const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const connectDb = require("../utils/db");
const Event = require("../models/event-model");
const { ensureEventPosterState } = require("../controllers/event-controller");

const run = async () => {
  await connectDb();

  const events = await Event.find({});
  let scanned = 0;
  let updated = 0;
  let cleared = 0;

  for (const event of events) {
    scanned += 1;
    const beforePoster = String(event.poster || "").trim();
    await ensureEventPosterState(event);
    const afterPoster = String(event.poster || "").trim();

    if (beforePoster !== afterPoster) {
      updated += 1;
      if (!afterPoster) {
        cleared += 1;
      }
    }
  }

  console.log(
    `cloudinary-poster-sync-complete: scanned=${scanned} updated=${updated} cleared=${cleared}`
  );
  process.exit(0);
};

run().catch((error) => {
  console.error("cloudinary-poster-sync-failed", error);
  process.exit(1);
});
