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
const { serializeEvent, syncEventSeatState } = require("./event-controller");

const buildBookingId = () => `TH${Date.now().toString(36).toUpperCase()}${Math.random()
  .toString(36)
  .slice(2, 6)
  .toUpperCase()}`;
const buildPaymentReference = (method = "upi") => `PAY-${String(method || "upi").slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

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

const sanitizePaymentDetails = (paymentMethod, paymentDetails = {}) => {
  const method = String(paymentMethod || "upi").toLowerCase();
  const details = paymentDetails && typeof paymentDetails === "object" ? paymentDetails : {};

  if (method === "card") {
    const cardNumber = String(details.cardNumber || "").replace(/\D/g, "");
    return {
      holderName: String(details.holderName || "").trim(),
      cardNumberLast4: cardNumber.slice(-4),
      expiryMonth: String(details.expiryMonth || "").trim().slice(0, 2),
      expiryYear: String(details.expiryYear || "").trim().slice(0, 4),
    };
  }

  if (method === "upi") {
    return {
      upiId: String(details.upiId || "").trim().toLowerCase(),
    };
  }

  if (method === "netbanking") {
    return {
      bankName: String(details.bankName || "").trim(),
      accountHolder: String(details.accountHolder || "").trim(),
    };
  }

  if (method === "wallet") {
    return {
      walletProvider: String(details.walletProvider || "").trim(),
      walletMobile: String(details.walletMobile || "").replace(/\D/g, "").slice(-10),
    };
  }

  return {};
};

const validatePaymentDetails = (paymentMethod, paymentDetails = {}) => {
  const method = String(paymentMethod || "upi").toLowerCase();

  if (method === "card") {
    if (!paymentDetails.holderName || !paymentDetails.cardNumberLast4 || paymentDetails.cardNumberLast4.length < 4) {
      return "Please enter valid card details";
    }
    return "";
  }

  if (method === "upi") {
    if (!paymentDetails.upiId || !/^[a-z0-9.\-_]{2,}@[a-z]{2,}$/i.test(paymentDetails.upiId)) {
      return "Please enter a valid UPI ID";
    }
    return "";
  }

  if (method === "netbanking") {
    if (!paymentDetails.bankName || !paymentDetails.accountHolder) {
      return "Please enter valid net banking details";
    }
    return "";
  }

  if (method === "wallet") {
    if (!paymentDetails.walletProvider || !paymentDetails.walletMobile || paymentDetails.walletMobile.length < 10) {
      return "Please enter valid wallet details";
    }
    return "";
  }

  return "Unsupported payment method";
};

const createHttpError = (statusCode, message, extra = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
};

const createBooking = async (req, res) => {
  let reservedSeats = [];
  let reservedEventId = null;

  try {
    const requestedSeats = [
      ...new Set(
        (Array.isArray(req.body?.seats) ? req.body.seats : [])
          .map((seat) => String(seat).trim())
          .filter(Boolean)
      ),
    ];
    const couponCode = String(req.body?.couponCode || "").trim().toUpperCase();
    const paymentMethod = String(req.body?.paymentMethod || "upi").trim().toLowerCase() || "upi";
    const paymentDetails = sanitizePaymentDetails(paymentMethod, req.body?.paymentDetails || {});
    const bookingMeta = req.body?.bookingMeta && typeof req.body.bookingMeta === "object" ? req.body.bookingMeta : {};
    const paymentValidationMessage = validatePaymentDetails(paymentMethod, paymentDetails);

    if (paymentValidationMessage) {
      throw createHttpError(400, paymentValidationMessage);
    }

    const event = await Event.findById(req.body.eventId);

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
      userId: req.user._id.toString(),
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

    if (couponCode) {
      const couponValidation = await validateCouponForAmount({
        code: couponCode,
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
        new: true,
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

    const paymentReference = buildPaymentReference(paymentMethod);
    const paymentCapturedAt = new Date();
    const booking = await createBookingWithRetry({
      event: reservedEvent._id,
      user: req.user._id,
      seats: requestedSeats,
      summary: pricingSummary.summary,
      bookingMeta,
      originalAmount: pricing.cartAmount,
      discountAmount: pricing.discountAmount,
      finalAmount: pricing.finalAmount,
      couponId: validatedCoupon?._id || null,
      couponCode: validatedCoupon?.code || "",
      paymentMethod,
      paymentDetails,
      paymentReference,
      paymentCapturedAt,
      paymentStatus: "paid",
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
      userId: req.user._id.toString(),
      reason: "booked",
      broadcast: false,
    });

    requestedSeats.forEach((seatId) => {
      emitSeatBooked({
        eventId: reservedEvent._id.toString(),
        seatId,
        userId: req.user._id.toString(),
      });
    });

    const seatLocks = getSeatLockSnapshot(reservedEvent._id.toString(), req.user._id.toString());

    return res.status(200).json({
      message: "Seats booked successfully",
      bookedSeats: requestedSeats,
      totalSeats: reservedEvent.totalSeats,
      availableSeats: reservedEvent.availableSeats,
      event: serializeEvent(reservedEvent.toObject(), {}, {}, seatLocks),
      booking: {
        id: booking._id.toString(),
        bookingId: booking.bookingId,
        summary: booking.summary,
        bookingMeta: booking.bookingMeta,
        originalAmount: booking.originalAmount,
        discountAmount: booking.discountAmount,
        finalAmount: booking.finalAmount,
        couponId: booking.couponId,
        couponCode: booking.couponCode,
        paymentMethod: booking.paymentMethod,
        paymentDetails: booking.paymentDetails || {},
        paymentReference: booking.paymentReference || "",
        paymentCapturedAt: booking.paymentCapturedAt || null,
        paymentStatus: booking.paymentStatus || "paid",
        qrPayload: booking.qrPayload || "",
        qrCodeDataUrl: booking.qrCodeDataUrl || "",
      },
      pricing,
    });
  } catch (error) {
    console.error("booking-create-failed", error);

    if (reservedEventId && reservedSeats.length) {
      try {
        await rollbackReservedSeats(reservedEventId, reservedSeats);
      } catch (rollbackError) {
        console.error("booking-seat-rollback-failed", rollbackError);
      }
    }

    if (error?.name === "ValidationError") {
      const firstMessage = Object.values(error.errors || {})[0]?.message;
      return res.status(400).json({ message: firstMessage || "Booking validation failed" });
    }

    if (error?.name === "VersionError") {
      return res.status(409).json({ message: "These seats were just booked by someone else. Please choose different seats." });
    }

    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
        seats: error.seats || [],
        invalidSeats: error.invalidSeats || [],
        valid: error.valid,
        discountAmount: error.discountAmount,
        finalAmount: error.finalAmount,
      });
    }

    return res.status(500).json({ message: "Unable to complete booking right now" });
  }
};

module.exports = {
  createBooking,
  listUserBookings: async (req, res) => {
    try {
      const bookings = await Booking.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .populate("event", "title venue city date poster category")
        .lean();

      return res.status(200).json({
        count: bookings.length,
        bookings: bookings.map((booking) => ({
          id: booking._id.toString(),
          bookingId: booking.bookingId,
          seats: booking.seats || [],
          summary: booking.summary || [],
          bookingMeta: booking.bookingMeta || {},
          originalAmount: booking.originalAmount || 0,
          discountAmount: booking.discountAmount || 0,
          finalAmount: booking.finalAmount || 0,
          paymentMethod: booking.paymentMethod || "",
          paymentDetails: booking.paymentDetails || {},
          paymentReference: booking.paymentReference || "",
          paymentCapturedAt: booking.paymentCapturedAt || null,
          paymentStatus: booking.paymentStatus || "paid",
          couponCode: booking.couponCode || "",
          qrPayload: booking.qrPayload || "",
          qrCodeDataUrl: booking.qrCodeDataUrl || "",
          createdAt: booking.createdAt,
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
  },
  listRecentBookings: async (req, res) => {
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
          id: booking._id.toString(),
          bookingId: booking.bookingId,
          bookingCode: booking.bookingCode,
          seats: booking.seats || [],
          summary: booking.summary || [],
          originalAmount: booking.originalAmount || 0,
          discountAmount: booking.discountAmount || 0,
          finalAmount: booking.finalAmount || 0,
          paymentMethod: booking.paymentMethod || "",
          paymentStatus: booking.paymentStatus || "",
          paymentDetails: booking.paymentDetails || {},
          paymentReference: booking.paymentReference || "",
          paymentCapturedAt: booking.paymentCapturedAt || null,
          qrPayload: booking.qrPayload || "",
          qrCodeDataUrl: booking.qrCodeDataUrl || "",
          couponCode: booking.couponCode || "",
          createdAt: booking.createdAt,
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
  },
  getBookingTicketByBookingId: async (req, res) => {
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

      const normalizedEvent = serializeEvent(event.toObject());
      return res.status(200).json({
        booking: {
          id: booking._id.toString(),
          bookingId: booking.bookingId,
          seats: booking.seats || [],
          summary: booking.summary || [],
          bookingMeta: booking.bookingMeta || {},
          originalAmount: booking.originalAmount || 0,
          discountAmount: booking.discountAmount || 0,
          finalAmount: booking.finalAmount || 0,
          couponCode: booking.couponCode || "",
          paymentMethod: booking.paymentMethod || "upi",
          paymentDetails: booking.paymentDetails || {},
          paymentReference: booking.paymentReference || "",
          paymentCapturedAt: booking.paymentCapturedAt || null,
          paymentStatus: booking.paymentStatus || "paid",
          qrPayload: booking.qrPayload || "",
          qrCodeDataUrl: booking.qrCodeDataUrl || "",
          createdAt: booking.createdAt,
        },
        event: normalizedEvent,
      });
    } catch (error) {
      console.error("booking-ticket-fetch-failed", error);
      return res.status(500).json({ message: "Unable to fetch ticket right now" });
    }
  },
};
