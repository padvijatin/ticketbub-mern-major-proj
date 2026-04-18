const Event = require("../models/event-model");
const User = require("../models/user-model");
const Wishlist = require("../models/wishlist-model");
const Review = require("../models/review-model");
const { cloudinaryAssetExists, normalizeCloudinaryAssetUrl } = require("../config/cloudinary");
const { getSeatLockSnapshot } = require("../services/seat-lock-service");
const { getTopSignalKeys, incrementUserInterestSignals, sanitizeSignalKey } = require("../services/recommendation-service");
const { getAuthorizationToken, resolveUserFromToken } = require("../services/socket-auth");
const { buildZoneSeatIds, getZoneAvailability } = require("../utils/seat-layout");

const moviePattern = /(movie|film|cinema|screen|premiere)/i;
const sportsPattern = /(sport|cricket|football|match|league|ipl|cup|tournament|stadium)/i;

const routeByType = {
  movie: "/movies",
  sports: "/sports",
  event: "/events",
};

const defaultSeatZoneBlueprints = {
  movie: [
    {
      sectionGroup: "Screening",
      name: "Premium",
      totalSeats: 24,
      priceOffset: 120,
      minPrice: 471,
      rows: ["A", "B"],
      seatsPerRow: 12,
    },
    {
      sectionGroup: "Screening",
      name: "Classic",
      totalSeats: 36,
      priceOffset: 0,
      minPrice: 349,
      rows: ["C", "D", "E"],
      seatsPerRow: 12,
    },
    {
      sectionGroup: "Screening",
      name: "Saver",
      totalSeats: 24,
      priceOffset: -87,
      minPrice: 262,
      rows: ["F", "G"],
      seatsPerRow: 12,
    },
  ],
  sports: [
    { sectionGroup: "Pitch", name: "North Lower", totalSeats: 180, priceOffset: -90, minPrice: 1169 },
    { sectionGroup: "Pitch", name: "East Stand", totalSeats: 220, priceOffset: 300, minPrice: 1559 },
    { sectionGroup: "Pitch", name: "South Lower", totalSeats: 180, priceOffset: -25, minPrice: 1234 },
    { sectionGroup: "Pitch", name: "West Premium", totalSeats: 140, priceOffset: 760, minPrice: 2013 },
  ],
  event: [
    { sectionGroup: "Stage", name: "Fan Pit", totalSeats: 160, priceOffset: 1200, minPrice: 2499 },
    { sectionGroup: "Stage", name: "Gold Circle", totalSeats: 220, priceOffset: 500, minPrice: 1799 },
    { sectionGroup: "Stage", name: "Regular", totalSeats: 260, priceOffset: 0, minPrice: 999 },
  ],
};

const normalizeType = (value = "") => {
  const normalizedValue = value.trim().toLowerCase();

  if (["movie", "movies"].includes(normalizedValue)) return "movie";
  if (["sport", "sports"].includes(normalizedValue)) return "sports";
  if (["event", "events"].includes(normalizedValue)) return "event";

  return "";
};

const detectContentType = (category = "") => {
  if (moviePattern.test(category)) return "movie";
  if (sportsPattern.test(category)) return "sports";
  return "event";
};

const toTitleCase = (value = "") =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const parseCommaValues = (value = "") =>
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formatStartTime = (value) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getDateRange = (dateFilter) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (dateFilter === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }

  if (dateFilter === "weekend") {
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }

  if (dateFilter === "month") {
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 30);
    end.setHours(23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }

  if (dateFilter === "upcoming") {
    start.setHours(0, 0, 0, 0);
    return { $gte: start };
  }

  return null;
};

const getPriceRange = (priceFilter) => {
  if (priceFilter === "under500") return { $lte: 500 };
  if (priceFilter === "500-999") return { $gte: 500, $lte: 999 };
  if (priceFilter === "1000-1999") return { $gte: 1000, $lte: 1999 };
  if (priceFilter === "premium") return { $gte: 2000 };
  return null;
};

