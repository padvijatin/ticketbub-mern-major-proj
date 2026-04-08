import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { getEvents } from "../utils/eventApi.js";
import { SearchList } from "./SearchList.jsx";

const tabs = [
  { id: "all", label: "All" },
  { id: "event", label: "Events" },
  { id: "movie", label: "Movies" },
  { id: "sports", label: "Sports" },
];

export const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let ignore = false;

    const loadItems = async () => {
      setIsLoading(true);

      try {
        const eventData = await getEvents({ limit: 200 });

        if (!ignore) {
          setItems(eventData);
        }
      } catch {
        if (!ignore) {
          setItems([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      ignore = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setActiveTab("all");
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items
      .filter((item) => (activeTab === "all" ? true : item.contentType === activeTab))
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        return `${item.title || ""} ${item.category || ""}`.toLowerCase().includes(normalizedQuery);
      })
      .slice(0, 12);
  }, [activeTab, items, query]);

  const modal = (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[10000] bg-[rgba(17,24,39,0.42)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="flex min-h-full items-start justify-center overflow-y-auto px-[1.6rem] py-[9rem]">
            <motion.div
              className="w-[min(66rem,100%)] rounded-[2.4rem] border border-[rgba(28,28,28,0.08)] bg-white p-[1.8rem] shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-[1rem]">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-[1.2rem] top-1/2 h-[1.8rem] w-[1.8rem] -translate-y-1/2 text-[var(--color-text-secondary)]" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search for movies, sports or events"
                    className="h-[4.8rem] w-full rounded-[1.4rem] border border-[rgba(28,28,28,0.08)] bg-white pl-[4.1rem] pr-[1.3rem] text-[1.4rem] text-[var(--color-text-primary)] outline-none transition-colors duration-200 focus:border-[rgba(248,68,100,0.22)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-[4.2rem] w-[4.2rem] items-center justify-center rounded-full border border-[rgba(28,28,28,0.08)] text-[var(--color-text-secondary)]"
                >
                  <X className="h-[1.8rem] w-[1.8rem]" />
                </button>
              </div>

              <div className="mt-[1.4rem] flex flex-wrap gap-[0.8rem]">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full px-[1.35rem] py-[0.8rem] text-[1.25rem] font-bold transition-colors duration-200 ${
                      activeTab === tab.id
                        ? "bg-[var(--color-primary)] text-[var(--color-text-light)]"
                        : "bg-[rgba(28,28,28,0.05)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-[1.8rem]">
                {isLoading ? (
                  <div className="rounded-[1.8rem] border border-[rgba(28,28,28,0.08)] bg-[rgba(28,28,28,0.02)] px-[1.4rem] py-[2rem] text-[1.35rem] text-[var(--color-text-secondary)]">
                    Loading results...
                  </div>
                ) : (
                  <SearchList items={filteredItems} onSelect={onClose} />
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
};
