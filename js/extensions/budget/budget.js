// Monthly budget extension — single per-month cap stored in localStorage.
// Multi-ledger / per-category budgets are intentionally out of scope for v1;
// the overwhelming user pain point is "did I overspend this month?" full stop.

import { totalSpent } from '../general/stats.js';

const LS_BUDGET = 'cashbook_budget_v1';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_BUDGET) || 'null') || null;
  } catch {
    return null;
  }
};

const write = (val) => {
  if (val == null) localStorage.removeItem(LS_BUDGET);
  else localStorage.setItem(LS_BUDGET, JSON.stringify(val));
};

/** Returns the monthly cap (number) or null if unset. */
export function getBudget() {
  const v = read();
  return v && Number.isFinite(v.monthly) ? v.monthly : null;
}

export function setBudget(monthly) {
  if (monthly == null || monthly <= 0) {
    write(null);
    return null;
  }
  write({ monthly: Number(monthly) });
  return Number(monthly);
}

/**
 * Evaluate budget status for the given month.
 * Returns null if no budget configured. Otherwise:
 *   { limit, spent, remaining, pct, level: 'ok' | 'warn' | 'over' }
 *
 *  warn — at 80% of limit; over — past 100%. Thresholds chosen to give a
 *  meaningful heads-up without being too noisy.
 */
export function evaluateBudget(recs, yearMonth) {
  const limit = getBudget();
  if (limit == null) return null;
  const spent = totalSpent(recs, yearMonth);
  const remaining = limit - spent;
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  let level = 'ok';
  if (pct >= 100) level = 'over';
  else if (pct >= 80) level = 'warn';
  return { limit, spent, remaining, pct, level };
}
