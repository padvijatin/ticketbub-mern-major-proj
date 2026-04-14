const express = require("express");
const authController = require("../controllers/auth-controller");
const validate = require("../middlewares/validate-middleware");
const authMiddleware = require("../middlewares/auth-middleware");
const { buildRateLimiter } = require("../middlewares/rate-limit");
const { registerSchema, loginSchema } = require("../validators/auth-validator");

const router = express.Router();
const authLimiter = buildRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts. Please try again later.",
});

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.get("/google", authLimiter, authController.googleRedirect);
router.get("/google/callback", authLimiter, authController.googleCallback);
router.get("/user", authMiddleware, authController.user);
router.post("/logout", authMiddleware, authController.logout);

module.exports = router;
