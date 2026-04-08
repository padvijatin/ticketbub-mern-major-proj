import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, ChevronLeft, Lock, QrCode, Shield, Smartphone, Tag, WalletCards } from "lucide-react";
import { toast } from "react-toastify";
import PosterImage from "../components/PosterImage.jsx";
import { getCoupons, validateCoupon } from "../utils/couponApi.js";
import { createPaymentOrder, getEventById, verifyPayment } from "../utils/eventApi.js";
import { useAuth } from "../store/auth.jsx";

const paymentHighlights = [
  { title: "UPI Apps", description: "Google Pay, PhonePe, Paytm and other UPI apps", icon: Smartphone },
  { title: "Cards & Banks", description: "Credit card, debit card and net banking", icon: WalletCards },
  { title: "Scan & Pay", description: "UPI QR and popular mobile-first checkout flows", icon: QrCode },
];

const quickPayBadges = ["Google Pay", "PhonePe", "Paytm", "UPI QR", "Cards", "Net Banking"];

const buildDefaultPricing = (subtotal = 0) => {
  const safeSubtotal = Math.max(0, Math.round(Number(subtotal) || 0));
  const convenienceFee = Math.round(safeSubtotal * 0.02);
  const gstAmount = Math.round(safeSubtotal * 0.18 * 0.02);

  return {
    cartAmount: safeSubtotal,
    discountAmount: 0,
    convenienceFee,
    gstAmount,
    finalAmount: safeSubtotal + convenienceFee + gstAmount,
  };
};

