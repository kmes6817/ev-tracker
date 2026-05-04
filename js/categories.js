// Category resolver — merges the configured preset with user-defined custom
// categories stored in localStorage. Custom categories override preset ones
// of the same name, so users can recolour or retype built-ins if they want.
import { getPreset } from './presets/index.js';

const LS_CUSTOMS = 'cashbook_custom_cats_v1';

const cfg = () => window.APP_CONFIG || window.EV_CONFIG || {};

const readCustoms = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_CUSTOMS) || '{}') || {};
  } catch {
    return {};
  }
};

const writeCustoms = (obj) => {
  try {
    localStorage.setItem(LS_CUSTOMS, JSON.stringify(obj));
  } catch (e) {
    console.warn('custom-cats write failed', e);
  }
};

const FALLBACK = { color: '#888', bg: '#eee', icon: 'package', type: 'r' };

const PALETTE = [
  { color: '#378ADD', bg: '#E6F1FB' },
  { color: '#1D9E75', bg: '#E1F5EE' },
  { color: '#D4537E', bg: '#FBEAF0' },
  { color: '#EF9F27', bg: '#FAEEDA' },
  { color: '#7F77DD', bg: '#EEEDFE' },
  { color: '#533AB7', bg: '#EEEDFE' },
  { color: '#3B6D11', bg: '#EAF3DE' },
  { color: '#993556', bg: '#FBEAF0' },
];

export function allCategories() {
  const presetName = cfg().CATEGORY_PRESET || 'general';
  const preset = getPreset(presetName);
  return { ...preset, ...readCustoms() };
}

export const categoriesOfType = (type) => {
  const all = allCategories();
  return Object.keys(all).filter((k) => all[k].type === type);
};

export const categoryMeta = (name) => allCategories()[name] || FALLBACK;

/** Add or update a custom category. Returns the resolved meta. */
export function addCustomCategory(name, type = 'r', overrides = {}) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('分類名稱不可為空');
  if (trimmed.length > 12) throw new Error('分類名稱過長(最多 12 字)');
  const customs = readCustoms();
  const palette = PALETTE[Object.keys(customs).length % PALETTE.length];
  customs[trimmed] = {
    color: overrides.color || palette.color,
    bg: overrides.bg || palette.bg,
    icon: overrides.icon || 'package',
    type: type === 'o' ? 'o' : 'r',
    custom: true,
    ...overrides,
  };
  writeCustoms(customs);
  return customs[trimmed];
}

/** Delete a custom category by name. No-op for preset-only names. */
export function removeCustomCategory(name) {
  const customs = readCustoms();
  if (!(name in customs)) return false;
  delete customs[name];
  writeCustoms(customs);
  return true;
}

export function isCustomCategory(name) {
  return !!readCustoms()[name];
}
