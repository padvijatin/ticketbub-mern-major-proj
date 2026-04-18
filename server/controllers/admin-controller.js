const Event = require("../models/event-model");
const Booking = require("../models/booking-model");
const Coupon = require("../models/coupon-model");
const Payment = require("../models/payment-model");
const User = require("../models/user-model");
const AuditLog = require("../models/audit-log-model");
const { serializeEvent, syncEventPosterStateForList, syncEventSeatState } = require("./event-controller");
const { serializeUser, normalizeRole, normalizeStatus } = require("./auth-controller");
const { serializeCoupon } = require("../services/coupon-service");
const { deleteCloudinaryAsset } = require("../config/cloudinary");

const getUserRole = (user) =>
  typeof user?.getRole === "function" ? user.getRole() : normalizeRole(user?.role || "user");

const ensureStaff = (req, res) => {
  const role = getUserRole(req.user);

  if (!["admin", "organizer"].includes(role)) {
    res.status(403).json({ message: "Admin or organizer access required" });
    return false;
  }

  return true;
};

const ensureAdmin = (req, res) => {
  if (getUserRole(req.user) !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return false;
  }

  return true;
};

const parseList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return [];
    }

    if ((trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) || (trimmedValue.startsWith("{") && trimmedValue.endsWith("}"))) {
      try {
        const parsed = JSON.parse(trimmedValue);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch (_error) {
      }
    }
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseNumber = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }

  return fallback;
};

const parseSeatZones = (value, existingSeatZones = []) => {
  const normalizeZoneRows = (rowsValue) => {
    if (Array.isArray(rowsValue)) {
      return rowsValue.map((row) => String(row).trim().toUpperCase()).filter(Boolean);
    }

    if (typeof rowsValue === "string") {
      return rowsValue
        .split(",")
        .map((row) => row.trim().toUpperCase())
        .filter(Boolean);
    }

    return [];
  };

  const normalizeSeatZones = (seatZones = []) =>
    seatZones
      .map((zone) => {
        const rows = normalizeZoneRows(zone?.rows);
        const seatsPerRow = Math.max(0, parseNumber(zone?.seatsPerRow, 0) || 0);
        const totalSeats = Math.max(0, parseNumber(zone?.totalSeats, 0) || 0);
        const hasRowLayout = rows.length > 0 && seatsPerRow > 0;
        const hasSequentialLayout = totalSeats > 0;

        if (!hasRowLayout && !hasSequentialLayout) {
          return null;
        }

        return {
          sectionGroup: String(zone?.sectionGroup || "").trim(),
          name: String(zone?.name || "").trim(),
          price: Math.max(0, parseNumber(zone?.price, 0) || 0),
          rows,
          seatsPerRow,
          totalSeats,
        };
      })
      .filter((zone) => zone && zone.name && zone.price > 0);

  if (Array.isArray(value)) {
    return normalizeSeatZones(value);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return normalizeSeatZones(parsed);
      }
    } catch (_error) {
      return existingSeatZones;
    }
  }

  return existingSeatZones;
};

const logAdminAction = async ({ action, entity, entityId = "", actor, metadata = {} } = {}) => {
  if (!action || !entity) {
    return;
  }

  try {
    await AuditLog.create({
      action,
      entity,
      entityId: String(entityId || ""),
      actorId: String(actor?._id || ""),
      actorRole: getUserRole(actor || {}),
      metadata,
    });
  } catch (error) {
    console.error("admin-audit-log-failed", error);
  }
};

const buildPosterPath = (req, existingPoster = "") => {
  const uploadedPosterUrl = String(
    req.file?.secure_url || req.file?.path || req.file?.filename || req.file?.public_id || ""
  ).trim();

  if (uploadedPosterUrl) {
    return uploadedPosterUrl;
  }

  if (parseBoolean(req.body?.removePoster, false)) {
    return "";
  }

  if (typeof req.body?.posterUrl === "string") {
    return req.body.posterUrl.trim();
  }

  return existingPoster;
};

