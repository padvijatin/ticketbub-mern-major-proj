import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle,
  ChevronLeft,
  Lock,
  Shield,
  Smartphone,
  Tag,
} from "lucide-react";
import { FaCcVisa, FaWallet } from "react-icons/fa";
import { toast } from "react-toastify";
import { getCoupons, validateCoupon } from "../utils/couponApi.js";
import { bookEvent, getEventById } from "../utils/eventApi.js";
import { useAuth } from "../store/auth.jsx";

const paymentMethods = [
  { id: "upi", label: "UPI", description: "Google Pay, PhonePe, Paytm", icon: Smartphone },
  { id: "card", label: "Credit / Debit Card", description: "Visa, Mastercard, RuPay", icon: FaCcVisa },
  { id: "netbanking", label: "Net Banking", description: "All major banks", icon: Building2 },
  { id: "wallet", label: "Wallets", description: "Paytm, Amazon Pay, MobiKwik", icon: FaWallet },
];

const paymentMethodLogos = {
  upi: [
    { src: "/brands/gpay.svg", alt: "Google Pay" },
    { src: "/brands/phonepe.svg", alt: "PhonePe" },
    { src: "/brands/paytm.svg", alt: "Paytm" },
  ],
  card: [
    { src: "/brands/visa.svg", alt: "Visa" },
    { src: "/brands/mastercard.svg", alt: "Mastercard" },
  ],
  wallet: [
    { src: "/brands/paytm.svg", alt: "Paytm" },
    { src: "/brands/amazon-pay.svg", alt: "Amazon Pay" },
    { src: "/brands/mobikwik.svg", alt: "MobiKwik" },
  ],
};

const PaymentMethodLogos = ({ methodId, isActive }) => {
  const logos = paymentMethodLogos[methodId] || [];

  if (!logos.length) {
    return null;
  }

  return (
    <div className="mt-[0.85rem] flex flex-wrap gap-[0.65rem]">
      {logos.map((logo) => (
        <span
          key={logo.alt}
          className={`inline-flex h-[3rem] items-center rounded-[1rem] border px-[0.85rem] ${
            isActive
              ? "border-[rgba(248,68,100,0.18)] bg-white"
              : "border-[rgba(15,23,42,0.06)] bg-[#f7f7f8]"
          }`}
        >
          <img src={logo.src} alt={logo.alt} className="h-[1.7rem] w-auto object-contain" />
        </span>
      ))}
    </div>
  );
};

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

