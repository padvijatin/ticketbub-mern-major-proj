import EventCard from "./EventCard.jsx";

export const ListingGrid = ({
  items,
  isLoading,
  error,
  columnsClassName = "sm:grid-cols-2 lg:grid-cols-3",
  emptyMessage = "No listings are available right now.",
  skeletonCount = 3,
  cardSize = "default",
}) => {
  if (isLoading) {
    return (
      <div className={`grid auto-rows-fr gap-[2rem] ${columnsClassName}`}>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <EventCard key={index} isLoading size={cardSize} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[2.2rem] border border-[rgba(248,68,100,0.14)] bg-[rgba(248,68,100,0.05)] px-[1.8rem] py-[1.6rem] text-[1.5rem] text-[var(--color-text-secondary)]">
        {error}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-[2.2rem] border border-[rgba(28,28,28,0.08)] bg-white px-[1.8rem] py-[1.6rem] text-[1.5rem] text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`grid auto-rows-fr gap-[2rem] ${columnsClassName}`}>
      {items.map((item) => (
        <EventCard key={item.id || item.title} event={item} size={cardSize} />
      ))}
    </div>
  );
};