const formatEventSchedule = (value) => {
  if (!value) {
    return "Date and time to be announced";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return `${parsedDate.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} | ${parsedDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[data-razorpay-checkout="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
    document.body.appendChild(script);
  });

const openRazorpayCheckout = ({ order, keyId, eventTitle, user }) =>
  new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      name: "TicketHub",
      description: eventTitle || "Ticket booking payment",
      image: "/favicon.ico",
      order_id: order.id,
      prefill: {
        name: user?.username || "",
        email: user?.email || "",
        contact: user?.phone || "",
      },
      notes: order.notes || {},
      theme: {
        color: "#f84464",
      },
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    });

    razorpay.on("payment.failed", (response) => {
      reject(new Error(response?.error?.description || "Payment failed"));
    });

    razorpay.open();
  });

export const Payment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { authorizationToken, isLoggedIn, user } = useAuth();
  const bookingState = location.state || {};
  const selectedItems = bookingState.items || [];
  const summary = bookingState.summary || [];
  const subtotal = bookingState.total || 0;
  const currency = bookingState.currency || "Rs ";
  const bookingMeta = bookingState.bookingMeta || {};
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponFeedback, setCouponFeedback] = useState("");
  const [pricing, setPricing] = useState(() => buildDefaultPricing(subtotal));

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id, authorizationToken],
    queryFn: () => getEventById(id, authorizationToken),
    enabled: Boolean(id),
  });

  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ["checkout-coupons", subtotal, authorizationToken],
    queryFn: () => getCoupons({ cartAmount: subtotal, authorizationToken }),
    enabled: subtotal > 0,
  });

  useEffect(() => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponFeedback("");
    setPricing(buildDefaultPricing(subtotal));
  }, [subtotal]);

  const savingsText = useMemo(() => {
    if (!pricing.discountAmount) {
      return "";
    }

    return `You saved ${currency}${pricing.discountAmount.toLocaleString("en-IN")}`;
  }, [currency, pricing.discountAmount]);

  const featuredCoupons = useMemo(() => coupons.slice(0, 4), [coupons]);

  const couponMutation = useMutation({
    mutationFn: (code) => validateCoupon({ code, cartAmount: subtotal, authorizationToken }),
    onSuccess: (response) => {
      setAppliedCoupon(response.coupon || null);
      setCouponCode(response.coupon?.code || "");
      setCouponFeedback(response.message || "Coupon applied successfully");
      setPricing({
        cartAmount: response.cartAmount,
        discountAmount: response.discountAmount,
        convenienceFee: response.convenienceFee,
        gstAmount: response.gstAmount,
        finalAmount: response.finalAmount,
      });
      toast.success(response.message || "Coupon applied successfully");
      queryClient.invalidateQueries({ queryKey: ["checkout-coupons", subtotal, authorizationToken] });
    },
    onError: (error) => {
      const message = error.response?.data?.message || "Unable to validate coupon right now";
      setAppliedCoupon(null);
      setCouponFeedback(message);
      setPricing(buildDefaultPricing(subtotal));
      toast.error(message);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!isLoggedIn) {
        throw new Error("Please login to complete payment");
      }

      if (!selectedItems.length) {
        throw new Error("Please select seats before paying");
      }

      await loadRazorpayScript();

      const orderResponse = await createPaymentOrder({
        eventId: id,
        seats: selectedItems,
        couponCode: appliedCoupon?.code || "",
        amount: pricing.finalAmount,
        bookingMeta,
        authorizationToken,
      });

      const paymentResponse = await openRazorpayCheckout({
        order: orderResponse.order,
        keyId: orderResponse.keyId,
        eventTitle: event?.title,
        user,
      });

      return verifyPayment({
        eventId: id,
        seats: selectedItems,
        couponCode: appliedCoupon?.code || "",
        amount: orderResponse.amount,
        bookingMeta,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        authorizationToken,
      });
    },
    onSuccess: (response) => {
      queryClient.setQueryData(["event", id, authorizationToken], response.event);
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["related-events"] });
      queryClient.invalidateQueries({ queryKey: ["checkout-coupons", subtotal, authorizationToken] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings", authorizationToken] });

      const confirmationState = {
        items: response.bookedSeats || selectedItems,
        summary: response.booking?.summary || summary,
        total: response.pricing?.finalAmount || pricing.finalAmount,
        currency,
        bookingMeta: response.booking?.bookingMeta || bookingMeta,
        paymentMethod: response.booking?.paymentMethod || "razorpay",
        couponCode: response.booking?.couponCode || appliedCoupon?.code || "",
        pricing: response.pricing || pricing,
        booking: response.booking || null,
      };

      sessionStorage.setItem(`ticketHubConfirmation:${id}`, JSON.stringify(confirmationState));
      toast.success(response.message || "Payment successful");
      navigate(`/event/${id}/confirmation`, {
        state: confirmationState,
      });
    },
    onError: (error) => {
      const message = error.response?.data?.message || error.message || "Unable to complete payment right now";
      if (message === "Please login to complete payment") {
        navigate("/login", {
          state: {
            redirectTo: `/event/${id}/payment`,
            bookingState,
          },
        });
        return;
      }

      toast.error(message);
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["checkout-coupons", subtotal, authorizationToken] });
    },
  });

  const handleApplyCoupon = (nextCode = couponCode) => {
    const normalizedCode = String(nextCode || "").trim().toUpperCase();

    if (!normalizedCode) {
      setCouponFeedback("Please enter a coupon code");
      return;
    }

    couponMutation.mutate(normalizedCode);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponFeedback("Coupon removed");
    setPricing(buildDefaultPricing(subtotal));
  };

  const handlePayment = () => {
    if (!isLoggedIn) {
      toast.info("Please login to complete payment");
      navigate("/login", {
        state: {
          redirectTo: `/event/${id}/payment`,
          bookingState,
        },
      });
      return;
    }

    paymentMutation.mutate();
  };

  if (!selectedItems.length) {
    return (
      <main className="py-[3rem]">
        <section className="mx-auto w-[min(80rem,calc(100%_-_3.2rem))] rounded-[2.4rem] border border-[rgba(28,28,28,0.08)] bg-white p-[2rem] shadow-[var(--shadow-soft)]">
          <p className="text-[1.5rem] text-[var(--color-text-secondary)]">
            No booking items were found. Please select seats before going to payment.
          </p>
          <Link
            to={id ? `/event/${id}/seats` : "/"}
            className="mt-[1.4rem] inline-flex text-[1.4rem] font-bold text-[var(--color-primary)]"
          >
            Go back to seat selection
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[#f7f7f8] py-[3rem]">
      <section className="mx-auto w-[min(112rem,calc(100%_-_3.2rem))]">
        <div className="flex items-center gap-[1.2rem]">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white text-[var(--color-text-primary)] shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] hover:text-[var(--color-primary)]"
          >
            <ChevronLeft className="h-[1.8rem] w-[1.8rem]" />
          </button>
          <div>
            <h1 className="text-[2.9rem] font-extrabold tracking-[-0.04em] text-[var(--color-text-primary)]">
              Secure Payment
            </h1>
            <p className="mt-[0.2rem] text-[1.45rem] text-[var(--color-text-secondary)]">
              {isLoading || !event ? "Preparing order..." : event.title}
            </p>
          </div>
        </div>

        <div className="mt-[2.4rem] grid items-start gap-[2.2rem] lg:grid-cols-[minmax(0,1.45fr)_minmax(29rem,0.9fr)]">
          <section className="flex flex-col gap-[2rem]">
            {!isLoggedIn ? (
              <div className="rounded-[2rem] border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.08)] px-[1.6rem] py-[1.4rem] text-[1.3rem] text-[var(--color-text-secondary)]">
                Login is required to continue to Razorpay checkout.
              </div>
            ) : null}

            <div className="rounded-[2.4rem] border border-[rgba(15,23,42,0.07)] bg-white p-[2rem] shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
              <h2 className="flex items-center gap-[0.8rem] text-[1.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                <Smartphone className="h-[1.7rem] w-[1.7rem] text-[var(--color-primary)]" />
                Popular Payment Options
              </h2>

              <div className="mt-[1.5rem] rounded-[2rem] border border-[rgba(15,23,42,0.07)] bg-[linear-gradient(135deg,#ffffff_0%,#fff3f6_100%)] p-[1.6rem]">
                <div className="flex items-start gap-[1rem]">
                  <span className="inline-flex h-[4.2rem] w-[4.2rem] items-center justify-center rounded-[1.4rem] bg-[rgba(248,68,100,0.1)] text-[var(--color-primary)]">
                    <CheckCircle className="h-[2rem] w-[2rem]" />
                  </span>
                  <div>
                    <p className="text-[1.5rem] font-bold text-[var(--color-text-primary)]">Razorpay checkout tuned for modern payments</p>
                    <p className="mt-[0.4rem] text-[1.2rem] leading-[1.7] text-[var(--color-text-secondary)]">
                      Users can pay with Google Pay, PhonePe, Paytm, UPI apps, cards, net banking and scan-based UPI flows from one secure checkout.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-[1.4rem] flex flex-wrap gap-[0.8rem]">
                {quickPayBadges.map((item) => (
                  <span
                    key={item}
                    className="inline-flex rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f7f7f8] px-[1.1rem] py-[0.65rem] text-[1.08rem] font-semibold text-[var(--color-text-secondary)]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-[1.6rem] grid gap-[1rem] md:grid-cols-3">
                {paymentHighlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-[1.8rem] border border-[rgba(15,23,42,0.08)] bg-[#fcfcfd] p-[1.3rem]"
                    >
                      <span className="inline-flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-[1.1rem] bg-[rgba(248,68,100,0.08)] text-[var(--color-primary)]">
                        <Icon className="h-[1.7rem] w-[1.7rem]" />
                      </span>
                      <p className="mt-[1rem] text-[1.3rem] font-bold text-[var(--color-text-primary)]">{item.title}</p>
                      <p className="mt-[0.35rem] text-[1.12rem] leading-[1.65] text-[var(--color-text-secondary)]">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="order-[-1] rounded-[2.4rem] border border-[rgba(15,23,42,0.07)] bg-white p-[2rem] shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
              <h2 className="flex items-center gap-[0.8rem] text-[1.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                <Tag className="h-[1.7rem] w-[1.7rem] text-[var(--color-primary)]" />
                Apply Coupon
              </h2>

              {appliedCoupon ? (
                <div className="mt-[1.5rem] flex flex-wrap items-center justify-between gap-[1rem] rounded-[1.8rem] border border-[rgba(248,68,100,0.2)] bg-[rgba(248,68,100,0.05)] px-[1.5rem] py-[1.3rem]">
                  <div className="flex items-center gap-[0.9rem]">
                    <CheckCircle className="h-[1.8rem] w-[1.8rem] text-[var(--color-primary)]" />
                    <div>
                      <p className="text-[1.35rem] font-bold text-[var(--color-text-primary)]">{appliedCoupon.code}</p>
                      <p className="text-[1.18rem] text-[var(--color-text-secondary)]">{appliedCoupon.offerLabel}</p>
                    </div>
                  </div>
                  <button type="button" onClick={removeCoupon} className="text-[1.2rem] font-bold text-[var(--color-primary)]">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="mt-[1.5rem] flex flex-wrap gap-[1rem] sm:flex-nowrap">
                  <input
                    value={couponCode}
                    onChange={(eventObject) => {
                      setCouponCode(eventObject.target.value.toUpperCase());
                      setCouponFeedback("");
                    }}
                    placeholder="Enter coupon code"
                    className="h-[4.8rem] min-w-0 flex-1 rounded-[1.6rem] border border-[rgba(15,23,42,0.08)] bg-[#f7f7f8] px-[1.5rem] text-[1.42rem] uppercase text-[var(--color-text-primary)] outline-none transition-colors duration-200 focus:border-[rgba(248,68,100,0.24)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon(couponCode)}
                    disabled={!couponCode.trim() || couponMutation.isPending}
                    className="inline-flex h-[4.8rem] items-center justify-center rounded-[1.6rem] border border-[rgba(15,23,42,0.08)] bg-[#f1f1f3] px-[2rem] text-[1.35rem] font-bold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {couponMutation.isPending ? "Applying..." : "Apply"}
                  </button>
                </div>
              )}

              {couponFeedback ? (
                <p className={`mt-[1rem] text-[1.2rem] ${appliedCoupon ? "text-[#15803d]" : "text-[var(--color-text-secondary)]"}`}>
                  {couponFeedback}
                </p>
              ) : null}

              <div className="mt-[1.4rem] flex flex-wrap gap-[0.8rem]">
                {couponsLoading ? (
                  <span className="text-[1.15rem] text-[var(--color-text-secondary)]">Loading offers...</span>
                ) : featuredCoupons.length ? (
                  featuredCoupons.map((coupon) => (
                    <button
                      key={coupon.id}
                      type="button"
                      onClick={() => handleApplyCoupon(coupon.code)}
                      disabled={couponMutation.isPending || coupon.isEligible === false}
                      className={`inline-flex rounded-full border px-[1.1rem] py-[0.65rem] text-[1.08rem] font-semibold transition-colors duration-200 ${
                        coupon.isEligible === false
                          ? "cursor-not-allowed border-[rgba(15,23,42,0.06)] bg-[#f1f1f3] text-[var(--color-text-secondary)] opacity-60"
                          : "border-[rgba(15,23,42,0.06)] bg-[#f1f1f3] text-[var(--color-text-secondary)] hover:border-[rgba(248,68,100,0.16)] hover:text-[var(--color-primary)]"
                      }`}
                      title={coupon.offerLabel}
                    >
                      {coupon.code} - {coupon.offerLabel}
                    </button>
                  ))
                ) : (
                  <div className="text-[1.15rem] text-[var(--color-text-secondary)]">
                    No active coupons are available right now.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-[0.7rem] px-[0.3rem] text-[1.15rem] text-[var(--color-text-secondary)]">
              <Shield className="h-[1.45rem] w-[1.45rem] text-[var(--color-primary)]" />
              <span>Razorpay secured checkout with verified payment signature and stored payment records</span>
              <Lock className="h-[1.25rem] w-[1.25rem]" />
            </div>
          </section>

          <aside className="lg:sticky lg:top-[9.5rem]">
            <div className="rounded-[2.4rem] border border-[rgba(15,23,42,0.07)] bg-white p-[1.8rem] shadow-[0_24px_54px_rgba(15,23,42,0.08)]">
              <h2 className="text-[1.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                Order Summary
              </h2>

              {event ? (
                <div className="mt-[1.5rem] flex gap-[1rem]">
                  <PosterImage src={event.poster} alt={event.title} className="h-[6.4rem] w-[6.4rem] rounded-[1.4rem] object-cover" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[1.52rem] font-bold leading-[1.35] text-[var(--color-text-primary)]">{event.title}</p>
                    <p className="mt-[0.25rem] text-[1.15rem] text-[var(--color-text-secondary)]">{formatEventSchedule(event.date)}</p>
                    <p className="text-[1.15rem] text-[var(--color-text-secondary)]">{event.venue}</p>
                  </div>
                </div>
              ) : null}

              <div className="mt-[1.6rem] border-t border-[rgba(15,23,42,0.07)] pt-[1.4rem]">
                {bookingMeta.selectedZones?.length ? (
                  <div className="mb-[1rem] rounded-[1.4rem] bg-[#f7f7f8] px-[1.2rem] py-[1rem] text-[1.18rem] text-[var(--color-text-secondary)]">
                    Sections: <span className="font-bold text-[var(--color-text-primary)]">{bookingMeta.selectedZones.join(", ")}</span>
                  </div>
                ) : null}
                <div className="space-y-[0.85rem]">
                  {summary.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-[1rem] text-[1.28rem] text-[var(--color-text-secondary)]">
                      <span>{item.label} x {item.count}</span>
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {item.currency}
                        {(item.count * item.price).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-[1.4rem] border-t border-[rgba(15,23,42,0.07)] pt-[1.2rem] text-[1.28rem]">
                <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                  <span>Subtotal</span>
                  <span className="text-[var(--color-text-primary)]">
                    {currency}
                    {pricing.cartAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="mt-[0.6rem] flex items-center justify-between text-[var(--color-text-secondary)]">
                  <span>Convenience fee</span>
                  <span className="text-[var(--color-text-primary)]">
                    {currency}
                    {pricing.convenienceFee.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="mt-[0.6rem] flex items-center justify-between text-[var(--color-text-secondary)]">
                  <span>GST</span>
                  <span className="text-[var(--color-text-primary)]">
                    {currency}
                    {pricing.gstAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                {pricing.discountAmount ? (
                  <div className="mt-[0.6rem] flex items-center justify-between text-[var(--color-primary)]">
                    <span>Discount ({appliedCoupon?.code || couponCode})</span>
                    <span>
                      -{currency}
                      {pricing.discountAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-[1.4rem] border-t border-[rgba(15,23,42,0.07)] pt-[1.3rem]">
                <div className="flex items-end justify-between gap-[1rem]">
                  <div>
                    <p className="text-[1.35rem] text-[var(--color-text-secondary)]">Total</p>
                    {savingsText ? <p className="mt-[0.3rem] text-[1.15rem] font-bold text-[#15803d]">{savingsText}</p> : null}
                  </div>
                  <span className="text-[2.7rem] font-extrabold tracking-[-0.05em] text-[var(--color-text-primary)]">
                    {currency}
                    {pricing.finalAmount.toLocaleString("en-IN")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={paymentMutation.isPending || couponMutation.isPending || !selectedItems.length}
                  className="mt-[1.5rem] inline-flex h-[5rem] w-full items-center justify-center rounded-[1.6rem] bg-[var(--color-primary)] text-[1.6rem] font-bold text-[var(--color-text-light)] shadow-[0_18px_30px_rgba(248,68,100,0.22)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {paymentMutation.isPending ? "Opening Razorpay..." : `Pay ${currency}${pricing.finalAmount.toLocaleString("en-IN")}`}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};
