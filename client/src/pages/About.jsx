import { createElement } from "react";
import { BadgeCheck, CalendarClock, CreditCard, MapPin, QrCode, ShieldCheck, Sparkles, Ticket } from "lucide-react";

const capabilityCards = [
  {
    title: "Movies, Sports, Events",
    subtitle: "One place to discover every kind of plan",
    icon: Ticket,
    iconClassName: "text-[var(--color-primary)] bg-[rgba(248,68,100,0.1)]",
  },
  {
    title: "Location-Aware Browsing",
    subtitle: "See experiences near your selected city",
    icon: MapPin,
    iconClassName: "text-[var(--color-primary)] bg-[rgba(248,68,100,0.1)]",
  },
  {
    title: "Secure Checkout",
    subtitle: "Built for safe booking and payment flow",
    icon: CreditCard,
    iconClassName: "text-[var(--color-primary)] bg-[rgba(248,68,100,0.1)]",
  },
  {
    title: "QR-Ready Tickets",
    subtitle: "Instant booking confirmation and ticket access",
    icon: QrCode,
    iconClassName: "text-[var(--color-primary)] bg-[rgba(248,68,100,0.1)]",
  },
];

const trustPoints = [
  {
    title: "Verified listings",
    description: "TicketHub is designed to help people browse organized event information with transparent pricing and cleaner detail pages.",
    icon: BadgeCheck,
  },
  {
    title: "Seat selection flow",
    description: "For supported venues, users can review layouts, select seats, and continue to checkout with a more confident booking experience.",
    icon: CalendarClock,
  },
  {
    title: "Security-focused journey",
    description: "Authentication, protected routes, and payment integration are built to keep the platform experience safer and more dependable.",
    icon: ShieldCheck,
  },
];

const whyChooseUs = [
  "Verified events with transparent pricing",
  "Instant e-tickets with QR code entry",
  "Secure payments with multiple options",
  "24/7 customer support",
  "Exclusive deals and early-bird offers",
  "Real-time seat selection across venues",
];

export const About = () => {
  return (
    <main className="min-h-[calc(100vh-18rem)] bg-[radial-gradient(circle_at_top,_rgba(248,68,100,0.08),_transparent_18%),linear-gradient(180deg,_#fffafb_0%,_#f5f5f5_100%)] py-[4rem] md:py-[5rem]">
      <section className="mx-auto w-[min(112rem,calc(100%_-_3.2rem))]">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-[rgba(248,68,100,0.14)] bg-white px-[1.1rem] py-[0.65rem] text-[1.05rem] font-extrabold uppercase tracking-[0.1em] text-[var(--color-primary)] shadow-[0_10px_25px_rgba(28,28,28,0.04)]">
            About TicketHub
          </span>
          <h1 className="mt-[1.4rem] text-[clamp(3.4rem,4.8vw,5.6rem)] font-extrabold tracking-[-0.05em] text-[var(--color-text-primary)]">
            About TicketHub
          </h1>
          <p className="mx-auto mt-[1.4rem] max-w-[78rem] text-[1.7rem] leading-[1.8] text-[var(--color-text-secondary)] md:text-[1.85rem]">
            TicketHub is your one-stop destination for discovering and booking movies, sports, and live events. We focus on a cleaner booking journey with location-aware discovery, seat selection support, secure checkout, and fast ticket access.
          </p>
        </div>

        <section className="mx-auto mt-[3.4rem] grid max-w-[92rem] gap-[1.4rem] sm:grid-cols-2 xl:grid-cols-4">
          {capabilityCards.map(({ title, subtitle, icon: Icon, iconClassName }) => (
            <article
              key={title}
              className="rounded-[2.4rem] border border-[rgba(28,28,28,0.08)] bg-white px-[1.6rem] py-[1.9rem] text-center shadow-[0_18px_40px_rgba(28,28,28,0.06)] transition-transform duration-200 hover:translate-y-[-2px]"
            >
              <span className={`mx-auto inline-flex h-[5.4rem] w-[5.4rem] items-center justify-center rounded-[1.8rem] ${iconClassName}`}>
                {createElement(Icon, { className: "h-[2.3rem] w-[2.3rem]" })}
              </span>
              <p className="mt-[1.5rem] text-[2rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                {title}
              </p>
              <p className="mt-[0.5rem] text-[1.35rem] leading-[1.65] text-[var(--color-text-secondary)]">
                {subtitle}
              </p>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-[4rem] max-w-[92rem] rounded-[2.8rem] border border-[rgba(28,28,28,0.08)] bg-white px-[2rem] py-[2.4rem] shadow-[0_18px_45px_rgba(28,28,28,0.07)] md:px-[3rem] md:py-[3rem]">
          <h2 className="text-[2.8rem] font-extrabold tracking-[-0.04em] text-[var(--color-text-primary)]">
            Our Mission
          </h2>
          <p className="mt-[1.2rem] text-[1.55rem] leading-[1.85] text-[var(--color-text-secondary)]">
            We believe people should be able to discover great experiences without confusion or friction. TicketHub aims to connect users with movies, sports, and live events through a booking platform that feels simple, secure, and modern from browsing to final confirmation.
          </p>
        </section>

        <section className="mx-auto mt-[2.4rem] max-w-[92rem]">
          <div className="grid gap-[1.4rem] lg:grid-cols-3">
            {trustPoints.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-[2.2rem] border border-[rgba(28,28,28,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#fff7f9_100%)] px-[1.6rem] py-[1.8rem] shadow-[0_16px_36px_rgba(28,28,28,0.05)]"
              >
                <span className="inline-flex h-[5rem] w-[5rem] items-center justify-center rounded-[1.6rem] bg-[rgba(248,68,100,0.1)] text-[var(--color-primary)]">
                  {createElement(Icon, { className: "h-[2.1rem] w-[2.1rem]" })}
                </span>
                <h3 className="mt-[1.3rem] text-[1.85rem] font-bold text-[var(--color-text-primary)]">{title}</h3>
                <p className="mt-[0.65rem] text-[1.38rem] leading-[1.72] text-[var(--color-text-secondary)]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-[4rem] max-w-[92rem]">
          <h2 className="text-[2.8rem] font-extrabold tracking-[-0.04em] text-[var(--color-text-primary)]">
            Why Choose Us
          </h2>

          <div className="mt-[1.8rem] grid gap-[1.4rem] md:grid-cols-2">
            {whyChooseUs.map((item) => (
              <article
                key={item}
                className="flex items-center gap-[1rem] rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-white px-[1.4rem] py-[1.3rem] shadow-[0_14px_32px_rgba(28,28,28,0.05)]"
              >
                <span
                  className="inline-flex h-[4.2rem] w-[4.2rem] shrink-0 items-center justify-center rounded-[1.4rem] bg-[rgba(248,68,100,0.1)] text-[var(--color-primary)]"
                >
                  <Sparkles className="h-[1.8rem] w-[1.8rem]" />
                </span>
                <p className="text-[1.42rem] leading-[1.65] text-[var(--color-text-primary)]">{item}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
};
