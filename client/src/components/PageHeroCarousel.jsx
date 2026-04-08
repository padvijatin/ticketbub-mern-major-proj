import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { HeroCarousel } from "./HeroCarousel.jsx";
import PosterImage from "./PosterImage.jsx";

const fallbackByType = {
  movie: "bg-[linear-gradient(135deg,#181032_0%,#7b3fe4_52%,#f84464_100%)]",
  sports: "bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_52%,#22c55e_100%)]",
  event: "bg-[linear-gradient(135deg,#1c1c1c_0%,#7b3fe4_46%,#f84464_100%)]",
};

const formatDate = (value) => {
  if (!value) {
    return "Date to be announced";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

const formatPrice = (value) => {
  if (typeof value === "number") {
    return `Rs ${new Intl.NumberFormat("en-IN").format(value)} onwards`;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return "Price soon";
};

const getLocation = (item) => item.venue || item.city || item.location || "Venue update soon";

const getBannerLink = (item) => (item.id ? `/event/${item.id}` : item.to || "/events");

const HeroSlide = ({ item, type }) => {
  const image = item.poster || item.image || "";
  const fallbackClassName = fallbackByType[type] || fallbackByType.event;

  return (
    <article className={`relative h-[34rem] overflow-hidden rounded-[2.8rem] md:h-[44rem] ${fallbackClassName}`}>
      <PosterImage src={image} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,28,28,0.88)_0%,rgba(28,28,28,0.6)_44%,rgba(28,28,28,0.16)_100%)]" />

      <div className="relative z-10 flex h-full flex-col justify-end p-[2.4rem] text-[var(--color-text-light)] md:p-[4rem]">
        <div className="max-w-[58rem]">
          <p className="text-[1.55rem] font-semibold text-white/84 md:text-[1.8rem]">
            {formatDate(item.date)}
          </p>
          <h2 className="mt-[1.4rem] max-w-[11ch] text-[clamp(3rem,4.4vw,5.4rem)] font-extrabold leading-[1.03] tracking-[-0.04em] text-white">
            {item.title}
          </h2>
          <p className="mt-[1.4rem] flex items-center gap-[0.7rem] text-[1.5rem] font-medium text-white/88 md:text-[1.7rem]">
            <MapPin className="h-[1.8rem] w-[1.8rem] text-white" />
            <span className="truncate">{getLocation(item)}</span>
          </p>
          <p className="mt-[1.1rem] text-[1.6rem] font-semibold text-white/86 md:text-[1.75rem]">
            {formatPrice(item.price)}
          </p>

          <Link
            to={getBannerLink(item)}
            className="mt-[2rem] inline-flex w-fit items-center rounded-[1.4rem] bg-[var(--color-primary)] px-[1.8rem] py-[1.2rem] text-[1.4rem] font-bold text-[var(--color-text-light)] transition-all duration-200 hover:bg-[var(--color-primary-hover)] md:text-[1.5rem]"
          >
            Book now
          </Link>
        </div>
      </div>
    </article>
  );
};

export const PageHeroCarousel = ({ items = [], type = "event" }) => {
  if (!items.length) {
    return null;
  }

  return (
    <HeroCarousel
      items={items}
      className="mb-[3rem]"
      animateOnMount
      renderSlide={(item) => <HeroSlide item={item} type={type} />}
      previousLabel="Previous banner"
      nextLabel="Next banner"
      getDotLabel={(_, index) => `Go to banner ${index + 1}`}
    />
  );
};
