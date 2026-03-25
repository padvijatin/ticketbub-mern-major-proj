import { useEffect, useState } from "react";
import { ListingGrid } from "../components/ListingGrid.jsx";
import { getEvents } from "../utils/eventApi.js";

export const Events = () => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadEvents = async () => {
      setIsLoading(true);
      setError("");

      try {
        const eventData = await getEvents({ type: "event" });

        if (!ignore) {
          setEvents(eventData);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError("Unable to load events right now.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className="py-[3rem]">
      <section className="mx-auto w-[min(132rem,calc(100%_-_3.2rem))]">
        <div className="mb-[2.6rem]">
          <span className="inline-flex rounded-full bg-[rgba(248,68,100,0.08)] px-[1.2rem] py-[0.8rem] text-[1.2rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-primary)]">
            Events
          </span>
          <h1 className="mt-[1.4rem] max-w-[12ch] text-[clamp(3rem,4.4vw,5rem)] leading-[1.05] font-extrabold tracking-[-0.04em]">
            Concerts, comedy, and city plans from your real collection.
          </h1>
          <p className="mt-[1.2rem] max-w-[62rem] text-[1.6rem] leading-[1.7] text-[var(--color-text-secondary)]">
            This page now uses the existing MongoDB events collection instead of client-side examples.
          </p>
        </div>

        <ListingGrid
          items={events}
          isLoading={isLoading}
          error={error}
          columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
          emptyMessage="No non-sports, non-movie events match your database records yet."
          skeletonCount={4}
          cardSize="listing"
        />
      </section>
    </main>
  );
};
