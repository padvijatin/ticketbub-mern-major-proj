import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Eye, MoreHorizontal, Search, X } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../store/auth.jsx";
import { deleteAdminBooking, getAdminBookings, updateAdminBooking } from "../../utils/adminApi.js";

const statusConfig = {
  paid: {
    label: "Confirmed",
    pillClassName: "bg-[rgba(248,68,100,0.12)] text-[var(--color-primary)]",
  },
  pending: {
    label: "Pending",
    pillClassName: "bg-[rgba(28,28,28,0.06)] text-[var(--color-text-primary)]",
  },
  failed: {
    label: "Cancelled",
    pillClassName: "bg-[rgba(239,68,68,0.12)] text-[var(--color-error)]",
  },
};

const statusMenuOptions = [
  { value: "paid", label: "Confirm" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Cancel" },
];

const bookingSummaryBullet = "\u2022";
const rupeeSymbol = "\u20B9";

const formatBookingDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

const getBookingStatus = (booking) => {
  const statusKey = String(booking.paymentStatus || "paid").toLowerCase();
  return statusConfig[statusKey] || statusConfig.paid;
};

const BookingManagement = ({ role = "admin" }) => {
  const queryClient = useQueryClient();
  const { authorizationToken } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState("");
  const [showStatusMenuFor, setShowStatusMenuFor] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const { data: bookings = [], isLoading, isError } = useQuery({
    queryKey: ["admin-bookings", authorizationToken, role],
    queryFn: () => getAdminBookings(authorizationToken),
    enabled: Boolean(authorizationToken),
  });

  useEffect(() => {
    const handleWindowClick = () => {
      setOpenMenuId("");
      setShowStatusMenuFor("");
    };

    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  const updateMutation = useMutation({
    mutationFn: ({ bookingId, payload }) => updateAdminBooking({ authorizationToken, bookingId, payload }),
    onSuccess: () => {
      toast.success("Booking updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setOpenMenuId("");
      setShowStatusMenuFor("");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Unable to update booking right now");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (bookingId) => deleteAdminBooking({ authorizationToken, bookingId }),
    onSuccess: () => {
      toast.success("Booking deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setOpenMenuId("");
      setShowStatusMenuFor("");
      setSelectedBooking(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Unable to delete booking right now");
    },
  });

  const filteredBookings = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    if (!normalizedQuery) {
      return bookings;
    }

    return bookings.filter((booking) =>
      [
        booking.bookingId,
        booking.user?.username,
        booking.user?.email,
        booking.event?.title,
        booking.paymentMethod,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [bookings, searchValue]);

  const totalRevenue = useMemo(
    () => filteredBookings.reduce((sum, booking) => sum + Number(booking.finalAmount || 0), 0),
    [filteredBookings]
  );

  return (
    <div className="space-y-[2rem]">
      <div>
        <h1 className="text-[2.6rem] font-extrabold text-[var(--color-text-primary)]">
          {role === "admin" ? "Bookings" : "Bookings For My Events"}
        </h1>
        <p className="mt-[0.5rem] text-[1.35rem] text-[var(--color-text-secondary)]">
          {role === "admin"
            ? `${filteredBookings.length} ${filteredBookings.length === 1 ? "booking" : "bookings"} ${bookingSummaryBullet} Revenue: ${rupeeSymbol}${totalRevenue.toLocaleString("en-IN")}`
            : "Review bookings and payment status for the events you organize."}
        </p>
      </div>

      <div className="max-w-[48rem]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-[1.4rem] top-1/2 h-[1.8rem] w-[1.8rem] -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search by name, event, or ID..."
            className="h-[4.8rem] w-full rounded-[1.4rem] border border-[rgba(28,28,28,0.08)] bg-white pl-[4.6rem] pr-[1.4rem] text-[1.4rem] text-[var(--color-text-primary)] outline-none shadow-[0_12px_30px_rgba(28,28,28,0.04)]"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-white shadow-[0_16px_36px_rgba(28,28,28,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[112rem] text-left">
            <thead>
              <tr className="border-b border-[rgba(28,28,28,0.08)] text-[1.15rem] text-[var(--color-text-primary)]">
                <th className="px-[2rem] py-[1.4rem] font-semibold">ID</th>
                <th className="px-[1rem] py-[1.4rem] font-semibold">Customer</th>
                <th className="px-[1rem] py-[1.4rem] font-semibold">Event</th>
                <th className="px-[1rem] py-[1.4rem] font-semibold">Seats</th>
                <th className="px-[1rem] py-[1.4rem] font-semibold">Amount</th>
                <th className="px-[1rem] py-[1.4rem] font-semibold">Payment</th>
                <th className="px-[1rem] py-[1.4rem] font-semibold">Date</th>
                <th className="px-[1rem] py-[1.4rem] font-semibold">Status</th>
                <th className="px-[2rem] py-[1.4rem] text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="px-[2rem] py-[2rem] text-center text-[1.4rem] text-[var(--color-text-secondary)]">
                    Loading bookings...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan="9" className="px-[2rem] py-[2rem] text-center text-[1.4rem] text-[var(--color-text-secondary)]">
                    Unable to load bookings right now.
                  </td>
                </tr>
              ) : filteredBookings.length ? (
                filteredBookings.map((booking) => {
                  const status = getBookingStatus(booking);

                  return (
                    <tr key={booking.id} className="border-b border-[rgba(28,28,28,0.06)] last:border-0">
                      <td className="px-[2rem] py-[1.8rem] text-[1.35rem] font-medium text-[var(--color-text-primary)]">
                        {booking.bookingId || "-"}
                      </td>
                      <td className="px-[1rem] py-[1.8rem] text-[1.35rem] text-[var(--color-text-primary)]">
                        {booking.user?.username || booking.user?.email || "Unknown"}
                      </td>
                      <td className="px-[1rem] py-[1.8rem] text-[1.35rem] text-[var(--color-text-primary)]">
                        {booking.event?.title || "Event unavailable"}
                      </td>
                      <td className="px-[1rem] py-[1.8rem] text-[1.35rem] text-[var(--color-text-primary)]">
                        {booking.seats?.length || 0}
                      </td>
                      <td className="px-[1rem] py-[1.8rem] text-[1.35rem] font-semibold text-[var(--color-text-primary)]">
                        {formatCurrency(booking.finalAmount)}
                      </td>
                      <td className="px-[1rem] py-[1.8rem] text-[1.35rem] text-[var(--color-text-primary)]">
                        {booking.paymentMethod
                          ? String(booking.paymentMethod)
                              .replace(/[_-]+/g, " ")
                              .replace(/\b\w/g, (character) => character.toUpperCase())
                          : "UPI"}
                      </td>
                      <td className="px-[1rem] py-[1.8rem] text-[1.35rem] text-[var(--color-text-primary)]">
                        {formatBookingDate(booking.createdAt)}
                      </td>
                      <td className="px-[1rem] py-[1.8rem]">
                        <span
                          className={`inline-flex rounded-full px-[1.2rem] py-[0.45rem] text-[1.15rem] font-semibold ${status.pillClassName}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-[2rem] py-[1.8rem] text-right">
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setShowStatusMenuFor("");
                              setOpenMenuId((current) => (current === booking.id ? "" : booking.id));
                            }}
                            className="inline-flex h-[3.8rem] w-[3.8rem] items-center justify-center rounded-full text-[var(--color-text-primary)] transition-all duration-150 hover:bg-[rgba(28,28,28,0.04)] active:scale-[0.96]"
                          >
                            <MoreHorizontal className="h-[1.8rem] w-[1.8rem]" />
                          </button>

                          {openMenuId === booking.id ? (
                            <div
                              className="absolute right-0 top-[4.4rem] z-20 min-w-[24rem] overflow-visible rounded-[1.6rem] border border-[rgba(28,28,28,0.08)] bg-white shadow-[0_18px_40px_rgba(28,28,28,0.14)]"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="border-b border-[rgba(28,28,28,0.08)] px-[1.6rem] py-[1.2rem] text-[1.4rem] font-semibold text-[var(--color-text-primary)]">
                                Actions
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setOpenMenuId("");
                                  setShowStatusMenuFor("");
                                }}
                                className="flex w-full items-center gap-[0.9rem] px-[1.4rem] py-[1.25rem] text-left text-[1.35rem] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(109,40,217,0.08)] hover:text-[#6d28d9]"
                              >
                                <Eye className="h-[1.7rem] w-[1.7rem]" />
                                View Details
                              </button>

                              <div className="relative border-t border-[rgba(28,28,28,0.08)]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowStatusMenuFor((current) => (current === booking.id ? "" : booking.id))
                                  }
                                  className="flex w-full items-center justify-between gap-[1rem] px-[1.4rem] py-[1.25rem] text-left text-[1.35rem] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(109,40,217,0.08)] hover:text-[#6d28d9]"
                                >
                                  <span>Change Status</span>
                                  <ChevronRight className="h-[1.6rem] w-[1.6rem]" />
                                </button>

                                {showStatusMenuFor === booking.id ? (
                                  <div className="absolute left-[-18.8rem] top-0 z-30 min-w-[17rem] rounded-[1.4rem] border border-[rgba(28,28,28,0.08)] bg-white p-[0.7rem] shadow-[0_18px_40px_rgba(28,28,28,0.14)]">
                                    {statusMenuOptions.map((option) => (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() =>
                                          updateMutation.mutate({
                                            bookingId: booking.id,
                                            payload: { paymentStatus: option.value },
                                          })
                                        }
                                        className={`flex w-full items-center rounded-[1rem] px-[1rem] py-[0.95rem] text-left text-[1.3rem] transition-colors ${
                                          String(booking.paymentStatus || "paid").toLowerCase() === option.value
                                            ? "bg-[rgba(28,28,28,0.05)] text-[var(--color-text-secondary)]"
                                            : "text-[var(--color-text-primary)] hover:bg-[rgba(28,28,28,0.04)]"
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>

                              <button
                                type="button"
                                onClick={() => deleteMutation.mutate(booking.id)}
                                disabled={deleteMutation.isPending}
                                className="flex w-full items-center gap-[0.9rem] border-t border-[rgba(28,28,28,0.08)] px-[1.4rem] py-[1.25rem] text-left text-[1.35rem] text-[var(--color-error)] transition-colors hover:bg-[rgba(239,68,68,0.06)] disabled:opacity-60"
                              >
                                Delete Booking
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="px-[2rem] py-[2rem] text-center text-[1.4rem] text-[var(--color-text-secondary)]">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBooking ? (
        <div
          className="fixed inset-0 z-[1300] overflow-y-auto bg-[rgba(28,28,28,0.35)] px-[1.2rem] py-[1.6rem] md:px-[1.6rem] md:py-[4rem]"
          onClick={() => setSelectedBooking(null)}
        >
          <div className="flex min-h-full items-center justify-center">
            <div
              className="max-h-[calc(100vh-3.2rem)] w-full max-w-[64rem] overflow-y-auto rounded-[2.2rem] bg-white p-[1.6rem] shadow-[0_24px_54px_rgba(28,28,28,0.18)] md:p-[2.4rem]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-[1rem]">
                <div>
                  <h3 className="text-[2rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                    Booking Details
                  </h3>
                  <p className="mt-[1.2rem] text-[1.4rem] text-[var(--color-text-secondary)]">
                    {selectedBooking.bookingId || "-"}
                  </p>
                </div>

                <div className="mt-[1.8rem] flex items-start gap-[1rem]">
                  <span
                    className={`inline-flex rounded-full px-[1.2rem] py-[0.45rem] text-[1.15rem] font-semibold ${
                      getBookingStatus(selectedBooking).pillClassName
                    }`}
                  >
                    {getBookingStatus(selectedBooking).label}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    className="inline-flex h-[3.8rem] w-[3.8rem] items-center justify-center rounded-full border border-[rgba(248,68,100,0.18)] text-[var(--color-text-secondary)] transition-all duration-150 hover:bg-[rgba(248,68,100,0.08)] hover:text-[var(--color-primary)] active:scale-[0.94] active:border-[rgba(248,68,100,0.32)]"
                  >
                    <X className="h-[1.7rem] w-[1.7rem]" />
                  </button>
                </div>
              </div>

              <div className="mt-[2rem] grid gap-x-[2rem] gap-y-[1.6rem] sm:mt-[2.4rem] sm:gap-x-[4rem] sm:gap-y-[2.2rem] sm:grid-cols-2">
                {[
                  ["Customer", selectedBooking.user?.username || selectedBooking.user?.email || "Unknown"],
                  ["Event", selectedBooking.event?.title || "Event unavailable"],
                  ["Seats", String(selectedBooking.seats?.length || 0)],
                  ["Amount", formatCurrency(selectedBooking.finalAmount)],
                  [
                    "Payment",
                    selectedBooking.paymentMethod
                      ? String(selectedBooking.paymentMethod)
                          .replace(/[_-]+/g, " ")
                          .replace(/\b\w/g, (character) => character.toUpperCase())
                      : "UPI",
                  ],
                  ["Date", formatBookingDate(selectedBooking.createdAt)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[1.3rem] text-[var(--color-text-secondary)]">{label}</p>
                    <p className="mt-[0.4rem] break-words text-[1.6rem] leading-[1.35] text-[var(--color-text-primary)] sm:text-[1.8rem]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BookingManagement;
