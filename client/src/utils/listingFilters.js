const hashString = (value = "") =>
  Array.from(String(value)).reduce(
    (total, character, index) => total + character.charCodeAt(0) * (index + 1),
    0
  );

export const getDateBucket = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "This Month";
  }

  const now = new Date();
  const diffInDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays <= 1) return "Today";
  if (diffInDays <= 3) return "This Weekend";
  if (diffInDays <= 30) return "This Month";
  return "Upcoming";
};

export const getPriceBucket = (price) => {
  const numericPrice = Number(price || 0);

  if (numericPrice <= 499) return "Under Rs 500";
  if (numericPrice <= 999) return "Rs 500 - 999";
  if (numericPrice <= 1999) return "Rs 1000 - 1999";
  if (numericPrice <= 2999) return "Rs 2000 - 2999";
  return "Premium";
};

export const detectMovieGenre = (event = {}) => {
  const haystack = `${event.title || ""} ${event.category || ""} ${event.subtitle || ""}`.toLowerCase();

  if (haystack.includes("horror")) return "Horror";
  if (haystack.includes("love") || haystack.includes("romance")) return "Romance";
  if (haystack.includes("comedy") || haystack.includes("fun")) return "Comedy";
  if (haystack.includes("action") || haystack.includes("war")) return "Action";
  if (haystack.includes("thrill") || haystack.includes("crime")) return "Thriller";
  if (haystack.includes("sci") || haystack.includes("space") || haystack.includes("future")) return "Sci-Fi";
  if (haystack.includes("adventure") || haystack.includes("journey")) return "Adventure";
  if (haystack.includes("family") || haystack.includes("kids")) return "Family";

  const fallbackGenres = ["Drama", "Action", "Comedy", "Thriller", "Adventure", "Sci-Fi"];
  return fallbackGenres[hashString(event.title) % fallbackGenres.length];
};

export const detectMovieLanguage = (event = {}) => {
  const haystack = `${event.title || ""} ${event.subtitle || ""}`.toLowerCase();

  if (haystack.includes("hindi")) return "Hindi";
  if (haystack.includes("english")) return "English";
  if (haystack.includes("telugu")) return "Telugu";
  if (haystack.includes("tamil")) return "Tamil";
  if (haystack.includes("malayalam")) return "Malayalam";
  if (haystack.includes("marathi")) return "Marathi";
  if (haystack.includes("gujarati")) return "Gujarati";

  const fallbackLanguages = ["Hindi", "English", "Telugu", "Tamil", "Marathi", "Gujarati"];
  return fallbackLanguages[hashString(event.id || event.title) % fallbackLanguages.length];
};

export const detectMovieFormat = (event = {}) => {
  const haystack = `${event.title || ""} ${event.subtitle || ""}`.toLowerCase();

  if (haystack.includes("imax")) return "IMAX";
  if (haystack.includes("4dx")) return "4DX";
  if (haystack.includes("3d")) return "3D";

  const fallbackFormats = ["2D", "3D", "IMAX"];
  return fallbackFormats[hashString(event.category || event.title) % fallbackFormats.length];
};

export const detectSportsCategory = (event = {}) => {
  const haystack = `${event.title || ""} ${event.category || ""} ${event.subtitle || ""}`.toLowerCase();

  if (haystack.includes("cricket") || haystack.includes("ipl") || haystack.includes("t20")) return "Cricket";
  if (haystack.includes("football") || haystack.includes("fc")) return "Football";

  const fallbackCategories = ["Cricket", "Football"];
  return fallbackCategories[hashString(event.title) % fallbackCategories.length];
};

export const detectSportsTier = (event = {}) => {
  const haystack = `${event.title || ""} ${event.category || ""}`.toLowerCase();

  if (haystack.includes("ipl")) return "IPL";
  if (haystack.includes("world cup") || haystack.includes("international")) return "International";
  if (haystack.includes("t20")) return "T20";
  if (haystack.includes("odi")) return "ODI";

  const fallbackTiers = ["IPL", "International", "T20", "ODI"];
  return fallbackTiers[hashString(event.id || event.title) % fallbackTiers.length];
};

export const detectEventCategory = (event = {}) => {
  const haystack = `${event.title || ""} ${event.category || ""} ${event.subtitle || ""}`.toLowerCase();

  if (haystack.includes("comedy")) return "Comedy";
  if (haystack.includes("concert") || haystack.includes("live")) return "Concert";
  if (haystack.includes("music")) return "Music";
  if (haystack.includes("workshop")) return "Workshop";
  if (haystack.includes("fest")) return "Festival";

  return event.category || "Live Event";
};

export const listingFilterConfigs = {
  movie: {
    title: "Browse Movies",
    groups: [
      { key: "language", label: "Languages", options: ["Hindi", "English", "Telugu", "Tamil", "Marathi", "Gujarati"] },
      { key: "genre", label: "Genres", options: ["Action", "Comedy", "Drama", "Thriller", "Romance", "Sci-Fi", "Adventure"] },
      { key: "format", label: "Format", options: ["2D", "3D", "IMAX", "4DX"] },
    ],
    describe: (item) => ({
      language: detectMovieLanguage(item),
      genre: detectMovieGenre(item),
      format: detectMovieFormat(item),
    }),
  },
  sports: {
    title: "Browse Sports",
    groups: [
      { key: "date", label: "Dates", options: ["Today", "This Weekend", "This Month", "Upcoming"] },
      { key: "category", label: "Categories", options: ["Cricket", "Football"] },
      { key: "tier", label: "Tournament", options: ["IPL", "International", "T20", "ODI"] },
      { key: "price", label: "Price", options: ["Under Rs 500", "Rs 500 - 999", "Rs 1000 - 1999", "Rs 2000 - 2999", "Premium"] },
    ],
    describe: (item) => ({
      date: getDateBucket(item.date),
      category: detectSportsCategory(item),
      tier: detectSportsTier(item),
      price: getPriceBucket(item.price),
    }),
  },
  event: {
    title: "Browse Events",
    groups: [
      { key: "date", label: "Dates", options: ["Today", "This Weekend", "This Month", "Upcoming"] },
      { key: "price", label: "Price", options: ["Under Rs 500", "Rs 500 - 999", "Rs 1000 - 1999", "Premium"] },
      { key: "category", label: "Categories", options: ["Comedy", "Concert", "Music", "Festival", "Workshop"] },
    ],
    describe: (item) => ({
      date: getDateBucket(item.date),
      price: getPriceBucket(item.price),
      category: detectEventCategory(item),
    }),
  },
};

export const filterListingItems = (items = [], config, activeFilters = {}) => {
  if (!config) {
    return items;
  }

  return items.filter((item) => {
    const descriptor = config.describe(item);
    return Object.entries(activeFilters).every(([key, value]) => !value || descriptor[key] === value);
  });
};
