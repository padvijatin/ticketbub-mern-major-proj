const jwt = require("jsonwebtoken");
const User = require("../models/user-model");

const resolveTokenFromValue = (value = "") => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.startsWith("Bearer ")) {
    return normalizedValue.replace("Bearer ", "").trim();
  }

  return normalizedValue;
};

const getAuthorizationToken = (source = {}) =>
  resolveTokenFromValue(
    source?.token ||
      source?.authorization ||
      source?.Authorization ||
      source?.headers?.authorization ||
      source?.handshake?.auth?.token ||
      source?.handshake?.headers?.authorization
  );

const resolveUserFromToken = async (tokenValue = "") => {
  const token = resolveTokenFromValue(tokenValue);

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return null;
    }

    if (String(user.status || "active").toLowerCase() !== "active") {
      return null;
    }

    return user;
  } catch (_error) {
    return null;
  }
};

module.exports = {
  getAuthorizationToken,
  resolveUserFromToken,
};
