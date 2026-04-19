const jwt = require("jsonwebtoken");

const normalizeList = (value = "") =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const getClientUrls = (value = process.env.CLIENT_URL || "") => normalizeList(value);

const getPrimaryClientUrl = () => getClientUrls()[0] || "http://localhost:5173";

const isRazorpayTestModeAllowedInProduction = () =>
  String(process.env.ALLOW_RAZORPAY_TEST_MODE_IN_PRODUCTION || "")
    .trim()
    .toLowerCase() === "true";

const getJwtSecretOrThrow = () => {
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (!secret) {
    const error = new Error("JWT secret is not configured");
    error.statusCode = 500;
    throw error;
  }

  return secret;
};

const getTicketAccessTokenTtlSeconds = (eventDate) => {
  const now = Date.now();
  const defaultExpiryMs = 7 * 24 * 60 * 60 * 1000;
  const maxExpiryMs = 30 * 24 * 60 * 60 * 1000;
  const minExpiryMs = 24 * 60 * 60 * 1000;
  const parsedEventDate = eventDate ? new Date(eventDate).getTime() : Number.NaN;

  if (!Number.isNaN(parsedEventDate)) {
    const expiryMs = Math.min(maxExpiryMs, Math.max(minExpiryMs, parsedEventDate + 2 * 24 * 60 * 60 * 1000 - now));
    return Math.max(60, Math.floor(expiryMs / 1000));
  }

  return Math.floor(defaultExpiryMs / 1000);
};

const buildTicketAccessToken = ({ bookingId, eventDate } = {}) => {
  const normalizedBookingId = String(bookingId || "").trim();

  if (!normalizedBookingId) {
    return "";
  }

  return jwt.sign(
    {
      purpose: "ticket-access",
      bookingId: normalizedBookingId,
    },
    getJwtSecretOrThrow(),
    {
      expiresIn: getTicketAccessTokenTtlSeconds(eventDate),
    }
  );
};

const verifyTicketAccessToken = ({ token, bookingId } = {}) => {
  try {
    const decoded = jwt.verify(String(token || "").trim(), getJwtSecretOrThrow());
    return decoded?.purpose === "ticket-access" && String(decoded.bookingId || "").trim() === String(bookingId || "").trim();
  } catch (_error) {
    return false;
  }
};

const looksLikePlaceholder = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || /(replace_|your_|changeme|example|placeholder)/i.test(normalized);
};

const validateRuntimeConfig = () => {
  const errors = [];
  const warnings = [];
  const nodeEnv = String(process.env.NODE_ENV || "development").trim().toLowerCase();
  const jwtSecret = String(process.env.JWT_SECRET || "").trim();
  const clientUrls = getClientUrls();
  const cloudinaryValues = [
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ].map((value) => String(value || "").trim());
  const razorpayKeyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const razorpayKeySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!String(process.env.MONGODB_URI || "").trim()) {
    errors.push("MONGODB_URI is missing.");
  }

  if (!jwtSecret) {
    errors.push("JWT_SECRET is missing.");
  } else {
    if (looksLikePlaceholder(jwtSecret)) {
      errors.push("JWT_SECRET still looks like a placeholder value.");
    }
    if (jwtSecret.length < 32) {
      warnings.push("JWT_SECRET should be at least 32 characters long.");
    }
  }

  if (nodeEnv === "production") {
    if (!clientUrls.length) {
      errors.push("CLIENT_URL is required in production.");
    }

    if (clientUrls.some((url) => /localhost|127\.0\.0\.1/i.test(url))) {
      errors.push("CLIENT_URL must not use localhost in production.");
    }
  }

  if (cloudinaryValues.some(Boolean) && !cloudinaryValues.every(Boolean)) {
    errors.push("Cloudinary config is incomplete. Set all CLOUDINARY_* variables together.");
  }

  if ((razorpayKeyId || razorpayKeySecret) && !(razorpayKeyId && razorpayKeySecret)) {
    errors.push("Razorpay config is incomplete. Set both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  if (razorpayKeyId) {
    if (nodeEnv === "production" && /^rzp_test_/i.test(razorpayKeyId)) {
      if (!isRazorpayTestModeAllowedInProduction()) {
        errors.push(
          "Production is configured with Razorpay test keys. Set ALLOW_RAZORPAY_TEST_MODE_IN_PRODUCTION=true only if this is an intentional temporary test deployment."
        );
      } else {
        warnings.push("Production is using Razorpay test keys because ALLOW_RAZORPAY_TEST_MODE_IN_PRODUCTION=true.");
      }
    }

    if (nodeEnv !== "production" && /^rzp_live_/i.test(razorpayKeyId)) {
      warnings.push("Non-production environment appears to be using Razorpay live keys.");
    }
  }

  return { errors, warnings };
};

module.exports = {
  buildTicketAccessToken,
  getClientUrls,
  getJwtSecretOrThrow,
  getPrimaryClientUrl,
  isRazorpayTestModeAllowedInProduction,
  validateRuntimeConfig,
  verifyTicketAccessToken,
};
