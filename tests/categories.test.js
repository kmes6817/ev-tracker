// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  allCategories,
  categoriesOfType,
  categoryMeta,
  addCustomCategory,
  removeCustomCategory,
  isCustomCategory,
} from '../js/categories.js';

beforeEach(() => {
  localStorage.clear();
  delete window.APP_CONFIG;
  delete window.EV_CONFIG;
});

describe('preset selection', () => {
  it('defaults to general preset when no config', () => {
    const all = allCategories();
    expect(all['餐飲']).toBeDefined();
    expect(all['充電']).toBeUndefined();
  });

  it('loads ev preset when configured', () => {
    window.APP_CONFIG = { CATEGORY_PRESET: 'ev' };
    const all = allCategories();
    expect(all['充電']).toBeDefined();
    expect(all['餐飲']).toBeUndefined();
  });

  it('falls back to general for unknown preset name', () => {
    window.APP_CONFIG = { CATEGORY_PRESET: 'martian' };
    expect(allCategories()['餐飲']).toBeDefined();
  });
});

describe('extraFields wiring', () => {
  it('EV 充電 declares kwh + odo extra fields', () => {
    window.APP_CONFIG = { CATEGORY_PRESET: 'ev' };
    expect(categoryMeta('充電').extraFields).toEqual(['kwh', 'odo']);
  });

  it('general categories have no extraFields', () => {
    expect(categoryMeta('餐飲').extraFields).toBeUndefined();
  });
});

describe('custom categories', () => {
  it('addCustomCategory persists to localStorage and merges in', () => {
    addCustomCategory('寵物', 'r');
    expect(isCustomCategory('寵物')).toBe(true);
    expect(allCategories()['寵物']).toBeDefined();
    expect(categoriesOfType('r')).toContain('寵物');
  });

  it('rejects empty / overlong names', () => {
    expect(() => addCustomCategory('', 'r')).toThrow();
    expect(() => addCustomCategory('一二三四五六七八九十一二三', 'r')).toThrow();
  });

  it('removeCustomCategory only removes customs', () => {
    addCustomCategory('寵物', 'r');
    expect(removeCustomCategory('寵物')).toBe(true);
    expect(isCustomCategory('寵物')).toBe(false);
    // Preset categories are untouched
    expect(removeCustomCategory('餐飲')).toBe(false);
    expect(allCategories()['餐飲']).toBeDefined();
  });

  it('custom overrides a preset of the same name', () => {
    addCustomCategory('餐飲', 'r', { color: '#ff0000' });
    expect(categoryMeta('餐飲').color).toBe('#ff0000');
  });
});
