import { useEffect, useState } from "react";
import { ListingGrid } from "../components/ListingGrid.jsx";
import { getEvents } from "../utils/eventApi.js";

export const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadMovies = async () => {
      setIsLoading(true);
      setError("");

      try {
        const movieData = await getEvents({ type: "movie" });

        if (!ignore) {
          setMovies(movieData);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError("Unable to load movies right now.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadMovies();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className="py-[3rem]">
      <section className="mx-auto w-[min(132rem,calc(100%_-_3.2rem))]">
        <div className="mb-[2.6rem]">
          <span className="inline-flex rounded-full bg-[rgba(248,68,100,0.08)] px-[1.2rem] py-[0.8rem] text-[1.2rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-primary)]">
            Movies
          </span>
          <h1 className="mt-[1.4rem] max-w-[12ch] text-[clamp(3rem,4.4vw,5rem)] leading-[1.05] font-extrabold tracking-[-0.04em]">
            Big-screen picks from your real event database.
          </h1>
          <p className="mt-[1.2rem] max-w-[62rem] text-[1.6rem] leading-[1.7] text-[var(--color-text-secondary)]">
            This page now filters movie-style records directly from the existing events collection.
          </p>
        </div>

        <ListingGrid
          items={movies}
          isLoading={isLoading}
          error={error}
          columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
          emptyMessage="No movie events match your database records yet."
          skeletonCount={4}
          cardSize="listing"
        />
      </section>
    </main>
  );
};