const buildEventPayload = ({ input = {}, req, existingEvent = null, userRole = "user", userId = null }) => {
  const parsedDate = input.date ? new Date(input.date) : existingEvent?.date ? new Date(existingEvent.date) : null;
  const payload = {
    title: String(input.title ?? existingEvent?.title ?? "").trim(),
    category: String(input.category ?? existingEvent?.category ?? "").trim(),
    description: String(input.description ?? existingEvent?.description ?? "").trim(),
    aboutThisEvent: String(input.aboutThisEvent ?? existingEvent?.aboutThisEvent ?? "").trim(),
    language: parseList(input.language ?? existingEvent?.language ?? []),
    genres: parseList(input.genres ?? existingEvent?.genres ?? []),
    format: parseList(input.format ?? existingEvent?.format ?? []),
    tags: parseList(input.tags ?? existingEvent?.tags ?? []),
    venue: String(input.venue ?? existingEvent?.venue ?? "").trim(),
    address: String(input.address ?? existingEvent?.address ?? "").trim(),
    city: String(input.city ?? existingEvent?.city ?? "").trim(),
    state: String(input.state ?? existingEvent?.state ?? "").trim(),
    latitude: parseNumber(input.latitude, existingEvent?.latitude ?? null),
    longitude: parseNumber(input.longitude, existingEvent?.longitude ?? null),
    date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    startTime: String(input.startTime ?? existingEvent?.startTime ?? "").trim(),
    price: Math.max(0, parseNumber(input.price, existingEvent?.price ?? 0) || 0),
    seatZones: parseSeatZones(input.seatZones, existingEvent?.seatZones ?? []),
    poster: buildPosterPath(req, existingEvent?.poster || ""),
    isActive: parseBoolean(input.isActive, existingEvent?.isActive ?? true),
  };

  const requestedStatus = String(input.status ?? existingEvent?.status ?? "pending").trim().toLowerCase();
  payload.status = userRole === "admin"
    ? ["pending", "approved", "rejected"].includes(requestedStatus)
      ? requestedStatus
      : "pending"
    : existingEvent?.status || "pending";
  if (userRole === "admin") {
    payload.isActive = payload.status === "approved" ? parseBoolean(input.isActive, existingEvent?.isActive ?? true) : false;
  } else if (!existingEvent) {
    payload.status = "pending";
    payload.isActive = false;
  } else if (payload.status !== "approved") {
    payload.isActive = false;
  } else {
    payload.isActive = existingEvent?.isActive ?? true;
  }
  payload.organizer = existingEvent?.organizer?._id || existingEvent?.organizer || userId || null;

  return payload;
};

const serializeManagedEvent = (event) => {
  const serializedEvent = serializeEvent(event.toObject ? event.toObject() : event, {}, {});
  const totalSeats = Math.max(0, Number(serializedEvent.totalSeats || 0));
  const availableSeats = Math.max(0, Number(serializedEvent.availableSeats || 0));
  const bookedSeatCount = Math.max(0, totalSeats - availableSeats);

  return {
    ...serializedEvent,
    bookedSeatCount,
    inventory: {
      totalSeats,
      availableSeats,
      bookedSeats: bookedSeatCount,
    },
    seatZones: (serializedEvent.seatZones || []).map((zone) => {
      const zoneTotalSeats = Math.max(0, Number(zone.totalSeats || 0));
      const zoneAvailableSeats = Math.max(0, Number(zone.availableSeats || 0));

      return {
        ...zone,
        bookedSeats: Math.max(0, zoneTotalSeats - zoneAvailableSeats),
      };
    }),
    status: String(event.status || "pending"),
    address: event.address || "",
    state: event.state || "",
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    isActive: Boolean(event.isActive),
    organizer: event.organizer
      ? {
          id: event.organizer._id?.toString?.() || "",
          username: event.organizer.username || "",
          email: event.organizer.email || "",
        }
      : null,
  };
};

