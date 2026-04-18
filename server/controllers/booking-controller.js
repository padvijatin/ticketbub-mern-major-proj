const Event = require("../models/event-model");
const Booking = require("../models/booking-model");
const Coupon = require("../models/coupon-model");
const Payment = require("../models/payment-model");
const AuditLog = require("../models/audit-log-model");
const QRCode = require("qrcode");
const puppeteer = require("puppeteer");
const os = require("os");
const path = require("path");
const fs = require("fs/promises");
const { resolveAuthContext } = require("../middlewares/auth-middleware");
const { validateCouponForAmount } = require("../services/coupon-service");
const { buildCheckoutPricing } = require("../services/pricing-service");
const { getTransporter } = require("../utils/mailer");
const { cloudinary, normalizeCloudinaryAssetUrl } = require("../config/cloudinary");
const { buildTicketAccessToken, getPrimaryClientUrl, verifyTicketAccessToken } = require("../utils/runtime-config");
const { incrementUserInterestSignals } = require("../services/recommendation-service");
const {
  assertSeatsLockedByUser,
  emitSeatBooked,
  getSeatLockSnapshot,
  releaseSeats,
} = require("../services/seat-lock-service");
const { buildZoneSeatIds } = require("../utils/seat-layout");
const { serializeEvent, syncEventSeatState, syncEventPosterState } = require("./event-controller");

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

const escapeHtml = (value = "") =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const withRetry = async (operation, { attempts = 3, delayMs = 350, shouldRetry } = {}) => {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts && (typeof shouldRetry === "function" ? shouldRetry(error) : true);
      if (!canRetry) {
        break;
      }
      await wait(delayMs * attempt);
    }
  }

  throw lastError;
};

const buildTicketAccessUrl = (booking = {}) => {
  const token = buildTicketAccessToken({
    bookingId: booking.bookingId,
    eventDate: booking.event?.date || booking.createdAt || null,
  });

  if (!token) {
    return `${getPrimaryClientUrl().replace(/\/$/, "")}/ticket/${booking.bookingId}`;
  }

  return `${getPrimaryClientUrl().replace(/\/$/, "")}/ticket/${booking.bookingId}?access=${encodeURIComponent(token)}`;
};

