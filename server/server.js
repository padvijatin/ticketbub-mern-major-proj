const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const connectDb = require("./utils/db");
const authRoute = require("./router/auth-router");
const bookingRoute = require("./router/booking-router");
const couponRoute = require("./router/coupon-router");
const eventRoute = require("./router/event-router");
const wishlistRoute = require("./router/wishlist-router");
const adminRoute = require("./router/admin-router");
const contactRoute = require("./router/contact-router");
const paymentRoute = require("./router/payment-router");
const { registerSeatSocketServer } = require("./services/socket-server");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  ...configuredOrigins,
]);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const isLocalhostOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

      if (allowedOrigins.has(origin) || isLocalhostOrigin) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoute);
app.use("/api/bookings", bookingRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/coupons", couponRoute);
app.use("/api/events", eventRoute);
app.use("/api/wishlist", wishlistRoute);
app.use("/api/admin", adminRoute);
app.use("/api/contact", contactRoute);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "TicketHub server is running",
  });
});

app.use((error, _req, res, next) => {
  if (!error) {
    next();
    return;
  }

  if (error?.message === "Only image uploads are allowed" || error?.message === "Only jpg, jpeg, and png image uploads are allowed") {
    res.status(400).json({ message: error.message });
    return;
  }

  if (error?.name === "MulterError") {
    res.status(400).json({ message: error.message || "Unable to upload image right now" });
    return;
  }

  if (error?.http_code || (error?.message && /cloudinary|upload/i.test(error.message))) {
    res.status(400).json({ message: error.message || "Unable to upload image right now" });
    return;
  }

  next(error);
});

const startServer = async () => {
  await connectDb();
  const io = registerSeatSocketServer({
    server,
    allowedOrigins: [...allowedOrigins],
  });
  app.locals.io = io;

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
