import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { HeroCarousel } from "./HeroCarousel.jsx";
import PosterImage from "./PosterImage.jsx";
import HeroPosterCard from "./HeroPosterCard.jsx";

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
    <article className={`relative overflow-hidden rounded-[2.8rem] border border-[rgba(28,28,28,0.08)] ${fallbackClassName}`}>
      <div className="absolute inset-0">
        <PosterImage
          src={image}
          alt={item.title}
          className="h-full w-full scale-[1.14] object-cover opacity-68 blur-[34px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.84)_0%,rgba(255,255,255,0.72)_40%,rgba(255,255,255,0.48)_62%,rgba(255,255,255,0.62)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.34),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.24),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.22)_100%)]" />
      </div>

      <div className="relative z-10 grid min-h-[32rem] gap-[1.8rem] p-[1.6rem] md:min-h-[42rem] md:grid-cols-[minmax(0,1.14fr)_clamp(23rem,24vw,29rem)] md:items-center md:gap-[2.4rem] md:p-[2rem] lg:px-[2.4rem]">
        <div className="flex h-full min-w-0 max-w-[60rem] flex-col justify-center py-[0.2rem] md:py-[0.6rem]">
          <p className="text-[1.45rem] font-semibold text-[rgba(28,28,28,0.72)] md:text-[1.8rem]">
            {formatDate(item.date)}
          </p>
          <h2 className="mt-[1.2rem] max-w-[12ch] overflow-hidden text-[clamp(2.7rem,4.1vw,4.9rem)] font-extrabold leading-[1.04] tracking-[-0.04em] text-[var(--color-text-primary)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {item.title}
          </h2>
          <p className="mt-[1.4rem] flex items-center gap-[0.7rem] text-[1.5rem] font-semibold text-[rgba(28,28,28,0.86)] md:text-[1.7rem]">
            <MapPin className="h-[1.8rem] w-[1.8rem] text-[var(--color-primary)]" />
            <span className="truncate">{getLocation(item)}</span>
          </p>
          <p className="mt-[1rem] text-[1.6rem] font-semibold text-[rgba(28,28,28,0.78)] md:text-[1.75rem]">
            {formatPrice(item.price)}
          </p>
          {item.subtitle ? (
            <p className="mt-[1.4rem] max-w-[56rem] overflow-hidden text-[1.4rem] leading-[1.7] text-[rgba(28,28,28,0.84)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] md:text-[1.56rem]">
              {item.subtitle}
            </p>
          ) : null}

          <Link
            to={getBannerLink(item)}
            className="mt-[2.1rem] inline-flex w-fit items-center rounded-[1.4rem] bg-[#17171c] px-[1.8rem] py-[1.2rem] text-[1.4rem] font-bold text-[var(--color-text-light)] shadow-[0_18px_32px_rgba(23,23,28,0.18)] transition-all duration-200 hover:bg-[var(--color-primary)] md:text-[1.5rem]"
          >
            Book now
          </Link>
        </div>

        <HeroPosterCard image={image} title={item.title} />
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
