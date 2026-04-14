const jwt = require("jsonwebtoken");
const arctic = require("arctic");
const User = require("../models/user-model");
const TokenBlocklist = require("../models/token-blocklist-model");

const googleClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const googleClientSecret = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
const googleRedirectUrl = String(process.env.GOOGLE_REDIRECT_URL || "").trim();
const googleOAuth = googleClientId && googleClientSecret && googleRedirectUrl
  ? new arctic.Google(googleClientId, googleClientSecret, googleRedirectUrl)
  : null;

const normalizeRole = (value = "") => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  if (["user", "organizer", "admin"].includes(normalizedValue)) {
    return normalizedValue;
  }

  return "user";
};

const normalizeStatus = (value = "") => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  if (["active", "blocked"].includes(normalizedValue)) {
    return normalizedValue;
  }

  return "active";
};

const ensureAuthProviders = (user = {}) => {
  const providers = Array.isArray(user.authProviders) ? user.authProviders : [];
  return [...new Set(providers.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean))];
};

const serializeUser = (user) => {
  const role = typeof user.getRole === "function" ? user.getRole() : normalizeRole(user.role);
  const status = typeof user.getStatus === "function" ? user.getStatus() : normalizeStatus(user.status);
  const authProviders = ensureAuthProviders(user);

  return {
    id: user._id?.toString?.() || "",
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar || "",
    authProviders,
    role,
    status,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
};

const getPrimaryClientUrl = () => {
  const clientUrl = String(process.env.CLIENT_URL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return clientUrl[0] || "http://localhost:5173";
};

const redirectWithOAuthError = (res, clientUrl, message) => {
  const safeMessage = String(message || "Google login failed");
  res.setHeader("Cache-Control", "no-store");
  return res.redirect(`${clientUrl}/#oauth_error=${encodeURIComponent(safeMessage)}`);
};

const getCookie = (req, name) => {
  const cookieHeader = String(req.headers.cookie || "");
  if (!cookieHeader) return "";
  const parts = cookieHeader.split(";").map((value) => value.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
};

const setCookie = (res, name, value, options = {}) => {
  const {
    maxAge,
    httpOnly = true,
    secure = process.env.NODE_ENV === "production",
    sameSite = "Lax",
    path = "/",
  } = options;

  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (typeof maxAge === "number") parts.push(`Max-Age=${Math.floor(maxAge / 1000)}`);

  const existing = res.getHeader("Set-Cookie");
  const next = existing ? (Array.isArray(existing) ? existing.concat(parts.join("; ")) : [existing, parts.join("; ")]) : parts.join("; ");
  res.setHeader("Set-Cookie", next);
};

const register = async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const userCreated = await User.create({
      username,
      email,
      phone,
      password,
      authProviders: ["local"],
      role: "user",
      status: "active",
    });

    return res.status(201).json({
      message: "Registration successful",
      token: userCreated.generateToken(),
      userId: userCreated._id.toString(),
      user: serializeUser(userCreated),
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userExist = await User.findOne({ email });

    if (!userExist) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (normalizeStatus(userExist.status) !== "active") {
      return res.status(403).json({ message: "Your account is blocked. Please contact support." });
    }

    if (!userExist.password) {
      return res.status(400).json({ message: "This account uses Google sign-in. Please continue with Google." });
    }

    const isPasswordValid = await userExist.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    return res.status(200).json({
      message: "Login successful",
      token: userExist.generateToken(),
      userId: userExist._id.toString(),
      user: serializeUser(userExist),
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
};

const googleRedirect = async (_req, res) => {
  if (!googleOAuth) {
    return res.status(500).json({ message: "Google login is not configured on the server." });
  }

  const state = arctic.generateState();
  const codeVerifier = arctic.generateCodeVerifier();
  const url = googleOAuth.createAuthorizationURL(state, codeVerifier, ["openid", "email", "profile"]);

  setCookie(res, "oauth_state", state, { maxAge: 10 * 60 * 1000 });
  setCookie(res, "oauth_code_verifier", codeVerifier, { maxAge: 10 * 60 * 1000 });

  return res.redirect(url.toString());
};

const googleCallback = async (req, res) => {
  if (!googleOAuth) {
    return redirectWithOAuthError(res, getPrimaryClientUrl(), "Google login is not configured on the server.");
  }

  const { code, state } = req.query || {};
  const storedState = getCookie(req, "oauth_state");
  const codeVerifier = getCookie(req, "oauth_code_verifier");

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    return redirectWithOAuthError(res, getPrimaryClientUrl(), "Invalid Google login request.");
  }

  try {
    const tokens = await googleOAuth.validateAuthorizationCode(String(code), codeVerifier);
    const accessToken = tokens.accessToken();

    const userinfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userinfoResponse.ok) {
      return redirectWithOAuthError(res, getPrimaryClientUrl(), "Unable to fetch Google profile.");
    }

    const userinfo = await userinfoResponse.json();
    const googleId = String(userinfo.sub || "").trim();
    const email = String(userinfo.email || "").trim().toLowerCase();
    const emailVerified = Boolean(userinfo.email_verified);
    const username = String(userinfo.name || email.split("@")[0] || "TicketHub User").trim();
    const avatar = String(userinfo.picture || "").trim();

    if (!googleId || !email || !emailVerified) {
      return redirectWithOAuthError(res, getPrimaryClientUrl(), "Google account could not be verified.");
    }

    let userExist = await User.findOne({
      $or: [{ email }, { googleId }],
    });

    if (userExist && normalizeStatus(userExist.status) !== "active") {
      return redirectWithOAuthError(res, getPrimaryClientUrl(), "Your account is blocked. Please contact support.");
    }

    if (!userExist) {
      userExist = await User.create({
        username,
        email,
        phone: "",
        password: null,
        googleId,
        avatar,
        authProviders: ["google"],
        role: "user",
        status: "active",
      });
    } else {
      const nextProviders = ensureAuthProviders(userExist);
      if (!nextProviders.includes("google")) {
        nextProviders.push("google");
      }

      userExist.googleId = userExist.googleId || googleId;
      userExist.avatar = avatar || userExist.avatar || "";
      userExist.username = userExist.username || username;
      userExist.authProviders = nextProviders.length ? nextProviders : ["google"];
      await userExist.save();
    }

    const token = userExist.generateToken();
    const clientUrl = getPrimaryClientUrl();

    setCookie(res, "oauth_state", "", { maxAge: 0 });
    setCookie(res, "oauth_code_verifier", "", { maxAge: 0 });

    res.setHeader("Cache-Control", "no-store");
    setCookie(res, "oauth_state", "", { maxAge: 0 });
    setCookie(res, "oauth_code_verifier", "", { maxAge: 0 });
    return res.redirect(`${clientUrl}/#oauth_token=${encodeURIComponent(token)}&oauth_success=${encodeURIComponent("Google login successful")}`);
  } catch (error) {
    console.error("google-oauth-callback-failed", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
    return redirectWithOAuthError(res, getPrimaryClientUrl(), "Google login failed.");
  }
};

const user = async (req, res) => {
  return res.status(200).json({ user: serializeUser(req.user) });
};

const logout = async (req, res) => {
  const token = String(req.token || "").trim();

  if (token) {
    try {
      const decoded = jwt.decode(token) || {};
      const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await TokenBlocklist.updateOne(
        { token },
        {
          $set: {
            token,
            expiresAt,
            reason: "logout",
          },
        },
        { upsert: true }
      );
    } catch (error) {
      console.error("logout-token-blocklist-failed", error);
    }
  }

  return res.status(200).json({ message: "Logout successful" });
};

module.exports = {
  register,
  login,
  googleRedirect,
  googleCallback,
  user,
  logout,
  serializeUser,
  normalizeRole,
  normalizeStatus,
};
