// Small, dependency-free helpers.
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

const escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (v) => (v == null ? '' : String(v).replace(/[&<>"']/g, (c) => escMap[c]));

export const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
};

export const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const currentYearMonth = () => todayISO().slice(0, 7);

/** Months elapsed between two yyyy-mm-dd strings (whole calendar months). */
export const monthsBetween = (startIso, nowDate = new Date()) => {
  if (!startIso) return 0;
  const [y, m, d] = startIso.split('-').map(Number);
  if (!y || !m) return 0;
  const start = new Date(y, m - 1, d || 1);
  let diff = (nowDate.getFullYear() - start.getFullYear()) * 12 + (nowDate.getMonth() - start.getMonth());
  if (nowDate.getDate() < start.getDate()) diff -= 1;
  return Math.max(0, diff);
};

/** Monthly loan payment (P, annual rate %, months). */
export const monthlyPayment = (p, annualRatePct, months) => {
  if (!p || !months) return 0;
  const r = annualRatePct / 100 / 12;
  if (!r) return p / months;
  return (p * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
};

/** fetch with timeout via AbortController. */
export const fetchWithTimeout = (url, options = {}, timeoutMs = 10000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
};

export const safeParseFloat = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const safeParseInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

/** Toast notification with optional action button.
 *  toast('Saved')                          → plain info toast for 2.4s
 *  toast('Failed', 'error')                → red variant
 *  toast('Failed', 'error', 3200)          → legacy signature (duration ms)
 *  toast('Deleted', 'info', { duration: 6000, action: { label: '復原', handler } })
 */
export const toast = (msg, type = 'info', opts = 2400) => {
  const { duration = 2400, action } = typeof opts === 'number' ? { duration: opts } : opts;
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.className = 'toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' err' : '');
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = msg;
  el.appendChild(text);
  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      try {
        action.handler();
      } finally {
        el.remove();
      }
    });
    el.appendChild(btn);
  }
  host.appendChild(el);
  const timer = setTimeout(() => el.remove(), duration);
  // Pause auto-dismiss on hover/focus (ADA: gives user time to read/act)
  el.addEventListener('mouseenter', () => clearTimeout(timer));
};
