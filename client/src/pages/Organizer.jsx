import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../store/auth.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import DashboardOverview from "../components/admin/DashboardOverview.jsx";
import EventManagement from "../components/admin/EventManagement.jsx";
import CouponManagement from "../components/admin/CouponManagement.jsx";
import BookingManagement from "../components/admin/BookingManagement.jsx";

export const Organizer = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { isLoading, isLoggedIn, isOrganizer } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview role="organizer" />;
      case "events":
        return <EventManagement role="organizer" />;
      case "coupons":
        return <CouponManagement />;
      case "bookings":
        return <BookingManagement role="organizer" />;
      default:
        return <DashboardOverview role="organizer" />;
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-15rem)] w-[min(120rem,calc(100%_-_3.2rem))] items-center justify-center py-[4rem] text-[1.8rem] font-semibold text-[var(--color-text-secondary)]">
        Checking organizer access...
      </section>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!isOrganizer) {
    return (
      <section className="mx-auto grid min-h-[calc(100vh-15rem)] w-[min(72rem,calc(100%_-_3.2rem))] place-items-center py-[4rem]">
        <div className="rounded-[2rem] border border-[rgba(28,28,28,0.08)] bg-white p-[3rem] text-center shadow-[0_24px_60px_rgba(28,28,28,0.1)]">
          <span className="inline-flex rounded-full bg-[rgba(248,68,100,0.1)] px-[1.2rem] py-[0.7rem] text-[1.2rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-primary)]">
            Restricted
          </span>
          <h1 className="mt-[1.6rem] text-[3rem] font-extrabold text-[var(--color-text-primary)]">
            Organizer access only
          </h1>
          <p className="mt-[1rem] text-[1.6rem] leading-[1.7] text-[var(--color-text-secondary)]">
            This page is available only for users with the organizer role.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-15rem)] bg-[var(--color-bg-main)] p-[1.6rem] max-[980px]:flex-col">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} role="organizer" />
      <main className="flex-1 overflow-auto p-[2.4rem] max-[980px]:px-0 max-[980px]:pb-0">
        <div className="mb-[1.4rem]">
          <Link
            to="/"
            className="inline-flex items-center gap-[0.6rem] text-[1.35rem] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
          >
            <ArrowLeft className="h-[1.6rem] w-[1.6rem]" /> Back to TicketHub
          </Link>
        </div>
        {renderContent()}
      </main>
    </div>
  );
};

