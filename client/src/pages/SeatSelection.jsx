import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { TheaterLayout } from "../components/booking/TheaterLayout.jsx";
import { StadiumLayout } from "../components/booking/StadiumLayout.jsx";
import { ExperienceLayout } from "../components/booking/ExperienceLayout.jsx";
import { getBookingType } from "../utils/bookingData.js";
import { getEventById } from "../utils/eventApi.js";

const layoutLabels = {
  theater: "Select Your Seats",
  stadium: "Choose Your Stand",
  experience: "Choose Your Zone",
};

export const SeatSelection = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEventById(id),
    enabled: Boolean(id),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (data) {
      setEvent(data);
    }
  }, [data]);

  if (isLoading && !event) {
    return (
      <main className="py-[3rem]">
        <section className="mx-auto w-[min(120rem,calc(100%_-_3.2rem))] rounded-[2.8rem] border border-[rgba(28,28,28,0.08)] bg-white p-[2rem] shadow-[var(--shadow-soft)]">
          <div className="h-[22rem] animate-pulse rounded-[2rem] bg-[linear-gradient(180deg,#eceff3_0%,#e2e8f0_100%)]" />
        </section>
      </main>
    );
  }

  if ((isError && !event) || !event) {
    return (
      <main className="py-[3rem]">
        <section className="mx-auto w-[min(80rem,calc(100%_-_3.2rem))] rounded-[2.4rem] border border-[rgba(248,68,100,0.14)] bg-[rgba(248,68,100,0.05)] px-[1.8rem] py-[1.6rem] text-[1.5rem] text-[var(--color-text-secondary)]">
          Seat selection could not be loaded right now.
        </section>
      </main>
    );
  }

  const bookingType = getBookingType(event);

  return (
    <main className="py-[3rem]">
      <section className="mx-auto w-[min(120rem,calc(100%_-_3.2rem))] space-y-[2rem]">
        <div className="flex items-start gap-[1.2rem]">
          <Link
            to={`/event/${event.id}`}
            className="inline-flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-full border border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-soft)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] hover:text-[var(--color-primary)]"
          >
            <ChevronLeft className="h-[1.8rem] w-[1.8rem]" />
          </Link>
          <div>
            <p className="text-[1.2rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-primary)]">
              {layoutLabels[bookingType]}
            </p>
            <h1 className="mt-[0.6rem] text-[clamp(2.8rem,4vw,4rem)] leading-[1.05] font-extrabold tracking-[-0.04em]">
              {event.title}
            </h1>
            <p className="mt-[0.8rem] text-[1.5rem] leading-[1.7] text-[var(--color-text-secondary)]">
              {event.venue}, {event.city}
            </p>
            <p className="mt-[0.45rem] text-[1.2rem] text-[var(--color-text-secondary)]">
              Live availability sync every 5 seconds
            </p>
          </div>
        </div>

        {bookingType === "theater" ? <TheaterLayout event={event} /> : null}
        {bookingType === "stadium" ? <StadiumLayout event={event} /> : null}
        {bookingType === "experience" ? <ExperienceLayout event={event} /> : null}
      </section>
    </main>
  );
};
