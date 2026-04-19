import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { A11y, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import EventCard from "../components/EventCard.jsx";
import HeroPosterCard from "../components/HeroPosterCard.jsx";
import { HeroCarousel } from "../components/HeroCarousel.jsx";
import PosterImage from "../components/PosterImage.jsx";
import { useAuth } from "../store/auth-context.jsx";
import { useLocationStore } from "../store/location-context.jsx";
import { filterItemsByLocation } from "../store/location-utils.js";
import { useWishlist } from "../store/wishlist-context.jsx";
import { getDiscoverFeed, getEvents } from "../utils/eventApi.js";

const heroFallbackByType = {
  movie: "bg-[linear-gradient(135deg,#181032_0%,#7b3fe4_52%,#f84464_100%)]",
  sports: "bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_52%,#22c55e_100%)]",
  event: "bg-[linear-gradient(135deg,#1c1c1c_0%,#7b3fe4_46%,#f84464_100%)]",
};
const homeHeroShellClassName =
  "relative overflow-hidden rounded-[2.8rem] border border-[rgba(28,28,28,0.08)]";
const homeHeroGridClassName =
  "relative z-10 grid min-h-[32rem] gap-[1.8rem] p-[1.6rem] md:min-h-[42rem] md:grid-cols-[minmax(0,1.14fr)_clamp(23rem,24vw,29rem)] md:items-center md:gap-[2.4rem] md:p-[2rem] lg:px-[2.4rem]";
const homeHeroContentClassName =
  "flex h-full min-w-0 max-w-[60rem] flex-col justify-center py-[0.2rem] md:py-[0.6rem]";

const HeroSlide = ({ slide }) => {
  const fallbackClassName = heroFallbackByType[slide.contentType] || heroFallbackByType.event;

  return (
    <section className={`${homeHeroShellClassName} ${fallbackClassName}`}>
      <div className="absolute inset-0">
        <PosterImage
          src={slide.poster}
          alt={slide.title}
          className="h-full w-full scale-[1.14] object-cover opacity-68 blur-[34px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.84)_0%,rgba(255,255,255,0.72)_40%,rgba(255,255,255,0.48)_62%,rgba(255,255,255,0.62)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.34),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.24),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.22)_100%)]" />
      </div>

      <div className={homeHeroGridClassName}>
        <div className={homeHeroContentClassName}>
          <h2 className="max-w-[12ch] overflow-hidden text-[clamp(2.7rem,4.1vw,4.9rem)] leading-[1.04] font-extrabold tracking-[-0.04em] text-[var(--color-text-primary)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {slide.title}
          </h2>
          <p className="mt-[1.4rem] max-w-[52rem] overflow-hidden text-[1.4rem] leading-[1.7] text-[rgba(28,28,28,0.84)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] md:text-[1.56rem]">
            {slide.subtitle}
          </p>
          <Link
            to={slide.to}
            className="mt-[2.1rem] inline-flex w-fit items-center rounded-[1.4rem] bg-[#17171c] px-[1.8rem] py-[1.2rem] text-[1.4rem] font-bold text-[var(--color-text-light)] shadow-[0_18px_32px_rgba(23,23,28,0.18)] transition-all duration-200 hover:bg-[var(--color-primary)] md:text-[1.5rem]"
          >
            {slide.cta}
          </Link>
        </div>

        <HeroPosterCard image={slide.poster} title={slide.title} />
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
    <section className="mt-[2.6rem] sm:mt-[3rem]">
      <div className="mb-[1.4rem] flex flex-col gap-[1.2rem] sm:mb-[1.6rem] md:flex-row md:items-center md:justify-between md:gap-[1.4rem]">
        <div className="min-w-0">
          {badge ? (
            <span className="inline-flex rounded-full bg-[rgba(248,68,100,0.08)] px-[1rem] py-[0.65rem] text-[1.05rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-primary)]">
              {badge}
            </span>
          ) : null}
          <h2 className="mt-[0.85rem] text-[2.1rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[2.4rem]">
            {title}
          </h2>
          {description ? (
            <p className="mt-[0.55rem] max-w-[64rem] text-[1.35rem] leading-[1.65] text-[var(--color-text-secondary)] sm:text-[1.4rem]">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-[0.9rem] md:justify-end">
          <span className="text-[1.25rem] font-semibold text-[var(--color-text-secondary)] md:hidden">
            Swipe to explore
          </span>
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
        <div className="overflow-hidden rounded-[2rem]">
          <Swiper
            modules={[A11y, Navigation]}
            navigation={{
              prevEl: `.${prevClassName}`,
              nextEl: `.${nextClassName}`,
            }}
            className="!overflow-visible [&_.swiper-wrapper]:items-stretch"
            grabCursor
            watchOverflow
            spaceBetween={14}
            slidesPerView={1.08}
            breakpoints={{
              420: { slidesPerView: 1.18, spaceBetween: 16 },
              560: { slidesPerView: 1.45, spaceBetween: 18 },
              768: { slidesPerView: 2.1, spaceBetween: 20 },
              1024: { slidesPerView: 3.1, spaceBetween: 20 },
              1280: { slidesPerView: 4, spaceBetween: 22 },
            }}
          >
            {slides.map((item) => (
              <SwiperSlide key={item.id || item.title} className="h-auto">
                <div className="h-full">
                  <EventCard
                    event={item}
                    isLoading={isLoading}
                    size="listing"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
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
  const { authorizationToken } = useAuth();
  const [discoverFeed, setDiscoverFeed] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadHomeEvents = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [eventData, feedData] = await Promise.all([
          getEvents({ limit: 36 }),
          getDiscoverFeed(authorizationToken).catch(() => null),
        ]);

        if (!ignore) {
          setHomeEvents(eventData);
          setDiscoverFeed(feedData);
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
  }, [authorizationToken]);

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

  const recommendedMovies = discoverFeed?.recommended?.movies?.length
    ? filterItemsByLocation(discoverFeed.recommended.movies, selectedLocation)
    : recommendedItemsByType.movie || [];
  const recommendedEvents = discoverFeed?.recommended?.events?.length
    ? filterItemsByLocation(discoverFeed.recommended.events, selectedLocation)
    : recommendedItemsByType.event || [];
  const recommendedSports = discoverFeed?.recommended?.sports?.length
    ? filterItemsByLocation(discoverFeed.recommended.sports, selectedLocation)
    : recommendedItemsByType.sports || [];

  const popularEvents = useMemo(
    () =>
      discoverFeed?.popular?.events?.length
        ? filterItemsByLocation(discoverFeed.popular.events, selectedLocation).slice(0, 8)
        : locationEvents.filter((item) => item.contentType === "event").slice(0, 8),
    [discoverFeed?.popular?.events, locationEvents, selectedLocation]
  );

  const popularMovies = useMemo(
    () =>
      discoverFeed?.popular?.movies?.length
        ? filterItemsByLocation(discoverFeed.popular.movies, selectedLocation).slice(0, 8)
        : locationEvents.filter((item) => item.contentType === "movie").slice(0, 8),
    [discoverFeed?.popular?.movies, locationEvents, selectedLocation]
  );

  const topGamesAndSportsEvents = useMemo(
    () =>
      discoverFeed?.trending?.sports?.length
        ? filterItemsByLocation(discoverFeed.trending.sports, selectedLocation).slice(0, 8)
        : locationEvents.filter((item) => item.contentType === "sports").slice(0, 8),
    [discoverFeed?.trending?.sports, locationEvents, selectedLocation]
  );

  const hasSlides = heroSlides.length > 0;

  return (
    <main className="py-[2rem] sm:py-[3rem]">
      <section className="mx-auto w-[min(120rem,calc(100%_-_2.4rem))] sm:w-[min(120rem,calc(100%_-_3.2rem))]">
        <div className="relative">
          {hasSlides ? (
            <HeroCarousel
              items={heroSlides}
              renderSlide={(slide) => <HeroSlide slide={slide} />}
            />
          ) : (
            <section className={`${homeHeroShellClassName} bg-[linear-gradient(135deg,#171717_0%,#7b3fe4_48%,#f84464_100%)] text-[var(--color-text-light)]`}>
              <div className={homeHeroGridClassName}>
                <div className={homeHeroContentClassName}>
                  <h2 className="max-w-[11ch] text-[clamp(3rem,4.4vw,5.4rem)] leading-[1.03] font-extrabold tracking-[-0.04em]">
                    {isLoading ? "Loading live events..." : "No live events available yet."}
                  </h2>
                  <p className="mt-[1.2rem] max-w-[52rem] text-[1.5rem] leading-[1.75] text-white/88 md:text-[1.7rem]">
                    {error || "Add active records to your existing events collection and they will appear here automatically."}
                  </p>
                </div>

                <HeroPosterCard
                  image=""
                  title=""
                  wrapperClassName="pointer-events-none opacity-0"
                />
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
