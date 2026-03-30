import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";

const getActiveCount = (activeFilters = {}) =>
  Object.values(activeFilters).reduce((count, values) => count + (values?.length || 0), 0);

const isOptionSelected = (activeFilters, key, value) => (activeFilters[key] || []).includes(value);

export const ListingFilters = ({
  title,
  groups,
  quickOptions = [],
  activeFilters,
  onToggle,
  onReset,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroupKey, setActiveGroupKey] = useState(groups[0]?.key || "");

  useEffect(() => {
    if (!groups.some((group) => group.key === activeGroupKey)) {
      setActiveGroupKey(groups[0]?.key || "");
    }
  }, [activeGroupKey, groups]);

  const activeCount = useMemo(() => getActiveCount(activeFilters), [activeFilters]);
  const activeGroup = groups.find((group) => group.key === activeGroupKey) || groups[0];

  const quickFilterItems = useMemo(() => {
    if (quickOptions.length) {
      return quickOptions;
    }

    return groups.flatMap((group) => group.options.slice(0, 1).map((value) => ({ key: group.key, value }))).slice(0, 4);
  }, [groups, quickOptions]);

  const modal = isOpen ? (
    <div
      className="fixed inset-0 z-[1300] bg-[rgba(28,28,28,0.38)] px-[0.9rem] py-[8.6rem] sm:px-[1.6rem] sm:py-[9.6rem]"
      onClick={() => setIsOpen(false)}
    >
      <div className="flex min-h-full items-start justify-center">
        <div
          className="w-full max-w-[64rem] overflow-hidden rounded-[1.8rem] border border-[rgba(248,68,100,0.08)] bg-white shadow-[0_28px_70px_rgba(28,28,28,0.16)] sm:rounded-[2.4rem]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-[1rem] px-[1.4rem] py-[1.4rem] sm:px-[2.4rem] sm:py-[2rem]">
            <div>
              <h3 className="text-[1.95rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[2.2rem]">
                Filter by
              </h3>
              <p className="mt-[0.35rem] text-[1.25rem] text-[var(--color-text-secondary)]">
                {title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-[3.4rem] w-[3.4rem] shrink-0 items-center justify-center rounded-full border border-[rgba(248,68,100,0.12)] bg-[rgba(248,68,100,0.04)] text-[var(--color-text-secondary)] transition-colors duration-200 hover:text-[var(--color-primary)] sm:h-[3.8rem] sm:w-[3.8rem]"
            >
              <X className="h-[1.8rem] w-[1.8rem]" />
            </button>
          </div>

          <div className="px-[1rem] pb-[1rem] sm:px-[1.8rem] sm:pb-[1.8rem]">
            <div className="grid overflow-hidden rounded-[1.7rem] border border-[rgba(248,68,100,0.08)] bg-[rgba(248,68,100,0.03)] md:grid-cols-[14rem_minmax(0,1fr)]">
              <div className="overflow-x-auto border-b border-[rgba(248,68,100,0.08)] bg-[rgba(255,255,255,0.88)] md:overflow-visible md:border-b-0 md:border-r">
                <div className="flex min-w-max md:min-w-0 md:flex-col">
                {groups.map((group) => {
                  const selectedCount = activeFilters[group.key]?.length || 0;
                  const isActive = group.key === activeGroup?.key;

                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => setActiveGroupKey(group.key)}
                      className={`flex min-w-[11rem] items-center justify-between gap-[0.8rem] px-[1.2rem] py-[1.1rem] text-left text-[1.22rem] font-bold transition-colors duration-200 md:w-full md:min-w-0 md:px-[1.4rem] md:py-[1.25rem] md:text-[1.28rem] ${
                        isActive
                          ? "bg-[rgba(248,68,100,0.08)] text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)] hover:bg-white/80 hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      <span className="truncate">{group.label}</span>
                      {selectedCount ? (
                        <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-[rgba(248,68,100,0.12)] px-[0.6rem] py-[0.15rem] text-[1.05rem] font-extrabold text-[var(--color-primary)]">
                          {selectedCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                </div>
              </div>

              <div className="min-h-[24rem] bg-white px-[1rem] py-[1rem] sm:px-[1.6rem] sm:py-[1.4rem]">
                <div className="grid gap-[0.7rem] sm:grid-cols-2">
                  {(activeGroup?.options || []).map((option) => {
                    const selected = isOptionSelected(activeFilters, activeGroup.key, option);

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => onToggle(activeGroup.key, option)}
                        className={`flex min-w-0 items-center gap-[0.9rem] rounded-[1.1rem] border px-[0.9rem] py-[0.85rem] text-left text-[1.25rem] font-semibold transition-colors duration-200 sm:rounded-[1.2rem] sm:px-[1rem] sm:py-[0.95rem] sm:text-[1.38rem] ${
                          selected
                            ? "border-[rgba(248,68,100,0.18)] bg-[rgba(248,68,100,0.08)] text-[var(--color-text-primary)]"
                            : "border-transparent text-[var(--color-text-primary)] hover:border-[rgba(248,68,100,0.1)] hover:bg-[rgba(248,68,100,0.04)]"
                        }`}
                      >
                        <span
                          className={`inline-flex h-[2.3rem] w-[2.3rem] shrink-0 items-center justify-center rounded-[0.7rem] border transition-colors duration-200 ${
                            selected
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                              : "border-[rgba(28,28,28,0.28)] bg-white text-transparent"
                          }`}
                        >
                          <Check className="h-[1.35rem] w-[1.35rem]" />
                        </span>
                        <span className="min-w-0 break-words leading-[1.25]">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-[1.25rem] flex flex-col gap-[0.9rem] sm:mt-[1.6rem] sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onReset}
                className="text-left text-[1.28rem] font-bold text-[var(--color-text-primary)] underline decoration-dotted underline-offset-[0.35rem] sm:text-[1.35rem]"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-[1.3rem] bg-[var(--color-primary)] px-[1.8rem] py-[1.15rem] text-[1.35rem] font-bold text-white transition-colors duration-200 hover:bg-[var(--color-primary-hover)] sm:min-w-[20rem] sm:w-auto sm:rounded-[1.4rem] sm:px-[2rem] sm:py-[1.2rem] sm:text-[1.42rem]"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
      <>
      <section className="mb-[2.6rem]">
        <div className="flex flex-wrap items-center gap-[0.8rem] sm:gap-[1rem]">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex h-[4.4rem] shrink-0 items-center gap-[0.8rem] rounded-[1.25rem] border border-[rgba(248,68,100,0.14)] bg-white px-[1.25rem] text-[1.35rem] font-bold text-[var(--color-text-primary)] shadow-[0_12px_30px_rgba(248,68,100,0.06)] transition-colors duration-200 hover:border-[rgba(248,68,100,0.24)] sm:h-[4.6rem] sm:gap-[0.9rem] sm:rounded-[1.35rem] sm:px-[1.5rem] sm:text-[1.55rem]"
          >
            <SlidersHorizontal className="h-[1.8rem] w-[1.8rem]" />
            <span>Filters</span>
            {activeCount ? (
              <span className="inline-flex h-[2.2rem] min-w-[2.2rem] items-center justify-center rounded-full bg-[rgba(248,68,100,0.12)] px-[0.55rem] text-[1.1rem] font-extrabold text-[var(--color-primary)]">
                {activeCount}
              </span>
            ) : null}
            <ChevronDown className="h-[1.6rem] w-[1.6rem]" />
          </button>

          {quickFilterItems.map((option) => {
            const selected = isOptionSelected(activeFilters, option.key, option.value);

            return (
              <button
                key={`${option.key}-${option.value}`}
                type="button"
                onClick={() => onToggle(option.key, option.value)}
                className={`inline-flex min-h-[4.4rem] max-w-full items-center rounded-[1.25rem] border px-[1.15rem] py-[0.85rem] text-[1.28rem] font-medium transition-colors duration-200 sm:min-h-[4.6rem] sm:rounded-[1.35rem] sm:px-[1.7rem] sm:py-[0.9rem] sm:text-[1.5rem] ${
                  selected
                    ? "border-[rgba(248,68,100,0.24)] bg-[rgba(248,68,100,0.08)] text-[var(--color-primary)]"
                    : "border-[rgba(28,28,28,0.12)] bg-white text-[var(--color-text-primary)] hover:border-[rgba(248,68,100,0.16)]"
                }`}
              >
                <span className="break-words leading-[1.15]">{option.value}</span>
              </button>
            );
          })}
        </div>
      </section>

      {typeof document !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
};
