import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { A11y, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import EventCard from "../components/EventCard.jsx";
import { HeroCarousel } from "../components/HeroCarousel.jsx";
import PosterImage from "../components/PosterImage.jsx";
import { useLocationStore, filterItemsByLocation } from "../store/location.jsx";
import { useWishlist } from "../store/wishlist.jsx";
import { getEvents } from "../utils/eventApi.js";

const heroFallbackByType = {
  movie: "bg-[linear-gradient(135deg,#181032_0%,#7b3fe4_52%,#f84464_100%)]",
  sports: "bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_52%,#22c55e_100%)]",
  event: "bg-[linear-gradient(135deg,#1c1c1c_0%,#7b3fe4_46%,#f84464_100%)]",
};
const HeroSlide = ({ slide }) => {
  const fallbackClassName = heroFallbackByType[slide.contentType] || heroFallbackByType.event;

  return (
    <section className={`relative h-[34rem] overflow-hidden rounded-[2.8rem] md:h-[44rem] ${fallbackClassName}`}>
      <PosterImage src={slide.poster} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,28,28,0.86)_0%,rgba(28,28,28,0.48)_44%,rgba(28,28,28,0.1)_100%)]" />

      <div className="relative z-10 flex h-full flex-col justify-end p-[2.4rem] text-[var(--color-text-light)] md:p-[4rem]">
        <h2 className="max-w-[11ch] text-[clamp(3rem,4.4vw,5.4rem)] leading-[1.03] font-extrabold tracking-[-0.04em]">
          {slide.title}
        </h2>
        <p className="mt-[1.2rem] max-w-[52rem] text-[1.5rem] leading-[1.75] text-white/88 md:text-[1.7rem]">
          {slide.subtitle}
        </p>
        <Link
          to={slide.to}
          className="mt-[2rem] inline-flex w-fit items-center rounded-[1.4rem] bg-[var(--color-primary)] px-[1.8rem] py-[1.2rem] text-[1.4rem] font-bold text-[var(--color-text-light)] transition-all duration-200 hover:bg-[var(--color-primary-hover)] md:text-[1.5rem]"
        >
          {slide.cta}
        </Link>
      </div>
    </section>
  );
};

