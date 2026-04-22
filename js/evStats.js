// Pure functions for EV charging metrics.
// Records are treated as read-only; nothing in here mutates input.

const chargeOnly = (recs) => recs.filter((r) => r.cat === '充電');

/**
 * Compute EV metrics for a set of records.
 * @param {Array} recs - full record list
 * @param {string|null} yearMonth - 'yyyy-mm' to restrict window, or null for all-time
 */
export function computeEvStats(recs, yearMonth = null) {
  const charges = chargeOnly(recs);
  const windowed = yearMonth ? charges.filter((r) => r.date.slice(0, 7) === yearMonth) : charges;

  const totalKwh = windowed.reduce((s, r) => s + (r.kwh || 0), 0);
  const totalSpent = windowed.reduce((s, r) => s + r.amt, 0);

  // Mileage — compare max and min odometer readings within the window
  const odoReadings = windowed.filter((r) => r.odo > 0).sort((a, b) => a.date.localeCompare(b.date));
  const firstOdo = odoReadings[0]?.odo || null;
  const lastOdo = odoReadings[odoReadings.length - 1]?.odo || null;
  const km = firstOdo != null && lastOdo != null && lastOdo > firstOdo ? lastOdo - firstOdo : 0;

  const pricePerKwh = totalKwh > 0 ? totalSpent / totalKwh : 0;
  const costPerKm = km > 0 ? totalSpent / km : 0;
  const kwhPer100km = km > 0 && totalKwh > 0 ? (totalKwh / km) * 100 : 0;

  return {
    sessions: windowed.length,
    totalKwh,
    totalSpent,
    km,
    firstOdo,
    lastOdo,
    pricePerKwh,
    costPerKm,
    kwhPer100km,
  };
}

/** Per-month kWh totals, sorted ascending. */
export function monthlyKwhTrend(recs) {
  const bm = {};
  chargeOnly(recs).forEach((r) => {
    if (!r.kwh) return;
    const m = r.date.slice(0, 7);
    bm[m] = (bm[m] || 0) + r.kwh;
  });
  return Object.entries(bm).sort(([a], [b]) => a.localeCompare(b));
}