const serializeAdminBooking = (booking) => ({
  id: booking._id.toString(),
  bookingId: booking.bookingId,
  seats: booking.seats || [],
  summary: booking.summary || [],
  originalAmount: booking.originalAmount || 0,
  discountAmount: booking.discountAmount || 0,
  finalAmount: booking.finalAmount || 0,
  paymentMethod: booking.paymentMethod || "",
  paymentStatus: booking.paymentStatus || "paid",
  paymentReference: booking.paymentReference || "",
  paymentCapturedAt: booking.paymentCapturedAt || null,
  couponCode: booking.couponCode || "",
  createdAt: booking.createdAt || null,
  event: booking.event
    ? {
        id: booking.event._id?.toString?.() || "",
        title: booking.event.title || "",
        category: booking.event.category || "",
        venue: booking.event.venue || "",
        city: booking.event.city || "",
        date: booking.event.date || null,
      }
    : null,
  user: booking.user
    ? {
        id: booking.user._id?.toString?.() || "",
        username: booking.user.username || "",
        email: booking.user.email || "",
        phone: booking.user.phone || "",
        role: normalizeRole(booking.user.role || "user"),
        status: normalizeStatus(booking.user.status || "active"),
      }
    : null,
});

const getAccessibleEventFilter = (req) => {
  const role = getUserRole(req.user);
  if (role === "organizer") {
    return { organizer: req.user._id };
  }

  return {};
};

const getAccessibleBookingFilter = async (req) => {
  const role = getUserRole(req.user);
  if (role === "organizer") {
    const organizerEventIds = await Event.find({ organizer: req.user._id }).distinct("_id");
    return { event: { $in: organizerEventIds } };
  }

  return {};
};

const getDashboardStats = async (req, res) => {
  try {
    if (!ensureStaff(req, res)) {
      return;
    }

    const role = getUserRole(req.user);
    const eventFilter = getAccessibleEventFilter(req);
    const bookingFilter = await getAccessibleBookingFilter(req);

    const [events, recentBookings, allBookings] = await Promise.all([
      Event.find(eventFilter).select("isActive status title createdAt organizer").lean(),
      Booking.find(bookingFilter)
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("event", "title")
        .populate("user", "username email")
        .lean(),
      Booking.find(bookingFilter).select("finalAmount createdAt paymentStatus user").lean(),
    ]);

    const users = role === "admin"
      ? await User.find({}).select("role status createdAt").lean()
      : [];

    const totalRevenue = allBookings.reduce((sum, booking) => {
      return String(booking.paymentStatus || "paid").toLowerCase() === "paid"
        ? sum + Number(booking.finalAmount || 0)
        : sum;
    }, 0);
    const activeEvents = events.filter((event) => event.isActive).length;

    const monthLabels = Array.from({ length: 6 }, (_, index) => {
      const current = new Date();
      current.setMonth(current.getMonth() - (5 - index));
      current.setDate(1);
      current.setHours(0, 0, 0, 0);
      return current;
    });

    const trendMap = monthLabels.reduce((accumulator, monthDate) => {
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      accumulator[key] = {
        month: monthDate.toLocaleDateString("en-IN", { month: "short" }),
        revenue: 0,
        bookings: 0,
      };
      return accumulator;
    }, {});

    allBookings.forEach((booking) => {
      const createdAt = new Date(booking.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        return;
      }

      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      if (!trendMap[key]) {
        return;
      }

      trendMap[key].bookings += 1;
      if (String(booking.paymentStatus || "paid").toLowerCase() === "paid") {
        trendMap[key].revenue += Number(booking.finalAmount || 0);
      }
    });

    return res.status(200).json({
      stats: {
        totalRevenue,
        totalBookings: allBookings.length,
        totalUsers: role === "admin" ? users.length : new Set(allBookings.map((booking) => String(booking.user || "")).filter(Boolean)).size,
        activeEvents,
      },
      trends: Object.values(trendMap),
      recentBookings: recentBookings.map(serializeAdminBooking),
    });
  } catch (error) {
    console.error("dashboard-fetch-failed", error);
    return res.status(500).json({ message: "Unable to load dashboard right now" });
  }
};

