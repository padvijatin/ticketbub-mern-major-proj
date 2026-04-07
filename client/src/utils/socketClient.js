import { io } from "socket.io-client";

const authApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";
const apiBaseUrl = authApiUrl.replace(/\/auth\/?$/, "");
const socketServerUrl = (import.meta.env.VITE_SOCKET_URL || apiBaseUrl.replace(/\/api\/?$/, "")).replace(/\/$/, "");

let seatSocket = null;
let currentToken = "";

const normalizeToken = (authorizationToken = "") => String(authorizationToken || "").replace(/^Bearer\s+/i, "").trim();

export const getSeatSocket = (authorizationToken = "") => {
  const token = normalizeToken(authorizationToken);

  if (!seatSocket) {
    seatSocket = io(socketServerUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }

  if (currentToken !== token) {
    currentToken = token;
    seatSocket.auth = token ? { token } : {};

    if (seatSocket.connected) {
      seatSocket.disconnect();
    }
  }

  if (!seatSocket.connected) {
    seatSocket.connect();
  }

  return seatSocket;
};
