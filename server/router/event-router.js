const express = require("express");
const eventController = require("../controllers/event-controller");
const authMiddleware = require("../middlewares/auth-middleware");

const router = express.Router();

router.get("/", eventController.getEvents);
router.get("/:id", eventController.getEventById);
router.post("/:id/book", eventController.bookEvent);
router.post("/:id/rate", authMiddleware, eventController.rateEvent);

module.exports = router;
