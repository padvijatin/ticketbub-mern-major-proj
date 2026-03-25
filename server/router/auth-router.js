const express = require("express");
const authController = require("../controllers/auth-controller");
const validate = require("../middlewares/validate-middleware");
const authMiddleware = require("../middlewares/auth-middleware");
const { registerSchema, loginSchema } = require("../validators/auth-validator");

const router = express.Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/user", authMiddleware, authController.user);
router.post("/logout", authMiddleware, authController.logout);

module.exports = router;
