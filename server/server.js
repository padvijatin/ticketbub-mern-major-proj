const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDb = require("./utils/db");
const authRoute = require("./router/auth-router");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
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
app.use("/api/auth", authRoute);


app.get("/", (req, res) => {
  res.status(200).json({
    message: "TicketHub server is running",
  });
});

const startServer = async () => {
  await connectDb();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
