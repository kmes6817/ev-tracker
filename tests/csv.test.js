import { describe, it, expect } from 'vitest';
import { recordsToCsv, csvToRecords, mergeImported } from '../js/csv.js';

describe('recordsToCsv', () => {
  it('emits header and BOM', () => {
    const out = recordsToCsv([]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out).toContain('id,date,type,cat,amt,kwh,odo,desc');
  });

  it('quotes fields containing commas, quotes, newlines', () => {
    const out = recordsToCsv([
      { id: '1', date: '2026-04-22', type: 'r', cat: '其他', amt: 100, desc: 'has, comma' },
      { id: '2', date: '2026-04-22', type: 'r', cat: '其他', amt: 50, desc: 'has "quote"' },
      { id: '3', date: '2026-04-22', type: 'r', cat: '其他', amt: 20, desc: 'line1\nline2' },
    ]);
    expect(out).toContain('"has, comma"');
    expect(out).toContain('"has ""quote"""');
    expect(out).toContain('"line1\nline2"');
  });

  it('omits undefined/null optional fields as empty', () => {
    const csv = recordsToCsv([{ id: '1', date: '2026-04-22', type: 'r', cat: '充電', amt: 100 }]);
    const dataLine = csv.split('\r\n')[1];
    // kwh, odo, desc should be empty
    expect(dataLine).toBe('1,2026-04-22,r,充電,100,,,');
  });
});

describe('csvToRecords', () => {
  it('parses the roundtrip of recordsToCsv', () => {
    const original = [
      { id: 'a', date: '2026-04-22', type: 'r', cat: '充電', amt: 300, kwh: 30, odo: 10000, desc: '' },
      { id: 'b', date: '2026-04-23', type: 'o', cat: '貼膜', amt: 8000, desc: '3M · test,with,comma' },
    ];
    const csv = recordsToCsv(original);
    const parsed = csvToRecords(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].kwh).toBe(30);
    expect(parsed[1].desc).toBe('3M · test,with,comma');
  });

  it('migrates legacy brand+note CSV columns into desc', () => {
    const csv = 'id,date,type,cat,amt,brand,note\n1,2026-04-22,r,貼膜,8000,3M,chrome finish';
    const parsed = csvToRecords(csv);
    expect(parsed[0].desc).toBe('3M · chrome finish');
    expect(parsed[0].brand).toBeUndefined();
  });

  it('handles BOM and CRLF', () => {
    const csv = '﻿id,date,type,cat,amt\r\n1,2026-04-22,r,充電,100\r\n';
    const parsed = csvToRecords(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].amt).toBe(100);
  });

  it('returns [] for empty input', () => {
    expect(csvToRecords('')).toEqual([]);
  });

  it('preserves escaped quotes', () => {
    const csv = 'id,date,type,cat,amt,desc\n1,2026-04-22,r,其他,100,"say ""hi"""';
    expect(csvToRecords(csv)[0].desc).toBe('say "hi"');
  });
});

describe('mergeImported', () => {
  const fakeUuid = () => 'generated-' + Math.random().toString(36).slice(2, 8);

  it('upserts by id', () => {
    const existing = [{ id: 'a', date: '2026-04-01', type: 'r', cat: '充電', amt: 100 }];
    const imported = [{ id: 'a', date: '2026-04-01', type: 'r', cat: '充電', amt: 200 }];
    const merged = mergeImported(existing, imported, fakeUuid);
    expect(merged).toHaveLength(1);
    expect(merged[0].amt).toBe(200);
  });

  it('generates UUIDs for rows without id', () => {
    const imported = [{ date: '2026-04-01', type: 'r', cat: '充電', amt: 100 }];
    const merged = mergeImported([], imported, fakeUuid);
    expect(merged[0].id).toMatch(/^generated-/);
  });

  it('skips rows missing required fields', () => {
    const bad = [
      { date: '', cat: '充電', amt: 100 },
      { date: '2026-04-01', cat: '', amt: 100 },
      { date: '2026-04-01', cat: '充電', amt: 0 },
    ];
    expect(mergeImported([], bad, fakeUuid)).toEqual([]);
  });

  it('sorts result by date descending', () => {
    const imported = [
      { id: '1', date: '2026-01-01', type: 'r', cat: '充電', amt: 100 },
      { id: '2', date: '2026-05-01', type: 'r', cat: '充電', amt: 100 },
    ];
    const merged = mergeImported([], imported, fakeUuid);
    expect(merged.map((r) => r.date)).toEqual(['2026-05-01', '2026-01-01']);
  });
});
