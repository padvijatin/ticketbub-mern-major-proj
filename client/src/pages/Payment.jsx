import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle,
  ChevronLeft,
  CreditCard,
  Lock,
  Shield,
  Smartphone,
  Tag,
} from "lucide-react";
import { FaCcVisa, FaWallet } from "react-icons/fa";
import { toast } from "react-toastify";
import { bookEvent, getEventById } from "../utils/eventApi.js";

const PaymentBrandStrip = ({ type, isActive }) => {
  const brandClassName = isActive
    ? "border-[rgba(248,68,100,0.18)] bg-white"
    : "border-transparent bg-[rgba(28,28,28,0.05)]";
  const logoClassName = "h-[1.8rem] w-auto object-contain";
  const BrandItem = ({ src, alt, fallbackIcon: FallbackIcon }) => (
    <span className={`inline-flex h-[3rem] items-center rounded-[1rem] border px-[0.8rem] ${brandClassName}`}>
      {src ? <img src={src} alt={alt} className={logoClassName} /> : <FallbackIcon className="h-[1.6rem] w-[1.6rem] text-[#2563eb]" />}
    </span>
  );

  if (type === "upi") {
    return (
      <div className="flex flex-wrap gap-[0.7rem]">
        <BrandItem src="/brands/gpay.svg" alt="Google Pay" />
        <BrandItem src="/brands/phonepe.svg" alt="PhonePe" />
        <BrandItem src="/brands/paytm.svg" alt="Paytm" />
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className="flex flex-wrap gap-[0.7rem]">
        <BrandItem src="/brands/visa.svg" alt="Visa" />
        <BrandItem src="/brands/mastercard.svg" alt="Mastercard" />
      </div>
    );
  }

  if (type === "wallet") {
    return (
      <div className="flex flex-wrap gap-[0.7rem]">
        <BrandItem src="/brands/paytm.svg" alt="Paytm" />
        <BrandItem src="/brands/amazon-pay.svg" alt="Amazon Pay" />
        <BrandItem src="/brands/mobikwik.svg" alt="MobiKwik" fallbackIcon={FaWallet} />
      </div>
    );
  }

  return null;
};

const coupons = {
  FIRST50: { discount: 50, type: "percent", label: "50% off (max Rs 500)" },
  FLAT200: { discount: 200, type: "flat", label: "Rs 200 off" },
  WELCOME: { discount: 20, type: "percent", label: "20% off (max Rs 300)" },
};

const paymentMethods = [
  { id: "upi", label: "UPI", description: "Google Pay, PhonePe, Paytm", icon: Smartphone },
  { id: "card", label: "Credit / Debit Card", description: "Visa, Mastercard, RuPay", icon: FaCcVisa },
  { id: "netbanking", label: "Net Banking", description: "All major banks", icon: Building2 },
  { id: "wallet", label: "Wallets", description: "Paytm, Amazon Pay, MobiKwik", icon: FaWallet },
];

