// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getBudget, setBudget, evaluateBudget } from '../../js/extensions/budget/budget.js';

beforeEach(() => localStorage.clear());

const recs = (amounts) =>
  amounts.map((amt, i) => ({ id: String(i), date: '2026-04-15', cat: '餐飲', amt, type: 'r' }));

describe('budget storage', () => {
  it('round-trips a positive value', () => {
    setBudget(15000);
    expect(getBudget()).toBe(15000);
  });
  it('treats 0 / negative / null as unset', () => {
    setBudget(15000);
    setBudget(0);
    expect(getBudget()).toBeNull();
    setBudget(15000);
    setBudget(null);
    expect(getBudget()).toBeNull();
  });
});

describe('evaluateBudget', () => {
  it('returns null when budget is unset', () => {
    expect(evaluateBudget(recs([100]), '2026-04')).toBeNull();
  });

  it('classifies levels at 80% and 100%', () => {
    setBudget(1000);
    // 50% spent → ok
    expect(evaluateBudget(recs([500]), '2026-04').level).toBe('ok');
    // 80% → warn
    expect(evaluateBudget(recs([800]), '2026-04').level).toBe('warn');
    // 99% → still warn
    expect(evaluateBudget(recs([990]), '2026-04').level).toBe('warn');
    // 100% → over
    expect(evaluateBudget(recs([1000]), '2026-04').level).toBe('over');
    expect(evaluateBudget(recs([1500]), '2026-04').level).toBe('over');
  });

  it('reports remaining (negative when over)', () => {
    setBudget(1000);
    expect(evaluateBudget(recs([300]), '2026-04').remaining).toBe(700);
    expect(evaluateBudget(recs([1200]), '2026-04').remaining).toBe(-200);
  });
});
