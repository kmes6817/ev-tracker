// CSV import/export for records.
// Uses RFC 4180 quoting: fields with comma, quote, CR, or LF get wrapped in
// double quotes; literal quotes are doubled.

const HEADERS = ['id', 'date', 'type', 'cat', 'amt', 'kwh', 'odo', 'brand', 'note'];

const quote = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function recordsToCsv(records) {
  const body = records
    .map((r) =>
      HEADERS.map((h) => {
        const val = r[h];
        if (val == null || val === '') return '';
        return quote(val);
      }).join(',')
    )
    .join('\r\n');
  // BOM so Excel auto-detects UTF-8
  return '﻿' + HEADERS.join(',') + '\r\n' + body;
}

/** Parse a single CSV line, respecting quotes. */
function parseLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/** Split CSV into logical lines, handling quoted newlines. */
function splitLines(text) {
  const lines = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQuotes = !inQuotes;
    if (!inQuotes && (c === '\n' || c === '\r')) {
      if (cur) lines.push(cur);
      cur = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else {
      cur += c;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function csvToRecords(text) {
  if (!text) return [];
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = splitLines(text);
  if (!lines.length) return [];
  const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = Object.fromEntries(HEADERS.map((h) => [h, header.indexOf(h)]));
  return lines.slice(1).map((line) => {
    const cols = parseLine(line);
    const get = (key) => {
      const i = idx[key];
      return i >= 0 ? cols[i] : '';
    };
    const rec = {
      id: get('id') || undefined,
      date: get('date'),
      type: get('type') || 'r',
      cat: get('cat'),
      amt: Number(get('amt')) || 0,
      brand: get('brand') || '',
      note: get('note') || '',
    };
    const kwh = Number(get('kwh'));
    const odo = Number(get('odo'));
    if (kwh > 0) rec.kwh = kwh;
    if (odo > 0) rec.odo = odo;
    return rec;
  });
}

/** Merge imported records into existing: by id if present, else append with new id. */
export function mergeImported(existing, imported, uuidFn) {
  const byId = new Map(existing.map((r) => [r.id, r]));
  for (const rec of imported) {
    if (!rec.date || !rec.cat || rec.amt <= 0) continue;
    if (rec.id && byId.has(rec.id)) {
      byId.set(rec.id, { ...byId.get(rec.id), ...rec });
    } else {
      const newRec = { ...rec, id: rec.id || uuidFn() };
      byId.set(newRec.id, newRec);
    }
  }
  return Array.from(byId.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/** Trigger a browser download of a Blob. */
export function downloadBlob(content, filename, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
