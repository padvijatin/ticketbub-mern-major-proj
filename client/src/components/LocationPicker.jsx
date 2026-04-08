import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { Building2, ChevronDown, MapPin, Navigation, Search, X } from "lucide-react";
import { matchesLocationSearch, useLocationStore } from "../store/location.jsx";

export const LocationPicker = ({ mobile = false, onSelect }) => {
  const {
    allCities,
    chooseCity,
    detectCurrentLocation,
    isDetectingLocation,
    popularCities,
    selectedLocation,
  } = useLocationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredCities = useMemo(() => {
    const popularCityNames = new Set(popularCities.map((city) => city.name.toLowerCase()));

    return allCities.filter((city) => {
      const isPopularCity = popularCityNames.has(city.name.toLowerCase());
      return !isPopularCity && matchesLocationSearch(city, searchValue);
    });
  }, [allCities, popularCities, searchValue]);

  const handleSelectCity = (city) => {
    chooseCity(city);
    setIsOpen(false);
    setSearchValue("");
    onSelect?.();
  };

  const handleDetectLocation = async () => {
    const detectedCity = await detectCurrentLocation();

    if (detectedCity) {
      setIsOpen(false);
      setSearchValue("");
      onSelect?.();
    }
  };

  const buttonClassName = mobile
    ? "flex w-full items-center justify-between rounded-[1.4rem] border border-[rgba(248,68,100,0.12)] bg-[var(--color-bg-card)] px-[1.4rem] py-[1.2rem] text-left shadow-[var(--shadow-soft)]"
    : "inline-flex min-w-[14rem] max-w-[20rem] items-center gap-[0.55rem] overflow-hidden bg-transparent px-0 py-0 text-left";

  const modal = (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[9999] bg-[rgba(17,24,39,0.42)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
        >
          <div className="flex min-h-full items-start justify-center overflow-y-auto px-[0.9rem] py-[5rem] sm:px-[1.6rem] sm:py-[8rem]">
            <motion.div
              className="w-full max-w-[78rem] overflow-hidden rounded-[1.6rem] border border-[rgba(28,28,28,0.08)] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:rounded-[2rem]"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-[1rem] border-b border-[rgba(28,28,28,0.08)] px-[1.2rem] py-[1.1rem] sm:px-[1.8rem] sm:py-[1.25rem]">
                <h2 className="text-[1.7rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[2rem]">
                  Choose your city
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-[3.4rem] w-[3.4rem] shrink-0 items-center justify-center rounded-full border border-[rgba(28,28,28,0.08)] text-[var(--color-text-secondary)] sm:h-[3.8rem] sm:w-[3.8rem]"
                >
                  <X className="h-[1.8rem] w-[1.8rem]" />
                </button>
              </div>

              <div className="px-[1.2rem] py-[1.2rem] sm:px-[1.8rem] sm:py-[1.6rem]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-[1.2rem] top-1/2 h-[1.8rem] w-[1.8rem] -translate-y-1/2 text-[var(--color-text-secondary)]" />
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search for your city"
                    className="h-[4.8rem] w-full rounded-[1.4rem] border border-[rgba(28,28,28,0.08)] bg-white pl-[4.2rem] pr-[1.4rem] text-[1.4rem] text-[var(--color-text-primary)] outline-none transition-colors duration-200 focus:border-[rgba(248,68,100,0.22)]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isDetectingLocation}
                  className="mt-[1.1rem] inline-flex items-center gap-[0.7rem] text-[1.35rem] font-bold text-[var(--color-primary)] disabled:opacity-60"
                >
                  <Navigation className="h-[1.5rem] w-[1.5rem]" />
                  {isDetectingLocation ? "Detecting your location..." : "Detect my location"}
                </button>
              </div>

              <div className="max-h-[calc(85vh-13rem)] overflow-y-auto border-t border-[rgba(28,28,28,0.08)] px-[1.2rem] py-[1.2rem] sm:max-h-[calc(85vh-14rem)] sm:px-[1.8rem] sm:py-[1.8rem]">
                <p className="text-center text-[1.25rem] font-bold text-[var(--color-text-secondary)]">
                  Popular Cities
                </p>
                <div className="mt-[1.1rem] grid grid-cols-1 gap-[0.7rem] min-[420px]:grid-cols-2 sm:mt-[1.3rem] sm:gap-[0.8rem] lg:grid-cols-4">
                  {popularCities.map((city) => (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => handleSelectCity(city)}
                      className="min-w-0 rounded-[1.3rem] border border-[rgba(248,68,100,0.1)] bg-[linear-gradient(180deg,rgba(248,68,100,0.04)_0%,rgba(123,63,228,0.04)_100%)] px-[0.85rem] py-[0.95rem] text-center transition-colors duration-200 hover:border-[rgba(248,68,100,0.2)] hover:bg-[rgba(248,68,100,0.06)] sm:rounded-[1.5rem] sm:px-[0.9rem] sm:py-[1rem]"
                    >
                      <span className="mx-auto inline-flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-[1.1rem] bg-[rgba(248,68,100,0.08)] text-[var(--color-primary)] sm:h-[4rem] sm:w-[4rem] sm:rounded-[1.2rem]">
                        <Building2 className="h-[1.55rem] w-[1.55rem] sm:h-[1.7rem] sm:w-[1.7rem]" />
                      </span>
                      <span className="mt-[0.55rem] block break-words text-[1.18rem] font-bold leading-[1.2] text-[var(--color-text-primary)] sm:mt-[0.65rem] sm:text-[1.25rem]">
                        {city.name}
                      </span>
                      <span className="mt-[0.15rem] block break-words text-[0.92rem] leading-[1.2] text-[var(--color-text-secondary)] sm:text-[1rem]">
                        {city.state}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-[2rem] border-t border-[rgba(28,28,28,0.08)] pt-[1.6rem]">
                  <p className="text-center text-[1.25rem] font-bold text-[var(--color-text-secondary)]">
                    Other Cities
                  </p>

                  <div className="mt-[1.2rem] grid max-h-[24rem] grid-cols-1 gap-x-[1.2rem] gap-y-[0.9rem] overflow-y-auto pr-[0.2rem] min-[420px]:grid-cols-2 sm:gap-x-[2rem] sm:pr-[0.4rem] lg:grid-cols-4">
                    {filteredCities.map((city) => (
                      <button
                        key={`${city.name}-${city.state}`}
                        type="button"
                        onClick={() => handleSelectCity(city)}
                        className="min-w-0 break-words text-left text-[1.18rem] leading-[1.25] text-[var(--color-text-secondary)] transition-colors duration-200 hover:text-[var(--color-primary)] sm:text-[1.25rem]"
                      >
                        {city.name}
                        <span className="ml-[0.45rem] inline break-words text-[0.98rem] text-[var(--color-text-secondary)] sm:text-[1.05rem]">
                          {city.state}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={buttonClassName} title={`${selectedLocation.name}, ${selectedLocation.state}`}>
        <span className="inline-flex h-[2.6rem] w-[2.6rem] shrink-0 items-center justify-center text-[var(--color-primary)]">
          <MapPin className="h-[1.8rem] w-[1.8rem]" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1 overflow-hidden">
          <span className="block truncate text-[1.26rem] font-extrabold leading-[1.1] text-[var(--color-text-primary)]">
            {selectedLocation.name}
          </span>
          <span className="mt-[0.15rem] block truncate text-[0.94rem] leading-[1.2] text-[var(--color-text-secondary)]">
            {selectedLocation.state}
          </span>
        </span>
        {!mobile ? (
          <ChevronDown className="ml-[0.2rem] h-[1.4rem] w-[1.4rem] shrink-0 text-[var(--color-text-secondary)]" />
        ) : null}
      </button>

      {typeof document !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
};