const createDefaultSeatZones = (contentType, basePrice) => {
  const safePrice = Number(basePrice) > 0 ? Number(basePrice) : 0;
  const blueprints = defaultSeatZoneBlueprints[contentType] || defaultSeatZoneBlueprints.event;

  return blueprints.map((zone) => ({
    sectionGroup: zone.sectionGroup,
    name: zone.name,
    price: Math.max(safePrice + zone.priceOffset, zone.minPrice),
    totalSeats: zone.totalSeats,
    availableSeats: zone.totalSeats,
    rows: zone.rows || [],
    seatsPerRow: zone.seatsPerRow || 0,
  }));
};

const normalizeSeatZones = (seatZones = [], contentType, basePrice) => {
  const blueprints = defaultSeatZoneBlueprints[contentType] || defaultSeatZoneBlueprints.event;

  const normalizedZones = seatZones
    .map((zone, index) => {
      const fallbackBlueprint = blueprints[index] || {};
      const rows = Array.isArray(zone.rows) && zone.rows.length ? zone.rows : fallbackBlueprint.rows || [];
      const seatsPerRow = Math.max(0, Number(zone.seatsPerRow) || Number(fallbackBlueprint.seatsPerRow) || 0);
      const seededZone = {
        sectionGroup: (zone.sectionGroup || fallbackBlueprint.sectionGroup || "").trim(),
        name: (zone.name || fallbackBlueprint.name || "").trim(),
        price: Number(zone.price) || Math.max((Number(basePrice) || 0) + (fallbackBlueprint.priceOffset || 0), fallbackBlueprint.minPrice || 0),
        totalSeats: Math.max(0, Number(zone.totalSeats) || Number(fallbackBlueprint.totalSeats) || 0),
        availableSeats: Math.max(0, Number(zone.availableSeats) || 0),
        rows,
        seatsPerRow,
      };
      const totalSeats = buildZoneSeatIds(seededZone).length;

      return {
        ...seededZone,
        totalSeats,
        availableSeats: totalSeats,
      };
    })
    .filter((zone) => zone.name && zone.price > 0 && zone.totalSeats > 0);

  if (normalizedZones.length) {
    return normalizedZones;
  }

  return createDefaultSeatZones(contentType, basePrice);
};

const getStartingPrice = (basePrice, seatZones = []) => {
  const prices = seatZones.map((zone) => Number(zone.price) || 0).filter((price) => price > 0);
  return prices.length ? Math.min(...prices) : Number(basePrice) || 0;
};

const calculateRatingSummary = (reviews = []) => {
  const totalRatings = reviews.length;

  if (!totalRatings) {
    return { averageRating: 0, totalRatings: 0 };
  }

  const ratingTotal = reviews.reduce((sum, review) => sum + Number(review.value || 0), 0);
  return {
    averageRating: Number((ratingTotal / totalRatings).toFixed(1)),
    totalRatings,
  };
};

const buildEventQuery = (queryParams = {}) => {
  const query = {
    isActive: true,
    status: "approved",
  };

  const type = normalizeType(queryParams.type);
  const language = parseCommaValues(queryParams.language);
  const genres = parseCommaValues(queryParams.genres);
  const format = parseCommaValues(queryParams.format);
  const tags = parseCommaValues(queryParams.tags);
  const category = String(queryParams.category || "").trim();
  const priceRange = getPriceRange(String(queryParams.price || "").trim().toLowerCase());
  const dateRange = getDateRange(String(queryParams.date || "").trim().toLowerCase());

  if (type === "movie") {
    query.category = moviePattern;
  } else if (type === "sports") {
    query.category = sportsPattern;
  } else if (type === "event" && !category) {
    query.category = {
      $not: {
        $regex: /(movie|film|cinema|screen|premiere|sport|cricket|football|match|league|ipl|cup|tournament|stadium)/i,
      },
    };
  }

  if (category) query.category = category;
  if (language.length) query.language = { $in: language };
  if (genres.length) query.genres = { $in: genres };
  if (format.length) query.format = { $in: format };
  if (tags.length) query.tags = { $in: tags };
  if (priceRange) query.price = priceRange;
  if (dateRange) query.date = dateRange;

  return query;
};

