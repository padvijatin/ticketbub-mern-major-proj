import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "./auth.jsx";

const WishlistContext = createContext(null);
const STORAGE_KEY = "tickethub_wishlist";
const authApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";
const apiBaseUrl = authApiUrl.replace(/\/auth\/?$/, "");
const wishlistApiUrl = `${apiBaseUrl}/wishlist`;

const readStoredWishlist = () => {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const persistStoredWishlist = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const clearStoredWishlist = () => {
  localStorage.removeItem(STORAGE_KEY);
};

const getWishlistId = (item = {}) => String(item.id || item._id || item.slug || item.title || "");

const buildAuthConfig = (authorizationToken) => ({
  headers: {
    Authorization: authorizationToken,
  },
});

export const WishlistProvider = ({ children }) => {
  const { authorizationToken, isLoading: isAuthLoading, isLoggedIn } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWishlist = useCallback(async () => {
    if (!isLoggedIn || !authorizationToken) {
      const storedWishlist = readStoredWishlist();
      setWishlistItems(storedWishlist);
      return storedWishlist;
    }

    const response = await axios.get(wishlistApiUrl, buildAuthConfig(authorizationToken));
    const nextItems = response.data.items || [];
    setWishlistItems(nextItems);
    return nextItems;
  }, [authorizationToken, isLoggedIn]);

  useEffect(() => {
    let ignore = false;

    const hydrateWishlist = async () => {
      if (isAuthLoading) {
        return;
      }

      setIsLoading(true);

      if (!isLoggedIn || !authorizationToken) {
        if (!ignore) {
          setWishlistItems(readStoredWishlist());
          setIsLoading(false);
        }
        return;
      }

      const guestWishlist = readStoredWishlist();

      try {
        if (guestWishlist.length) {
          await axios.post(
            `${wishlistApiUrl}/sync`,
            {
              eventIds: guestWishlist.map(getWishlistId).filter(Boolean),
            },
            buildAuthConfig(authorizationToken)
          );
          clearStoredWishlist();
        }

        const items = await refreshWishlist();

        if (!ignore) {
          setWishlistItems(items);
        }
      } catch {
        if (!ignore) {
          setWishlistItems(guestWishlist);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    hydrateWishlist();

    return () => {
      ignore = true;
    };
  }, [authorizationToken, isAuthLoading, isLoggedIn, refreshWishlist]);

  const isWishlisted = useCallback(
    (item) => wishlistItems.some((wishlistItem) => getWishlistId(wishlistItem) === getWishlistId(item)),
    [wishlistItems]
  );

  const toggleWishlist = useCallback(
    async (item) => {
      const wishlistId = getWishlistId(item);

      if (!wishlistId) {
        return false;
      }

      const alreadyWishlisted = wishlistItems.some(
        (wishlistItem) => getWishlistId(wishlistItem) === wishlistId
      );

      if (!isLoggedIn || !authorizationToken) {
        const nextItems = alreadyWishlisted
          ? wishlistItems.filter((wishlistItem) => getWishlistId(wishlistItem) !== wishlistId)
          : [
              {
                ...item,
                id: item.id || item._id || wishlistId,
                isWishlisted: true,
              },
              ...wishlistItems,
            ];

        setWishlistItems(nextItems);
        persistStoredWishlist(nextItems);
        return !alreadyWishlisted;
      }

      try {
        if (alreadyWishlisted) {
          await axios.delete(`${wishlistApiUrl}/${wishlistId}`, buildAuthConfig(authorizationToken));
        } else {
          await axios.post(
            wishlistApiUrl,
            {
              eventId: wishlistId,
            },
            buildAuthConfig(authorizationToken)
          );
        }

        await refreshWishlist();
        return !alreadyWishlisted;
      } catch {
        return alreadyWishlisted;
      }
    },
    [authorizationToken, isLoggedIn, refreshWishlist, wishlistItems]
  );

  const clearWishlist = useCallback(async () => {
    if (!isLoggedIn || !authorizationToken) {
      setWishlistItems([]);
      clearStoredWishlist();
      return true;
    }

    try {
      await axios.delete(wishlistApiUrl, buildAuthConfig(authorizationToken));
      setWishlistItems([]);
      return true;
    } catch {
      return false;
    }
  }, [authorizationToken, isLoggedIn]);

  const value = useMemo(
    () => ({
      clearWishlist,
      isLoading,
      isWishlisted,
      refreshWishlist,
      toggleWishlist,
      wishlistCount: wishlistItems.length,
      wishlistItems,
    }),
    [clearWishlist, isLoading, isWishlisted, refreshWishlist, toggleWishlist, wishlistItems]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => useContext(WishlistContext);
