import { describe, it, expect } from 'vitest';
import {
  totalSpent,
  monthlyTotals,
  categoryBreakdown,
  topNCategories,
  momChange,
} from '../../js/extensions/general/stats.js';

const recs = [
  { id: '1', date: '2026-04-01', cat: '餐飲', amt: 200, type: 'r' },
  { id: '2', date: '2026-04-15', cat: '餐飲', amt: 150, type: 'r' },
  { id: '3', date: '2026-04-20', cat: '交通', amt: 80, type: 'r' },
  { id: '4', date: '2026-03-10', cat: '餐飲', amt: 500, type: 'r' },
  { id: '5', date: '2026-03-25', cat: '娛樂', amt: 1000, type: 'o' },
];

describe('totalSpent', () => {
  it('sums all records when yearMonth is null', () => {
    expect(totalSpent(recs)).toBe(1930);
  });
  it('filters by yyyy-mm', () => {
    expect(totalSpent(recs, '2026-04')).toBe(430);
    expect(totalSpent(recs, '2026-03')).toBe(1500);
    expect(totalSpent(recs, '2026-01')).toBe(0);
  });
});

describe('monthlyTotals', () => {
  it('groups by month, sorted ascending', () => {
    expect(monthlyTotals(recs)).toEqual([
      { month: '2026-03', total: 1500 },
      { month: '2026-04', total: 430 },
    ]);
  });
});

describe('categoryBreakdown', () => {
  it('groups + sorts by amount desc', () => {
    expect(categoryBreakdown(recs, '2026-04')).toEqual([
      { cat: '餐飲', amount: 350 },
      { cat: '交通', amount: 80 },
    ]);
  });
});

describe('topNCategories', () => {
  it('limits to N', () => {
    expect(topNCategories(recs, 1)).toHaveLength(1);
    expect(topNCategories(recs, 1)[0].cat).toBe('餐飲');
  });
});

describe('momChange', () => {
  it('reports diff and pct vs previous month', () => {
    const r = momChange(recs, '2026-04');
    expect(r.current).toBe(430);
    expect(r.previous).toBe(1500);
    expect(r.diff).toBe(-1070);
    expect(r.pct).toBeCloseTo(-71.33, 1);
  });
  it('returns null pct when previous is 0', () => {
    const r = momChange(recs, '2026-03');
    expect(r.previous).toBe(0);
    expect(r.pct).toBeNull();
  });
});
