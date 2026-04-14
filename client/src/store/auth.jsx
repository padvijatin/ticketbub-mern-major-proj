import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL, AuthContext } from "./auth-context.jsx";

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash || "";
    const match = hash.match(/oauth_token=([^&]+)/);
    const errorMatch = hash.match(/oauth_error=([^&]+)/);
    const successMatch = hash.match(/oauth_success=([^&]+)/);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]);
      persistAuth({ token: decoded });
      if (successMatch && successMatch[1]) {
        try {
          window.sessionStorage.setItem("oauth_success", decodeURIComponent(successMatch[1]));
          window.dispatchEvent(new Event("oauth-toast"));
        } catch (error) {}
      }
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      return;
    }

    if (errorMatch && errorMatch[1]) {
      const decoded = decodeURIComponent(errorMatch[1]);
      try {
        window.sessionStorage.setItem("oauth_error", decoded);
        window.dispatchEvent(new Event("oauth-toast"));
      } catch (error) {}
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }, []);

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
      // Ignore logout failures and clear local auth state anyway.
    } finally {
      clearAuth();
    }
  };

  const fetchUser = useCallback(async () => {
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
  }, [authorizationToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

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
