const Event = require("../models/event-model");
const { buildZoneSeatIds } = require("../utils/seat-layout");

const LOCK_TTL_MS = 5 * 60 * 1000;
const seatLocks = {};

let ioInstance = null;
let cleanupTimer = null;

const normalizeValue = (value = "") => String(value || "").trim();

const getEventLockBucket = (eventId) => {
  const normalizedEventId = normalizeValue(eventId);

  if (!seatLocks[normalizedEventId]) {
    seatLocks[normalizedEventId] = {};
  }

  return seatLocks[normalizedEventId];
};

const deleteEventLockBucketIfEmpty = (eventId) => {
  const normalizedEventId = normalizeValue(eventId);
  const bucket = seatLocks[normalizedEventId];

  if (bucket && !Object.keys(bucket).length) {
    delete seatLocks[normalizedEventId];
  }
};

const emitToEventRoom = (eventId, eventName, payload = {}) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(normalizeValue(eventId)).emit(eventName, {
    eventId: normalizeValue(eventId),
    ...payload,
  });
};

const pruneExpiredLocks = () => {
  const now = Date.now();

  Object.entries(seatLocks).forEach(([eventId, bucket]) => {
    Object.entries(bucket).forEach(([seatId, lock]) => {
      if (Number(lock.expiresAt) > now) {
        return;
      }

      delete bucket[seatId];
      emitToEventRoom(eventId, "seat-released", {
        seatId,
        status: "available",
        reason: "expired",
      });
    });

    deleteEventLockBucketIfEmpty(eventId);
  });
};

const attachSocketServer = (io) => {
  ioInstance = io;

  if (!cleanupTimer) {
    cleanupTimer = setInterval(pruneExpiredLocks, 1000);

    if (typeof cleanupTimer.unref === "function") {
      cleanupTimer.unref();
    }
  }
};

const getSeatLockSnapshot = (eventId, currentUserId = "") => {
  pruneExpiredLocks();

  const normalizedEventId = normalizeValue(eventId);
  const normalizedUserId = normalizeValue(currentUserId);
  const bucket = seatLocks[normalizedEventId] || {};
  const lockedSeats = Object.entries(bucket).map(([seatId, lock]) => ({
    seatId,
    userId: lock.userId,
    expiresAt: lock.expiresAt,
  }));

  return {
    lockedSeats,
    lockedSeatIds: lockedSeats.map((lock) => lock.seatId),
    currentUserLockedSeats: normalizedUserId
      ? lockedSeats.filter((lock) => lock.userId === normalizedUserId).map((lock) => lock.seatId)
      : [],
    lockDurationMs: LOCK_TTL_MS,
  };
};

const validateSeatAgainstEvent = (event, seatId) => {
  const validSeatIds = new Set((event?.seatZones || []).flatMap((zone) => buildZoneSeatIds(zone)));

  if (!validSeatIds.has(seatId)) {
    return {
      ok: false,
      code: "invalid-seat",
      message: "Selected seat is invalid",
    };
  }

  if ((event?.bookedSeats || []).includes(seatId)) {
    return {
      ok: false,
      code: "seat-booked",
      message: "This seat is already booked",
    };
  }

  return { ok: true };
};

const lockSeat = async ({ eventId, seatId, userId, socketId }) => {
  pruneExpiredLocks();

  const normalizedEventId = normalizeValue(eventId);
  const normalizedSeatId = normalizeValue(seatId);
  const normalizedUserId = normalizeValue(userId);
  const normalizedSocketId = normalizeValue(socketId);

  if (!normalizedEventId || !normalizedSeatId || !normalizedUserId) {
    return {
      ok: false,
      code: "invalid-request",
      message: "Event, seat, and user are required",
    };
  }

  const event = await Event.findOne({
    _id: normalizedEventId,
    isActive: true,
    status: "approved",
  }).lean();

  if (!event) {
    return {
      ok: false,
      code: "event-not-found",
      message: "Event not found",
    };
  }

  const seatValidation = validateSeatAgainstEvent(event, normalizedSeatId);
  if (!seatValidation.ok) {
    return seatValidation;
  }

  const bucket = getEventLockBucket(normalizedEventId);
  const existingLock = bucket[normalizedSeatId];

  if (existingLock?.userId === normalizedUserId) {
    existingLock.expiresAt = Date.now() + LOCK_TTL_MS;
    existingLock.socketId = normalizedSocketId || existingLock.socketId;

    return {
      ok: true,
      seatId: normalizedSeatId,
      alreadyLockedByUser: true,
      expiresAt: existingLock.expiresAt,
    };
  }

  if (existingLock) {
    return {
      ok: false,
      code: "seat-locked",
      message: "This seat is locked by another user",
      seatId: normalizedSeatId,
    };
  }

  const expiresAt = Date.now() + LOCK_TTL_MS;
  bucket[normalizedSeatId] = {
    userId: normalizedUserId,
    socketId: normalizedSocketId,
    expiresAt,
  };

  emitToEventRoom(normalizedEventId, "seat-locked", {
    seatId: normalizedSeatId,
    status: "locked",
    userId: normalizedUserId,
    expiresAt,
  });

  return {
    ok: true,
    seatId: normalizedSeatId,
    expiresAt,
  };
};

