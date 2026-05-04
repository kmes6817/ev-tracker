/**
 * Cashbook — Google Apps Script backend.
 * (Originally ev-tracker; rename PR #6.)
 *
 * Setup:
 *  1. Create a Google Sheet. Copy the ID from the URL.
 *  2. In Apps Script editor, set Script Properties:
 *       SHEET_ID     = <your sheet id>
 *       SHARED_TOKEN = <any random string — must match config.local.js>
 *  3. Deploy as Web App: Execute as = Me, Who has access = Anyone.
 *  4. Copy the deployment URL into config.local.js (GAS_URL).
 *
 * The sheet will be initialised on first call with two tabs: `records` and `loan`.
 * Token check is intentionally simple — do NOT use this as your only defence
 * if the sheet holds sensitive data; migrate to OAuth (Firebase, Supabase)
 * for anything beyond personal use.
 */

const SHEET_ID = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
const SHARED_TOKEN = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN');

const RECORDS_SHEET = 'records';
const LOAN_SHEET = 'loan';
const RECORD_HEADERS = ['id', 'cat', 'amt', 'date', 'type', 'desc', 'kwh', 'odo', 'ledger'];
const LOAN_HEADERS = ['price', 'down', 'rate', 'months', 'start'];

// Legacy headers — previous schemas. If the sheet still has the old layout
// we read them, merge brand+note → desc, and on next save the column order
// is rewritten to the new layout.
const LEGACY_HEADER_V1 = ['id', 'cat', 'amt', 'date', 'type', 'brand', 'note'];
const LEGACY_HEADER_V2 = ['id', 'cat', 'amt', 'date', 'type', 'brand', 'note', 'kwh', 'odo'];

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function _requireToken(token) {
  // Token check is optional. If SHARED_TOKEN is unset, we skip it so upgrades
  // from the pre-v0.2 backend keep working. Set it in Script Properties to
  // enable authentication.
  if (!SHARED_TOKEN) return;
  if (token !== SHARED_TOKEN) throw new Error('Unauthorized');
}

function _ss() {
  // Prefer explicit SHEET_ID; fall back to the bound spreadsheet when the
  // script is attached to a sheet (Extensions → Apps Script).
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('Backend misconfigured: set SHEET_ID in Script Properties');
}

function _sheet(name, headers) {
  const ss = _ss();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    return sh;
  }
  // Migrate legacy header row (missing kwh/odo) in place
  const firstRow = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  const nonEmpty = firstRow.filter((c) => c !== '' && c != null);
  if (nonEmpty.length > 0 && nonEmpty.length < headers.length) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

function doGet(e) {
  try {
    const action = (e.parameter.action || '').toLowerCase();
    const token = e.parameter.token || '';
    if (action === 'load') {
      _requireToken(token);
      return _json(_load());
    }
    return _json({ error: 'Unknown action' });
  } catch (err) {
    return _json({ error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = (body.action || '').toLowerCase();
    _requireToken(body.token || '');
    if (action === 'save') {
      _save(body.records || [], body.loan || null);
      return _json({ ok: true });
    }
    return _json({ error: 'Unknown action' });
  } catch (err) {
    return _json({ error: String(err.message || err) });
  }
}

function _load() {
  const recSh = _sheet(RECORDS_SHEET, RECORD_HEADERS);
  const loanSh = _sheet(LOAN_SHEET, LOAN_HEADERS);

  const recValues = recSh.getDataRange().getValues();
  const records = [];
  if (recValues.length === 0) {
    return { records: [], loan: null };
  }
  // Map header name → column index so we're not brittle to column order.
  const headerRow = recValues[0].map(function (h) {
    return String(h || '').toLowerCase();
  });
  const col = {};
  headerRow.forEach(function (name, i) {
    col[name] = i;
  });
  function get(row, name) {
    const i = col[name];
    return i == null || i < 0 ? undefined : row[i];
  }
  for (let i = 1; i < recValues.length; i++) {
    const row = recValues[i];
    if (!get(row, 'id')) continue;
    const dateVal = get(row, 'date');
    // Collapse legacy brand+note columns into desc if desc is empty
    let desc = String(get(row, 'desc') || '');
    if (!desc) {
      const brand = String(get(row, 'brand') || '').trim();
      const note = String(get(row, 'note') || '').trim();
      desc = [brand, note].filter(function (x) { return x; }).join(' · ');
    }
    const rec = {
      id: String(get(row, 'id')),
      cat: String(get(row, 'cat') || ''),
      amt: Number(get(row, 'amt')) || 0,
      date: dateVal instanceof Date
        ? Utilities.formatDate(dateVal, 'Asia/Taipei', 'yyyy-MM-dd')
        : String(dateVal || ''),
      type: String(get(row, 'type') || 'r'),
      desc: desc,
    };
    const kwh = Number(get(row, 'kwh'));
    const odo = Number(get(row, 'odo'));
    if (kwh > 0) rec.kwh = kwh;
    if (odo > 0) rec.odo = odo;
    const ledger = String(get(row, 'ledger') || '').trim();
    if (ledger) rec.ledger = ledger;
    records.push(rec);
  }
  records.sort((a, b) => b.date.localeCompare(a.date));

  const loanValues = loanSh.getDataRange().getValues();
  let loan = null;
  if (loanValues.length >= 2 && loanValues[1][0]) {
    const r = loanValues[1];
    loan = {
      price: Number(r[0]) || 0,
      down: Number(r[1]) || 0,
      rate: Number(r[2]) || 0,
      months: Number(r[3]) || 0,
      start: r[4] instanceof Date ? Utilities.formatDate(r[4], 'Asia/Taipei', 'yyyy-MM-dd') : String(r[4] || ''),
    };
  }

  return { records: records, loan: loan };
}

function _save(records, loan) {
  const recSh = _sheet(RECORDS_SHEET, RECORD_HEADERS);
  recSh.clearContents();
  recSh.appendRow(RECORD_HEADERS);
  if (records.length) {
    const rows = records.map(function (r) {
      // Migrate in case records still have legacy brand/note fields
      let desc = r.desc || '';
      if (!desc) {
        const parts = [r.brand, r.note].filter(function (x) { return x && String(x).trim(); });
        desc = parts.join(' · ');
      }
      return [r.id, r.cat, r.amt, r.date, r.type, desc, r.kwh || '', r.odo || '', r.ledger || ''];
    });
    recSh.getRange(2, 1, rows.length, RECORD_HEADERS.length).setValues(rows);
  }

  const loanSh = _sheet(LOAN_SHEET, LOAN_HEADERS);
  loanSh.clearContents();
  loanSh.appendRow(LOAN_HEADERS);
  if (loan) {
    loanSh.appendRow([loan.price, loan.down, loan.rate, loan.months, loan.start]);
  }
}
