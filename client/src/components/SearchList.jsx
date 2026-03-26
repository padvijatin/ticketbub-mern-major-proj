import { Link } from "react-router-dom";

const categoryLabelMap = {
  movie: "Movie",
  event: "Event",
  sports: "Sports",
};

export const SearchList = ({ items, onSelect }) => {
  if (!items.length) {
    return (
      <div className="rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-[rgba(28,28,28,0.02)] px-[1.4rem] py-[2rem] text-[1.35rem] text-[var(--color-text-secondary)]">
        No results found.
      </div>
    );
  }

  return (
    <div className="space-y-[0.7rem]">
      {items.map((item) => (
        <Link
          key={item.id || item._id || item.title}
          to={`/event/${item.id}`}
          onClick={onSelect}
          className="flex items-center justify-between rounded-[1.6rem] border border-transparent bg-[rgba(28,28,28,0.02)] px-[1.4rem] py-[1.2rem] transition-colors duration-200 hover:border-[rgba(248,68,100,0.16)] hover:bg-[rgba(248,68,100,0.05)]"
        >
          <div className="min-w-0">
            <p className="truncate text-[1.45rem] font-bold text-[var(--color-text-primary)]">
              {item.title}
            </p>
            <p className="mt-[0.25rem] text-[1.15rem] text-[var(--color-text-secondary)]">
              {categoryLabelMap[item.contentType] || "Event"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};
