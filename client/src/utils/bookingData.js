import { buildZoneSeatIds, getZoneBookedSeatIds } from "./seatLayout.js";

const slugify = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const defaultZoneMetaByType = {
  movie: [
    {
      key: "premium",
      colorClass: "bg-[rgba(248,68,100,0.14)]",
      description: "Best view with the strongest screen alignment.",
      perks: ["Prime view", "Fast entry"],
      section: "PR",
    },
    {
      key: "classic",
      colorClass: "bg-[rgba(123,63,228,0.14)]",
      description: "Balanced choice for most movie plans.",
      perks: ["Balanced view", "Popular pick"],
      section: "CL",
    },
    {
      key: "saver",
      colorClass: "bg-[rgba(34,197,94,0.16)]",
      description: "Budget-friendly seats without missing the experience.",
      perks: ["Best value", "Group friendly"],
      section: "SV",
    },
  ],
  sports: [
    {
      key: "north-lower",
      colorClass: "bg-[rgba(248,68,100,0.14)]",
      description: "Closer angle with strong sightlines near the action.",
      perks: ["Closer action", "Popular stand"],
      section: "NL",
    },
    {
      key: "east-stand",
      colorClass: "bg-[rgba(245,158,11,0.16)]",
      description: "Wide stadium view with a lively match-day atmosphere.",
      perks: ["Wide view", "Lively crowd"],
      section: "ES",
    },
    {
      key: "south-lower",
      colorClass: "bg-[rgba(34,197,94,0.16)]",
      description: "Comfortable lower-tier seating for regular fans.",
      perks: ["Comfortable zone", "Easy access"],
      section: "SL",
    },
    {
      key: "west-premium",
      colorClass: "bg-[rgba(123,63,228,0.18)]",
      description: "Premium stand with one of the strongest views in the house.",
      perks: ["Premium view", "Priority access"],
      section: "WP",
    },
  ],
  event: [
    {
      key: "fan-pit",
      colorClass: "bg-[linear-gradient(135deg,#f84464_0%,#ff8f6c_100%)]",
      description: "Closest to the stage with the most energetic crowd.",
      perks: ["Closest entry", "Fast-lane access"],
      section: "FP",
    },
    {
      key: "gold-circle",
      colorClass: "bg-[linear-gradient(135deg,#f59e0b_0%,#facc15_100%)]",
      description: "Balanced view with premium access and smoother entry.",
      perks: ["Premium zone", "Priority support"],
      section: "GC",
    },
    {
      key: "regular",
      colorClass: "bg-[linear-gradient(135deg,#7b3fe4_0%,#4f46e5_100%)]",
      description: "Best everyday pick for group bookings and casual plans.",
      perks: ["General entry", "Open access"],
      section: "RG",
    },
  ],
};

const getZoneMeta = (event, zone, index) => {
  const contentType = event?.contentType === "event" ? "event" : event?.contentType || "event";
  const defaults = defaultZoneMetaByType[contentType] || defaultZoneMetaByType.event;
  return defaults.find((item) => item.key === slugify(zone.name)) || defaults[index % defaults.length];
};

export const getEventSeatZones = (event = {}) => {
  const zones = Array.isArray(event.seatZones) ? event.seatZones : [];
  const bookedSeats = Array.isArray(event.bookedSeats) ? event.bookedSeats : [];

  return zones.map((zone, index) => {
    const meta = getZoneMeta(event, zone, index);
    const seatIds = buildZoneSeatIds(zone);
    const bookedSeatIds = getZoneBookedSeatIds(zone, bookedSeats);

    return {
      id: slugify(zone.name) || `${event.contentType || "zone"}-${index + 1}`,
      label: zone.name,
      name: zone.name,
      sectionGroup: zone.sectionGroup || "Tickets",
      price: Number(zone.price) || 0,
      rows: Array.isArray(zone.rows) ? zone.rows : [],
      seatsPerRow: Math.max(0, Number(zone.seatsPerRow) || 0),
      seatIds,
      bookedSeatIds,
      totalSeats: seatIds.length,
      availableSeatIds: seatIds.filter((seatId) => !bookedSeatIds.includes(seatId)),
      availableSeats: Math.max(0, seatIds.length - bookedSeatIds.length),
      currency: "Rs ",
      colorClass: meta.colorClass,
      description: meta.description,
      perks: meta.perks,
      section: meta.section,
    };
  });
};

export const getBookingType = (event = {}) => {
  if (event.contentType === "movie") {
    return "theater";
  }

  if (event.contentType === "sports") {
    return "stadium";
  }

  return "experience";
};

export const buildSeatCategories = (event = {}) =>
  getEventSeatZones(event).map((zone) => ({
    id: zone.id,
    label: zone.label,
    price: zone.price,
    availableSeats: zone.availableSeats,
    colorClass: zone.colorClass,
    rows: zone.rows,
    seatsPerRow: zone.seatsPerRow,
    seatIds: zone.seatIds,
    bookedSeatIds: zone.bookedSeatIds,
  }));

export const generateTheaterSeats = (event = {}) => {
  const categories = buildSeatCategories(event);

  return categories.flatMap((category) =>
    category.seatIds.map((seatId) => {
      const row = String(seatId).match(/^[A-Z]+/)?.[0] || "";
      const number = Number(String(seatId).replace(/^[A-Z]+/, "")) || 0;

      return {
        id: seatId,
        row,
        number,
        category: category.id,
        price: category.price,
        status: category.bookedSeatIds.includes(seatId) ? "booked" : "available",
      };
    })
  );
};

export const generateStadiumZones = (event = {}) =>
  getEventSeatZones(event).map((zone, index) => ({
    id: zone.id,
    label: zone.label,
    section: zone.section,
    price: zone.price,
    currency: zone.currency,
    totalSeats: zone.totalSeats,
    bookedSeats: zone.bookedSeatIds.length,
    availableSeatIds: zone.availableSeatIds,
    position:
      [
        { top: "8%", left: "31%", width: "38%", height: "15%" },
        { top: "30%", right: "2%", width: "22%", height: "32%" },
        { bottom: "8%", left: "31%", width: "38%", height: "15%" },
        { top: "30%", left: "2%", width: "22%", height: "32%" },
      ][index] || { top: "30%", left: "2%", width: "22%", height: "32%" },
  }));

export const generateExperienceZones = (event = {}) =>
  getEventSeatZones(event).map((zone) => ({
    id: zone.id,
    label: zone.label,
    description: zone.description,
    price: zone.price,
    currency: zone.currency,
    totalTickets: zone.totalSeats,
    soldTickets: zone.bookedSeatIds.length,
    availableTicketIds: zone.availableSeatIds,
    colorClass: zone.colorClass,
    perks: zone.perks,
  }));