const HomeRail = ({
  title,
  badge,
  description,
  to,
  items,
  isLoading,
  railId,
  emptyMessage,
}) => {
  const prevClassName = `${railId}-prev`;
  const nextClassName = `${railId}-next`;
  const slides = isLoading
    ? Array.from({ length: 4 }, (_, index) => ({ id: `${railId}-${index}` }))
    : items;

  return (
    <section className="mt-[3rem]">
      <div className="mb-[1.6rem] flex items-center justify-between gap-[1.4rem]">
        <div>
          {badge ? (
            <span className="inline-flex rounded-full bg-[rgba(248,68,100,0.08)] px-[1rem] py-[0.65rem] text-[1.05rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-primary)]">
              {badge}
            </span>
          ) : null}
          <h2 className="mt-[0.9rem] text-[2.4rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-[0.6rem] text-[1.4rem] leading-[1.65] text-[var(--color-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-[0.9rem]">
          <Link
            to={to}
            className="text-[1.4rem] font-bold text-[var(--color-primary)] transition-colors duration-200 hover:text-[var(--color-primary-hover)]"
          >
            See all
          </Link>
          <button
            type="button"
            className={`${prevClassName} hidden h-[4rem] w-[4rem] items-center justify-center rounded-full border border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-soft)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] hover:text-[var(--color-primary)] md:inline-flex`}
            aria-label={`Previous ${title}`}
          >
            <ChevronLeft className="h-[1.8rem] w-[1.8rem]" />
          </button>
          <button
            type="button"
            className={`${nextClassName} hidden h-[4rem] w-[4rem] items-center justify-center rounded-full border border-[rgba(28,28,28,0.08)] bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-soft)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.18)] hover:text-[var(--color-primary)] md:inline-flex`}
            aria-label={`Next ${title}`}
          >
            <ChevronRight className="h-[1.8rem] w-[1.8rem]" />
          </button>
        </div>
      </div>

      {!isLoading && !items.length ? (
        <div className="rounded-[2.2rem] border border-[rgba(28,28,28,0.08)] bg-white px-[1.8rem] py-[1.6rem] text-[1.5rem] text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)]">
          {emptyMessage}
        </div>
      ) : (
        <Swiper
          modules={[A11y, Navigation]}
          navigation={{
            prevEl: `.${prevClassName}`,
            nextEl: `.${nextClassName}`,
          }}
          spaceBetween={20}
          slidesPerView={1.12}
          breakpoints={{
            560: { slidesPerView: 1.45 },
            768: { slidesPerView: 2.1 },
            1024: { slidesPerView: 3.1 },
            1280: { slidesPerView: 4 },
          }}
        >
          {slides.map((item) => (
            <SwiperSlide key={item.id || item.title} className="h-auto">
              <div className="h-full">
                <EventCard event={item} isLoading={isLoading} size="listing" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  );
};

export const Home = () => {
  const [homeEvents, setHomeEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { selectedLocation } = useLocationStore();
  const { wishlistItems } = useWishlist();

  useEffect(() => {
    let ignore = false;

    const loadHomeEvents = async () => {
      setIsLoading(true);
      setError("");

      try {
        const eventData = await getEvents({ limit: 24 });

        if (!ignore) {
          setHomeEvents(eventData);
        }
      } catch {
        if (!ignore) {
          setError("Unable to load TicketHub events right now.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadHomeEvents();

    return () => {
      ignore = true;
    };
  }, []);

  const locationEvents = useMemo(
    () => filterItemsByLocation(homeEvents, selectedLocation),
    [homeEvents, selectedLocation]
  );

  const heroSlides = useMemo(() => locationEvents.slice(0, 3), [locationEvents]);

  const recommendedItemsByType = useMemo(() => {
    const wishlistedTypes = [...new Set(wishlistItems.map((item) => item.contentType).filter(Boolean))];
    const orderedTypes = [
      ...wishlistedTypes,
      ...["movie", "event", "sports"].filter((type) => !wishlistedTypes.includes(type)),
    ];

    return orderedTypes.reduce((accumulator, type) => {
      accumulator[type] = locationEvents.filter((item) => item.contentType === type).slice(0, 8);
      return accumulator;
    }, {});
  }, [locationEvents, wishlistItems]);

  const recommendedMovies = recommendedItemsByType.movie || [];
  const recommendedEvents = recommendedItemsByType.event || [];
  const recommendedSports = recommendedItemsByType.sports || [];

  const popularEvents = useMemo(
    () => locationEvents.filter((item) => item.contentType === "event").slice(0, 8),
    [locationEvents]
  );

  const popularMovies = useMemo(
    () => locationEvents.filter((item) => item.contentType === "movie").slice(0, 8),
    [locationEvents]
  );

  const topGamesAndSportsEvents = useMemo(
    () => locationEvents.filter((item) => item.contentType === "sports").slice(0, 8),
    [locationEvents]
  );

  const hasSlides = heroSlides.length > 0;

  return (
    <main className="py-[3rem]">
      <section className="mx-auto w-[min(120rem,calc(100%_-_3.2rem))]">
        <div className="relative">
          {hasSlides ? (
            <HeroCarousel
              items={heroSlides}
              renderSlide={(slide) => <HeroSlide slide={slide} />}
            />
          ) : (
            <section className="flex h-[34rem] items-end overflow-hidden rounded-[2.8rem] bg-[linear-gradient(135deg,#171717_0%,#7b3fe4_48%,#f84464_100%)] p-[2.4rem] text-[var(--color-text-light)] md:h-[44rem] md:p-[4rem]">
              <div>
                <h2 className="max-w-[11ch] text-[clamp(3rem,4.4vw,5.4rem)] leading-[1.03] font-extrabold tracking-[-0.04em]">
                  {isLoading ? "Loading live events..." : "No live events available yet."}
                </h2>
                <p className="mt-[1.2rem] max-w-[52rem] text-[1.5rem] leading-[1.75] text-white/88 md:text-[1.7rem]">
                  {error || "Add active records to your existing events collection and they will appear here automatically."}
                </p>
              </div>
            </section>
          )}
        </div>

        {error ? (
          <div className="mt-[2.6rem] rounded-[2.2rem] border border-[rgba(248,68,100,0.14)] bg-[rgba(248,68,100,0.05)] px-[1.8rem] py-[1.6rem] text-[1.5rem] text-[var(--color-text-secondary)]">
            {error}
          </div>
        ) : (
          <>
            <HomeRail
              title="Recommended Movies"
              badge="For you"
              description="Movie picks shaped by what you save and browse."
              to="/movies"
              items={recommendedMovies}
              isLoading={isLoading}
              railId="recommended-movies"
              emptyMessage="No movie recommendations are available right now."
            />
            <HomeRail
              title="Recommended Events"
              badge="For you"
              description="Live event picks selected from your current taste."
              to="/events"
              items={recommendedEvents}
              isLoading={isLoading}
              railId="recommended-events"
              emptyMessage="No event recommendations are available right now."
            />
            <HomeRail
              title="Recommended Sports"
              badge="For you"
              description="Sports picks lined up from the categories you like."
              to="/sports"
              items={recommendedSports}
              isLoading={isLoading}
              railId="recommended-sports"
              emptyMessage="No sports recommendations are available right now."
            />
            <HomeRail
              title="Popular Movies"
              badge="Trending"
              description="Big-screen picks people usually open first."
              to="/movies"
              items={popularMovies}
              isLoading={isLoading}
              railId="popular-movies"
              emptyMessage="No popular movies are available right now."
            />
            <HomeRail
              title="Popular Events"
              badge="Trending"
              description="Events getting the most attention right now."
              to="/events"
              items={popularEvents}
              isLoading={isLoading}
              railId="popular-events"
              emptyMessage="No popular events are available right now."
            />
            <HomeRail
              title="Top Games & Sport Events"
              badge="Sports spotlight"
              description="One sports rail for match days, leagues, and stadium events."
              to="/sports"
              items={topGamesAndSportsEvents}
              isLoading={isLoading}
              railId="top-games-sports-events"
              emptyMessage="No top games or sports events are available right now."
            />
          </>
        )}
      </section>
    </main>
  );
};