const releaseSeat = ({ eventId, seatId, userId, reason = "manual", broadcast = true }) => {
  pruneExpiredLocks();

  const normalizedEventId = normalizeValue(eventId);
  const normalizedSeatId = normalizeValue(seatId);
  const normalizedUserId = normalizeValue(userId);
  const bucket = seatLocks[normalizedEventId];
  const existingLock = bucket?.[normalizedSeatId];

  if (!existingLock || existingLock.userId !== normalizedUserId) {
    return false;
  }

  delete bucket[normalizedSeatId];
  deleteEventLockBucketIfEmpty(normalizedEventId);

  if (broadcast) {
    emitToEventRoom(normalizedEventId, "seat-released", {
      seatId: normalizedSeatId,
      status: "available",
      reason,
    });
  }

  return true;
};

const releaseSeats = ({ eventId, seatIds = [], userId, reason = "manual", broadcast = true }) =>
  [...new Set((seatIds || []).map(normalizeValue).filter(Boolean))].filter((seatId) =>
    releaseSeat({
      eventId,
      seatId,
      userId,
      reason,
      broadcast,
    })
  ).length;

const releaseSocketLocks = ({ socketId, userId }) => {
  pruneExpiredLocks();

  const normalizedSocketId = normalizeValue(socketId);
  const normalizedUserId = normalizeValue(userId);

  Object.entries(seatLocks).forEach(([eventId, bucket]) => {
    Object.entries(bucket).forEach(([seatId, lock]) => {
      if (lock.userId !== normalizedUserId || lock.socketId !== normalizedSocketId) {
        return;
      }

      delete bucket[seatId];
      emitToEventRoom(eventId, "seat-released", {
        seatId,
        status: "available",
        reason: "disconnect",
      });
    });

    deleteEventLockBucketIfEmpty(eventId);
  });
};

const assertSeatsLockedByUser = ({ eventId, seatIds = [], userId }) => {
  pruneExpiredLocks();

  const normalizedEventId = normalizeValue(eventId);
  const normalizedUserId = normalizeValue(userId);
  const bucket = seatLocks[normalizedEventId] || {};
  const uniqueSeatIds = [...new Set((seatIds || []).map(normalizeValue).filter(Boolean))];
  const missingSeats = [];
  const conflictingSeats = [];

  uniqueSeatIds.forEach((seatId) => {
    const lock = bucket[seatId];

    if (!lock) {
      missingSeats.push(seatId);
      return;
    }

    if (lock.userId !== normalizedUserId) {
      conflictingSeats.push(seatId);
    }
  });

  return {
    ok: !missingSeats.length && !conflictingSeats.length,
    missingSeats,
    conflictingSeats,
  };
};

const emitSeatBooked = ({ eventId, seatId, userId }) => {
  emitToEventRoom(eventId, "seat-booked", {
    seatId: normalizeValue(seatId),
    status: "booked",
    userId: normalizeValue(userId),
  });
};

module.exports = {
  LOCK_TTL_MS,
  attachSocketServer,
  assertSeatsLockedByUser,
  emitSeatBooked,
  getSeatLockSnapshot,
  lockSeat,
  releaseSeat,
  releaseSeats,
  releaseSocketLocks,
};
