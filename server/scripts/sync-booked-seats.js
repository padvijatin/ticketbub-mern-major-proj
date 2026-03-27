const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const connectDb = require("../utils/db");
const Event = require("../models/event-model");
const { buildZoneSeatIds } = require("../utils/seat-layout");
const { syncEventSeatState } = require("../controllers/event-controller");

const movieLayouts = {
  premium: { rows: ["A", "B"], seatsPerRow: 12 },
  classic: { rows: ["C", "D", "E"], seatsPerRow: 12 },
  saver: { rows: ["F", "G"], seatsPerRow: 12 },
};

const getMovieLayout = (zoneName = "") => movieLayouts[String(zoneName).trim().toLowerCase()] || { rows: [], seatsPerRow: 0 };

const run = async () => {
  await connectDb();

  const events = await Event.find({});
  let updatedCount = 0;

  for (const event of events) {
    event.seatZones = (Array.isArray(event.seatZones) ? event.seatZones : []).map((zone) => {
      const movieLayout = getMovieLayout(zone.name);
      return {
        ...zone.toObject?.() || zone,
        rows: Array.isArray(zone.rows) && zone.rows.length ? zone.rows : movieLayout.rows,
        seatsPerRow: Number(zone.seatsPerRow) || movieLayout.seatsPerRow || 0,
      };
    });

    const allSeatIds = event.seatZones.flatMap((zone) => buildZoneSeatIds(zone));
    const totalSeats = allSeatIds.length;
    const targetAvailable = Math.max(0, Math.min(totalSeats, Number(event.availableSeats) || totalSeats));
    const targetBookedCount = Math.max(0, totalSeats - targetAvailable);

    event.bookedSeats = allSeatIds.slice(-targetBookedCount);
    syncEventSeatState(event);
    await event.save();
    updatedCount += 1;
  }

  console.log(`booked-seats-synced:${updatedCount}`);
  process.exit(0);
};

run().catch((error) => {
  console.error("booked-seats-sync-failed", error);
  process.exit(1);
});
