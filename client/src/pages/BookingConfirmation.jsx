import { useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Download, MapPin, Share2, Tag, Ticket } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "react-toastify";
import { BrandLogo } from "../components/BrandLogo.jsx";
import PosterImage from "../components/PosterImage.jsx";
import { getEventById } from "../utils/eventApi.js";

export const BookingConfirmation = () => {
  const { id } = useParams();
  const location = useLocation();
  const ticketRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const bookingState = useMemo(() => {
    if (location.state) {
      return location.state;
    }

    try {
      const storedValue = sessionStorage.getItem(`ticketHubConfirmation:${id}`);
      return storedValue ? JSON.parse(storedValue) : {};
    } catch {
      return {};
    }
  }, [id, location.state]);
  const selectedItems = bookingState.items || [];
  const summary = bookingState.summary || [];
  const currency = bookingState.currency || "Rs ";
  const bookingMeta = bookingState.bookingMeta || {};
  const paymentMethod = bookingState.paymentMethod || "razorpay";
  const booking = bookingState.booking || null;
  const pricing = bookingState.pricing || {
    cartAmount: booking?.originalAmount || bookingState.total || 0,
    discountAmount: booking?.discountAmount || 0,
    finalAmount: booking?.finalAmount || bookingState.total || 0,
  };
  const bookingId = booking?.bookingId || "";
  const qrCodeDataUrl = booking?.qrCodeDataUrl || "";
  const ticketUrl = booking?.qrPayload || (bookingId ? `${window.location.origin}/ticket/${bookingId}` : window.location.href);
  const paymentRef = booking?.paymentId || booking?.paymentReference || "Captured";
  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEventById(id),
    enabled: Boolean(id),
  });

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;
    if (!bookingId) {
      toast.error("Booking id is missing. Please retry from Payment.");
      return;
    }

    setIsDownloading(true);
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `TicketHub-${bookingId}.png`;
      link.click();
    } catch {
      toast.error("Unable to download ticket right now");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!bookingId) {
      toast.error("Booking id is missing. Please retry from Payment.");
      return;
    }

    const shareText = `TicketHub Booking ${bookingId} for ${event?.title || "your event"}`;
    const shareUrl = ticketUrl;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "TicketHub Ticket",
          text: shareText,
          url: shareUrl,
        });
        return;
      }
    } catch {
      // If user cancels native share, fall back to copy.
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success("Ticket link copied");
    } catch {
      toast.success("Copy this link from the address bar");
    }
  };

  return (
    <main className="py-[3rem]">
      <section className="mx-auto w-[min(84rem,calc(100%_-_3.2rem))] space-y-[2rem]">
        <div className="text-center">
          <div className="mx-auto inline-flex h-[6.4rem] w-[6.4rem] items-center justify-center rounded-full bg-[rgba(34,197,94,0.14)] text-[#16a34a]">
            <CheckCircle2 className="h-[3.6rem] w-[3.6rem]" />
          </div>
          <h1 className="mt-[1.2rem] text-[3.2rem] font-extrabold tracking-[-0.04em] text-[var(--color-text-primary)]">
            Booking Confirmed
          </h1>
          <p className="mt-[0.8rem] text-[1.4rem] text-[var(--color-text-secondary)]">
            Booking ID: <span className="font-bold text-[var(--color-text-primary)]">{bookingId || "Unavailable"}</span>
          </p>
        </div>

        <article
          ref={ticketRef}
          className="overflow-hidden rounded-[2.4rem] border border-[rgba(248,68,100,0.14)] bg-white shadow-[0_18px_36px_rgba(28,28,28,0.08)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-[0.8rem] border-b border-[rgba(248,68,100,0.16)] bg-[linear-gradient(90deg,rgba(248,68,100,0.08)_0%,rgba(248,68,100,0.02)_100%)] px-[1.8rem] py-[1.2rem]">
            <BrandLogo size="sm" />
            <p className="inline-flex h-[2.6rem] items-center rounded-full border border-[rgba(248,68,100,0.2)] bg-white px-[1rem] text-[1.05rem] font-extrabold tracking-[0.08em] text-[var(--color-text-secondary)]">
              ADMIT ONE
            </p>
          </div>
          {event ? (
            <div className="relative h-[20rem] overflow-hidden">
              <PosterImage src={event.poster} alt={event.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,28,28,0.12)_0%,rgba(28,28,28,0.72)_100%)]" />
              <div className="absolute bottom-[1.8rem] left-[1.8rem] right-[1.8rem]">
                <h2 className="text-[2.2rem] font-extrabold tracking-[-0.03em] text-white">{event.title}</h2>
                <p className="mt-[0.3rem] text-[1.2rem] text-white/82">{event.category}</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="h-[20rem] animate-pulse bg-[linear-gradient(180deg,#eceff3_0%,#e2e8f0_100%)]" />
          ) : null}

          <div className="p-[2rem]">
            {event ? (
              <div className="grid gap-[1.2rem] md:grid-cols-2">
                <div className="flex items-start gap-[0.8rem]">
                  <CalendarDays className="mt-[0.2rem] h-[1.6rem] w-[1.6rem] text-[var(--color-primary)]" />
                  <div>
                    <p className="text-[1.1rem] text-[var(--color-text-secondary)]">Date</p>
                    <p className="text-[1.4rem] font-bold text-[var(--color-text-primary)]">
                      {new Date(event.date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-[0.8rem]">
                  <MapPin className="mt-[0.2rem] h-[1.6rem] w-[1.6rem] text-[var(--color-primary)]" />
                  <div>
                    <p className="text-[1.1rem] text-[var(--color-text-secondary)]">Venue</p>
                    <p className="text-[1.4rem] font-bold text-[var(--color-text-primary)]">
                      {event.venue}, {event.city}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-[0.8rem]">
                  <Ticket className="mt-[0.2rem] h-[1.6rem] w-[1.6rem] text-[var(--color-primary)]" />
                  <div>
                    <p className="text-[1.1rem] text-[var(--color-text-secondary)]">Tickets</p>
                    <p className="text-[1.4rem] font-bold text-[var(--color-text-primary)]">
                      {selectedItems.length ? selectedItems.join(", ") : "Selection confirmed"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[1.1rem] text-[var(--color-text-secondary)]">Sections</p>
                  <p className="text-[1.4rem] font-bold text-[var(--color-text-primary)]">
                    {bookingMeta.selectedZones?.length ? bookingMeta.selectedZones.join(", ") : "Standard allocation"}
                  </p>
                </div>
                <div>
                  <p className="text-[1.1rem] text-[var(--color-text-secondary)]">Payment Method</p>
                  <p className="text-[1.4rem] font-bold uppercase text-[var(--color-text-primary)]">{paymentMethod}</p>
                </div>
                <div>
                  <p className="text-[1.1rem] text-[var(--color-text-secondary)]">Payment Ref</p>
                  <p className="text-[1.4rem] font-bold text-[var(--color-text-primary)]">{paymentRef}</p>
                </div>
                {booking?.couponCode ? (
                  <div className="flex items-start gap-[0.8rem]">
                    <Tag className="mt-[0.2rem] h-[1.6rem] w-[1.6rem] text-[var(--color-primary)]" />
                    <div>
                      <p className="text-[1.1rem] text-[var(--color-text-secondary)]">Coupon Applied</p>
                      <p className="text-[1.4rem] font-bold text-[var(--color-text-primary)]">{booking.couponCode}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {summary.length ? (
              <div className="mt-[1.8rem] rounded-[1.8rem] bg-[rgba(28,28,28,0.03)] p-[1.4rem]">
                <p className="text-[1.15rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                  Booking Breakdown
                </p>
                <div className="mt-[1rem] space-y-[0.8rem] text-[1.3rem]">
                  {summary.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-[1rem]">
                      <span className="text-[var(--color-text-secondary)]">
                        {item.label} x {item.count}
                      </span>
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {item.currency}
                        {(item.count * item.price).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-[1.8rem] rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-[rgba(28,28,28,0.02)] p-[1.4rem] text-[1.3rem]">
              <div className="flex items-center justify-between gap-[1rem] text-[var(--color-text-secondary)]">
                <span>Subtotal</span>
                <span className="font-bold text-[var(--color-text-primary)]">{currency}{Number(pricing.cartAmount || 0).toLocaleString("en-IN")}</span>
              </div>
              {pricing.discountAmount ? (
                <div className="mt-[0.8rem] flex items-center justify-between gap-[1rem] text-[var(--color-primary)]">
                  <span>Discount{booking?.couponCode ? ` (${booking.couponCode})` : ""}</span>
                  <span className="font-bold">-{currency}{Number(pricing.discountAmount || 0).toLocaleString("en-IN")}</span>
                </div>
              ) : null}
            </div>

            <div className="my-[1.8rem] border-t border-dashed border-[rgba(28,28,28,0.14)]" />

            <div className="flex flex-col items-center gap-[1.2rem] py-[1rem]">
              <div className="rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-white p-[1.2rem]">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt={`Ticket QR ${bookingId}`} className="h-[16rem] w-[16rem] object-contain" />
                ) : (
                  <p className="px-[1rem] py-[6rem] text-[1.2rem] text-[var(--color-text-secondary)]">QR is being prepared</p>
                )}
              </div>
              <p className="text-[1.2rem] text-[var(--color-text-secondary)]">Scan opens your live ticket at entry.</p>
            </div>

            <div className="my-[1.8rem] border-t border-dashed border-[rgba(28,28,28,0.14)]" />

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[1.4rem] text-[var(--color-text-secondary)]">Total Paid</span>
                {pricing.discountAmount ? (
                  <p className="mt-[0.35rem] text-[1.2rem] font-bold text-[#15803d]">
                    You saved {currency}{Number(pricing.discountAmount || 0).toLocaleString("en-IN")}
                  </p>
                ) : null}
              </div>
              <span className="text-[2.3rem] font-extrabold tracking-[-0.04em] text-[var(--color-text-primary)]">
                {currency}
                {Number(pricing.finalAmount || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </article>

        <div className="flex flex-col gap-[1rem] sm:flex-row">
          <button
            type="button"
            onClick={handleDownloadTicket}
            disabled={isDownloading}
            className="inline-flex h-[4.8rem] flex-1 items-center justify-center gap-[0.8rem] rounded-[1.4rem] bg-[var(--color-primary)] text-[1.5rem] font-bold text-[var(--color-text-light)]"
          >
            <Download className="h-[1.8rem] w-[1.8rem]" />
            {isDownloading ? "Preparing..." : "Download Ticket"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-[4.8rem] flex-1 items-center justify-center gap-[0.8rem] rounded-[1.4rem] border border-[rgba(28,28,28,0.08)] bg-white text-[1.5rem] font-bold text-[var(--color-text-primary)]"
          >
            <Share2 className="h-[1.8rem] w-[1.8rem]" />
            Share
          </button>
        </div>

        <div className="text-center">
          <Link to="/" className="text-[1.35rem] font-bold text-[var(--color-primary)]">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
};