const buildInterestedCountMap = async (events = []) => {
  const eventIds = events.map((event) => event._id).filter(Boolean);
  if (!eventIds.length) return {};

  const counts = await Wishlist.aggregate([
    { $match: { event: { $in: eventIds } } },
    { $group: { _id: "$event", count: { $sum: 1 } } },
  ]);

  return counts.reduce((accumulator, entry) => {
    accumulator[entry._id.toString()] = entry.count;
    return accumulator;
  }, {});
};

const buildReviewSummaryMap = async (events = []) => {
  const eventIds = events.map((event) => event._id).filter(Boolean);
  if (!eventIds.length) return {};

  const reviews = await Review.aggregate([
    { $match: { event: { $in: eventIds } } },
    { $group: { _id: "$event", totalRatings: { $sum: 1 }, averageRating: { $avg: "$value" } } },
  ]);

  return reviews.reduce((accumulator, entry) => {
    accumulator[entry._id.toString()] = {
      totalRatings: entry.totalRatings,
      averageRating: Number((entry.averageRating || 0).toFixed(1)),
    };
    return accumulator;
  }, {});
};

const normalizeBookedSeats = (bookedSeats = [], seatZones = []) => {
  const validSeatIds = new Set(seatZones.flatMap((zone) => buildZoneSeatIds(zone)));
  return [...new Set((Array.isArray(bookedSeats) ? bookedSeats : []).map((seat) => String(seat).trim()).filter((seat) => validSeatIds.has(seat)))];
};

const getBookedSeatsFromAvailability = (seatZones = [], bookedSeats = []) => {
  const normalizedBookedSeats = normalizeBookedSeats(bookedSeats, seatZones);

  return normalizedBookedSeats;
};

const buildSerializedSeatZones = (seatZones = [], bookedSeats = []) =>
  seatZones.map((zone) => {
    const zoneAvailability = getZoneAvailability(zone, bookedSeats);

    return {
      sectionGroup: zone.sectionGroup,
      name: zone.name,
      price: Number(zone.price) || 0,
      rows: Array.isArray(zone.rows) ? zone.rows : [],
      seatsPerRow: Math.max(0, Number(zone.seatsPerRow) || 0),
      totalSeats: zoneAvailability.totalSeats,
      availableSeats: zoneAvailability.availableSeats,
    };
  });

const hasSeatStateChanged = (event, nextState) => {
  const currentBookedSeats = Array.isArray(event.bookedSeats) ? event.bookedSeats : [];
  const currentSeatZones = Array.isArray(event.seatZones) ? event.seatZones : [];

  return JSON.stringify({
    bookedSeats: currentBookedSeats,
    seatZones: currentSeatZones,
    totalSeats: event.totalSeats,
    availableSeats: event.availableSeats,
  }) !== JSON.stringify({
    bookedSeats: nextState.bookedSeats,
    seatZones: nextState.seatZones,
    totalSeats: nextState.totalSeats,
    availableSeats: nextState.availableSeats,
  });
};

const syncEventPosterState = async (event) => {
  const currentPoster = String(event?.poster || "").trim();

  if (!currentPoster) {
    return false;
  }

  const posterExists = await cloudinaryAssetExists(currentPoster);
  if (posterExists !== false) {
    return false;
  }

  event.poster = "";
  await event.save();
  return true;
};

const syncEventPosterStateForList = async (events = []) => {
  await Promise.all(events.map((event) => syncEventPosterState(event)));
};

