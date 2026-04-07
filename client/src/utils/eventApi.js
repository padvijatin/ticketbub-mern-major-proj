import axios from "axios";

const authApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";
const apiBaseUrl = authApiUrl.replace(/\/auth\/?$/, "");
const serverBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");
const bookingsApiUrl = `${apiBaseUrl}/bookings`;
const eventsApiUrl = `${apiBaseUrl}/events`;

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

const normalizeEvent = (event) => {
  if (!event) return null;

  return {
    ...event,
    poster: normalizePosterUrl(event.poster || ""),
  };
};

const normalizeParams = (params = {}) =>
  Object.entries(params).reduce((result, [key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) {
        result[key] = value.join(",");
      }

      return result;
    }

    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }

    return result;
  }, {});

export const getEvents = async (params = {}) => {
  const response = await axios.get(eventsApiUrl, { params: normalizeParams(params) });
  return (response.data.events || []).map(normalizeEvent);
};

export const getEventById = async (eventId, authorizationToken = "") => {
  const response = await axios.get(`${eventsApiUrl}/${eventId}`, {
    headers: authorizationToken
      ? {
          Authorization: authorizationToken,
        }
      : undefined,
  });
  return normalizeEvent(response.data.event || null);
};

export const bookEvent = async ({
  eventId,
  seats,
  couponCode = "",
  paymentMethod = "upi",
  paymentDetails = {},
  bookingMeta = {},
  authorizationToken = "",
}) => {
  const response = await axios.post(
    bookingsApiUrl,
    {
      eventId,
      seats,
      couponCode,
      paymentMethod,
      paymentDetails,
      bookingMeta,
    },
    {
      headers: authorizationToken
        ? {
            Authorization: authorizationToken,
          }
        : undefined,
    }
  );
  return {
    ...response.data,
    event: normalizeEvent(response.data.event || null),
  };
};

export const getMyBookings = async (authorizationToken) => {
  const response = await axios.get(`${bookingsApiUrl}/me`, {
    headers: authorizationToken
      ? {
          Authorization: authorizationToken,
        }
      : undefined,
  });

  return (response.data.bookings || []).map((booking) => ({
    ...booking,
    event: normalizeEvent(booking.event || null),
  }));
};

export const getBookingTicket = async (bookingId) => {
  const response = await axios.get(`${bookingsApiUrl}/${bookingId}`);
  return {
    booking: response.data.booking || null,
    event: normalizeEvent(response.data.event || null),
  };
};

export const rateEvent = async ({ eventId, value, authorizationToken }) => {
  const response = await axios.post(
    `${eventsApiUrl}/${eventId}/rate`,
    { value },
    {
      headers: {
        Authorization: authorizationToken,
      },
    }
  );

  return response.data;
};
