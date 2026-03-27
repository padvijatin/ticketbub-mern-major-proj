import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { BookingSummary } from "./BookingSummary.jsx";
import { generateStadiumZones } from "../../utils/bookingData.js";

const MAX_TICKETS = 10;

const syncSelectionWithZones = (zones, currentSelection) => {
  const nextSelection = {};

  Object.entries(currentSelection).forEach(([zoneId, seatIds]) => {
    const zone = zones.find((item) => item.id === zoneId);

    if (!zone) {
      return;
    }

    const validSeatIds = seatIds.filter((seatId) => zone.availableSeatIds.includes(seatId));

    if (validSeatIds.length) {
      nextSelection[zoneId] = validSeatIds;
    }
  });

  return nextSelection;
};

export const StadiumLayout = ({ event }) => {
  const zones = useMemo(() => generateStadiumZones(event), [event]);
  const [selection, setSelection] = useState({});
  const [activeZoneId, setActiveZoneId] = useState(null);
  const totalSelectedTickets = Object.values(selection).reduce((sum, seatIds) => sum + seatIds.length, 0);

  useEffect(() => {
    setSelection((currentSelection) => syncSelectionWithZones(zones, currentSelection));
    setActiveZoneId((currentZoneId) => (zones.some((zone) => zone.id === currentZoneId) ? currentZoneId : null));
  }, [zones]);

  const updateQuantity = (zoneId, delta) => {
    setSelection((currentSelection) => {
      const currentSeatIds = currentSelection[zoneId] || [];
      const zone = zones.find((item) => item.id === zoneId);
      const selectedCount = Object.values(currentSelection).reduce((sum, seatIds) => sum + seatIds.length, 0);

      if (!zone) {
        return currentSelection;
      }

      if (delta < 0) {
        if (!currentSeatIds.length) {
          return currentSelection;
        }

        const nextSelection = { ...currentSelection };
        const nextSeatIds = currentSeatIds.slice(0, -1);

        if (nextSeatIds.length) {
          nextSelection[zoneId] = nextSeatIds;
        } else {
          delete nextSelection[zoneId];
        }

        return nextSelection;
      }

      if (selectedCount >= MAX_TICKETS) {
        return currentSelection;
      }

      const nextSeatId = zone.availableSeatIds.find((seatId) => !currentSeatIds.includes(seatId));

      if (!nextSeatId) {
        return currentSelection;
      }

      return {
        ...currentSelection,
        [zoneId]: [...currentSeatIds, nextSeatId],
      };
    });
  };

  const clearSelection = () => {
    setSelection({});
  };

  const summary = useMemo(
    () =>
      Object.entries(selection).map(([zoneId, seatIds]) => {
        const zone = zones.find((item) => item.id === zoneId);
        return {
          label: zone.label,
          count: seatIds.length,
          price: zone.price,
          currency: zone.currency,
        };
      }),
    [selection, zones]
  );

  const total = summary.reduce((amount, item) => amount + item.count * item.price, 0);
  const selectedItems = Object.values(selection).flat();
  const bookingMeta = {
    bookingType: "stadium",
    selectedZones: summary.map((item) => item.label),
  };

  return (
    <div className="grid gap-[2rem] lg:grid-cols-[minmax(0,1.5fr)_minmax(30rem,0.9fr)]">
      <section className="rounded-[2.4rem] border border-[rgba(28,28,28,0.08)] bg-white p-[2rem] shadow-[var(--shadow-soft)]">
        <div className="relative mx-auto aspect-square w-full max-w-[52rem]">
          <div className="absolute inset-[7%] rounded-[50%] border-[0.2rem] border-[rgba(28,28,28,0.1)]" />
          <div className="absolute inset-[26%] flex items-center justify-center rounded-[50%] border border-[rgba(34,197,94,0.18)] bg-[linear-gradient(180deg,rgba(34,197,94,0.16)_0%,rgba(34,197,94,0.06)_100%)]">
            <span className="text-[1.1rem] font-extrabold uppercase tracking-[0.16em] text-[#15803d]">
              Pitch
            </span>
          </div>

          {zones.map((zone) => {
            const selectedCount = (selection[zone.id] || []).length;
            const isActive = activeZoneId === zone.id;
            const availableSeats = zone.availableSeatIds.length;
            const isSoldOut = availableSeats <= 0;

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

        {activeZoneId ? (() => {
          const activeZone = zones.find((zone) => zone.id === activeZoneId);
          const quantity = (selection[activeZone.id] || []).length;
          const availableSeats = activeZone.availableSeatIds.length;
          const fillWidth = activeZone.totalSeats ? `${(activeZone.bookedSeats / activeZone.totalSeats) * 100}%` : "0%";

          return (
            <div className="mt-[2rem] rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-[rgba(245,245,245,0.7)] p-[1.6rem]">
              <div className="flex items-start justify-between gap-[1rem]">
                <div>
                  <h3 className="text-[1.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                    {activeZone.label}
                  </h3>
                  <p className="mt-[0.4rem] text-[1.25rem] text-[var(--color-text-secondary)]">
                    {availableSeats > 0 ? `${availableSeats} seats left out of ${activeZone.totalSeats}` : `Sold out • ${activeZone.totalSeats} seats booked`}
                  </p>
                </div>
                <span className="text-[2rem] font-extrabold text-[var(--color-text-primary)]">
                  {activeZone.currency}
                  {activeZone.price.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="mt-[1.2rem] h-[0.8rem] overflow-hidden rounded-full bg-[rgba(28,28,28,0.08)]">
                <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: fillWidth }} />
              </div>

              <div className="mt-[1.4rem] flex items-center justify-between">
                <span className="text-[1.35rem] text-[var(--color-text-secondary)]">Tickets</span>
                <div className="flex items-center gap-[1rem]">
                  <button
                    type="button"
                    onClick={() => updateQuantity(activeZone.id, -1)}
                    disabled={quantity === 0}
                    className="inline-flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-[1rem] border border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Minus className="h-[1.6rem] w-[1.6rem]" />
                  </button>
                  <span className="w-[2.8rem] text-center text-[1.9rem] font-extrabold text-[var(--color-text-primary)]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(activeZone.id, 1)}
                    disabled={availableSeats <= quantity || totalSelectedTickets >= MAX_TICKETS}
                    className="inline-flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-[1rem] border border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-[1.6rem] w-[1.6rem]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })() : null}
      </section>

      <BookingSummary
        selectedItems={selectedItems}
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
