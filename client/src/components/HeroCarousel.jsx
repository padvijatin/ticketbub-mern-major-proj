import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { A11y, Autoplay, EffectFade } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-fade";

const baseButtonClassName =
  "absolute top-1/2 z-10 hidden h-[4.4rem] w-[4.4rem] -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(248,68,100,0.16)] bg-white/78 text-[var(--color-text-primary)] shadow-[0_16px_32px_rgba(28,28,28,0.12)] backdrop-blur-[14px] transition-colors duration-200 hover:border-[rgba(248,68,100,0.28)] hover:bg-white hover:text-[var(--color-primary)] md:inline-flex";

export const HeroCarousel = ({
  items = [],
  renderSlide,
  getSlideKey = (item, index) => item?.id || item?.title || index,
  getDotLabel = (_, index) => `Go to slide ${index + 1}`,
  previousLabel = "Previous slide",
  nextLabel = "Next slide",
  className = "",
  animateOnMount = false,
}) => {
  const [swiper, setSwiper] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isReady, setIsReady] = useState(!animateOnMount);

  useEffect(() => {
    if (!animateOnMount) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      setIsReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [animateOnMount]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  if (!items.length) {
    return null;
  }

  return (
    <section
      className={`relative ${
        animateOnMount
          ? `transition-all duration-500 ease-out ${
              isReady ? "translate-y-0 opacity-100" : "translate-y-[1.6rem] opacity-0"
            }`
          : ""
      } ${className}`.trim()}
    >
      <Swiper
        className="overflow-hidden rounded-[2.8rem]"
        modules={[A11y, Autoplay, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop={items.length > 1}
        speed={700}
        autoplay={
          items.length > 1
            ? {
                delay: 5000,
                disableOnInteraction: false,
              }
            : false
        }
        onSwiper={setSwiper}
        onSlideChange={(instance) => setActiveIndex(instance.realIndex)}
      >
        {items.map((item, index) => (
          <SwiperSlide key={getSlideKey(item, index)}>
            {renderSlide(item, index)}
          </SwiperSlide>
        ))}
      </Swiper>

      {items.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => swiper?.slidePrev()}
            className={`${baseButtonClassName} left-[1.2rem]`}
            aria-label={previousLabel}
          >
            <ChevronLeft className="h-[2rem] w-[2rem]" />
          </button>
          <button
            type="button"
            onClick={() => swiper?.slideNext()}
            className={`${baseButtonClassName} right-[1.2rem]`}
            aria-label={nextLabel}
          >
            <ChevronRight className="h-[2rem] w-[2rem]" />
          </button>

          <div className="absolute bottom-[1.6rem] left-1/2 z-10 flex -translate-x-1/2 gap-[0.8rem]">
            {items.map((item, index) => (
              <button
                key={`${getSlideKey(item, index)}-dot`}
                type="button"
                onClick={() => swiper?.slideToLoop(index)}
                className={`h-[0.9rem] rounded-full transition-all duration-200 ${
                  index === activeIndex
                    ? "w-[3rem] bg-[var(--color-primary)]"
                    : "w-[0.9rem] bg-[rgba(28,28,28,0.18)] hover:bg-[rgba(248,68,100,0.28)]"
                }`}
                aria-label={getDotLabel(item, index)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
};
