const mongoose = require("mongoose");

const stringArrayField = {
  type: [String],
  default: [],
  set: (values = []) => values.map((value) => String(value).trim()).filter(Boolean),
};

const seatZoneSchema = new mongoose.Schema(
  {
    sectionGroup: {
      type: String,
      trim: true,
      default: "",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSeats: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableSeats: {
      type: Number,
      default: 0,
      min: 0,
    },
    rows: {
      type: [String],
      default: [],
      set: (values = []) => values.map((value) => String(value).trim().toUpperCase()).filter(Boolean),
    },
    seatsPerRow: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    aboutThisEvent: {
      type: String,
      trim: true,
      default: "",
    },
    language: stringArrayField,
    genres: stringArrayField,
    format: stringArrayField,
    tags: stringArrayField,
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    seatZones: {
      type: [seatZoneSchema],
      default: [],
    },
    bookedSeats: {
      type: [String],
      default: [],
      set: (values = []) => [...new Set(values.map((value) => String(value).trim()).filter(Boolean))],
    },
    totalSeats: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableSeats: {
      type: Number,
      default: 0,
      min: 0,
    },
    poster: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "events",
    versionKey: false,
  }
);

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
