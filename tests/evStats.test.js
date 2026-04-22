import { describe, it, expect } from 'vitest';
import { computeEvStats, monthlyKwhTrend } from '../js/evStats.js';

const mkRec = (overrides) => ({
  id: Math.random().toString(36).slice(2),
  cat: '充電',
  amt: 0,
  date: '2026-04-01',
  type: 'r',
  ...overrides,
});

describe('computeEvStats', () => {
  it('returns zeros for empty record set', () => {
    const s = computeEvStats([]);
    expect(s.sessions).toBe(0);
    expect(s.totalKwh).toBe(0);
    expect(s.km).toBe(0);
  });

  it('ignores non-charging categories', () => {
    const recs = [mkRec({ cat: '保養', amt: 5000, kwh: 999 })];
    expect(computeEvStats(recs).sessions).toBe(0);
  });

  it('aggregates kWh and derives price/kWh', () => {
    const recs = [
      mkRec({ date: '2026-04-01', amt: 300, kwh: 30 }),
      mkRec({ date: '2026-04-10', amt: 200, kwh: 20 }),
    ];
    const s = computeEvStats(recs);
    expect(s.sessions).toBe(2);
    expect(s.totalKwh).toBe(50);
    expect(s.totalSpent).toBe(500);
    expect(s.pricePerKwh).toBe(10);
  });

  it('computes km from odometer range', () => {
    const recs = [
      mkRec({ date: '2026-04-01', amt: 300, kwh: 30, odo: 10000 }),
      mkRec({ date: '2026-04-15', amt: 200, kwh: 20, odo: 10500 }),
    ];
    const s = computeEvStats(recs);
    expect(s.km).toBe(500);
    expect(s.costPerKm).toBe(1);
    expect(s.kwhPer100km).toBe(10);
  });

  it('respects yearMonth filter', () => {
    const recs = [
      mkRec({ date: '2026-03-15', amt: 400, kwh: 40 }),
      mkRec({ date: '2026-04-05', amt: 100, kwh: 10 }),
    ];
    expect(computeEvStats(recs, '2026-04').sessions).toBe(1);
    expect(computeEvStats(recs, '2026-04').totalKwh).toBe(10);
  });

  it('does not return negative km if odometer decreases', () => {
    const recs = [
      mkRec({ date: '2026-04-01', amt: 100, odo: 20000 }),
      mkRec({ date: '2026-04-10', amt: 100, odo: 19000 }),
    ];
    expect(computeEvStats(recs).km).toBe(0);
  });
});

describe('monthlyKwhTrend', () => {
  it('groups by yyyy-mm, sorted ascending', () => {
    const recs = [
      mkRec({ date: '2026-04-15', kwh: 10 }),
      mkRec({ date: '2026-03-10', kwh: 20 }),
      mkRec({ date: '2026-04-20', kwh: 5 }),
    ];
    const t = monthlyKwhTrend(recs);
    expect(t).toEqual([
      ['2026-03', 20],
      ['2026-04', 15],
    ]);
  });

  it('skips records without kwh', () => {
    const recs = [mkRec({ date: '2026-04-15' })];
    expect(monthlyKwhTrend(recs)).toEqual([]);
  });
});
