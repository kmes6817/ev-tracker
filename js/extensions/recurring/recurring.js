// Recurring expenses — a generalisation of the original 'loan' table.
// Subscriptions, rent, instalments and the like all share the same shape:
// a fixed amount that hits every N months between a start date and an
// optional end date. The car-loan UI in the loan tab is unchanged for v1;
// this module covers the *additional* recurring obligations the user wants
// to factor into monthly stats.
//
// Storage: localStorage `cashbook_recurring_v1`. GAS sync is intentionally
// out of scope for this PR — the entries are small enough to be re-entered
// per-device, and a future PR can promote this to its own sheet once the
// shape stabilises.
//
// Record shape:
//   { id, kind, name, amount, category, start, end?, everyNMonths, ledger? }
// kind ∈ 'subscription' | 'rent' | 'loan' | 'other'
// everyNMonths defaults to 1; pass 12 for an annual subscription.

import { uuid } from '../../util.js';
import { MAIN_LEDGER } from '../../ledgers.js';

const LS_KEY = 'cashbook_recurring_v1';

const readAll = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

const writeAll = (list) => localStorage.setItem(LS_KEY, JSON.stringify(list));

export const KINDS = ['subscription', 'rent', 'loan', 'other'];
export const KIND_LABELS = {
  subscription: '訂閱',
  rent: '租金',
  loan: '貸款',
  other: '其他',
};

/** List recurring entries. If `ledger` is given, filter to that ledger. */
export function listRecurring(ledger = null) {
  const list = readAll();
  return ledger ? list.filter((r) => (r.ledger || MAIN_LEDGER) === ledger) : list;
}

export function addRecurring(entry) {
  const trimmed = String(entry.name || '').trim();
  if (!trimmed) throw new Error('名稱不可為空');
  if (!Number.isFinite(entry.amount) || entry.amount <= 0) throw new Error('金額必須大於 0');
  if (!entry.start) throw new Error('請填寫起始日期');
  if (!KINDS.includes(entry.kind)) throw new Error('無效的種類');
  const list = readAll();
  const rec = {
    id: uuid(),
    kind: entry.kind,
    name: trimmed,
    amount: Number(entry.amount),
    category: entry.category || '',
    start: entry.start,
    end: entry.end || null,
    everyNMonths: Number.isFinite(entry.everyNMonths) && entry.everyNMonths > 0 ? entry.everyNMonths : 1,
    ledger: entry.ledger || MAIN_LEDGER,
  };
  list.push(rec);
  writeAll(list);
  return rec;
}

export function removeRecurring(id) {
  const list = readAll();
  const next = list.filter((r) => r.id !== id);
  if (next.length === list.length) return false;
  writeAll(next);
  return true;
}

/**
 * Returns the amount this recurring contributes to the given yyyy-mm.
 * Zero if the recurrence is not active that month or the cadence skips it.
 */
export function monthlyAmount(rec, yearMonth) {
  if (!rec.start) return 0;
  const startYm = rec.start.slice(0, 7);
  if (yearMonth < startYm) return 0;
  if (rec.end && yearMonth > rec.end.slice(0, 7)) return 0;
  // Calendar months elapsed
  const [sy, sm] = startYm.split('-').map(Number);
  const [y, m] = yearMonth.split('-').map(Number);
  const diff = (y - sy) * 12 + (m - sm);
  if (diff < 0) return 0;
  if (diff % (rec.everyNMonths || 1) !== 0) return 0;
  return rec.amount;
}

/** Total recurring cost across all entries in the given ledger + month. */
export function totalForMonth(yearMonth, ledger = null) {
  return listRecurring(ledger).reduce((sum, r) => sum + monthlyAmount(r, yearMonth), 0);
}
