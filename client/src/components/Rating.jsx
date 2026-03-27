import { Star } from "lucide-react";

export const Rating = ({
  value = 0,
  totalRatings = 0,
  onRate,
  disabled = false,
  size = "default",
  showCount = true,
}) => {
  const starClassName = size === "sm" ? "h-[1.5rem] w-[1.5rem]" : "h-[1.9rem] w-[1.9rem]";
  const textClassName = size === "sm" ? "text-[1.3rem]" : "text-[1.55rem]";

  return (
    <div className="flex flex-wrap items-center gap-[0.8rem]">
      <div className="flex items-center gap-[0.35rem]">
        {Array.from({ length: 5 }, (_, index) => {
          const starValue = index + 1;
          const isActive = starValue <= Math.round(value);

          return (
            <button
              key={starValue}
              type="button"
              onClick={() => onRate?.(starValue)}
              disabled={disabled || !onRate}
              className={`transition-transform duration-150 ${
                disabled || !onRate ? "cursor-default" : "hover:scale-105"
              }`}
              aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
            >
              <Star
                className={`${starClassName} ${
                  isActive ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[rgba(28,28,28,0.18)]"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className={`${textClassName} font-bold text-[var(--color-text-primary)]`}>
        {Number(value || 0).toFixed(1)}
        {showCount ? (
          <span className="ml-[0.45rem] font-medium text-[var(--color-text-secondary)]">
            ({Number(totalRatings || 0)} ratings)
          </span>
        ) : null}
      </div>
    </div>
  );
};
