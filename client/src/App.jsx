import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { Home } from "./pages/Home";
import { Movies } from "./pages/Movies";
import { Sports } from "./pages/Sports";
import { Events } from "./pages/Events";
import { Organizer } from "./pages/Organizer";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Logout } from "./pages/Logout";
import { Wishlist } from "./pages/Wishlist";
import { Bookings } from "./pages/Bookings";
import { EventDetails } from "./pages/EventDetails";
import { SeatSelection } from "./pages/SeatSelection";
import { BookingConfirmation } from "./pages/BookingConfirmation";
import { TicketView } from "./pages/TicketView";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Admin = lazy(() => import("./pages/Admin.jsx").then((module) => ({ default: module.Admin })));
const Payment = lazy(() => import("./pages/Payment.jsx").then((module) => ({ default: module.Payment })));

const pageFallback = (
  <main className="py-[3rem]">
    <section className="mx-auto w-[min(80rem,calc(100%_-_3.2rem))] rounded-[2.2rem] border border-[rgba(28,28,28,0.08)] bg-white px-[2rem] py-[2.4rem] text-[1.5rem] text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)]">
      Loading page...
    </section>
  </main>
);

const App = () => {
  useEffect(() => {
    const showOauthToasts = () => {
      try {
        const oauthError = window.sessionStorage.getItem("oauth_error");
        if (oauthError) {
          toast.error(oauthError);
          window.sessionStorage.removeItem("oauth_error");
        }
        const oauthSuccess = window.sessionStorage.getItem("oauth_success");
        if (oauthSuccess) {
          toast.success(oauthSuccess);
          window.sessionStorage.removeItem("oauth_success");
        }
      } catch (error) {}
    };

    showOauthToasts();
    window.addEventListener("oauth-toast", showOauthToasts);
    return () => window.removeEventListener("oauth-toast", showOauthToasts);
  }, []);

  return (
    <Router>
      <Navbar />
      <ErrorBoundary>
        <Suspense fallback={pageFallback}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/sports" element={<Sports />} />
            <Route path="/events" element={<Events />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/organizer" element={<Organizer />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/event/:id" element={<EventDetails />} />
            <Route path="/event/:id/seats" element={<SeatSelection />} />
            <Route path="/event/:id/payment" element={<Payment />} />
            <Route path="/event/:id/confirmation" element={<BookingConfirmation />} />
            <Route path="/ticket/:bookingId" element={<TicketView />} />
            <Route path="/logout" element={<Logout />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Footer />
      <ToastContainer position="top-right" autoClose={2500} />
    </Router>
  );
};

export default App;