const listEvents = async (req, res) => {
  try {
    if (!ensureStaff(req, res)) {
      return;
    }

    const events = await Event.find(getAccessibleEventFilter(req)).sort({ createdAt: -1, date: 1 }).populate("organizer", "username email");
    await syncEventPosterStateForList(events);
    return res.status(200).json({
      events: events.map(serializeManagedEvent),
    });
  } catch (error) {
    console.error("events-list-failed", error);
    return res.status(500).json({ message: "Unable to load events right now" });
  }
};

const createEvent = async (req, res) => {
  try {
    if (!ensureStaff(req, res)) {
      return;
    }


    const role = getUserRole(req.user);
    const payload = buildEventPayload({
      input: req.body,
      req,
      userRole: role,
      userId: req.user._id,
    });

    if (!payload.title || !payload.category || !payload.venue || !payload.city || !payload.date || payload.price <= 0) {
      return res.status(400).json({ message: "Please fill all required event fields" });
    }

    if (role === "organizer") {
      payload.status = "pending";
      payload.isActive = false;
    }

    const event = await Event.create(payload);
    syncEventSeatState(event);
    await event.save();
    await event.populate("organizer", "username email");

    await logAdminAction({
      action: "event_create",
      entity: "event",
      entityId: event._id,
      actor: req.user,
      metadata: { title: event.title, category: event.category },
    });

    return res.status(201).json({
      message: "Event created successfully",
      event: serializeManagedEvent(event),
    });
  } catch (error) {
    if (req.file?.path) {
      await deleteCloudinaryAsset(req.file.path);
    }
    console.error("event-create-failed", error);
    return res.status(500).json({ message: "Unable to create event right now" });
  }
};

const updateEvent = async (req, res) => {
  try {
    if (!ensureStaff(req, res)) {
      return;
    }


    const role = getUserRole(req.user);
    const query = role === "organizer" ? { _id: req.params.id, organizer: req.user._id } : { _id: req.params.id };
    const event = await Event.findOne(query).populate("organizer", "username email");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const payload = buildEventPayload({
      input: req.body,
      req,
      existingEvent: event,
      userRole: role,
      userId: req.user._id,
    });

    if (!payload.title || !payload.category || !payload.venue || !payload.city || !payload.date || payload.price <= 0) {
      return res.status(400).json({ message: "Please fill all required event fields" });
    }

    const previousPoster = String(event.poster || "").trim();
    Object.assign(event, payload);
    syncEventSeatState(event);
    await event.save();
    await event.populate("organizer", "username email");


    const nextPoster = String(event.poster || "").trim();
    if (previousPoster && previousPoster !== nextPoster) {
      await deleteCloudinaryAsset(previousPoster);
    }
    await logAdminAction({
      action: "event_update",
      entity: "event",
      entityId: event._id,
      actor: req.user,
      metadata: { title: event.title, category: event.category },
    });

    return res.status(200).json({
      message: "Event updated successfully",
      event: serializeManagedEvent(event),
    });
  } catch (error) {
    if (req.file?.path) {
      await deleteCloudinaryAsset(req.file.path);
    }
    console.error("event-update-failed", error);
    return res.status(500).json({ message: "Unable to update event right now" });
  }
};

const deleteEvent = async (req, res) => {
  try {
    if (!ensureStaff(req, res)) {
      return;
    }

    const role = getUserRole(req.user);
    const query = role === "organizer" ? { _id: req.params.id, organizer: req.user._id } : { _id: req.params.id };
    const event = await Event.findOne(query);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.isActive = false;
    await event.save();

    await logAdminAction({
      action: "event_archive",
      entity: "event",
      entityId: event._id,
      actor: req.user,
      metadata: { title: event.title, category: event.category },
    });

    return res.status(200).json({ message: "Event archived successfully" });
  } catch (error) {
    console.error("event-delete-failed", error);
    return res.status(500).json({ message: "Unable to archive event right now" });
  }
};

