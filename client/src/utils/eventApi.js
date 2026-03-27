import axios from "axios";

const authApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";
const apiBaseUrl = authApiUrl.replace(/\/auth\/?$/, "");
const eventsApiUrl = `${apiBaseUrl}/events`;

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
  return response.data.events || [];
};

export const getEventById = async (eventId) => {
  const response = await axios.get(`${eventsApiUrl}/${eventId}`);
  return response.data.event || null;
};

export const bookEvent = async ({ eventId, seats }) => {
  const response = await axios.post(`${eventsApiUrl}/${eventId}/book`, { seats });
  return response.data;
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
