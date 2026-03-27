const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const connectDb = require("../utils/db");
const Event = require("../models/event-model");

const moviePattern = /(movie|film|cinema|screen|premiere)/i;
const sportsPattern = /(sport|cricket|football|match|league|ipl|cup|tournament|stadium)/i;

const defaultSeatZoneBlueprints = {
  movie: [
    { sectionGroup: "Screening", name: "Premium", totalSeats: 24, priceOffset: 120, minPrice: 471, minAvailable: 18 },
    { sectionGroup: "Screening", name: "Classic", totalSeats: 36, priceOffset: 0, minPrice: 349, minAvailable: 24 },
    { sectionGroup: "Screening", name: "Saver", totalSeats: 24, priceOffset: -87, minPrice: 262, minAvailable: 16 },
  ],
  sports: [
    { sectionGroup: "Pitch", name: "North Lower", totalSeats: 180, priceOffset: -90, minPrice: 1169, minAvailable: 64 },
    { sectionGroup: "Pitch", name: "East Stand", totalSeats: 220, priceOffset: 300, minPrice: 1559, minAvailable: 58 },
    { sectionGroup: "Pitch", name: "South Lower", totalSeats: 180, priceOffset: -25, minPrice: 1234, minAvailable: 44 },
    { sectionGroup: "Pitch", name: "West Premium", totalSeats: 140, priceOffset: 760, minPrice: 2013, minAvailable: 28 },
  ],
  event: [
    { sectionGroup: "Stage", name: "Fan Pit", totalSeats: 160, priceOffset: 1200, minPrice: 2499, minAvailable: 31 },
    { sectionGroup: "Stage", name: "Gold Circle", totalSeats: 220, priceOffset: 500, minPrice: 1799, minAvailable: 111 },
    { sectionGroup: "Stage", name: "Regular", totalSeats: 260, priceOffset: 0, minPrice: 999, minAvailable: 136 },
  ],
};

const detectContentType = (category = "") => {
  if (moviePattern.test(category)) {
    return "movie";
  }

  if (sportsPattern.test(category)) {
    return "sports";
  }

  return "event";
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeSeatZones = (event) => {
  const contentType = detectContentType(event.category);
  const basePrice = Number(event.price) || 0;
  const currentZones = Array.isArray(event.seatZones) ? event.seatZones : [];
  const blueprints = defaultSeatZoneBlueprints[contentType];

  return blueprints.map((blueprint, index) => {
    const currentZone = currentZones.find((zone) => String(zone.name || "").trim().toLowerCase() === blueprint.name.toLowerCase())
      || currentZones[index]
      || {};
    const totalSeats = blueprint.totalSeats;
    const availableSeats = clamp(
      Number(currentZone.availableSeats) || blueprint.minAvailable,
      0,
      totalSeats
    );

    return {
      sectionGroup: blueprint.sectionGroup,
      name: blueprint.name,
      price: Math.max(Number(currentZone.price) || basePrice + blueprint.priceOffset, blueprint.minPrice),
      totalSeats,
      availableSeats,
    };
  });
};

const run = async () => {
  await connectDb();

  const events = await Event.find({});
  let updatedCount = 0;

  for (const event of events) {
    const seatZones = normalizeSeatZones(event);
    const totalSeats = seatZones.reduce((sum, zone) => sum + zone.totalSeats, 0);
    const availableSeats = seatZones.reduce((sum, zone) => sum + zone.availableSeats, 0);
    const price = seatZones.reduce((lowest, zone) => Math.min(lowest, zone.price), Number.POSITIVE_INFINITY);

    event.seatZones = seatZones;
    event.totalSeats = totalSeats;
    event.availableSeats = availableSeats;
    event.price = Number.isFinite(price) ? price : event.price;

    await event.save();
    updatedCount += 1;
  }

  console.log(`seat-capacity-synced:${updatedCount}`);
  process.exit(0);
};

run().catch((error) => {
  console.error("seat-capacity-sync-failed", error);
  process.exit(1);
});
