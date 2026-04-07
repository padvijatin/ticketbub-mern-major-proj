import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { BookingSummary } from "./BookingSummary.jsx";
import { useSeatLocking } from "../../hooks/useSeatLocking.js";
import { generateStadiumZones } from "../../utils/bookingData.js";

const MAX_TICKETS = 10;

const LegendDot = ({ className, label }) => (
  <span className="flex items-center gap-[0.7rem]">
    <span className={`h-[1.4rem] w-[1.4rem] rounded-[0.45rem] ${className}`} />
    <span className="text-[1.2rem] text-[var(--color-text-secondary)]">{label}</span>
  </span>
);

const ZoneBadge = ({ label, price }) => (
  <span className="inline-flex items-center rounded-full border border-[rgba(28,28,28,0.08)] bg-[rgba(255,255,255,0.92)] px-[1rem] py-[0.5rem] text-[1.1rem] font-semibold text-[var(--color-text-secondary)]">
    {label} - Rs {price}
  </span>
);

export const StadiumLayout = ({ event }) => {
  const baseZones = useMemo(() => generateStadiumZones(event), [event]);
  const {
    bookedSeatIdSet,
    clearSelection,
    lockedByOtherSeatIdSet,
    selectedSeatIds,
    selectedSeatIdSet,
    lockSeat,
    releaseSeat,
  } = useSeatLocking({ event, maxSelectable: MAX_TICKETS });
  const [activeZoneId, setActiveZoneId] = useState(null);
  const totalSelectedTickets = selectedSeatIds.length;

  const zones = useMemo(
    () =>
      baseZones.map((zone) => {
        const newlyBookedSeatIds = zone.availableSeatIds.filter((seatId) => bookedSeatIdSet.has(seatId));
        const liveAvailableSeatIds = zone.availableSeatIds.filter((seatId) => !bookedSeatIdSet.has(seatId));
        const interactiveSeatIds = liveAvailableSeatIds.filter(
          (seatId) => !lockedByOtherSeatIdSet.has(seatId) || selectedSeatIdSet.has(seatId)
        );
        const selectedZoneSeatIds = interactiveSeatIds.filter((seatId) => selectedSeatIdSet.has(seatId));

        return {
          ...zone,
          bookedSeats: zone.bookedSeats + newlyBookedSeatIds.length,
          interactiveSeatIds,
          selectedZoneSeatIds,
          remainingSeats: Math.max(0, interactiveSeatIds.length - selectedZoneSeatIds.length),
        };
      }),
    [baseZones, bookedSeatIdSet, lockedByOtherSeatIdSet, selectedSeatIdSet]
  );

  const activeZone = zones.find((zone) => zone.id === activeZoneId) || null;

  const updateQuantity = (zoneId, delta) => {
    const zone = zones.find((item) => item.id === zoneId);

    if (!zone) {
      return;
    }

    if (delta < 0) {
      const lastSeatId = zone.selectedZoneSeatIds[zone.selectedZoneSeatIds.length - 1];

      if (lastSeatId) {
        releaseSeat(lastSeatId);
      }

      return;
    }

    if (totalSelectedTickets >= MAX_TICKETS) {
      return;
    }

    const nextSeatId = zone.interactiveSeatIds.find((seatId) => !zone.selectedZoneSeatIds.includes(seatId));

    if (nextSeatId) {
      lockSeat(nextSeatId);
    }
  };

  const summary = useMemo(
    () =>
      zones
        .filter((zone) => zone.selectedZoneSeatIds.length)
        .map((zone) => ({
          label: zone.label,
          count: zone.selectedZoneSeatIds.length,
          price: zone.price,
          currency: zone.currency,
        })),
    [zones]
  );

  const total = summary.reduce((amount, item) => amount + item.count * item.price, 0);
  const bookingMeta = {
    bookingType: "stadium",
    selectedZones: summary.map((item) => item.label),
  };

  return (
    <div className="grid gap-[2rem] lg:grid-cols-[minmax(0,1.5fr)_minmax(30rem,0.9fr)]">
      <section className="rounded-[2.4rem] border border-[rgba(28,28,28,0.08)] bg-white p-[2rem] shadow-[var(--shadow-soft)]">
        <div className="mb-[1.8rem] flex flex-wrap items-center justify-center gap-[1.2rem]">
          <LegendDot className="border border-[rgba(28,28,28,0.08)] bg-white" label="Available" />
          <LegendDot className="bg-[var(--color-primary)]" label="Selected" />
          <LegendDot className="bg-[rgba(245,158,11,0.22)]" label="Locked" />
          <LegendDot className="bg-[rgba(28,28,28,0.08)]" label="Booked" />
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[52rem]">
          <div className="absolute inset-[7%] rounded-[50%] border-[0.2rem] border-[rgba(28,28,28,0.1)]" />
          <div className="absolute inset-[26%] flex items-center justify-center rounded-[50%] border border-[rgba(34,197,94,0.18)] bg-[linear-gradient(180deg,rgba(34,197,94,0.16)_0%,rgba(34,197,94,0.06)_100%)]">
            <span className="text-[1.1rem] font-extrabold uppercase tracking-[0.16em] text-[#15803d]">
              Pitch
            </span>
          </div>

          {zones.map((zone) => {
            const selectedCount = zone.selectedZoneSeatIds.length;
            const isActive = activeZoneId === zone.id;
            const isSoldOut = zone.remainingSeats <= 0 && selectedCount === 0;

            return (
              <button
                key={zone.id}
                type="button"
                style={zone.position}
                disabled={isSoldOut}
                onClick={() => setActiveZoneId(isActive ? null : zone.id)}
                className={`absolute flex flex-col items-center justify-center rounded-[1.2rem] border-2 px-[0.8rem] py-[0.6rem] text-center transition-all duration-200 ${
                  isSoldOut
                    ? "cursor-not-allowed border-[rgba(28,28,28,0.08)] bg-[rgba(28,28,28,0.05)] opacity-60"
                    : isActive
                      ? "z-10 scale-105 border-[var(--color-primary)] bg-[rgba(248,68,100,0.08)]"
                      : "border-[rgba(28,28,28,0.08)] bg-white hover:border-[rgba(248,68,100,0.18)]"
                }`}
              >
                <span className="text-[0.95rem] font-extrabold leading-[1.15] text-[var(--color-text-primary)] md:text-[1.1rem]">
                  {zone.label}
                </span>
                <span className="mt-[0.2rem] text-[0.9rem] text-[var(--color-text-secondary)] md:text-[1rem]">
                  {zone.currency}
                  {zone.price.toLocaleString("en-IN")}
                </span>
                {isSoldOut ? (
                  <span className="mt-[0.35rem] rounded-full bg-[rgba(28,28,28,0.08)] px-[0.7rem] py-[0.2rem] text-[0.8rem] font-bold text-[var(--color-text-secondary)]">
                    Sold out
                  </span>
                ) : selectedCount ? (
                  <span className="mt-[0.35rem] rounded-full bg-[var(--color-primary)] px-[0.7rem] py-[0.2rem] text-[0.85rem] font-bold text-[var(--color-text-light)]">
                    {selectedCount} selected
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-[1.8rem] flex flex-wrap items-center justify-center gap-[0.9rem]">
          {zones.map((zone) => (
            <ZoneBadge key={zone.id} label={zone.label} price={zone.price.toLocaleString("en-IN")} />
          ))}
        </div>

        {activeZone ? (
          <div className="mt-[2rem] rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-[rgba(245,245,245,0.7)] p-[1.6rem]">
            <div className="flex items-start justify-between gap-[1rem]">
              <div>
                <h3 className="text-[1.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  {activeZone.label}
                </h3>
                <p className="mt-[0.4rem] text-[1.25rem] text-[var(--color-text-secondary)]">
                  {activeZone.remainingSeats > 0
                    ? `${activeZone.remainingSeats} seats left out of ${activeZone.totalSeats}`
                    : `Sold out • ${activeZone.totalSeats} seats booked`}
                </p>
              </div>
              <span className="text-[2rem] font-extrabold text-[var(--color-text-primary)]">
                {activeZone.currency}
                {activeZone.price.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="mt-[1.2rem] h-[0.8rem] overflow-hidden rounded-full bg-[rgba(28,28,28,0.08)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)]"
                style={{ width: activeZone.totalSeats ? `${(activeZone.bookedSeats / activeZone.totalSeats) * 100}%` : "0%" }}
              />
            </div>

            <div className="mt-[1.4rem] flex items-center justify-between">
              <span className="text-[1.35rem] text-[var(--color-text-secondary)]">Tickets</span>
              <div className="flex items-center gap-[1rem]">
                <button
                  type="button"
                  onClick={() => updateQuantity(activeZone.id, -1)}
                  disabled={activeZone.selectedZoneSeatIds.length === 0}
                  className="inline-flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-[1rem] border border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Minus className="h-[1.6rem] w-[1.6rem]" />
                </button>
                <span className="w-[2.8rem] text-center text-[1.9rem] font-extrabold text-[var(--color-text-primary)]">
                  {activeZone.selectedZoneSeatIds.length}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(activeZone.id, 1)}
                  disabled={activeZone.remainingSeats <= 0 || totalSelectedTickets >= MAX_TICKETS}
                  className="inline-flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-[1rem] border border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-[1.6rem] w-[1.6rem]" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <BookingSummary
        selectedItems={selectedSeatIds}
        summary={summary}
        total={total}
        currency="Rs "
        maxItems={MAX_TICKETS}
        onRemove={() => {}}
        onClear={clearSelection}
        eventId={event.id}
        hideChips
        bookingMeta={bookingMeta}
      />
    </div>
  );
};
