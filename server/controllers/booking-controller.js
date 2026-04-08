const Event = require("../models/event-model");
const Booking = require("../models/booking-model");
const Coupon = require("../models/coupon-model");
const QRCode = require("qrcode");
const { validateCouponForAmount } = require("../services/coupon-service");
const { buildCheckoutPricing } = require("../services/pricing-service");
const {
  assertSeatsLockedByUser,
  emitSeatBooked,
  getSeatLockSnapshot,
  releaseSeats,
} = require("../services/seat-lock-service");
const { buildZoneSeatIds } = require("../utils/seat-layout");
const { serializeEvent, syncEventSeatState, ensureEventPosterState } = require("./event-controller");

const buildBookingId = () =>
  `TH${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const createHttpError = (statusCode, message, extra = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
};

const detectBookingContentType = (category = "") => {
  const value = String(category || "").trim().toLowerCase();

  if (/(movie|film|cinema|screen|premiere)/i.test(value)) {
    return "movie";
  }

  if (/(sport|cricket|football|match|league|ipl|cup|tournament|stadium)/i.test(value)) {
    return "sports";
  }

  return "event";
};

const getBookingPricingSummary = (requestedSeats = [], seatZones = []) => {
  const groupedSummary = {};
  let cartAmount = 0;

  seatZones.forEach((zone) => {
    const zoneSeatIds = new Set(buildZoneSeatIds(zone));
    const selectedSeatCount = requestedSeats.filter((seat) => zoneSeatIds.has(seat)).length;

    if (!selectedSeatCount) {
      return;
    }

    groupedSummary[zone.name] = {
      label: zone.name,
      count: selectedSeatCount,
      price: Number(zone.price) || 0,
      currency: "Rs ",
    };

    cartAmount += selectedSeatCount * (Number(zone.price) || 0);
  });

  return {
    cartAmount: Math.max(0, Math.round(cartAmount)),
    summary: Object.values(groupedSummary),
  };
};

const createBookingWithRetry = async (payload, attempts = 3) => {
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const bookingCode = buildBookingId();
      return await Booking.create({
        ...payload,
        bookingCode,
        bookingId: bookingCode,
      });
    } catch (error) {
      lastError = error;

      if (error?.code !== 11000) {
        throw error;
      }
    }
  }

  throw lastError;
};

const rollbackReservedSeats = async (eventId, reservedSeats = []) => {
  if (!eventId || !reservedSeats.length) {
    return;
  }

  const rollbackEvent = await Event.findById(eventId);

  if (!rollbackEvent) {
    return;
  }

  rollbackEvent.bookedSeats = (rollbackEvent.bookedSeats || []).filter((seat) => !reservedSeats.includes(seat));
  syncEventSeatState(rollbackEvent);
  await rollbackEvent.save();
};

const serializeBooking = (booking) => ({
  id: booking._id.toString(),
  bookingId: booking.bookingId,
  bookingCode: booking.bookingCode || booking.bookingId,
  seats: booking.seats || [],
  summary: booking.summary || [],
  bookingMeta: booking.bookingMeta || {},
  originalAmount: booking.originalAmount || 0,
  discountAmount: booking.discountAmount || 0,
  finalAmount: booking.finalAmount || 0,
  couponId: booking.couponId || null,
  couponCode: booking.couponCode || "",
  paymentMethod: booking.paymentMethod || "razorpay",
  paymentGateway: booking.paymentGateway || "razorpay",
  paymentReference: booking.paymentReference || booking.paymentId || "",
  paymentCapturedAt: booking.paymentCapturedAt || null,
  paymentStatus: booking.paymentStatus || "paid",
  orderId: booking.orderId || "",
  paymentId: booking.paymentId || "",
  qrPayload: booking.qrPayload || "",
  qrCodeDataUrl: booking.qrCodeDataUrl || "",
  createdAt: booking.createdAt,
});

const buildBookingPayload = ({ booking, event, pricing, userId }) => {
  const seatLocks = getSeatLockSnapshot(event._id.toString(), String(userId || ""));

  return {
    message: "Seats booked successfully",
    bookedSeats: booking.seats || [],
    totalSeats: event.totalSeats,
    availableSeats: event.availableSeats,
    event: serializeEvent(event.toObject ? event.toObject() : event, {}, {}, seatLocks),
    booking: serializeBooking(booking),
    pricing,
  };
};

const prepareBookingCheckout = async ({ userId, eventId, seats = [], couponCode = "", expectedAmount } = {}) => {
  const requestedSeats = [...new Set((Array.isArray(seats) ? seats : []).map((seat) => String(seat).trim()).filter(Boolean))];
  const normalizedCouponCode = String(couponCode || "").trim().toUpperCase();

  if (!eventId) {
    throw createHttpError(400, "Event id is required");
  }

  if (!requestedSeats.length) {
    throw createHttpError(400, "Please select at least one seat");
  }

  const event = await Event.findById(eventId);

  if (!event || !event.isActive || event.status !== "approved") {
    throw createHttpError(404, "Event not found");
  }

  const normalizedState = syncEventSeatState(event);
  const validSeatIds = new Set(normalizedState.seatZones.flatMap((zone) => buildZoneSeatIds(zone)));
  const invalidSeats = requestedSeats.filter((seat) => !validSeatIds.has(seat));

  if (invalidSeats.length) {
    throw createHttpError(400, "Some selected seats are invalid", { invalidSeats });
  }

  const alreadyBookedSeats = requestedSeats.filter((seat) => normalizedState.bookedSeats.includes(seat));

  if (alreadyBookedSeats.length) {
    throw createHttpError(409, "Some selected seats are already booked", { seats: alreadyBookedSeats });
  }

  const lockOwnership = assertSeatsLockedByUser({
    eventId: event._id.toString(),
    seatIds: requestedSeats,
    userId: String(userId || ""),
  });

  if (!lockOwnership.ok) {
    throw createHttpError(409, "Your seat lock expired. Please reselect your seats.", {
      seats: [...lockOwnership.missingSeats, ...lockOwnership.conflictingSeats],
    });
  }

  const pricingSummary = getBookingPricingSummary(requestedSeats, normalizedState.seatZones);

  if (!pricingSummary.summary.length || pricingSummary.cartAmount <= 0) {
    throw createHttpError(400, "Unable to calculate booking amount for the selected seats");
  }

  let pricing = buildCheckoutPricing({
    cartAmount: pricingSummary.cartAmount,
    discountAmount: 0,
  });
  let validatedCoupon = null;

  if (normalizedCouponCode) {
    const couponValidation = await validateCouponForAmount({
      code: normalizedCouponCode,
      cartAmount: pricingSummary.cartAmount,
    });

    if (!couponValidation.valid) {
      throw createHttpError(400, couponValidation.message, {
        valid: false,
        discountAmount: couponValidation.pricing.discountAmount,
        finalAmount: couponValidation.pricing.finalAmount,
      });
    }

    pricing = couponValidation.pricing;
    validatedCoupon = couponValidation.coupon;
  }

  if (expectedAmount !== undefined && expectedAmount !== null) {
    const normalizedExpectedAmount = Math.max(0, Math.round(Number(expectedAmount) || 0));

    if (normalizedExpectedAmount !== pricing.finalAmount) {
      throw createHttpError(400, "Payment amount mismatch");
    }
  }

  return {
    event,
    normalizedState,
    pricing,
    pricingSummary,
    requestedSeats,
    validatedCoupon,
  };
};

const finalizeBooking = async ({
  user,
  eventId,
  seats = [],
  couponCode = "",
  bookingMeta = {},
  paymentMethod = "razorpay",
  paymentGateway = "razorpay",
  paymentReference = "",
  paymentCapturedAt = new Date(),
  paymentStatus = "paid",
  orderId = "",
  paymentId = "",
  expectedAmount,
} = {}) => {
  let reservedSeats = [];
  let reservedEventId = null;

  try {
    const { event, pricing, pricingSummary, requestedSeats, validatedCoupon } = await prepareBookingCheckout({
      userId: user?._id?.toString?.() || "",
      eventId,
      seats,
      couponCode,
      expectedAmount,
    });

    const existingBooking = paymentId
      ? await Booking.findOne({ paymentId }).populate("event")
      : orderId
        ? await Booking.findOne({ orderId }).populate("event")
        : null;

    if (existingBooking) {
      const existingEvent = existingBooking.event ? syncEventSeatState(existingBooking.event) : event;
      const existingPricing = buildCheckoutPricing({
        cartAmount: existingBooking.originalAmount || 0,
        discountAmount: existingBooking.discountAmount || 0,
      });

      return buildBookingPayload({
        booking: existingBooking,
        event: existingEvent,
        pricing: existingPricing,
        userId: user?._id,
      });
    }

    const reservedEvent = await Event.findOneAndUpdate(
      {
        _id: event._id,
        isActive: true,
        status: "approved",
        bookedSeats: { $nin: requestedSeats },
      },
      {
        $addToSet: { bookedSeats: { $each: requestedSeats } },
      },
      {
        returnDocument: "after",
      }
    );

    if (!reservedEvent) {
      const latestEvent = await Event.findById(event._id);
      const latestBookedSeats = latestEvent ? syncEventSeatState(latestEvent).bookedSeats : [];
      const conflictingSeats = requestedSeats.filter((seat) => latestBookedSeats.includes(seat));

      throw createHttpError(
        409,
        conflictingSeats.length
          ? "Some selected seats are already booked"
          : "These seats were just booked by someone else. Please choose different seats.",
        {
          seats: conflictingSeats,
        }
      );
    }

    reservedSeats = requestedSeats;
    reservedEventId = reservedEvent._id;
    syncEventSeatState(reservedEvent);
    reservedEvent.availableSeats = Math.max(0, reservedEvent.totalSeats - reservedEvent.bookedSeats.length);
    await reservedEvent.save();

    const booking = await createBookingWithRetry({
      event: reservedEvent._id,
      user: user?._id || null,
      seats: requestedSeats,
      summary: pricingSummary.summary,
      bookingMeta,
      originalAmount: pricing.cartAmount,
      discountAmount: pricing.discountAmount,
      finalAmount: pricing.finalAmount,
      couponId: validatedCoupon?._id || null,
      couponCode: validatedCoupon?.code || "",
      paymentMethod,
      paymentGateway,
      paymentReference: paymentReference || paymentId || orderId || "",
      paymentCapturedAt,
      paymentStatus,
      orderId,
      paymentId,
    });

    const ticketPath = `/ticket/${booking.bookingId}`;
    const ticketUrl = `${process.env.CLIENT_URL?.split(",")[0] || "http://localhost:5173"}${ticketPath}`;
    const qrPayload = ticketUrl;
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
      color: {
        dark: "#1c1c1c",
        light: "#ffffff",
      },
    });

    booking.qrPayload = qrPayload;
    booking.qrCodeDataUrl = qrCodeDataUrl;
    await booking.save();

    if (validatedCoupon?._id) {
      await Coupon.updateOne({ _id: validatedCoupon._id }, { $inc: { usedCount: 1 } });
    }

    releaseSeats({
      eventId: reservedEvent._id.toString(),
      seatIds: requestedSeats,
      userId: user?._id?.toString?.() || "",
      reason: "booked",
      broadcast: false,
    });

    requestedSeats.forEach((seatId) => {
      emitSeatBooked({
        eventId: reservedEvent._id.toString(),
        seatId,
        userId: user?._id?.toString?.() || "",
      });
    });

    return buildBookingPayload({
      booking,
      event: reservedEvent,
      pricing,
      userId: user?._id,
    });
  } catch (error) {
    if (reservedEventId && reservedSeats.length) {
      try {
        await rollbackReservedSeats(reservedEventId, reservedSeats);
      } catch (rollbackError) {
        console.error("booking-seat-rollback-failed", rollbackError);
      }
    }

    throw error;
  }
};

const createBooking = async (_req, res) =>
  res.status(410).json({
    message: "Direct booking is disabled. Complete payment through Razorpay checkout.",
  });

const listUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("event", "title venue city date poster category")
      .lean();

    await Promise.all(
      bookings.map(async (booking) => {
        if (booking.event) {
          await ensureEventPosterState(booking.event);
        }
      })
    );

    return res.status(200).json({
      count: bookings.length,
      bookings: bookings.map((booking) => ({
        ...serializeBooking(booking),
        event: booking.event
          ? {
              id: booking.event._id?.toString?.() || "",
              title: booking.event.title || "",
              venue: booking.event.venue || "",
              city: booking.event.city || "",
              date: booking.event.date || null,
              poster: booking.event.poster || "",
              category: booking.event.category || "",
              contentType: detectBookingContentType(booking.event.category || ""),
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("booking-list-user-failed", error);
    return res.status(500).json({ message: "Unable to load your bookings right now" });
  }
};

const listRecentBookings = async (req, res) => {
  try {
    const userRole = typeof req.user?.getRole === "function" ? req.user.getRole() : String(req.user?.role || "user");
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const bookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("event", "title venue city date")
      .populate("user", "username email phone role")
      .lean();

    return res.status(200).json({
      count: bookings.length,
      bookings: bookings.map((booking) => ({
        ...serializeBooking(booking),
        event: booking.event
          ? {
              id: booking.event._id?.toString?.() || "",
              title: booking.event.title || "",
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
              role: booking.user.role || "user",
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("booking-list-recent-failed", error);
    return res.status(500).json({ message: "Unable to load bookings right now" });
  }
};

const getBookingTicketByBookingId = async (req, res) => {
  try {
    const bookingId = String(req.params.bookingId || "").trim();

    if (!bookingId) {
      return res.status(400).json({ message: "Booking id is required" });
    }

    const booking = await Booking.findOne({ bookingId }).lean();
    if (!booking) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const event = await Event.findById(booking.event);
    if (!event) {
      return res.status(404).json({ message: "Event not found for this ticket" });
    }

    await ensureEventPosterState(event);
    const normalizedEvent = serializeEvent(event.toObject());
    return res.status(200).json({
      booking: serializeBooking(booking),
      event: normalizedEvent,
    });
  } catch (error) {
    console.error("booking-ticket-fetch-failed", error);
    return res.status(500).json({ message: "Unable to fetch ticket right now" });
  }
};

module.exports = {
  createBooking,
  createHttpError,
  detectBookingContentType,
  finalizeBooking,
  getBookingTicketByBookingId,
  listRecentBookings,
  listUserBookings,
  prepareBookingCheckout,
  serializeBooking,
};

