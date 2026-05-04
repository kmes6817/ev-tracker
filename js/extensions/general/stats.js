// Generic spending stats — preset-agnostic. Pure functions over the records
// list; nothing here mutates input.

/** Sum of `amt` for records in the given yyyy-mm window (or all-time if null). */
export function totalSpent(recs, yearMonth = null) {
  return recs
    .filter((r) => yearMonth === null || r.date.slice(0, 7) === yearMonth)
    .reduce((s, r) => s + r.amt, 0);
}

/** [{ month: 'yyyy-mm', total: n }, …] sorted ascending. */
export function monthlyTotals(recs) {
  const bm = {};
  recs.forEach((r) => {
    const m = r.date.slice(0, 7);
    bm[m] = (bm[m] || 0) + r.amt;
  });
  return Object.entries(bm)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}

/** Spending grouped by category in the given month (or all-time). */
export function categoryBreakdown(recs, yearMonth = null) {
  const by = {};
  recs
    .filter((r) => yearMonth === null || r.date.slice(0, 7) === yearMonth)
    .forEach((r) => {
      by[r.cat] = (by[r.cat] || 0) + r.amt;
    });
  return Object.entries(by)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amount]) => ({ cat, amount }));
}

/** Top N categories by spend in the given window. */
export function topNCategories(recs, n = 5, yearMonth = null) {
  return categoryBreakdown(recs, yearMonth).slice(0, n);
}

/** Month-over-month change vs previous month. Returns { current, previous, diff, pct }. */
export function momChange(recs, yearMonth) {
  const cur = totalSpent(recs, yearMonth);
  const [y, m] = yearMonth.split('-').map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const prev = totalSpent(recs, prevYm);
  const diff = cur - prev;
  const pct = prev > 0 ? (diff / prev) * 100 : null;
  return { current: cur, previous: prev, diff, pct };
}