export const Payment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { authorizationToken, isLoggedIn } = useAuth();
  const bookingState = location.state || {};
  const selectedItems = bookingState.items || [];
  const summary = bookingState.summary || [];
  const subtotal = bookingState.total || 0;
  const currency = bookingState.currency || "Rs ";
  const bookingMeta = bookingState.bookingMeta || {};
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponFeedback, setCouponFeedback] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [pricing, setPricing] = useState(() => buildDefaultPricing(subtotal));
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: "",
    holderName: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    bankName: "",
    accountHolder: "",
    walletProvider: "",
    walletMobile: "",
  });

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

  const bookingMutation = useMutation({
    mutationFn: () =>
      bookEvent({
        eventId: id,
        seats: selectedItems,
        couponCode: appliedCoupon?.code || "",
        paymentMethod: selectedMethod,
        paymentDetails,
        bookingMeta,
        authorizationToken,
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(["event", id, authorizationToken], response.event);
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["related-events"] });
      queryClient.invalidateQueries({ queryKey: ["checkout-coupons", subtotal, authorizationToken] });

      const confirmationState = {
        items: response.bookedSeats || selectedItems,
        summary: response.booking?.summary || summary,
        total: response.pricing?.finalAmount || pricing.finalAmount,
        currency,
        bookingMeta: response.booking?.bookingMeta || bookingMeta,
        paymentMethod: response.booking?.paymentMethod || selectedMethod,
        couponCode: response.booking?.couponCode || appliedCoupon?.code || "",
        pricing: response.pricing || pricing,
        booking: response.booking || null,
      };

      sessionStorage.setItem(`ticketHubConfirmation:${id}`, JSON.stringify(confirmationState));
      toast.success(response.message || "Booking confirmed");
      navigate(`/event/${id}/confirmation`, {
        state: confirmationState,
      });
    },
    onError: (error) => {
      const message = error.response?.data?.message || "Unable to complete booking right now";
      if (error.response?.status === 401) {
        toast.error("Please login to complete payment");
      } else {
        toast.error(message);
      }
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

    if (selectedMethod === "upi" && !/^[a-z0-9.\-_]{2,}@[a-z]{2,}$/i.test(String(paymentDetails.upiId || "").trim())) {
      toast.error("Enter a valid UPI ID (example: user@upi)");
      return;
    }

    if (selectedMethod === "card") {
      const cardDigits = String(paymentDetails.cardNumber || "").replace(/\D/g, "");
      if (!String(paymentDetails.holderName || "").trim() || cardDigits.length < 12) {
        toast.error("Enter valid card details");
        return;
      }
    }

    if (selectedMethod === "netbanking" && (!String(paymentDetails.bankName || "").trim() || !String(paymentDetails.accountHolder || "").trim())) {
      toast.error("Enter bank and account holder details");
      return;
    }

    if (selectedMethod === "wallet" && (!String(paymentDetails.walletProvider || "").trim() || String(paymentDetails.walletMobile || "").replace(/\D/g, "").length < 10)) {
      toast.error("Enter wallet provider and mobile number");
      return;
    }

    bookingMutation.mutate();
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
              Payment
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
                Login is required only when you complete payment. Coupons can still be checked before checkout.
              </div>
            ) : null}

            <div className="rounded-[2.4rem] border border-[rgba(15,23,42,0.07)] bg-white p-[2rem] shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
              <h2 className="flex items-center gap-[0.8rem] text-[1.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                <span className="inline-flex h-[1.6rem] w-[1.6rem] rounded-[0.45rem] border border-[rgba(248,68,100,0.28)] bg-[rgba(248,68,100,0.08)]" />
                Payment Method
              </h2>

              <div className="mt-[1.5rem] space-y-[1rem]">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      className={`flex w-full items-center gap-[1.4rem] rounded-[1.8rem] border p-[1.35rem] text-left transition-all duration-200 ${
                        selectedMethod === method.id
                          ? "border-[rgba(248,68,100,0.9)] bg-[rgba(248,68,100,0.04)] shadow-[0_12px_24px_rgba(248,68,100,0.08)]"
                          : "border-[rgba(15,23,42,0.08)] bg-white hover:border-[rgba(248,68,100,0.16)]"
                      }`}
                    >
                      <span
                        className={`inline-flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-[1.2rem] ${
                          selectedMethod === method.id
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[#f1f1f3] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        <Icon className="h-[1.8rem] w-[1.8rem]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[1.45rem] font-bold text-[var(--color-text-primary)]">
                          {method.label}
                        </span>
                        <span className="mt-[0.2rem] block text-[1.18rem] text-[var(--color-text-secondary)]">
                          {method.description}
                        </span>
                        <PaymentMethodLogos methodId={method.id} isActive={selectedMethod === method.id} />
                      </span>
                      <span
                        className={`inline-flex h-[2rem] w-[2rem] shrink-0 items-center justify-center rounded-full border ${
                          selectedMethod === method.id
                            ? "border-[var(--color-primary)]"
                            : "border-[rgba(15,23,42,0.14)]"
                        }`}
                      >
                        {selectedMethod === method.id ? (
                          <span className="h-[0.95rem] w-[0.95rem] rounded-full bg-[var(--color-primary)]" />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-[1.4rem] rounded-[1.8rem] border border-[rgba(15,23,42,0.07)] bg-[#fafafb] p-[1.4rem]">
                <p className="text-[1.14rem] font-semibold text-[var(--color-text-secondary)]">
                  Demo payment details
                </p>
                {selectedMethod === "upi" ? (
                  <input
                    value={paymentDetails.upiId}
                    onChange={(eventObject) => setPaymentDetails((current) => ({ ...current, upiId: eventObject.target.value }))}
                    placeholder="name@upi"
                    className="mt-[0.9rem] h-[4.5rem] w-full rounded-[1.3rem] border border-[rgba(15,23,42,0.08)] bg-white px-[1.2rem] text-[1.3rem] outline-none focus:border-[rgba(248,68,100,0.24)]"
                  />
                ) : null}
                {selectedMethod === "card" ? (
                  <div className="mt-[0.9rem] grid gap-[0.8rem] md:grid-cols-2">
                    <input
                      value={paymentDetails.holderName}
                      onChange={(eventObject) => setPaymentDetails((current) => ({ ...current, holderName: eventObject.target.value }))}
                      placeholder="Card holder name"
                      className="h-[4.5rem] rounded-[1.3rem] border border-[rgba(15,23,42,0.08)] bg-white px-[1.2rem] text-[1.3rem] outline-none focus:border-[rgba(248,68,100,0.24)]"
                    />
                    <input
                      value={paymentDetails.cardNumber}
                      onChange={(eventObject) => setPaymentDetails((current) => ({ ...current, cardNumber: eventObject.target.value }))}
                      placeholder="4111 1111 1111 1111"
                      className="h-[4.5rem] rounded-[1.3rem] border border-[rgba(15,23,42,0.08)] bg-white px-[1.2rem] text-[1.3rem] outline-none focus:border-[rgba(248,68,100,0.24)]"
                    />
                  </div>
                ) : null}
                {selectedMethod === "netbanking" ? (
                  <div className="mt-[0.9rem] grid gap-[0.8rem] md:grid-cols-2">
                    <input
                      value={paymentDetails.bankName}
                      onChange={(eventObject) => setPaymentDetails((current) => ({ ...current, bankName: eventObject.target.value }))}
                      placeholder="Bank name"
                      className="h-[4.5rem] rounded-[1.3rem] border border-[rgba(15,23,42,0.08)] bg-white px-[1.2rem] text-[1.3rem] outline-none focus:border-[rgba(248,68,100,0.24)]"
                    />
                    <input
                      value={paymentDetails.accountHolder}
                      onChange={(eventObject) => setPaymentDetails((current) => ({ ...current, accountHolder: eventObject.target.value }))}
                      placeholder="Account holder"
                      className="h-[4.5rem] rounded-[1.3rem] border border-[rgba(15,23,42,0.08)] bg-white px-[1.2rem] text-[1.3rem] outline-none focus:border-[rgba(248,68,100,0.24)]"
                    />
                  </div>
                ) : null}
                {selectedMethod === "wallet" ? (
                  <div className="mt-[0.9rem] grid gap-[0.8rem] md:grid-cols-2">
                    <input
                      value={paymentDetails.walletProvider}
                      onChange={(eventObject) => setPaymentDetails((current) => ({ ...current, walletProvider: eventObject.target.value }))}
                      placeholder="Wallet provider"
                      className="h-[4.5rem] rounded-[1.3rem] border border-[rgba(15,23,42,0.08)] bg-white px-[1.2rem] text-[1.3rem] outline-none focus:border-[rgba(248,68,100,0.24)]"
                    />
                    <input
                      value={paymentDetails.walletMobile}
                      onChange={(eventObject) => setPaymentDetails((current) => ({ ...current, walletMobile: eventObject.target.value }))}
                      placeholder="Mobile number"
                      className="h-[4.5rem] rounded-[1.3rem] border border-[rgba(15,23,42,0.08)] bg-white px-[1.2rem] text-[1.3rem] outline-none focus:border-[rgba(248,68,100,0.24)]"
                    />
                  </div>
                ) : null}
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
              <span>Your payment is secured with 256-bit SSL encryption</span>
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
                  <img src={event.poster || "/fallback.jpg"} alt={event.title} className="h-[6.4rem] w-[6.4rem] rounded-[1.4rem] object-cover" />
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
                  disabled={bookingMutation.isPending || couponMutation.isPending || !selectedItems.length}
                  className="mt-[1.5rem] inline-flex h-[5rem] w-full items-center justify-center rounded-[1.6rem] bg-[var(--color-primary)] text-[1.6rem] font-bold text-[var(--color-text-light)] shadow-[0_18px_30px_rgba(248,68,100,0.22)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bookingMutation.isPending ? "Processing..." : `Pay ${currency}${pricing.finalAmount.toLocaleString("en-IN")}`}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

