import { useMemo } from "react";
import { BookingSummary } from "./BookingSummary.jsx";
import { useSeatLocking } from "../../hooks/useSeatLocking.js";
import { buildSeatCategories, generateTheaterSeats } from "../../utils/bookingData.js";

const MAX_SEATS = 10;

const LegendDot = ({ className, label }) => (
  <span className="flex items-center gap-[0.7rem]">
    <span className={`h-[1.4rem] w-[1.4rem] rounded-[0.45rem] ${className}`} />
    <span className="text-[1.2rem] text-[var(--color-text-secondary)]">{label}</span>
  </span>
);

const ZoneBadge = ({ colorClass, label }) => (
  <span className="inline-flex items-center gap-[0.6rem] rounded-full border border-[rgba(28,28,28,0.08)] bg-[rgba(255,255,255,0.92)] px-[1rem] py-[0.5rem] text-[1.1rem] font-semibold text-[var(--color-text-secondary)]">
    <span className={`h-[1.1rem] w-[1.1rem] rounded-full ${colorClass}`} />
    {label}
  </span>
);

const SeatButton = ({ seat, onToggle }) => {
  const baseClassName =
    "flex h-[3rem] w-[3rem] items-center justify-center rounded-[0.8rem] text-[1rem] font-bold transition-all duration-150 md:h-[3.4rem] md:w-[3.4rem]";
  let stateClassName = "";

  if (seat.status === "booked") {
    stateClassName = "cursor-not-allowed bg-[rgba(28,28,28,0.08)] text-[var(--color-text-secondary)]/70";
  } else if (seat.status === "locked") {
    stateClassName = "cursor-not-allowed bg-[rgba(245,158,11,0.22)] text-[#8a5a00]";
  } else if (seat.status === "selected") {
    stateClassName = "scale-105 bg-[var(--color-primary)] text-[var(--color-text-light)] ring-2 ring-[rgba(248,68,100,0.24)]";
  } else {
    stateClassName = "border border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)] hover:border-[rgba(248,68,100,0.2)] hover:bg-[rgba(248,68,100,0.08)]";
  }

  return (
    <button
      type="button"
      disabled={seat.status === "booked" || seat.status === "locked"}
      onClick={() => onToggle(seat.id)}
      title={`Seat ${seat.id}`}
      className={`${baseClassName} ${stateClassName}`}
    >
      {seat.number}
    </button>
  );
};

export const TheaterLayout = ({ event }) => {
  const categories = useMemo(() => buildSeatCategories(event), [event]);
  const { bookedSeatIdSet, clearSelection, lockedByOtherSeatIdSet, selectedSeatIds, selectedSeatIdSet, toggleSeat } = useSeatLocking({
    event,
    maxSelectable: MAX_SEATS,
  });

  const seats = useMemo(
    () =>
      generateTheaterSeats(event).map((seat) => {
        if (bookedSeatIdSet.has(seat.id)) {
          return { ...seat, status: "booked" };
        }

        if (selectedSeatIdSet.has(seat.id)) {
          return { ...seat, status: "selected" };
        }

        if (lockedByOtherSeatIdSet.has(seat.id)) {
          return { ...seat, status: "locked" };
        }

        return seat;
      }),
    [bookedSeatIdSet, event, lockedByOtherSeatIdSet, selectedSeatIdSet]
  );

  const selectedSeats = useMemo(() => seats.filter((seat) => seat.status === "selected"), [seats]);

  const summary = useMemo(() => {
    const groupedSummary = {};

    selectedSeats.forEach((seat) => {
      const category = categories.find((item) => item.id === seat.category);

      if (!category) {
        return;
      }

      if (!groupedSummary[category.id]) {
        groupedSummary[category.id] = {
          label: category.label,
          count: 0,
          price: category.price,
          currency: "Rs ",
        };
      }

      groupedSummary[category.id].count += 1;
    });

    return Object.values(groupedSummary);
  }, [categories, selectedSeats]);

  const total = summary.reduce((amount, item) => amount + item.count * item.price, 0);
  const bookingMeta = {
    bookingType: "theater",
    selectedZones: summary.map((item) => item.label),
  };

  return (
    <div className="grid gap-[2rem] lg:grid-cols-[minmax(0,1.6fr)_minmax(30rem,0.9fr)]">
      <section className="rounded-[2.4rem] border border-[rgba(28,28,28,0.08)] bg-white p-[2rem] shadow-[var(--shadow-soft)]">
        <div className="flex justify-center">
          <div className="flex h-[4.6rem] w-[70%] items-center justify-center rounded-b-[100%] border border-[rgba(248,68,100,0.18)] bg-[linear-gradient(180deg,rgba(248,68,100,0.16)_0%,rgba(248,68,100,0.04)_100%)]">
            <span className="text-[1.1rem] font-extrabold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Screen
            </span>
          </div>
        </div>

        <div className="mt-[2rem] flex flex-wrap items-center justify-center gap-[1.2rem]">
          <LegendDot className="border border-[rgba(28,28,28,0.08)] bg-white" label="Available" />
          <LegendDot className="bg-[var(--color-primary)]" label="Selected" />
          <LegendDot className="bg-[rgba(245,158,11,0.22)]" label="Locked" />
          <LegendDot className="bg-[rgba(28,28,28,0.08)]" label="Booked" />
        </div>

        <div className="mt-[1.4rem] flex flex-wrap items-center justify-center gap-[0.9rem]">
          {categories.map((category) => (
            <ZoneBadge key={category.id} colorClass={category.colorClass} label={`${category.label} - Rs ${category.price}`} />
          ))}
        </div>

        <div className="mt-[2.4rem] space-y-[1.6rem] overflow-x-auto">
          {categories.map((category) => {
            const categorySeats = seats.filter((seat) => seat.category === category.id);
            const availableSeats = categorySeats.filter((seat) => seat.status === "available" || seat.status === "selected").length;

            return (
              <div key={category.id} className="space-y-[0.8rem]">
                <div className="flex flex-wrap items-center justify-between gap-[0.8rem]">
                  <p className="text-[1.15rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                    {category.label}
                  </p>
                  <p className="text-[1.15rem] font-semibold text-[var(--color-text-secondary)]">
                    {availableSeats > 0 ? `${availableSeats} seats left` : "Sold out"}
                  </p>
                </div>
                {category.rows.map((row) => {
                  const rowSeats = seats.filter((seat) => seat.row === row);

                  return (
                    <div key={row} className="flex items-center justify-center gap-[0.8rem]">
                      <span className="w-[2rem] text-right text-[1rem] font-bold text-[var(--color-text-secondary)]">
                        {row}
                      </span>
                      <div className="flex flex-wrap justify-center gap-[0.45rem]">
                        {rowSeats.map((seat) => (
                          <SeatButton key={seat.id} seat={seat} onToggle={toggleSeat} />
                        ))}
                      </div>
                      <span className="w-[2rem] text-[1rem] font-bold text-[var(--color-text-secondary)]">
                        {row}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      <BookingSummary
        selectedItems={selectedSeatIds}
        summary={summary}
        total={total}
        currency="Rs "
        maxItems={MAX_SEATS}
        onRemove={toggleSeat}
        onClear={clearSelection}
        eventId={event.id}
        bookingMeta={bookingMeta}
      />
    </div>
  );
};