const generateTicketImageWithPuppeteer = async ({ booking }) => {
  const filePath = path.join(os.tmpdir(), `ticket-${booking.bookingId}-${Date.now()}.png`);
  const liveTicketUrl = String(booking.qrPayload || "").trim() || buildTicketAccessUrl(booking);
  const eventDate = booking.event?.date
    ? new Date(booking.event.date).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "TBA";
  const seatText = (booking.seats || []).join(", ") || "General";
  const sectionText = (booking.summary || []).map((item) => item.label).join(", ") || "Standard";
  const poster = String(booking.event?.poster || "").trim();
  const qrCodeDataUrl = booking.qrCodeDataUrl || "";
  const title = escapeHtml(booking.event?.title || "TicketHub Event");
  const category = escapeHtml(booking.event?.category || "Event");
  const venue = escapeHtml([booking.event?.venue, booking.event?.city].filter(Boolean).join(", ") || "Venue TBA");
  const paidAmount = Number(booking.finalAmount || 0);

  const html = `
    <html><head><meta charset="UTF-8" />
    <style>
      body{margin:0;font-family:Arial,sans-serif;background:#f3f4f6}
      .card{width:920px;min-height:1120px;background:#fff;border:1px solid #e5e7eb;border-radius:26px;overflow:hidden}
      .top{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #ececec}
      .brand{font-size:40px;font-weight:800;color:#f43f5e}.admit{font-size:17px;font-weight:700;color:#6b7280;border:1px solid #e5e7eb;border-radius:999px;padding:8px 14px}
      .hero{position:relative;height:280px;background:#111827}.hero img{width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.75))}
      .heroText{position:absolute;left:24px;bottom:20px;color:#fff}.title{font-size:46px;font-weight:800;margin:0}.cat{font-size:28px;margin-top:8px;color:rgba(255,255,255,.9)}
      .content{padding:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 28px}.label{color:#6b7280;font-size:26px}.value{color:#111827;font-weight:700;font-size:34px;line-height:1.25}
      .block{margin-top:20px;border-radius:20px;background:#f7f7f8;padding:16px;border:1px solid #ededed}.row{display:flex;justify-content:space-between;font-size:28px;color:#374151;margin-top:6px}.row strong{color:#111827}
      .divider{margin:20px 0;border-top:2px dashed #e5e7eb}.qrWrap{display:flex;flex-direction:column;align-items:center}
      .qr{width:208px;height:208px;border:1px solid #e5e7eb;border-radius:18px;padding:14px;background:#fff;object-fit:contain}.scan{font-size:26px;color:#6b7280;margin-top:12px}
      .total{display:flex;justify-content:space-between;align-items:flex-end}.tLabel{font-size:34px;color:#6b7280}.tVal{font-size:56px;font-weight:800;color:#111827}
    </style></head>
    <body><div class="card">
      <div class="top"><div class="brand">TicketHub</div><div class="admit">ADMIT ONE</div></div>
      <div class="hero">${poster ? `<img src="${escapeHtml(poster)}" alt="${title}" />` : ""}<div class="shade"></div><div class="heroText"><h1 class="title">${title}</h1><div class="cat">${category}</div></div></div>
      <div class="content">
        <div class="grid">
          <div><div class="label">Date</div><div class="value">${escapeHtml(eventDate)}</div></div>
          <div><div class="label">Venue</div><div class="value">${venue}</div></div>
          <div><div class="label">Tickets</div><div class="value">${escapeHtml(seatText)}</div></div>
          <div><div class="label">Sections</div><div class="value">${escapeHtml(sectionText)}</div></div>
          <div><div class="label">Payment Method</div><div class="value">${escapeHtml(String(booking.paymentMethod || "razorpay").toUpperCase())}</div></div>
          <div><div class="label">Payment Ref</div><div class="value">${escapeHtml(booking.paymentId || booking.paymentReference || "Captured")}</div></div>
        </div>
        <div class="block"><div class="row"><span>Booking ID</span><strong>${escapeHtml(booking.bookingId)}</strong></div></div>
        <div class="divider"></div>
        <div class="qrWrap">${qrCodeDataUrl ? `<img class="qr" src="${qrCodeDataUrl}" alt="QR" />` : '<div class="qr"></div>'}<div class="scan">Scan opens your live ticket at entry.</div></div>
        <div class="divider"></div>
        <div class="total"><div class="tLabel">Total Paid</div><div class="tVal">Rs ${paidAmount.toLocaleString("en-IN")}</div></div>
      </div>
    </div></body></html>
  `;

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 2200, deviceScaleFactor: 1.5 });

    let capturedFromLivePage = false;
    try {
      await page.goto(liveTicketUrl, { waitUntil: "networkidle2", timeout: 25000 });
      await page.waitForSelector("article", { timeout: 12000 });
      const articleElement = await page.$("article");

      if (articleElement) {
        await articleElement.screenshot({
          path: filePath,
          type: "png",
        });
        capturedFromLivePage = true;
      }
    } catch {
      capturedFromLivePage = false;
    }

    if (!capturedFromLivePage) {
      await page.setViewport({ width: 920, height: 1120, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.screenshot({ path: filePath, type: "png" });
    }
  } finally {
    await browser.close();
  }

  const imageBuffer = await fs.readFile(filePath);
  return { filePath, imageBuffer, mimeType: "image/png" };
};

const uploadTicketToCloudinary = async ({ filePath, bookingId }) => {
  const result = await withRetry(
    () =>
      cloudinary.uploader.upload(filePath, {
        folder: "tickethub/tickets",
        resource_type: "image",
        public_id: `ticket-${bookingId}-${Date.now()}`,
        overwrite: true,
      }),
    {
      shouldRetry: (error) => {
        const statusCode = Number(error?.http_code || error?.status || 0);
        return !statusCode || statusCode >= 500;
      },
    }
  );

  return String(result?.secure_url || result?.url || "").trim();
};

const cleanupCloudinaryTicket = async (ticketUrl = "") => {
  const marker = "/upload/";
  const markerIndex = ticketUrl.indexOf(marker);
  if (!ticketUrl || markerIndex < 0) return;

  try {
    const afterUpload = ticketUrl.slice(markerIndex + marker.length).split("?")[0];
    const segments = afterUpload.split("/").filter(Boolean);
    const withoutVersion = /^v\d+$/.test(segments[0]) ? segments.slice(1) : segments;
    const lastSegment = withoutVersion[withoutVersion.length - 1] || "";
    const publicId = [...withoutVersion.slice(0, -1), lastSegment.replace(/\.[a-z0-9]+$/i, "")].join("/");
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: "image" });
  } catch (error) {
    console.error("booking-ticket-cloudinary-cleanup-failed", error);
  }
};

