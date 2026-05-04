// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  MAIN_LEDGER,
  listLedgers,
  getActiveLedger,
  setActiveLedger,
  addLedger,
  removeLedger,
  ledgerOf,
  recordsInLedger,
} from '../js/ledgers.js';

beforeEach(() => localStorage.clear());

describe('ledger list', () => {
  it('starts with just main', () => {
    expect(listLedgers()).toEqual([MAIN_LEDGER]);
    expect(getActiveLedger()).toBe(MAIN_LEDGER);
  });

  it('addLedger appends; rejects duplicates and overlong names', () => {
    addLedger('家用');
    expect(listLedgers()).toEqual([MAIN_LEDGER, '家用']);
    expect(() => addLedger('家用')).toThrow();
    expect(() => addLedger('')).toThrow();
    expect(() => addLedger('十二三四五六七八九十一二三四五六七')).toThrow();
  });

  it('removeLedger refuses to delete main', () => {
    expect(() => removeLedger(MAIN_LEDGER)).toThrow();
  });

  it('removeLedger drops active back to main', () => {
    addLedger('差旅');
    setActiveLedger('差旅');
    removeLedger('差旅');
    expect(getActiveLedger()).toBe(MAIN_LEDGER);
  });
});

describe('record helpers', () => {
  it('ledgerOf defaults to main', () => {
    expect(ledgerOf({ id: '1' })).toBe(MAIN_LEDGER);
    expect(ledgerOf({ id: '1', ledger: '家用' })).toBe('家用');
  });

  it('recordsInLedger filters', () => {
    const recs = [
      { id: '1', ledger: 'main' },
      { id: '2', ledger: '家用' },
      { id: '3' }, // implicit main
    ];
    expect(recordsInLedger(recs, 'main').map((r) => r.id)).toEqual(['1', '3']);
    expect(recordsInLedger(recs, '家用').map((r) => r.id)).toEqual(['2']);
  });
});
