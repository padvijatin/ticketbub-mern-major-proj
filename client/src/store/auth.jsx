import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const authorizationToken = token ? `Bearer ${token}` : "";
  const isLoggedIn = Boolean(token);
  const userName = user?.username || "";
  const userRole = user?.role || "user";
  const isAdmin = userRole === "admin";
  const isOrganizer = userRole === "organizer";

  const persistAuth = ({ token: nextToken, user: nextUser }) => {
    if (nextToken) {
      localStorage.setItem("token", nextToken);
      setToken(nextToken);
    }

    if (nextUser) {
      setUser(nextUser);
    }
  };

  const clearAuth = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
  };

  const registerUser = async (userData) => {
    const response = await axios.post(`${API_BASE_URL}/register`, userData);
    persistAuth(response.data);
    return response.data;
  };

  const loginUser = async (loginData) => {
    const response = await axios.post(`${API_BASE_URL}/login`, loginData);
    persistAuth(response.data);
    return response.data;
  };

  const logoutUser = async () => {
    try {
      if (authorizationToken) {
        await axios.post(
          `${API_BASE_URL}/logout`,
          {},
          {
            headers: {
              Authorization: authorizationToken,
            },
          }
        );
      }
    } catch {
    } finally {
      clearAuth();
    }
  };

  const fetchUser = async () => {
    if (!authorizationToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/user`, {
        headers: {
          Authorization: authorizationToken,
        },
      });
      setUser(response.data.user);
    } catch {
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [authorizationToken]);

  return (
    <AuthContext.Provider
      value={{
        API_BASE_URL,
        authorizationToken,
        isAdmin,
        isLoggedIn,
        isLoading,
        isOrganizer,
        loginUser,
        logoutUser,
        registerUser,
        user,
        userName,
        userRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