const listUsers = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const users = await User.find({}).select("-password").sort({ createdAt: -1 }).lean();
    const bookingCounts = await Booking.aggregate([{ $group: { _id: "$user", count: { $sum: 1 } } }]);
    const bookingCountMap = bookingCounts.reduce((accumulator, entry) => {
      accumulator[String(entry._id || "")] = entry.count;
      return accumulator;
    }, {});

    return res.status(200).json({
      users: users.map((user) => ({
        ...serializeUser(user),
        bookingCount: Number(bookingCountMap[String(user._id)] || 0),
      })),
    });
  } catch (error) {
    console.error("users-list-failed", error);
    return res.status(500).json({ message: "Unable to load users right now" });
  }
};

const updateUser = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (String(user._id) === String(req.user._id) && normalizeStatus(req.body.status || user.status) !== "active") {
      return res.status(400).json({ message: "You cannot block your own admin account" });
    }

    if (req.body.role) {
      user.role = normalizeRole(req.body.role);
    }

    if (req.body.status) {
      user.status = normalizeStatus(req.body.status);
    }

    if (req.body.username) {
      user.username = String(req.body.username).trim() || user.username;
    }

    if (req.body.phone) {
      user.phone = String(req.body.phone).trim() || user.phone;
    }

    await user.save();

    return res.status(200).json({
      message: "User updated successfully",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("user-update-failed", error);
    return res.status(500).json({ message: "Unable to update user right now" });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot delete your own admin account" });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("user-delete-failed", error);
    return res.status(500).json({ message: "Unable to delete user right now" });
  }
};


const listCoupons = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const coupons = await Coupon.find({}).sort({ createdAt: -1, expiryDate: 1, code: 1 }).lean();

    return res.status(200).json({
      coupons: coupons.map((coupon) =>
        serializeCoupon(coupon, {
          isExpired: new Date(coupon.expiryDate).getTime() < Date.now(),
        })
      ),
    });
  } catch (error) {
    console.error("coupons-list-failed", error);
    return res.status(500).json({ message: "Unable to load coupons right now" });
  }
};

const createCoupon = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const code = String(req.body.code || "").trim().toUpperCase();
    const discountType = String(req.body.discountType || "").trim().toLowerCase();
    const discountValue = Math.max(0, Number(req.body.discountValue) || 0);
    const maxDiscount = req.body.maxDiscount === "" || req.body.maxDiscount == null
      ? null
      : Math.max(0, Number(req.body.maxDiscount) || 0);
    const minOrderAmount = Math.max(0, Number(req.body.minOrderAmount) || 0);
    const usageLimit = req.body.usageLimit === "" || req.body.usageLimit == null
      ? null
      : Math.max(1, Number(req.body.usageLimit) || 0);
    const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;
    if (expiryDate && !Number.isNaN(expiryDate.getTime())) {
      expiryDate.setHours(23, 59, 59, 999);
    }

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    if (!['percentage', 'flat'].includes(discountType)) {
      return res.status(400).json({ message: "Select a valid coupon type" });
    }

    if (discountValue <= 0) {
      return res.status(400).json({ message: "Discount must be greater than zero" });
    }

    if (discountType === "percentage" && discountValue > 100) {
      return res.status(400).json({ message: "Percentage discount cannot be more than 100" });
    }

    if (!expiryDate || Number.isNaN(expiryDate.getTime())) {
      return res.status(400).json({ message: "Select a valid expiry date" });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (expiryDate.getTime() < todayStart.getTime()) {
      return res.status(400).json({ message: "Expiry date cannot be in the past" });
    }

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(409).json({ message: "A coupon with this code already exists" });
    }

    const coupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      maxDiscount,
      minOrderAmount,
      expiryDate,
      usageLimit,
      isActive: true,
    });

    await logAdminAction({
      action: "coupon_create",
      entity: "coupon",
      entityId: coupon._id,
      actor: req.user,
      metadata: { code: coupon.code, discountType: coupon.discountType },
    });

    return res.status(201).json({
      message: "Coupon created successfully",
      coupon: serializeCoupon(coupon),
    });
  } catch (error) {
    console.error("coupon-create-failed", error);
    return res.status(500).json({ message: "Unable to create coupon right now" });
  }
};

