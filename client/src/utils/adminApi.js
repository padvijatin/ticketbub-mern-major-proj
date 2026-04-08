import axios from "axios";

const authApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";
const apiBaseUrl = authApiUrl.replace(/\/auth\/?$/, "");
const serverBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");
const adminApiUrl = `${apiBaseUrl}/admin`;

const buildConfig = (authorizationToken, headers = {}) => ({
  headers: {
    ...(authorizationToken
      ? {
          Authorization: authorizationToken,
        }
      : {}),
    ...headers,
  },
});

const normalizePosterUrl = (value = "") => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${serverBaseUrl}${value}`;
  }

  return value;
};

const normalizeEvent = (event) => ({
  ...event,
  poster: normalizePosterUrl(event?.poster || ""),
});

const buildEventFormData = (payload = {}) => {
  const formData = new FormData();
  const appendValue = (key, value) => {
    if (value === undefined || value === null) return;
    formData.append(key, value);
  };

  [
    "title",
    "category",
    "description",
    "aboutThisEvent",
    "language",
    "genres",
    "format",
    "tags",
    "venue",
    "address",
    "city",
    "state",
    "latitude",
    "longitude",
    "date",
    "startTime",
    "price",
    "posterUrl",
    "status",
    "isActive",
    "removePoster",
  ].forEach((key) => appendValue(key, payload[key]));

  appendValue("seatZones", JSON.stringify(payload.seatZones || []));

  if (payload.posterFile instanceof File) {
    formData.append("poster", payload.posterFile);
  }

  return formData;
};

export const getAdminDashboard = async (authorizationToken) => {
  const response = await axios.get(`${adminApiUrl}/dashboard`, buildConfig(authorizationToken));
  return response.data;
};

export const getAdminEvents = async (authorizationToken) => {
  const response = await axios.get(`${adminApiUrl}/events`, buildConfig(authorizationToken));
  return (response.data.events || []).map(normalizeEvent);
};

export const createAdminEvent = async ({ authorizationToken, payload }) => {
  const response = await axios.post(
    `${adminApiUrl}/events`,
    buildEventFormData(payload),
    buildConfig(authorizationToken, { "Content-Type": "multipart/form-data" })
  );
  return normalizeEvent(response.data.event);
};

export const updateAdminEvent = async ({ authorizationToken, eventId, payload }) => {
  const response = await axios.patch(
    `${adminApiUrl}/events/${eventId}`,
    buildEventFormData(payload),
    buildConfig(authorizationToken, { "Content-Type": "multipart/form-data" })
  );
  return normalizeEvent(response.data.event);
};

export const deleteAdminEvent = async ({ authorizationToken, eventId }) => {
  const response = await axios.delete(`${adminApiUrl}/events/${eventId}`, buildConfig(authorizationToken));
  return response.data;
};

export const getAdminUsers = async (authorizationToken) => {
  const response = await axios.get(`${adminApiUrl}/users`, buildConfig(authorizationToken));
  return response.data.users || [];
};

export const updateAdminUser = async ({ authorizationToken, userId, payload }) => {
  const response = await axios.patch(`${adminApiUrl}/users/${userId}`, payload, buildConfig(authorizationToken));
  return response.data.user;
};

export const deleteAdminUser = async ({ authorizationToken, userId }) => {
  const response = await axios.delete(`${adminApiUrl}/users/${userId}`, buildConfig(authorizationToken));
  return response.data;
};

export const getAdminCoupons = async (authorizationToken) => {
  const response = await axios.get(`${adminApiUrl}/coupons`, buildConfig(authorizationToken));
  return response.data.coupons || [];
};

export const createAdminCoupon = async ({ authorizationToken, payload }) => {
  const response = await axios.post(`${adminApiUrl}/coupons`, payload, buildConfig(authorizationToken));
  return response.data.coupon;
};

export const getAdminBookings = async (authorizationToken) => {
  const response = await axios.get(`${adminApiUrl}/bookings`, buildConfig(authorizationToken));
  return response.data.bookings || [];
};

export const updateAdminBooking = async ({ authorizationToken, bookingId, payload }) => {
  const response = await axios.patch(`${adminApiUrl}/bookings/${bookingId}`, payload, buildConfig(authorizationToken));
  return response.data.booking;
};

export const deleteAdminBooking = async ({ authorizationToken, bookingId }) => {
  const response = await axios.delete(`${adminApiUrl}/bookings/${bookingId}`, buildConfig(authorizationToken));
  return response.data;
};