const serializeEvent = (event, interestedCountMap = {}, reviewSummaryMap = {}, seatLocks = {}) => {
  const contentType = detectContentType(event.category);
  const normalizedSeatZones = normalizeSeatZones(event.seatZones, contentType, event.price);
  const bookedSeats = getBookedSeatsFromAvailability(normalizedSeatZones, event.bookedSeats);
  const seatZones = buildSerializedSeatZones(normalizedSeatZones, bookedSeats);
  const eventId = event._id.toString();
  const reviewSummary = reviewSummaryMap[eventId] || { averageRating: 0, totalRatings: 0 };
  const totalSeats = seatZones.reduce((sum, zone) => sum + Number(zone.totalSeats || 0), 0);
  const availableSeats = Math.max(0, totalSeats - bookedSeats.length);

  return {
    id: eventId,
    title: event.title,
    subtitle: event.description || `${toTitleCase(event.category)} in ${event.city}`,
    description: event.description || "",
    aboutThisEvent: event.aboutThisEvent || "",
    category: toTitleCase(event.category),
    contentType,
    language: event.language || [],
    genres: event.genres || [],
    format: event.format || [],
    tags: event.tags || [],
    date: event.date instanceof Date ? event.date.toISOString() : event.date,
    startTime: event.startTime || formatStartTime(event.date),
    city: event.city,
    state: event.state || "",
    address: event.address || "",
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    venue: event.venue,
    price: getStartingPrice(event.price, seatZones),
    seatZones,
    bookedSeats,
    lockedSeats: seatLocks.lockedSeatIds || [],
    currentUserLockedSeats: seatLocks.currentUserLockedSeats || [],
    totalSeats,
    availableSeats,
    averageRating: reviewSummary.averageRating,
    totalRatings: reviewSummary.totalRatings,
    interestedCount: Number(interestedCountMap[eventId] || 0),
    viewCount: Math.max(0, Number(event.viewCount) || 0),
    bookingCount: Math.max(0, Number(event.bookingCount) || 0),
    lastViewedAt: event.lastViewedAt || null,
    poster: normalizeCloudinaryAssetUrl(event.poster || ""),
    cta: contentType === "movie" ? "Book Movie" : contentType === "sports" ? "Get Sports Tickets" : "Book Event",
    to: routeByType[contentType],
    isActive: event.isActive,
  };
};

const syncEventSeatState = (event) => {
  const contentType = detectContentType(event.category);
  const normalizedSeatZones = normalizeSeatZones(event.seatZones, contentType, event.price);
  const bookedSeats = getBookedSeatsFromAvailability(normalizedSeatZones, event.bookedSeats);
  const seatZones = buildSerializedSeatZones(normalizedSeatZones, bookedSeats);
  const totalSeats = seatZones.reduce((sum, zone) => sum + zone.totalSeats, 0);
  const availableSeats = Math.max(0, totalSeats - bookedSeats.length);

  event.seatZones = seatZones;
  event.bookedSeats = bookedSeats;
  event.totalSeats = totalSeats;
  event.availableSeats = availableSeats;
  event.price = getStartingPrice(event.price, seatZones);

  return { seatZones, bookedSeats, totalSeats, availableSeats };
};