const listBookings = async (req, res) => {
  try {
    if (!ensureStaff(req, res)) {
      return;
    }

    const bookings = await Booking.find(await getAccessibleBookingFilter(req))
      .sort({ createdAt: -1 })
      .populate("event", "title category venue city date")
      .populate("user", "username email phone role status")
      .lean();

    return res.status(200).json({
      bookings: bookings.map(serializeAdminBooking),
    });
  } catch (error) {
    console.error("bookings-list-failed", error);
    return res.status(500).json({ message: "Unable to load bookings right now" });
  }
};

const updateBooking = async (req, res) => {
  try {
    if (!ensureStaff(req, res)) {
      return;
    }

    const bookingFilter = await getAccessibleBookingFilter(req);
    const booking = await Booking.findOne({ _id: req.params.id, ...bookingFilter })
      .populate("event", "title category venue city date")
      .populate("user", "username email phone role status");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const nextStatus = String(req.body.paymentStatus || "").trim().toLowerCase();
    if (!["pending", "paid", "failed"].includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }

    booking.paymentStatus = nextStatus;
    await booking.save();

    await logAdminAction({
      action: "booking_update",
      entity: "booking",
      entityId: booking._id,
      actor: req.user,
      metadata: { paymentStatus: booking.paymentStatus, bookingId: booking.bookingId },
    });

    return res.status(200).json({
      message: "Booking updated successfully",
      booking: serializeAdminBooking(booking.toObject ? booking.toObject() : booking),
    });
  } catch (error) {
    console.error("booking-update-failed", error);
    return res.status(500).json({ message: "Unable to update booking right now" });
  }
};

const deleteBooking = async (req, res) => {
  try {
    if (!ensureStaff(req, res)) {
      return;
    }

    const bookingFilter = await getAccessibleBookingFilter(req);
    const booking = await Booking.findOne({ _id: req.params.id, ...bookingFilter });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.event) {
      const event = await Event.findById(booking.event);

      if (event) {
        const releasedSeats = (Array.isArray(booking.seats) ? booking.seats : [])
          .map((seat) => String(seat).trim())
          .filter(Boolean);

        event.bookedSeats = (event.bookedSeats || []).filter(
          (seat) => !releasedSeats.includes(String(seat).trim())
        );
        syncEventSeatState(event);
        event.bookingCount = Math.max(0, Number(event.bookingCount || 0) - 1);
        await event.save();
      }
    }

    if (booking.couponId) {
      await Coupon.updateOne(
        { _id: booking.couponId, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
      );
    }

    if (booking.ticketImageUrl) {
      await deleteCloudinaryAsset(booking.ticketImageUrl);
    }

    await Payment.updateMany(
      {
        $or: [
          { booking: booking._id },
          { paymentId: booking.paymentId || "__none__" },
          { orderId: booking.orderId || "__none__" },
        ],
      },
      {
        $set: {
          booking: null,
        },
      }
    );

    await Booking.deleteOne({ _id: booking._id });

    await logAdminAction({
      action: "booking_delete",
      entity: "booking",
      entityId: booking._id,
      actor: req.user,
      metadata: { bookingId: booking.bookingId },
    });

    return res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("booking-delete-failed", error);
    return res.status(500).json({ message: "Unable to delete booking right now" });
  }
};
module.exports = {
  getDashboardStats,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listUsers,
  updateUser,
  deleteUser,
  listCoupons,
  createCoupon,
  listBookings,
  updateBooking,
  deleteBooking,
};





