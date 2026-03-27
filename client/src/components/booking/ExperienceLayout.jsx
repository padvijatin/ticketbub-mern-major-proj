import { useEffect, useMemo, useState } from "react";
import { Check, Mic2, Minus, Plus } from "lucide-react";
import { BookingSummary } from "./BookingSummary.jsx";
import { generateExperienceZones } from "../../utils/bookingData.js";

const MAX_TICKETS = 10;

const syncSelectionWithZones = (zones, currentSelection) => {
  const nextSelection = {};

  Object.entries(currentSelection).forEach(([zoneId, seatIds]) => {
    const zone = zones.find((item) => item.id === zoneId);

    if (!zone) {
      return;
    }

    const validSeatIds = seatIds.filter((seatId) => zone.availableTicketIds.includes(seatId));

    if (validSeatIds.length) {
      nextSelection[zoneId] = validSeatIds;
    }
  });

  return nextSelection;
};

export const ExperienceLayout = ({ event }) => {
  const zones = useMemo(() => generateExperienceZones(event), [event]);
  const [selection, setSelection] = useState({});
  const totalTickets = Object.values(selection).reduce((sum, seatIds) => sum + seatIds.length, 0);

  useEffect(() => {
    setSelection((currentSelection) => syncSelectionWithZones(zones, currentSelection));
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

      const nextSeatId = zone.availableTicketIds.find((seatId) => !currentSeatIds.includes(seatId));

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
    bookingType: "experience",
    selectedZones: summary.map((item) => item.label),
  };

  return (
    <div className="grid gap-[2rem] lg:grid-cols-[minmax(0,1.5fr)_minmax(30rem,0.9fr)]">
      <section className="space-y-[1.8rem]">
        <div className="rounded-[2.4rem] border border-[rgba(28,28,28,0.08)] bg-white p-[2.2rem] shadow-[var(--shadow-soft)]">
          <div className="flex justify-center">
            <div className="flex h-[6.4rem] w-[74%] items-center justify-center rounded-b-[100%] border border-[rgba(123,63,228,0.14)] bg-[linear-gradient(180deg,rgba(123,63,228,0.18)_0%,rgba(123,63,228,0.06)_100%)]">
              <span className="inline-flex items-center gap-[0.85rem] text-[1.5rem] font-extrabold uppercase tracking-[0.28em] text-[var(--color-accent)]">
                <Mic2 className="h-[1.55rem] w-[1.55rem]" />
                Stage
              </span>
            </div>
          </div>

          <div className="mx-auto mt-[2.4rem] flex max-w-[52rem] flex-col gap-[1.2rem]">
            {zones.map((zone) => {
              const availableTickets = zone.availableTicketIds.length;
              const selectedCount = (selection[zone.id] || []).length;
              const soldRatio = zone.totalTickets ? Math.min(zone.soldTickets / zone.totalTickets, 1) : 0;
              const isSoldOut = availableTickets <= 0;

              return (
                <button
                  key={zone.id}
                  type="button"
                  disabled={isSoldOut}
                  onClick={() => updateQuantity(zone.id, selectedCount ? -1 : 1)}
                  className={`rounded-[2rem] border bg-white px-[2rem] py-[1.45rem] text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-all duration-200 ${
                    isSoldOut
                      ? "cursor-not-allowed border-[rgba(28,28,28,0.08)] bg-[rgba(28,28,28,0.04)] opacity-70"
                      : selectedCount
                        ? "border-[rgba(248,68,100,0.24)] bg-[rgba(248,68,100,0.04)]"
                        : "border-[rgba(28,28,28,0.08)] hover:border-[rgba(248,68,100,0.18)]"
                  }`}
                >
                  <div className="flex items-center justify-center gap-[0.8rem]">
                    <span className={`h-[1.3rem] w-[1.3rem] rounded-full ${zone.colorClass}`} />
                    <span className="text-[1.55rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                      {zone.label}
                    </span>
                  </div>

                  <div className="mx-auto mt-[0.95rem] flex w-[12rem] items-center gap-[0.8rem]">
                    <div className="h-[0.7rem] flex-1 overflow-hidden rounded-full bg-[rgba(28,28,28,0.08)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${soldRatio * 100}%` }}
                      />
                    </div>
                    <span className="text-[1.2rem] text-[var(--color-text-secondary)]">
                      {isSoldOut ? "Sold out" : `${availableTickets} left`}
                    </span>
                  </div>

                  {selectedCount ? (
                    <span className="mt-[0.8rem] inline-flex rounded-full bg-[rgba(248,68,100,0.08)] px-[0.95rem] py-[0.35rem] text-[1.05rem] font-bold text-[var(--color-primary)]">
                      {selectedCount} selected
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-[1.4rem] md:grid-cols-2">
          {zones.map((zone) => {
            const availableTickets = zone.availableTicketIds.length;
            const quantity = (selection[zone.id] || []).length;
            const isSoldOut = availableTickets <= 0;

            return (
              <article
                key={zone.id}
                className={`rounded-[2.2rem] border bg-white p-[1.8rem] shadow-[var(--shadow-soft)] transition-all duration-200 ${
                  isSoldOut
                    ? "border-[rgba(28,28,28,0.08)] bg-[rgba(28,28,28,0.03)]"
                    : quantity
                      ? "border-[rgba(248,68,100,0.24)] bg-[rgba(248,68,100,0.04)]"
                      : "border-[rgba(28,28,28,0.08)]"
                }`}
              >
                <div className="flex items-start justify-between gap-[1.2rem]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-[0.8rem]">
                      <span className={`h-[1.4rem] w-[1.4rem] rounded-full ${zone.colorClass}`} />
                      <h3 className="text-[1.8rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                        {zone.label}
                      </h3>
                    </div>
                    <p className="mt-[0.6rem] text-[1.3rem] leading-[1.6] text-[var(--color-text-secondary)]">
                      {zone.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-[2rem] font-extrabold text-[var(--color-text-primary)]">
                    {zone.currency}
                    {zone.price.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="mt-[1.2rem] flex flex-wrap gap-[0.7rem]">
                  {zone.perks.map((perk) => (
                    <span
                      key={perk}
                      className="inline-flex items-center gap-[0.45rem] rounded-full bg-[rgba(28,28,28,0.05)] px-[0.9rem] py-[0.45rem] text-[1.08rem] text-[var(--color-text-secondary)]"
                    >
                      <Check className="h-[1.2rem] w-[1.2rem] text-[var(--color-primary)]" />
                      {perk}
                    </span>
                  ))}
                </div>

                <div className="mt-[1.5rem] flex items-center justify-between border-t border-[rgba(28,28,28,0.08)] pt-[1.3rem]">
                  <span className="text-[1.25rem] text-[var(--color-text-secondary)]">
                    {isSoldOut ? "Sold out" : `${availableTickets} available`}
                  </span>

                  <div className="flex items-center gap-[1rem]">
                    <button
                      type="button"
                      onClick={() => updateQuantity(zone.id, -1)}
                      disabled={quantity === 0}
                      className="inline-flex h-[3.7rem] w-[3.7rem] items-center justify-center rounded-[1rem] border border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Minus className="h-[1.6rem] w-[1.6rem]" />
                    </button>
                    <span className="w-[2.8rem] text-center text-[1.9rem] font-extrabold text-[var(--color-text-primary)]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(zone.id, 1)}
                      disabled={isSoldOut || quantity >= availableTickets || totalTickets >= MAX_TICKETS}
                      className="inline-flex h-[3.7rem] w-[3.7rem] items-center justify-center rounded-[1rem] border border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-[1.6rem] w-[1.6rem]" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
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
