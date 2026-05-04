// Sync layer — talks to Google Apps Script, falls back to localStorage,
// and queues writes when offline so nothing is lost.
import { fetchWithTimeout } from './util.js';

const SCHEMA_VERSION = 2;
const LS_DATA = 'ev_data_v2';
const LS_PENDING = 'ev_pending_v2';
const LEGACY_RECORDS = 'ev_records';
const LEGACY_LOAN = 'ev_loan';

const getConfig = () => window.APP_CONFIG || window.EV_CONFIG || {};

const readLocal = () => {
  try {
    const raw = localStorage.getItem(LS_DATA);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through */
  }
  // Migrate legacy keys
  try {
    const recs = JSON.parse(localStorage.getItem(LEGACY_RECORDS) || 'null');
    const loan = JSON.parse(localStorage.getItem(LEGACY_LOAN) || 'null');
    if (recs || loan) return { version: SCHEMA_VERSION, records: recs || [], loan };
  } catch {
    /* ignore */
  }
  return { version: SCHEMA_VERSION, records: [], loan: null };
};

const writeLocal = (data) => {
  try {
    localStorage.setItem(LS_DATA, JSON.stringify({ ...data, version: SCHEMA_VERSION }));
  } catch (e) {
    console.warn('localStorage write failed', e);
  }
};

const readPending = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_PENDING) || 'null') || false;
  } catch {
    return false;
  }
};
const writePending = (flag) => {
  if (flag) localStorage.setItem(LS_PENDING, '1');
  else localStorage.removeItem(LS_PENDING);
};

export const api = {
  hasPending: () => !!readPending(),
  loadLocal: () => readLocal(),

  async load() {
    const cfg = getConfig();
    if (!cfg.GAS_URL) throw new Error('GAS_URL 未設定（config.local.js）');
    const r = await fetchWithTimeout(
      `${cfg.GAS_URL}?action=load&token=${encodeURIComponent(cfg.TOKEN || '')}`,
      { redirect: 'follow' },
      12000
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    const shaped = {
      version: SCHEMA_VERSION,
      records: data.records || [],
      loan: data.loan || null,
    };
    writeLocal(shaped);
    return shaped;
  },

  /** Save both locally and remotely. Sets pending flag on failure. */
  async save(data) {
    writeLocal(data);
    const cfg = getConfig();
    if (!cfg.GAS_URL) {
      writePending(true);
      throw new Error('GAS_URL 未設定，僅本機儲存');
    }
    try {
      const r = await fetchWithTimeout(
        cfg.GAS_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'save',
            token: cfg.TOKEN || '',
            records: data.records,
            loan: data.loan,
          }),
          redirect: 'follow',
        },
        15000
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      writePending(false);
      return true;
    } catch (e) {
      writePending(true);
      throw e;
    }
  },

  /** Attempt to resend unsynced local changes. */
  async flushPending() {
    if (!readPending()) return false;
    return this.save(readLocal());
  },
};
