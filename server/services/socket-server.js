const { Server } = require("socket.io");
const bookingController = require("../controllers/booking-controller");
const {
  LOCK_TTL_MS,
  attachSocketServer,
  getSeatLockSnapshot,
  lockSeat,
  releaseSeat,
  releaseSocketLocks,
} = require("./seat-lock-service");
const { getAuthorizationToken, resolveUserFromToken } = require("./socket-auth");

const callController = async (controller, { body = {}, user, token = "" }) =>
  new Promise((resolve) => {
    const req = {
      body,
      user,
      token,
      header(name) {
        if (String(name).toLowerCase() === "authorization") {
          return token ? `Bearer ${token}` : "";
        }

        return "";
      },
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({
          statusCode: this.statusCode,
          payload,
        });
      },
    };

    controller(req, res);
  });

const registerSeatSocketServer = ({ server, allowedOrigins = [] }) => {
  const io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }

        const isLocalhostOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

        if (allowedOrigins.includes(origin) || isLocalhostOrigin) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = getAuthorizationToken({
      token: socket.handshake.auth?.token,
      headers: socket.handshake.headers,
    });
    const user = await resolveUserFromToken(token);

    socket.data.user = user || null;
    socket.data.token = token || "";
    next();
  });

  io.on("connection", (socket) => {
    socket.on("join-event", ({ eventId } = {}, callback) => {
      const normalizedEventId = String(eventId || "").trim();

      if (!normalizedEventId) {
        callback?.({ ok: false, message: "Event id is required" });
        return;
      }

      socket.join(normalizedEventId);
      callback?.({
        ok: true,
        eventId: normalizedEventId,
        lockDurationMs: LOCK_TTL_MS,
        ...getSeatLockSnapshot(normalizedEventId, socket.data.user?._id?.toString?.() || ""),
      });
    });

    socket.on("lock-seat", async ({ eventId, seatId } = {}, callback) => {
      if (!socket.data.user) {
        callback?.({ ok: false, code: "unauthorized", message: "Please login to lock seats" });
        return;
      }

      const result = await lockSeat({
        eventId,
        seatId,
        userId: socket.data.user._id.toString(),
        socketId: socket.id,
      });

      callback?.({
        ...result,
        lockDurationMs: LOCK_TTL_MS,
      });
    });

    socket.on("release-seat", ({ eventId, seatId } = {}, callback) => {
      if (!socket.data.user) {
        callback?.({ ok: false, code: "unauthorized", message: "Please login to release seats" });
        return;
      }

      const released = releaseSeat({
        eventId,
        seatId,
        userId: socket.data.user._id.toString(),
      });

      callback?.({
        ok: released,
        seatId: String(seatId || "").trim(),
      });
    });

    socket.on("confirm-booking", async (payload = {}, callback) => {
      if (!socket.data.user || !socket.data.token) {
        callback?.({ ok: false, code: "unauthorized", message: "Please login to confirm booking" });
        return;
      }

      const result = await callController(bookingController.createBooking, {
        body: payload,
        user: socket.data.user,
        token: socket.data.token,
      });

      callback?.({
        ok: result.statusCode >= 200 && result.statusCode < 300,
        statusCode: result.statusCode,
        ...(result.payload || {}),
      });
    });

    socket.on("disconnect", () => {
      releaseSocketLocks({
        socketId: socket.id,
        userId: socket.data.user?._id?.toString?.() || "",
      });
    });
  });

  attachSocketServer(io);

  return io;
};

module.exports = {
  registerSeatSocketServer,
};