const getEvents = async (req, res) => {
  try {
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const parsedSkip = Number.parseInt(req.query.skip, 10);
    const query = buildEventQuery(req.query);
    const eventQuery = Event.find(query).sort({ date: 1, createdAt: -1, title: 1 });

    if (Number.isInteger(parsedSkip) && parsedSkip > 0) eventQuery.skip(parsedSkip);
    if (Number.isInteger(parsedLimit) && parsedLimit > 0) eventQuery.limit(parsedLimit);

    const events = await eventQuery;

    await syncEventPosterStateForList(events);

    await Promise.all(
      events.map(async (event) => {
        const previousState = event.toObject({ depopulate: true });
        const syncedState = syncEventSeatState(event);

        if (hasSeatStateChanged(previousState, syncedState)) {
          await event.save();
        }
      })
    );

    const [interestedCountMap, reviewSummaryMap] = await Promise.all([
      buildInterestedCountMap(events),
      buildReviewSummaryMap(events),
    ]);

    return res.status(200).json({
      events: events.map((event) => serializeEvent(event.toObject(), interestedCountMap, reviewSummaryMap)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load events right now" });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      isActive: true,
      status: "approved",
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await syncEventPosterState(event);

    const previousState = event.toObject({ depopulate: true });
    const syncedState = syncEventSeatState(event);

    if (hasSeatStateChanged(previousState, syncedState)) {
      await event.save();
    }

    const [interestedCountMap, reviewSummaryMap, viewer] = await Promise.all([
      buildInterestedCountMap([event]),
      buildReviewSummaryMap([event]),
      resolveUserFromToken(getAuthorizationToken(req.headers)),
    ]);

    await Event.updateOne(
      { _id: event._id },
      {
        $inc: { viewCount: 1 },
        $set: { lastViewedAt: new Date() },
      }
    );

    event.viewCount = Math.max(0, Number(event.viewCount || 0)) + 1;
    event.lastViewedAt = new Date();

    if (viewer?._id) {
      await incrementUserInterestSignals({
        userId: viewer._id,
        category: event.category,
        city: event.city,
        contentType: detectContentType(event.category),
        weight: 1,
      });
    }

    const seatLocks = getSeatLockSnapshot(event._id.toString(), viewer?._id?.toString?.() || "");

    return res.status(200).json({
      event: serializeEvent(event.toObject(), interestedCountMap, reviewSummaryMap, seatLocks),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load event right now" });
  }
};

const buildRecommendedEvents = ({ events = [], preferredCategories = [], preferredCities = [], preferredTypes = [] } = {}) =>
  [...events].sort((left, right) => {
    const leftCategory = sanitizeSignalKey(left.category);
    const rightCategory = sanitizeSignalKey(right.category);
    const leftCity = sanitizeSignalKey(left.city);
    const rightCity = sanitizeSignalKey(right.city);
    const leftType = sanitizeSignalKey(detectContentType(left.category));
    const rightType = sanitizeSignalKey(detectContentType(right.category));

    const leftScore =
      (preferredCategories.includes(leftCategory) ? 6 : 0) +
      (preferredCities.includes(leftCity) ? 4 : 0) +
      (preferredTypes.includes(leftType) ? 5 : 0) +
      Math.max(0, Number(left.bookingCount || 0)) * 2 +
      Math.max(0, Number(left.viewCount || 0));

    const rightScore =
      (preferredCategories.includes(rightCategory) ? 6 : 0) +
      (preferredCities.includes(rightCity) ? 4 : 0) +
      (preferredTypes.includes(rightType) ? 5 : 0) +
      Math.max(0, Number(right.bookingCount || 0)) * 2 +
      Math.max(0, Number(right.viewCount || 0));

    return rightScore - leftScore;
  });

const buildPopularEvents = (events = []) =>
  [...events].sort(
    (left, right) =>
      Math.max(0, Number(right.bookingCount || 0)) * 3 +
      Math.max(0, Number(right.viewCount || 0)) -
      (Math.max(0, Number(left.bookingCount || 0)) * 3 + Math.max(0, Number(left.viewCount || 0)))
  );

const buildTrendingEvents = (events = []) =>
  [...events].sort((left, right) => {
    const now = Date.now();
    const leftCreatedHours = Math.max(1, (now - new Date(left.createdAt || now).getTime()) / (1000 * 60 * 60));
    const rightCreatedHours = Math.max(1, (now - new Date(right.createdAt || now).getTime()) / (1000 * 60 * 60));
    const leftLastViewedHours = left.lastViewedAt ? Math.max(1, (now - new Date(left.lastViewedAt).getTime()) / (1000 * 60 * 60)) : 240;
    const rightLastViewedHours = right.lastViewedAt ? Math.max(1, (now - new Date(right.lastViewedAt).getTime()) / (1000 * 60 * 60)) : 240;

    const leftScore =
      Math.max(0, Number(left.viewCount || 0)) * 2.2 +
      Math.max(0, Number(left.bookingCount || 0)) * 2.8 +
      200 / leftCreatedHours +
      120 / leftLastViewedHours;
    const rightScore =
      Math.max(0, Number(right.viewCount || 0)) * 2.2 +
      Math.max(0, Number(right.bookingCount || 0)) * 2.8 +
      200 / rightCreatedHours +
      120 / rightLastViewedHours;

    return rightScore - leftScore;
  });

const splitByContentType = (events = []) =>
  events.reduce(
    (accumulator, event) => {
      const type = detectContentType(event.category);
      accumulator[type].push(event);
      return accumulator;
    },
    { movie: [], event: [], sports: [] }
  );

const getDiscoverFeed = async (req, res) => {
  try {
    const viewer = await resolveUserFromToken(getAuthorizationToken(req.headers));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const allEvents = await Event.find({
      isActive: true,
      status: "approved",
      date: { $gte: now },
    })
      .sort({ date: 1, createdAt: -1 })
      .limit(180);

    if (!allEvents.length) {
      return res.status(200).json({
        recommended: { movies: [], events: [], sports: [] },
        popular: { movies: [], events: [], sports: [] },
        trending: { movies: [], events: [], sports: [] },
      });
    }

    await syncEventPosterStateForList(allEvents);
    await Promise.all(
      allEvents.map(async (event) => {
        const previousState = event.toObject({ depopulate: true });
        const syncedState = syncEventSeatState(event);
        if (hasSeatStateChanged(previousState, syncedState)) {
          await event.save();
        }
      })
    );

    const [interestedCountMap, reviewSummaryMap, viewerUser] = await Promise.all([
      buildInterestedCountMap(allEvents),
      buildReviewSummaryMap(allEvents),
      viewer?._id ? User.findById(viewer._id).select("interestSignals").lean() : Promise.resolve(null),
    ]);

    const serialized = allEvents.map((event) => serializeEvent(event.toObject(), interestedCountMap, reviewSummaryMap, {}));
    const topCategories = getTopSignalKeys(viewerUser?.interestSignals?.categoryScores || {}, 5);
    const topCities = getTopSignalKeys(viewerUser?.interestSignals?.cityScores || {}, 5);
    const topTypes = getTopSignalKeys(viewerUser?.interestSignals?.contentTypeScores || {}, 3);

    const popular = splitByContentType(buildPopularEvents(serialized));
    const trending = splitByContentType(buildTrendingEvents(serialized));
    const recommended = splitByContentType(
      buildRecommendedEvents({
        events: serialized,
        preferredCategories: topCategories,
        preferredCities: topCities,
        preferredTypes: topTypes,
      })
    );

    return res.status(200).json({
      recommended: {
        movies: recommended.movie.slice(0, 10),
        events: recommended.event.slice(0, 10),
        sports: recommended.sports.slice(0, 10),
      },
      popular: {
        movies: popular.movie.slice(0, 10),
        events: popular.event.slice(0, 10),
        sports: popular.sports.slice(0, 10),
      },
      trending: {
        movies: trending.movie.slice(0, 10),
        events: trending.event.slice(0, 10),
        sports: trending.sports.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("discover-feed-failed", error);
    return res.status(500).json({ message: "Unable to load recommendations right now" });
  }
};

const rateEvent = async (req, res) => {
  try {
    const ratingValue = Number(req.body?.value);

    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const event = await Event.findById(req.params.id).select("_id");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await Review.findOneAndUpdate(
      { event: event._id, user: req.user._id },
      {
        $set: { value: ratingValue },
        $setOnInsert: { event: event._id, user: req.user._id },
      },
      { upsert: true, returnDocument: "after" }
    );

    const reviews = await Review.find({ event: event._id }).select("value").lean();
    const ratingSummary = calculateRatingSummary(reviews);

    return res.status(200).json({
      averageRating: ratingSummary.averageRating,
      totalRatings: ratingSummary.totalRatings,
      userRating: ratingValue,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to save rating right now" });
  }
};

module.exports = {
  getDiscoverFeed,
  getEvents,
  getEventById,
  rateEvent,
  serializeEvent,
  buildEventQuery,
  syncEventPosterState,
  syncEventPosterStateForList,
  syncEventSeatState,
};