export const Payment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const bookingState = location.state || {};
  const selectedItems = bookingState.items || [];
  const summary = bookingState.summary || [];
  const subtotal = bookingState.total || 0;
  const currency = bookingState.currency || "Rs ";
  const bookingMeta = bookingState.bookingMeta || {};
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEventById(id),
    enabled: Boolean(id),
  });

  const discount = useMemo(() => {
    if (!appliedCoupon) {
      return 0;
    }

    const coupon = coupons[appliedCoupon];

    if (coupon.type === "percent") {
      return Math.min((subtotal * coupon.discount) / 100, coupon.discount === 50 ? 500 : 300);
    }

    return coupon.discount;
  }, [appliedCoupon, subtotal]);

  const convenienceFee = Math.round(subtotal * 0.02);
  const gst = Math.round((subtotal - discount) * 0.18 * 0.02);
  const total = subtotal - discount + convenienceFee + gst;

  const bookingMutation = useMutation({
    mutationFn: () => bookEvent({ eventId: id, seats: selectedItems }),
    onSuccess: (response) => {
      queryClient.setQueryData(["event", id], response.event);
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["related-events"] });
      toast.success(response.message || "Booking confirmed");
      navigate(`/event/${id}/confirmation`, {
        state: {
          items: response.bookedSeats || selectedItems,
          summary,
          subtotal,
          total,
          currency,
          bookingMeta,
          paymentMethod: selectedMethod,
        },
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Unable to complete booking right now");
      queryClient.invalidateQueries({ queryKey: ["event", id] });
    },
  });

  const applyCoupon = () => {
    const normalizedCode = couponCode.trim().toUpperCase();

    if (coupons[normalizedCode]) {
      setAppliedCoupon(normalizedCode);
      setCouponError("");
      return;
    }

    setAppliedCoupon(null);
    setCouponError("Invalid coupon code");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const handlePayment = () => {
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
    <main className="py-[3rem]">
      <section className="mx-auto w-[min(118rem,calc(100%_-_3.2rem))] space-y-[2rem]">
        <div className="flex items-center gap-[1.2rem]">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-full border border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-soft)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] hover:text-[var(--color-primary)]"
          >
            <ChevronLeft className="h-[1.8rem] w-[1.8rem]" />
          </button>
          <div>
            <h1 className="text-[2.8rem] font-extrabold tracking-[-0.04em] text-[var(--color-text-primary)]">
              Payment
            </h1>
            <p className="mt-[0.5rem] text-[1.4rem] text-[var(--color-text-secondary)]">
              {isLoading || !event ? "Preparing order..." : event.title}
            </p>
          </div>
        </div>

        <div className="grid gap-[2rem] lg:grid-cols-[minmax(0,1.35fr)_minmax(32rem,0.85fr)]">
          <section className="space-y-[1.8rem]">
            <div className="rounded-[2.2rem] border border-[rgba(28,28,28,0.08)] bg-white p-[1.8rem] shadow-[var(--shadow-soft)]">
              <h2 className="flex items-center gap-[0.8rem] text-[1.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                <Tag className="h-[1.8rem] w-[1.8rem] text-[var(--color-primary)]" />
                Apply Coupon
              </h2>

              {appliedCoupon ? (
                <div className="mt-[1.4rem] flex items-center justify-between rounded-[1.6rem] border border-[rgba(248,68,100,0.18)] bg-[rgba(248,68,100,0.06)] p-[1.3rem]">
                  <div className="flex items-center gap-[0.8rem]">
                    <CheckCircle className="h-[1.8rem] w-[1.8rem] text-[var(--color-primary)]" />
                    <div>
                      <p className="text-[1.35rem] font-bold text-[var(--color-text-primary)]">{appliedCoupon}</p>
                      <p className="text-[1.2rem] text-[var(--color-text-secondary)]">{coupons[appliedCoupon].label}</p>
                    </div>
                  </div>
                  <button type="button" onClick={removeCoupon} className="text-[1.2rem] font-bold text-[var(--color-primary)]">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="mt-[1.4rem] flex flex-wrap gap-[1rem]">
                  <input
                    value={couponCode}
                    onChange={(eventObject) => {
                      setCouponCode(eventObject.target.value);
                      setCouponError("");
                    }}
                    placeholder="Enter coupon code"
                    className="h-[4.4rem] min-w-0 flex-1 rounded-[1.4rem] border border-[rgba(28,28,28,0.08)] bg-white px-[1.4rem] text-[1.4rem] text-[var(--color-text-primary)] outline-none transition-colors duration-200 focus:border-[rgba(248,68,100,0.24)]"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={!couponCode.trim()}
                    className="inline-flex h-[4.4rem] items-center justify-center rounded-[1.4rem] border border-[rgba(28,28,28,0.08)] bg-white px-[1.6rem] text-[1.35rem] font-bold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              )}

              {couponError ? <p className="mt-[0.9rem] text-[1.2rem] text-[#dc2626]">{couponError}</p> : null}

              <div className="mt-[1.2rem] flex flex-wrap gap-[0.8rem]">
                {Object.entries(coupons).map(([code, info]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCouponCode(code)}
                    className="rounded-full bg-[rgba(28,28,28,0.05)] px-[0.9rem] py-[0.5rem] text-[1.05rem] text-[var(--color-text-secondary)] transition-colors duration-200 hover:text-[var(--color-text-primary)]"
                  >
                    {code} - {info.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2.2rem] border border-[rgba(28,28,28,0.08)] bg-white p-[1.8rem] shadow-[var(--shadow-soft)]">
              <h2 className="flex items-center gap-[0.8rem] text-[1.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                <CreditCard className="h-[1.8rem] w-[1.8rem] text-[var(--color-primary)]" />
                Payment Method
              </h2>

              <div className="mt-[1.4rem] space-y-[1rem]">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      className={`flex w-full items-center gap-[1.4rem] rounded-[1.6rem] border-2 p-[1.4rem] text-left transition-all duration-200 ${
                        selectedMethod === method.id
                          ? "border-[rgba(248,68,100,0.24)] bg-[rgba(248,68,100,0.05)]"
                          : "border-[rgba(28,28,28,0.08)] bg-white hover:border-[rgba(248,68,100,0.18)]"
                      }`}
                    >
                      <span
                        className={`inline-flex h-[4.2rem] w-[4.2rem] shrink-0 items-center justify-center rounded-[1.2rem] ${
                          selectedMethod === method.id
                            ? "bg-[var(--color-primary)] text-[var(--color-text-light)]"
                            : "bg-[rgba(28,28,28,0.06)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        <Icon className="h-[1.9rem] w-[1.9rem]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[1.45rem] font-bold text-[var(--color-text-primary)]">
                          {method.label}
                        </span>
                        <span className="mt-[0.3rem] block text-[1.2rem] text-[var(--color-text-secondary)]">
                          {method.description}
                        </span>
                        <span className="mt-[0.9rem] block">
                          <PaymentBrandStrip type={method.id} isActive={selectedMethod === method.id} />
                        </span>
                      </span>
                      <span
                        className={`inline-flex h-[1.9rem] w-[1.9rem] shrink-0 rounded-full border-2 ${
                          selectedMethod === method.id
                            ? "border-[var(--color-primary)]"
                            : "border-[rgba(28,28,28,0.18)]"
                        }`}
                      >
                        {selectedMethod === method.id ? (
                          <span className="m-[0.18rem] block h-full w-full rounded-full bg-[var(--color-primary)]" />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-[0.9rem] px-[0.4rem] text-[1.15rem] text-[var(--color-text-secondary)]">
              <Shield className="h-[1.5rem] w-[1.5rem] text-[var(--color-primary)]" />
              <span>Your payment is secured with 256-bit SSL encryption.</span>
              <Lock className="h-[1.3rem] w-[1.3rem]" />
            </div>
          </section>

          <aside className="rounded-[2.2rem] border border-[rgba(28,28,28,0.08)] bg-white p-[1.8rem] shadow-[var(--shadow-soft)]">
            <h2 className="text-[1.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
              Order Summary
            </h2>

            {event ? (
              <div className="mt-[1.4rem] flex gap-[1rem]">
                <img src={event.poster || "/fallback.jpg"} alt={event.title} className="h-[7rem] w-[7rem] rounded-[1.2rem] object-cover" />
                <div className="min-w-0">
                  <p className="line-clamp-1 text-[1.45rem] font-bold text-[var(--color-text-primary)]">{event.title}</p>
                  <p className="mt-[0.35rem] text-[1.15rem] text-[var(--color-text-secondary)]">{event.venue}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-[1.6rem] space-y-[0.9rem] border-t border-[rgba(28,28,28,0.08)] pt-[1.4rem] text-[1.3rem]">
              {bookingMeta.selectedZones?.length ? (
                <div className="rounded-[1.4rem] bg-[rgba(28,28,28,0.03)] px-[1.2rem] py-[1rem] text-[1.2rem] text-[var(--color-text-secondary)]">
                  Sections: <span className="font-bold text-[var(--color-text-primary)]">{bookingMeta.selectedZones.join(", ")}</span>
                </div>
              ) : null}
              {summary.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-[1rem] text-[var(--color-text-secondary)]">
                  <span>
                    {item.label} x {item.count}
                  </span>
                  <span className="font-bold text-[var(--color-text-primary)]">
                    {item.currency}
                    {(item.count * item.price).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-[1.6rem] space-y-[0.8rem] border-t border-[rgba(28,28,28,0.08)] pt-[1.4rem] text-[1.3rem]">
              <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                <span>Subtotal</span>
                <span className="text-[var(--color-text-primary)]">
                  {currency}
                  {subtotal.toLocaleString("en-IN")}
                </span>
              </div>
              {discount ? (
                <div className="flex items-center justify-between text-[var(--color-primary)]">
                  <span>Discount ({appliedCoupon})</span>
                  <span>
                    -{currency}
                    {discount.toLocaleString("en-IN")}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                <span>Convenience fee</span>
                <span className="text-[var(--color-text-primary)]">
                  {currency}
                  {convenienceFee.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                <span>GST</span>
                <span className="text-[var(--color-text-primary)]">
                  {currency}
                  {gst.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="mt-[1.6rem] flex items-center justify-between border-t border-[rgba(28,28,28,0.08)] pt-[1.4rem]">
              <span className="text-[1.4rem] text-[var(--color-text-secondary)]">Total</span>
              <span className="text-[2.5rem] font-extrabold tracking-[-0.04em] text-[var(--color-text-primary)]">
                {currency}
                {total.toLocaleString("en-IN")}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePayment}
              disabled={bookingMutation.isPending || !selectedItems.length}
              className="mt-[1.6rem] inline-flex h-[4.8rem] w-full items-center justify-center rounded-[1.4rem] bg-[var(--color-primary)] text-[1.5rem] font-bold text-[var(--color-text-light)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bookingMutation.isPending ? "Processing..." : `Pay ${currency}${total.toLocaleString("en-IN")}`}
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
};
