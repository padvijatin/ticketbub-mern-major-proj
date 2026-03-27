import { useEffect, useMemo, useState } from "react";
import { ListingFilters } from "../components/ListingFilters.jsx";
import { ListingGrid } from "../components/ListingGrid.jsx";
import { PageHeroCarousel } from "../components/PageHeroCarousel.jsx";
import { filterItemsByLocation, useLocationStore } from "../store/location.jsx";
import { getEvents } from "../utils/eventApi.js";
import { buildEventFilterParams, listingFilterConfigs } from "../utils/listingFilters.js";

export const Sports = () => {
  const [sports, setSports] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { selectedLocation } = useLocationStore();
  const filterConfig = listingFilterConfigs.sports;

  useEffect(() => {
    let ignore = false;

    const loadSports = async () => {
      setIsLoading(true);
      setError("");

      try {
        const sportsData = await getEvents(buildEventFilterParams("sports", activeFilters));

        if (!ignore) {
          setSports(sportsData);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError("Unable to load sports events right now.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadSports();

    return () => {
      ignore = true;
    };
  }, [activeFilters]);

  const locationSports = useMemo(
    () => filterItemsByLocation(sports, selectedLocation),
    [selectedLocation, sports]
  );

  const heroSports = useMemo(() => locationSports.slice(0, 3), [locationSports]);

  const handleToggleFilter = (key, value) => {
    setActiveFilters((currentFilters) => ({
      ...currentFilters,
      [key]: currentFilters[key]?.includes(value)
        ? currentFilters[key].filter((item) => item !== value)
        : [...(currentFilters[key] || []), value],
    }));
  };

  return (
    <main className="py-[3rem]">
      <section className="mx-auto w-[min(132rem,calc(100%_-_3.2rem))]">
        <PageHeroCarousel items={heroSports} type="sports" />

        <div className="mb-[2.6rem]">
          <span className="inline-flex rounded-full bg-[rgba(248,68,100,0.08)] px-[1.2rem] py-[0.8rem] text-[1.2rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-primary)]">
            Sports
          </span>
          <h1 className="mt-[1.4rem] max-w-[12ch] text-[clamp(3rem,4.4vw,5rem)] leading-[1.05] font-extrabold tracking-[-0.04em]">
            Stadium nights pulled from your existing event records.
          </h1>
          <p className="mt-[1.2rem] max-w-[62rem] text-[1.6rem] leading-[1.7] text-[var(--color-text-secondary)]">
            This page now reads sports-like categories from the same MongoDB events collection.
          </p>
        </div>

        <ListingFilters
          title={filterConfig.title}
          groups={filterConfig.groups}
          activeFilters={activeFilters}
          onToggle={handleToggleFilter}
          onReset={() => setActiveFilters({})}
        />

        <ListingGrid
          items={locationSports}
          isLoading={isLoading}
          error={error}
          columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
          emptyMessage="No sports events match these filters right now."
          skeletonCount={4}
          cardSize="listing"
        />
      </section>
    </main>
  );
};
