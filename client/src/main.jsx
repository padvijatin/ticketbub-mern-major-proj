import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./store/auth.jsx";
import { LocationProvider } from "./store/location.jsx";
import { WishlistProvider } from "./store/wishlist.jsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LocationProvider>
        <WishlistProvider>
          <App />
        </WishlistProvider>
      </LocationProvider>
    </AuthProvider>
  </QueryClientProvider>
);
