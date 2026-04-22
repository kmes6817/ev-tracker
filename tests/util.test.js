import { describe, it, expect, vi } from 'vitest';
import {
  escapeHtml,
  uuid,
  todayISO,
  currentYearMonth,
  monthsBetween,
  monthlyPayment,
  safeParseFloat,
  safeParseInt,
} from '../js/util.js';

describe('escapeHtml', () => {
  it('escapes the five dangerous characters', () => {
    expect(escapeHtml('<img src=x onerror="a"\'b\'&c>')).toBe(
      '&lt;img src=x onerror=&quot;a&quot;&#39;b&#39;&amp;c&gt;'
    );
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('stringifies non-string input', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('uuid', () => {
  it('returns unique values across many calls', () => {
    const s = new Set();
    for (let i = 0; i < 1000; i++) s.add(uuid());
    expect(s.size).toBe(1000);
  });
});

describe('todayISO', () => {
  it('returns yyyy-mm-dd for local time (not UTC-shifted)', () => {
    vi.useFakeTimers();
    // 2026-04-22 23:30 local time
    vi.setSystemTime(new Date(2026, 3, 22, 23, 30));
    expect(todayISO()).toBe('2026-04-22');
    vi.useRealTimers();
  });

  it('pads single-digit months and days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 10, 0));
    expect(todayISO()).toBe('2026-01-05');
    vi.useRealTimers();
  });
});

describe('currentYearMonth', () => {
  it('returns yyyy-mm', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 3));
    expect(currentYearMonth()).toBe('2026-11');
    vi.useRealTimers();
  });
});

describe('monthsBetween', () => {
  it('returns whole calendar months', () => {
    // exactly 12 months
    expect(monthsBetween('2025-04-22', new Date(2026, 3, 22))).toBe(12);
  });

  it('does not count the current month until the day-of-month passes', () => {
    expect(monthsBetween('2025-04-22', new Date(2026, 3, 21))).toBe(11);
    expect(monthsBetween('2025-04-22', new Date(2026, 3, 23))).toBe(12);
  });

  it('returns 0 for empty or future dates', () => {
    expect(monthsBetween('', new Date(2026, 3, 22))).toBe(0);
    expect(monthsBetween('2030-01-01', new Date(2026, 3, 22))).toBe(0);
  });
});

describe('monthlyPayment', () => {
  it('returns 0 for 0 principal or 0 months', () => {
    expect(monthlyPayment(0, 5, 60)).toBe(0);
    expect(monthlyPayment(100000, 5, 0)).toBe(0);
  });

  it('handles zero rate as simple division', () => {
    expect(monthlyPayment(60000, 0, 60)).toBe(1000);
  });

  it('computes standard amortisation (amortised within 1%)', () => {
    // 1,000,000 at 3% for 60 months ≈ 17,969
    const mo = monthlyPayment(1_000_000, 3, 60);
    expect(mo).toBeGreaterThan(17900);
    expect(mo).toBeLessThan(18100);
  });
});

describe('safeParseFloat / safeParseInt', () => {
  it('returns 0 for non-numeric', () => {
    expect(safeParseFloat('')).toBe(0);
    expect(safeParseFloat('abc')).toBe(0);
    expect(safeParseInt('')).toBe(0);
    expect(safeParseInt('abc')).toBe(0);
  });

  it('parses valid numbers', () => {
    expect(safeParseFloat('3.14')).toBeCloseTo(3.14);
    expect(safeParseInt('42')).toBe(42);
  });

  it('guards against Infinity / NaN', () => {
    expect(safeParseFloat('Infinity')).toBe(0);
    expect(safeParseFloat('NaN')).toBe(0);
  });
});
