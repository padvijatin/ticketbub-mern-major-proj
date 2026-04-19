import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Heart, MapPin } from "lucide-react";
import { Rating } from "./Rating.jsx";
import { useWishlist } from "../store/wishlist-context.jsx";
import { fallbackPosterImage, resolvePosterSource } from "./posterImageUtils.js";

const routeByType = {
  movie: "/movies",
  sports: "/sports",
  event: "/events",
};

const fallbackByType = {
  movie: "bg-[linear-gradient(135deg,#181032_0%,#7b3fe4_52%,#f84464_100%)]",
  sports: "bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_52%,#22c55e_100%)]",
  event: "bg-[linear-gradient(135deg,#1c1c1c_0%,#7b3fe4_46%,#f84464_100%)]",
};
const fallbackImage = fallbackPosterImage;

const formatDate = (value) => {
  if (!value) {
    return "Date to be announced";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatPrice = (value) => {
  if (typeof value === "number") {
    return `Rs ${new Intl.NumberFormat("en-IN").format(value)}`;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return "Price soon";
};

const getLocation = (event) => {
  if (event.location) {
    return event.location;
  }

  if (event.city) {
    return event.city;
  }

  if (event.venue) {
    return event.venue;
  }

  return "Location to be announced";
};

const getCategoryLabel = (event) => {
  if (event.category) {
    return event.category;
  }

  if (event.contentType === "movie") {
    return "Movie";
  }

  if (event.contentType === "sports") {
    return "Sports";
  }

  return "Live Event";
};

const EventCardSkeleton = ({ size = "default" }) => {
  const isListing = size === "listing";
  const mediaAspectClassName = isListing ? "aspect-[4/5] sm:aspect-[5/6]" : "aspect-[15/10] sm:aspect-[16/10]";
  const cardShellClassName = isListing
    ? "min-h-[42rem] sm:min-h-[45rem] xl:min-h-[48rem]"
    : "min-h-[38rem] sm:min-h-[41rem] xl:min-h-[44rem]";

  return (
    <article
      className={`h-full overflow-hidden rounded-[2rem] border border-[rgba(28,28,28,0.08)] bg-[var(--color-bg-card)] shadow-[var(--shadow-soft)] ${cardShellClassName}`}
    >
      <div className={`${mediaAspectClassName} animate-pulse bg-[linear-gradient(180deg,#eceff3_0%,#e2e8f0_100%)]`} />
      <div className="grid animate-pulse gap-[1rem] p-[1.3rem] sm:p-[1.5rem]">
        <div className="h-[1.8rem] w-[72%] rounded-full bg-[#e7eaee]" />
        <div className="h-[1.4rem] w-[56%] rounded-full bg-[#edf0f3]" />
        <div className="h-[1.4rem] w-[48%] rounded-full bg-[#edf0f3]" />
        <div className="mt-[0.8rem] flex items-center justify-between gap-[1rem]">
          <div className="h-[2.1rem] w-[34%] rounded-full bg-[#e7eaee]" />
          <div className="h-[4rem] w-[10.8rem] rounded-[1.2rem] bg-[#e7eaee]" />
        </div>
      </div>
    </article>
  );
};

const EventCard = ({
  event = {},
  isLoading = false,
  size = "default",
}) => {
  const primaryImage = resolvePosterSource(event.image || event.poster);
  const [imageSrc, setImageSrc] = useState(primaryImage);
  const { isWishlisted, toggleWishlist } = useWishlist();
  const isListing = size === "listing";
  const mediaAspectClassName = isListing ? "aspect-[4/5] sm:aspect-[5/6]" : "aspect-[15/10] sm:aspect-[16/10]";
  const cardShellClassName = isListing
    ? "min-h-[42rem] sm:min-h-[45rem] xl:min-h-[48rem]"
    : "min-h-[38rem] sm:min-h-[41rem] xl:min-h-[44rem]";
  const titleClassName = isListing
    ? "min-h-[5rem] text-[1.7rem] sm:min-h-[5.4rem] sm:text-[1.85rem]"
    : "min-h-[4.8rem] text-[1.65rem] sm:min-h-[5.2rem] sm:text-[1.8rem]";
  const isLiked = isWishlisted(event) || Boolean(event.isWishlisted || event.liked);
  useEffect(() => {
    setImageSrc(primaryImage);
  }, [primaryImage]);

  if (isLoading) {
    return <EventCardSkeleton size={size} />;
  }

  const title = event.title || "Untitled event";
  const location = getLocation(event);
  const date = formatDate(event.date);
  const price = formatPrice(event.price);
  const category = getCategoryLabel(event);
  const averageRating = Number(event.averageRating || 0);
  const totalRatings = Number(event.totalRatings || 0);
  const destination = event.id ? `/event/${event.id}` : event.to || routeByType[event.contentType] || "/events";
  const fallbackClassName = fallbackByType[event.contentType] || fallbackByType.event;

  const handleImageError = () => {
    setImageSrc(fallbackImage);
  };

  const handleWishlistToggle = (eventObject) => {
    eventObject.preventDefault();
    eventObject.stopPropagation();
    toggleWishlist(event);
  };

  return (
    <article className="relative h-full min-w-0">
      <button
        type="button"
        aria-label={isLiked ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={isLiked}
        onClick={handleWishlistToggle}
        className={`absolute right-[1rem] top-[1rem] z-20 inline-flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-full border shadow-[0_10px_24px_rgba(28,28,28,0.14)] transition-colors duration-200 sm:right-[1.2rem] sm:top-[1.2rem] sm:h-[3.8rem] sm:w-[3.8rem] ${
          isLiked
            ? "border-[rgba(248,68,100,0.24)] bg-white text-[var(--color-primary)]"
            : "border-[rgba(28,28,28,0.08)] bg-white/96 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
        }`}
      >
        <Heart className={`h-[1.8rem] w-[1.8rem] ${isLiked ? "fill-current" : ""}`} />
      </button>

      <Link
        to={destination}
        className={`group flex h-full flex-col overflow-hidden rounded-[2rem] border border-[rgba(28,28,28,0.08)] bg-[var(--color-bg-card)] shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] duration-200 hover:border-[rgba(248,68,100,0.14)] hover:shadow-[0_20px_34px_rgba(28,28,28,0.08)] ${cardShellClassName}`}
      >
        <div className={`relative overflow-hidden ${mediaAspectClassName} ${fallbackClassName}`}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={title}
              className="poster-card-image"
              onError={handleImageError}
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,28,28,0.04)_0%,rgba(28,28,28,0.14)_45%,rgba(28,28,28,0.54)_100%)]" />

          <div className="absolute left-[1rem] top-[1rem] max-w-[72%] sm:left-[1.2rem] sm:top-[1.2rem] sm:max-w-[68%]">
            <span className="inline-flex rounded-full bg-[var(--color-primary)] px-[0.9rem] py-[0.55rem] text-[0.95rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-text-light)] sm:px-[1rem] sm:py-[0.65rem] sm:text-[1rem]">
              {category}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-[1.3rem] sm:p-[1.5rem]">
          <h3
            className={`${titleClassName} font-extrabold leading-[1.35] tracking-[-0.02em] text-[var(--color-text-primary)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden`}
            title={title}
          >
            {title}
          </h3>

          <div className="mt-[1.1rem]">
            <Rating value={averageRating} totalRatings={totalRatings} size="sm" />
          </div>

          <div className="mt-[1rem] grid gap-[0.75rem] text-[1.25rem] text-[var(--color-text-secondary)] sm:text-[1.3rem]">
            <div className="flex items-center gap-[0.7rem]">
              <CalendarDays className="h-[1.5rem] w-[1.5rem] shrink-0 text-[var(--color-primary)]" />
              <span className="truncate">{date}</span>
            </div>
            <div className="flex items-center gap-[0.7rem]">
              <MapPin className="h-[1.5rem] w-[1.5rem] shrink-0 text-[var(--color-primary)]" />
              <span className="truncate" title={location}>
                {location}
              </span>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-[0.8rem] pt-[1.4rem] sm:gap-[1rem] sm:pt-[1.6rem]">
            <div className="min-w-0">
              <p className="text-[1rem] font-extrabold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]/80">
                Starts from
              </p>
              <p className="mt-[0.35rem] truncate text-[1.7rem] font-extrabold text-[var(--color-primary)] sm:text-[1.95rem]">
                {price}
              </p>
            </div>

            <span className="inline-flex h-[3.7rem] shrink-0 items-center rounded-[1.1rem] bg-[var(--color-primary)] px-[1.2rem] text-[1.2rem] font-bold text-[var(--color-text-light)] transition-colors duration-200 group-hover:bg-[var(--color-primary-hover)] sm:h-[4rem] sm:rounded-[1.2rem] sm:px-[1.5rem] sm:text-[1.3rem]">
              Book Now
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default EventCard;
