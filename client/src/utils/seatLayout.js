const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const getSeatPrefix = (zoneName = "") => {
  const words = String(zoneName)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "ZT";
  }

  const prefix = words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
  return prefix || slugify(zoneName).replace(/-/g, "").slice(0, 3).toUpperCase() || "ZT";
};

const buildRowSeatIds = (rows = [], seatsPerRow = 0) =>
  rows.flatMap((row) =>
    Array.from({ length: seatsPerRow }, (_, index) => `${row}${index + 1}`)
  );

const buildSequentialSeatIds = (prefix, totalSeats) =>
  Array.from({ length: totalSeats }, (_, index) => `${prefix}-${index + 1}`);

export const buildZoneSeatIds = (zone = {}) => {
  const rows = Array.isArray(zone.rows) ? zone.rows.map((row) => String(row).trim()).filter(Boolean) : [];
  const seatsPerRow = Math.max(0, Number(zone.seatsPerRow) || 0);
  const totalSeats = Math.max(0, Number(zone.totalSeats) || 0);

  if (rows.length && seatsPerRow > 0) {
    return buildRowSeatIds(rows, seatsPerRow);
  }

  return buildSequentialSeatIds(getSeatPrefix(zone.name), totalSeats);
};

export const getZoneBookedSeatIds = (zone = {}, bookedSeats = []) => {
  const zoneSeatIds = buildZoneSeatIds(zone);
  const seatIdSet = new Set(zoneSeatIds);
  return bookedSeats.filter((seatId) => seatIdSet.has(seatId));
};