const sendTicketEmail = async ({ transporter, mailOptions }) =>
  withRetry(
    async () => {
      await transporter.sendMail(mailOptions);
      return true;
    },
    {
      shouldRetry: (error) => ["ETIMEDOUT", "ESOCKET", "ECONNECTION", "EAI_AGAIN"].includes(String(error?.code || "")),
    }
  );

const fetchImageBufferFromUrl = async (url = "") => {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl) {
    return null;
  }

  const response = await fetch(normalizedUrl);
  if (!response.ok) {
    throw new Error(`Unable to download ticket image from Cloudinary (${response.status})`);
  }

  const contentType = String(response.headers.get("content-type") || "image/png");
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
};

const buildTicketMailOptions = ({ booking, recipientEmail, fromEmail, ticketUrl, imageBuffer, mimeType }) => ({
  from: fromEmail,
  to: recipientEmail,
  subject: `Your TicketHub ticket ${booking.bookingId}`,
  text: [
    `Hi ${booking.user?.username || "there"},`,
    "",
    `Your ticket is ready for ${booking.event?.title || "your event"}.`,
    `Booking ID: ${booking.bookingId}`,
    booking.event?.venue || booking.event?.city ? `Venue: ${[booking.event?.venue, booking.event?.city].filter(Boolean).join(", ")}` : "",
    booking.event?.date ? `Date: ${new Date(booking.event.date).toLocaleString("en-IN")}` : "",
    `Download ticket: ${ticketUrl}`,
    booking.qrPayload ? `Live ticket: ${booking.qrPayload}` : "",
  ].filter(Boolean).join("\n"),
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <h2 style="margin-bottom:12px;">Your TicketHub ticket is ready</h2>
      <p>Hi ${booking.user?.username || "there"},</p>
      <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
      ${booking.event?.title ? `<p><strong>Event:</strong> ${booking.event.title}</p>` : ""}
      ${booking.event?.venue || booking.event?.city ? `<p><strong>Venue:</strong> ${[booking.event?.venue, booking.event?.city].filter(Boolean).join(", ")}</p>` : ""}
      ${booking.event?.date ? `<p><strong>Date:</strong> ${new Date(booking.event.date).toLocaleString("en-IN")}</p>` : ""}
      <p style="margin:16px 0;">
        <a href="${ticketUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Download Ticket</a>
      </p>
      ${booking.qrPayload ? `<p><a href="${booking.qrPayload}">Open your live ticket</a></p>` : ""}
      <p>Your professionally formatted ticket is attached to this email.</p>
    </div>
  `,
  attachments: [{ filename: `TicketHub-${booking.bookingId}.png`, content: imageBuffer, contentType: mimeType }],
});

const logTicketEmailFailure = async ({ bookingId, error, userId } = {}) => {
  if (!bookingId) {
    return;
  }

  try {
    await AuditLog.create({
      action: "ticket_email_failed",
      entity: "booking",
      entityId: String(bookingId),
      actorId: String(userId || ""),
      actorRole: "",
      metadata: {
        message: String(error?.message || "Unknown error"),
        code: String(error?.code || ""),
      },
    });
  } catch (logError) {
    console.error("ticket-email-failure-log-failed", logError);
  }
};

const deliverBookingTicketByBookingId = async ({ bookingId, requestedBy = null } = {}) => {
  let tempFilePath = "";
  let uploadedTicketUrl = "";
  let createdTicketImage = false;
  const normalizedBookingId = String(bookingId || "").trim();
  if (!normalizedBookingId) {
    throw createHttpError(400, "Booking id is required");
  }

  try {
    const booking = await Booking.findOne({ bookingId: normalizedBookingId })
      .populate("event", "title venue city date poster category")
      .populate("user", "username email")
      .exec();
    if (!booking) {
      throw createHttpError(404, "Booking not found");
    }

    if (requestedBy) {
      const userRole = typeof requestedBy.getRole === "function" ? requestedBy.getRole() : String(requestedBy.role || "user");
      const isOwner = booking.user?._id?.toString?.() === requestedBy?._id?.toString?.();
      if (!isOwner && userRole !== "admin") {
        throw createHttpError(403, "You cannot deliver this ticket");
      }
    }

    if (booking.ticketEmailStatus === "sent" && booking.ticketEmailSentAt && booking.ticketImageUrl) {
      return { message: "Ticket already emailed", alreadyDelivered: true, booking: serializeBooking(booking) };
    }

    const nextQrPayload = String(booking.qrPayload || "").trim();
    if (!nextQrPayload || !/[?&]access=/.test(nextQrPayload)) {
      booking.qrPayload = buildTicketAccessUrl(booking);
      booking.qrCodeDataUrl = await QRCode.toDataURL(booking.qrPayload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 360,
        color: {
          dark: "#1c1c1c",
          light: "#ffffff",
        },
      });
      await booking.save();
    }

    const recipientEmail = booking.user?.email || requestedBy?.email;
    if (!recipientEmail) {
      throw createHttpError(400, "Ticket recipient email is missing");
    }

    let imageBuffer;
    let mimeType;
    const existingTicketUrl = String(booking.ticketImageUrl || "").trim();

    if (existingTicketUrl) {
      const cloudinaryImage = await fetchImageBufferFromUrl(existingTicketUrl);
      imageBuffer = cloudinaryImage?.buffer;
      mimeType = cloudinaryImage?.contentType || "image/png";
      uploadedTicketUrl = existingTicketUrl;
    } else {
      const generatedTicket = await generateTicketImageWithPuppeteer({ booking });
      tempFilePath = generatedTicket.filePath;
      imageBuffer = generatedTicket.imageBuffer;
      mimeType = generatedTicket.mimeType;

      uploadedTicketUrl = await uploadTicketToCloudinary({
        filePath: generatedTicket.filePath,
        bookingId: booking.bookingId,
      });
      if (!uploadedTicketUrl) {
        throw createHttpError(500, "Unable to store ticket image");
      }
      createdTicketImage = true;
    }

    const transporter = getTransporter();
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!fromEmail) {
      throw createHttpError(500, "Ticket email sender is not configured");
    }

    const mailOptions = buildTicketMailOptions({
      booking,
      recipientEmail,
      fromEmail,
      ticketUrl: uploadedTicketUrl,
      imageBuffer,
      mimeType,
    });

    await sendTicketEmail({ transporter, mailOptions });

    booking.ticketImageUrl = uploadedTicketUrl;
    booking.ticketEmailStatus = "sent";
    booking.ticketEmailSentAt = new Date();
    await booking.save();

    return { message: "Ticket emailed successfully", alreadyDelivered: false, booking: serializeBooking(booking) };
  } catch (error) {
    await logTicketEmailFailure({
      bookingId: normalizedBookingId,
      error,
      userId: requestedBy?._id,
    });
    if (createdTicketImage && uploadedTicketUrl) {
      await cleanupCloudinaryTicket(uploadedTicketUrl);
    }
    if (normalizedBookingId) {
      await Booking.updateOne({ bookingId: normalizedBookingId }, { $set: { ticketEmailStatus: "failed" } });
    }
    throw error;
  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.error("booking-ticket-temp-cleanup-failed", cleanupError);
      }
    }
  }
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
  ticketImageUrl: booking.ticketImageUrl || "",
  ticketEmailStatus: booking.ticketEmailStatus || "pending",
  ticketEmailSentAt: booking.ticketEmailSentAt || null,
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

    const qrPayload = buildTicketAccessUrl({
      ...booking.toObject(),
      event: reservedEvent,
    });
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
    await Event.updateOne(
      { _id: reservedEvent._id },
      {
        $inc: { bookingCount: 1 },
      }
    );

    await incrementUserInterestSignals({
      userId: user?._id,
      category: reservedEvent.category,
      city: reservedEvent.city,
      contentType: detectBookingContentType(reservedEvent.category),
      weight: 3,
    });

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

const syncUserBookingsFromPayments = async (userId) => {
  if (!userId) {
    return;
  }

  const paymentRecords = await Payment.find({ user: userId })
    .select("booking paymentId orderId")
    .lean();

  if (!paymentRecords.length) {
    return;
  }

  const bookingIds = [...new Set(paymentRecords.map((payment) => payment.booking?.toString?.()).filter(Boolean))];
  const paymentIds = [...new Set(paymentRecords.map((payment) => String(payment.paymentId || "").trim()).filter(Boolean))];
  const orderIds = [...new Set(paymentRecords.map((payment) => String(payment.orderId || "").trim()).filter(Boolean))];

  if (bookingIds.length) {
    await Booking.updateMany(
      {
        _id: { $in: bookingIds },
        $or: [{ user: null }, { user: { $exists: false } }],
      },
      { $set: { user: userId } }
    );
  }

  const referenceFilters = [];

  if (paymentIds.length) {
    referenceFilters.push({ paymentId: { $in: paymentIds } });
  }

  if (orderIds.length) {
    referenceFilters.push({ orderId: { $in: orderIds } });
  }

  if (referenceFilters.length) {
    await Booking.updateMany(
      {
        $and: [
          { $or: referenceFilters },
          { $or: [{ user: null }, { user: { $exists: false } }] },
        ],
      },
      { $set: { user: userId } }
    );
  }

  if (!referenceFilters.length) {
    return;
  }

  const linkedBookings = await Booking.find({
    user: userId,
    $or: referenceFilters,
  })
    .select("_id paymentId orderId")
    .lean();

  if (!linkedBookings.length) {
    return;
  }

  const bookingIdByReference = linkedBookings.reduce((accumulator, booking) => {
    const paymentId = String(booking.paymentId || "").trim();
    const orderId = String(booking.orderId || "").trim();

    if (paymentId) {
      accumulator[`payment:${paymentId}`] = booking._id;
    }

    if (orderId) {
      accumulator[`order:${orderId}`] = booking._id;
    }

    return accumulator;
  }, {});

  await Promise.all(
    paymentRecords.map(async (payment) => {
      if (payment.booking) {
        return;
      }

      const paymentId = String(payment.paymentId || "").trim();
      const orderId = String(payment.orderId || "").trim();
      const linkedBookingId = (paymentId && bookingIdByReference[`payment:${paymentId}`]) || (orderId && bookingIdByReference[`order:${orderId}`]);

      if (!linkedBookingId) {
        return;
      }

      await Payment.updateOne({ _id: payment._id, booking: null }, { $set: { booking: linkedBookingId } });
    })
  );
};

const listUserBookings = async (req, res) => {
  try {
    await syncUserBookingsFromPayments(req.user?._id);

    const bookings = await Booking.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("event", "title venue city date poster category")
      .lean();

    await Promise.all(
      bookings.map(async (booking) => {
        if (booking.event) {
          await syncEventPosterState(booking.event);
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
              poster: normalizeCloudinaryAssetUrl(booking.event.poster || ""),
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

const deliverBookingTicket = async (req, res) => {
  try {
    const result = await deliverBookingTicketByBookingId({
      bookingId: req.params.bookingId,
      requestedBy: req.user || null,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("booking-ticket-delivery-failed", error);

    return res.status(error.statusCode || 500).json({
      message:
        error.message === "Mail server is not configured"
          ? "Ticket email server is not configured"
          : error.message || "Unable to email ticket right now",
    });
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

    let authContext = null;
    try {
      authContext = await resolveAuthContext(req);
    } catch (error) {
      if (req.header("Authorization")) {
        return res.status(error.statusCode || 401).json({ message: error.message || "Invalid or expired token" });
      }
    }

    const ticketAccessToken = String(req.query.access || "").trim();
    const hasTicketTokenAccess = ticketAccessToken
      ? verifyTicketAccessToken({ token: ticketAccessToken, bookingId })
      : false;
    const requestUserRole = typeof authContext?.user?.getRole === "function"
      ? authContext.user.getRole()
      : String(authContext?.user?.role || "user");
    const isOwner = booking.user?.toString?.() === authContext?.user?._id?.toString?.();
    const hasPrivilegedAccess = Boolean(authContext?.user) && (isOwner || requestUserRole === "admin");

    if (!hasPrivilegedAccess && !hasTicketTokenAccess) {
      return res.status(authContext?.user ? 403 : 401).json({
        message: authContext?.user ? "You cannot access this ticket" : "Please login or use a valid ticket link",
      });
    }

    const event = await Event.findById(booking.event);
    if (!event) {
      return res.status(404).json({ message: "Event not found for this ticket" });
    }

    await syncEventPosterState(event);
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
  deliverBookingTicket,
  deliverBookingTicketByBookingId,
  finalizeBooking,
  getBookingTicketByBookingId,
  listRecentBookings,
  listUserBookings,
  prepareBookingCheckout,
  serializeBooking,
};
