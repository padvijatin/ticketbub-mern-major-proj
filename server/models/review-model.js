const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    collection: "reviews",
    timestamps: true,
    versionKey: false,
  }
);

reviewSchema.index({ event: 1, user: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
