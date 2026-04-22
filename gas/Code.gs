/**
 * EV Tracker — Google Apps Script backend.
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
const RECORD_HEADERS = ['id', 'cat', 'amt', 'date', 'type', 'brand', 'note'];
const LOAN_HEADERS = ['price', 'down', 'rate', 'months', 'start'];

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function _requireToken(token) {
  if (!SHARED_TOKEN) throw new Error('Backend misconfigured: SHARED_TOKEN not set');
  if (token !== SHARED_TOKEN) throw new Error('Unauthorized');
}

function _ss() {
  if (!SHEET_ID) throw new Error('Backend misconfigured: SHEET_ID not set');
  return SpreadsheetApp.openById(SHEET_ID);
}

function _sheet(name, headers) {
  const ss = _ss();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
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
  for (let i = 1; i < recValues.length; i++) {
    const row = recValues[i];
    if (!row[0]) continue;
    records.push({
      id: String(row[0]),
      cat: row[1],
      amt: Number(row[2]) || 0,
      date: row[3] instanceof Date ? Utilities.formatDate(row[3], 'Asia/Taipei', 'yyyy-MM-dd') : String(row[3] || ''),
      type: row[4] || 'r',
      brand: row[5] || '',
      note: row[6] || '',
    });
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
    const rows = records.map((r) => [r.id, r.cat, r.amt, r.date, r.type, r.brand || '', r.note || '']);
    recSh.getRange(2, 1, rows.length, RECORD_HEADERS.length).setValues(rows);
  }

  const loanSh = _sheet(LOAN_SHEET, LOAN_HEADERS);
  loanSh.clearContents();
  loanSh.appendRow(LOAN_HEADERS);
  if (loan) {
    loanSh.appendRow([loan.price, loan.down, loan.rate, loan.months, loan.start]);
  }
}
