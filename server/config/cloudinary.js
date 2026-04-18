const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isCloudinaryAdminResourceCheckEnabled = () =>
  String(process.env.CLOUDINARY_ENABLE_ADMIN_RESOURCE_CHECK || "")
    .trim()
    .toLowerCase() === "true";

const buildCloudinaryUrl = (publicId = "") => {
  const normalizedPublicId = String(publicId || "").trim();

  if (!normalizedPublicId) {
    return "";
  }

  return cloudinary.url(normalizedPublicId, {
    secure: true,
  });
};

const normalizeCloudinaryAssetUrl = (value = "") => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  if (/^(https?:)?\/\//i.test(normalizedValue) || normalizedValue.startsWith("data:") || normalizedValue.startsWith("/")) {
    return normalizedValue;
  }

  return buildCloudinaryUrl(normalizedValue);
};

const extractCloudinaryPublicId = (value = "") => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  if (!/^(https?:)?\/\//i.test(normalizedValue) && !normalizedValue.startsWith("data:") && !normalizedValue.startsWith("/")) {
    return normalizedValue;
  }

  if (!normalizedValue.includes("/res.cloudinary.com/")) {
    return "";
  }

  const uploadMarker = "/upload/";
  const uploadIndex = normalizedValue.indexOf(uploadMarker);

  if (uploadIndex < 0) {
    return "";
  }

  const afterUpload = normalizedValue.slice(uploadIndex + uploadMarker.length);
  const [pathWithoutQuery] = afterUpload.split("?");
  const segments = pathWithoutQuery.split("/").filter(Boolean);

  if (!segments.length) {
    return "";
  }

  const withoutVersion = /^v\d+$/.test(segments[0]) ? segments.slice(1) : segments;
  const lastSegment = withoutVersion[withoutVersion.length - 1] || "";
  const extensionlessLastSegment = lastSegment.replace(/\.[a-z0-9]+$/i, "");
  const publicIdSegments = [...withoutVersion.slice(0, -1), extensionlessLastSegment].filter(Boolean);

  return decodeURIComponent(publicIdSegments.join("/"));
};

const deleteCloudinaryAsset = async (value = "") => {
  const publicId = extractCloudinaryPublicId(value);

  if (!publicId) {
    return false;
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: "image",
    });
    return true;
  } catch (error) {
    console.error("cloudinary-delete-failed", error);
    return false;
  }
};

const cloudinaryAssetExists = async (value = "") => {
  const publicId = extractCloudinaryPublicId(value);

  if (!publicId) {
    return false;
  }

  if (!isCloudinaryAdminResourceCheckEnabled()) {
    return null;
  }

  try {
    await cloudinary.api.resource(publicId, {
      resource_type: "image",
    });
    return true;
  } catch (error) {
    const httpCode = error?.http_code || error?.error?.http_code;
    const message = String(error?.message || error?.error?.message || "");

    if (httpCode === 404 || /not found/i.test(message)) {
      return false;
    }

    console.error("cloudinary-resource-check-failed", error);
    return null;
  }
};

module.exports = {
  cloudinary,
  buildCloudinaryUrl,
  cloudinaryAssetExists,
  deleteCloudinaryAsset,
  extractCloudinaryPublicId,
  isCloudinaryAdminResourceCheckEnabled,
  normalizeCloudinaryAssetUrl,
};
