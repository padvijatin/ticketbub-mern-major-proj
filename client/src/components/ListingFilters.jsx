export const ListingFilters = ({ title, groups, activeFilters, onToggle, onReset }) => {
  return (
    <section className="mb-[2.2rem] rounded-[2.4rem] border border-[rgba(28,28,28,0.08)] bg-white p-[1.8rem] shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-[1rem]">
        <div>
          <h2 className="text-[2rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
            {title}
          </h2>
          <p className="mt-[0.45rem] text-[1.3rem] text-[var(--color-text-secondary)]">
            Find the right pick faster with TicketHub-style quick filters.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[1.2rem] font-bold text-[var(--color-primary)]"
        >
          Clear all
        </button>
      </div>

      <div className="mt-[1.6rem] space-y-[1.35rem]">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="text-[1.15rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
              {group.label}
            </p>
            <div className="mt-[0.8rem] flex flex-wrap gap-[0.7rem]">
              {group.options.map((option) => {
                const isActive = activeFilters[group.key] === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onToggle(group.key, option)}
                    className={`rounded-full border px-[1rem] py-[0.55rem] text-[1.15rem] font-medium transition-colors duration-200 ${
                      isActive
                        ? "border-[rgba(248,68,100,0.22)] bg-[rgba(248,68,100,0.08)] text-[var(--color-primary)]"
                        : "border-[rgba(28,28,28,0.08)] bg-[rgba(28,28,28,0.03)] text-[var(--color-text-secondary)] hover:border-[rgba(248,68,100,0.18)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
