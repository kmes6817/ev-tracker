// Preset registry. Add new presets here and they become available via
// APP_CONFIG.CATEGORY_PRESET in config.local.js.
import { CATEGORIES as EV } from './ev-preset.js';
import { CATEGORIES as GENERAL } from './general-preset.js';

const PRESETS = {
  ev: EV,
  general: GENERAL,
};

export const PRESET_NAMES = Object.keys(PRESETS);

export function getPreset(name) {
  if (PRESETS[name]) return PRESETS[name];
  // Unknown / unset → general default
  return GENERAL;
}
