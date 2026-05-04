// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  addRecurring,
  removeRecurring,
  listRecurring,
  monthlyAmount,
  totalForMonth,
} from '../../js/extensions/recurring/recurring.js';

beforeEach(() => localStorage.clear());

describe('add / list / remove', () => {
  it('round-trips an entry', () => {
    const r = addRecurring({
      kind: 'subscription',
      name: 'Netflix',
      amount: 390,
      start: '2026-01-15',
    });
    expect(listRecurring()).toHaveLength(1);
    expect(listRecurring()[0].name).toBe('Netflix');
    expect(removeRecurring(r.id)).toBe(true);
    expect(listRecurring()).toHaveLength(0);
  });

  it('rejects bad inputs', () => {
    expect(() => addRecurring({ kind: 'subscription', name: '', amount: 100, start: '2026-01-01' })).toThrow();
    expect(() =>
      addRecurring({ kind: 'subscription', name: 'X', amount: 0, start: '2026-01-01' })
    ).toThrow();
    expect(() => addRecurring({ kind: 'subscription', name: 'X', amount: 100, start: '' })).toThrow();
    expect(() => addRecurring({ kind: 'martian', name: 'X', amount: 100, start: '2026-01-01' })).toThrow();
  });

  it('filters list by ledger', () => {
    addRecurring({ kind: 'subscription', name: 'A', amount: 100, start: '2026-01-01', ledger: 'main' });
    addRecurring({ kind: 'rent', name: 'B', amount: 25000, start: '2026-01-01', ledger: '家用' });
    expect(listRecurring('main')).toHaveLength(1);
    expect(listRecurring('家用')).toHaveLength(1);
    expect(listRecurring()).toHaveLength(2);
  });
});

describe('monthlyAmount cadence', () => {
  it('returns 0 before start', () => {
    const r = { start: '2026-03-01', amount: 500, everyNMonths: 1 };
    expect(monthlyAmount(r, '2026-02')).toBe(0);
    expect(monthlyAmount(r, '2026-03')).toBe(500);
  });

  it('respects end date', () => {
    const r = { start: '2026-01-01', end: '2026-04-30', amount: 500, everyNMonths: 1 };
    expect(monthlyAmount(r, '2026-04')).toBe(500);
    expect(monthlyAmount(r, '2026-05')).toBe(0);
  });

  it('handles annual cadence', () => {
    const r = { start: '2026-03-01', amount: 1200, everyNMonths: 12 };
    expect(monthlyAmount(r, '2026-03')).toBe(1200);
    expect(monthlyAmount(r, '2026-04')).toBe(0);
    expect(monthlyAmount(r, '2027-03')).toBe(1200);
    expect(monthlyAmount(r, '2027-04')).toBe(0);
  });
});

describe('totalForMonth', () => {
  it('sums active entries for the month', () => {
    addRecurring({ kind: 'subscription', name: 'Netflix', amount: 390, start: '2026-01-01' });
    addRecurring({ kind: 'subscription', name: 'iCloud', amount: 90, start: '2026-01-01' });
    addRecurring({ kind: 'subscription', name: 'Annual', amount: 1200, start: '2026-03-01', everyNMonths: 12 });
    expect(totalForMonth('2026-03')).toBe(390 + 90 + 1200);
    expect(totalForMonth('2026-04')).toBe(390 + 90);
  });
});
