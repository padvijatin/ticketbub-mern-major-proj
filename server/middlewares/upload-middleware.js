const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

const allowedFormats = ["jpg", "jpeg", "png", "webp"];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const originalName = String(file.originalname || "poster");
    const baseName = originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "poster";

    return {
      folder: "tickethub",
      allowed_formats: allowedFormats,
      public_id: `${baseName}-${Date.now()}`,
    };
  },
});

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const normalizedMimeType = String(file.mimetype || "").trim().toLowerCase();
    const isImage = normalizedMimeType.startsWith("image/");
    const extension = String(file.originalname || "")
      .split(".")
      .pop()
      ?.trim()
      .toLowerCase();

    if (isImage && allowedFormats.includes(extension)) {
      callback(null, true);
      return;
    }

    callback(new Error("Only jpg, jpeg, png, and webp image uploads are allowed"));
  },
});

module.exports = {
  imageUpload,
};
