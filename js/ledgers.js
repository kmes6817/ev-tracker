// Multi-ledger support — every record carries a `ledger` string. Records
// without one are treated as belonging to MAIN_LEDGER.
//
// Ledgers themselves are just a list of names persisted in localStorage;
// there is intentionally no per-ledger settings object. If you want budgets
// or category presets to differ per ledger, make those data structures
// keyed by ledger name in their own modules.

export const MAIN_LEDGER = 'main';

const LS_LEDGERS = 'cashbook_ledgers_v1';
const LS_ACTIVE = 'cashbook_active_ledger_v1';

const readList = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_LEDGERS) || 'null');
    if (Array.isArray(raw) && raw.length) return raw;
  } catch {
    /* ignore */
  }
  return [MAIN_LEDGER];
};

const writeList = (list) => {
  localStorage.setItem(LS_LEDGERS, JSON.stringify(list));
};

export function listLedgers() {
  // Ensure MAIN_LEDGER is always present and always first.
  const list = readList();
  if (!list.includes(MAIN_LEDGER)) list.unshift(MAIN_LEDGER);
  return list;
}

export function getActiveLedger() {
  const v = localStorage.getItem(LS_ACTIVE);
  return v && listLedgers().includes(v) ? v : MAIN_LEDGER;
}

export function setActiveLedger(name) {
  if (!listLedgers().includes(name)) return false;
  localStorage.setItem(LS_ACTIVE, name);
  return true;
}

export function addLedger(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('帳本名稱不可為空');
  if (trimmed.length > 16) throw new Error('帳本名稱過長(最多 16 字)');
  const list = listLedgers();
  if (list.includes(trimmed)) throw new Error('帳本名稱已存在');
  list.push(trimmed);
  writeList(list);
  return trimmed;
}

export function removeLedger(name) {
  if (name === MAIN_LEDGER) throw new Error('無法刪除主帳本');
  const list = listLedgers().filter((n) => n !== name);
  writeList(list);
  if (getActiveLedger() === name) setActiveLedger(MAIN_LEDGER);
  return true;
}

/** Resolve a record's ledger — defaults to MAIN_LEDGER if missing. */
export function ledgerOf(rec) {
  return rec.ledger || MAIN_LEDGER;
}

/** Filter records to those in the given ledger. */
export function recordsInLedger(recs, ledger) {
  return recs.filter((r) => ledgerOf(r) === ledger);
}
