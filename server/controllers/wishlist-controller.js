const User = require("../models/user-model");
const Event = require("../models/event-model");
const Wishlist = require("../models/wishlist-model");
const { serializeEvent } = require("./event-controller");
const { incrementUserInterestSignals } = require("../services/recommendation-service");

const moviePattern = /(movie|film|cinema|screen|premiere)/i;
const sportsPattern = /(sport|cricket|football|match|league|ipl|cup|tournament|stadium)/i;

const isApprovedActiveEvent = (event) => event && event.isActive && event.status === "approved";

const detectWishlistContentType = (category = "") => {
  if (moviePattern.test(String(category || ""))) {
    return "movie";
  }

  if (sportsPattern.test(String(category || ""))) {
    return "sports";
  }

  return "event";
};

const serializeWishlistEntry = (entry) => ({
  ...serializeEvent(entry.event),
  isWishlisted: true,
  wishedAt: entry.savedAt instanceof Date ? entry.savedAt.toISOString() : entry.savedAt,
});

const migrateLegacyWishlist = async (userId) => {
  const user = await User.findById(userId).select("wishlist");

  if (!user || !Array.isArray(user.wishlist) || !user.wishlist.length) {
    return;
  }

  const operations = user.wishlist
    .filter((entry) => entry?.event)
    .map((entry) => ({
      updateOne: {
        filter: {
          user: userId,
          event: entry.event,
        },
        update: {
          $set: {
            savedAt: entry.savedAt || new Date(),
          },
          $setOnInsert: {
            user: userId,
            event: entry.event,
          },
        },
        upsert: true,
      },
    }));

  if (operations.length) {
    await Wishlist.bulkWrite(operations, { ordered: false });
  }

  user.wishlist = [];
  await user.save();
};

const loadWishlistItems = async (userId) => {
  await migrateLegacyWishlist(userId);

  const entries = await Wishlist.find({ user: userId })
    .populate({
      path: "event",
      model: Event,
    })
    .sort({ savedAt: -1 })
    .exec();

  const invalidEntryIds = entries
    .filter((entry) => !isApprovedActiveEvent(entry.event))
    .map((entry) => entry._id);

  if (invalidEntryIds.length) {
    await Wishlist.deleteMany({ _id: { $in: invalidEntryIds } });
  }

  return entries.filter((entry) => isApprovedActiveEvent(entry.event));
};

const getWishlist = async (req, res) => {
  try {
    const items = await loadWishlistItems(req.user._id);

    return res.status(200).json({
      items: items.map(serializeWishlistEntry),
      count: items.length,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load wishlist right now" });
  }
};

const ensureWishlistEvent = async (eventId) => {
  if (!eventId) {
    return null;
  }

  return Event.findOne({
    _id: eventId,
    isActive: true,
    status: "approved",
  });
};

const trackWishlistInterest = async (userId, events = [], weight = 2) => {
  const validEvents = (Array.isArray(events) ? events : []).filter(Boolean);

  if (!userId || !validEvents.length) {
    return;
  }

  await Promise.all(
    validEvents.map((event) =>
      incrementUserInterestSignals({
        userId,
        category: event.category,
        city: event.city,
        contentType: detectWishlistContentType(event.category),
        weight,
      })
    )
  );
};

const addWishlistItem = async (req, res) => {
  try {
    const { eventId } = req.body;
    const event = await ensureWishlistEvent(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await Wishlist.findOneAndUpdate(
      {
        user: req.user._id,
        event: event._id,
      },
      {
        $set: {
          savedAt: new Date(),
        },
        $setOnInsert: {
          user: req.user._id,
          event: event._id,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    await trackWishlistInterest(req.user._id, [event], 2);

    const count = await Wishlist.countDocuments({ user: req.user._id });

    return res.status(200).json({
      message: "Added to wishlist",
      isWishlisted: true,
      count,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update wishlist right now" });
  }
};

const removeWishlistItem = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.body.eventId;

    await Wishlist.deleteOne({
      user: req.user._id,
      event: eventId,
    });

    const count = await Wishlist.countDocuments({ user: req.user._id });

    return res.status(200).json({
      message: "Removed from wishlist",
      isWishlisted: false,
      count,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update wishlist right now" });
  }
};

const syncWishlist = async (req, res) => {
  try {
    const eventIds = Array.isArray(req.body.eventIds) ? req.body.eventIds : [];
    const uniqueEventIds = [...new Set(eventIds.filter(Boolean).map((value) => String(value)))];

    if (uniqueEventIds.length) {
      const events = await Event.find({
        _id: { $in: uniqueEventIds },
        isActive: true,
        status: "approved",
      }).select("_id category city");

      const operations = events.map((event) => ({
        updateOne: {
          filter: {
            user: req.user._id,
            event: event._id,
          },
          update: {
            $set: {
              savedAt: new Date(),
            },
            $setOnInsert: {
              user: req.user._id,
              event: event._id,
            },
          },
          upsert: true,
        },
      }));

      if (operations.length) {
        await Wishlist.bulkWrite(operations, { ordered: false });
      }

      await trackWishlistInterest(req.user._id, events, 1);
    }

    return getWishlist(req, res);
  } catch (error) {
    return res.status(500).json({ message: "Unable to sync wishlist right now" });
  }
};

const clearWishlist = async (req, res) => {
  try {
    await Wishlist.deleteMany({ user: req.user._id });

    return res.status(200).json({
      message: "Wishlist cleared",
      count: 0,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to clear wishlist right now" });
  }
};

module.exports = {
  addWishlistItem,
  clearWishlist,
  getWishlist,
  removeWishlistItem,
  syncWishlist,
};
