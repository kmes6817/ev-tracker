# Google Apps Script Backend

See [`Code.gs`](Code.gs) for the implementation and inline setup instructions.

## Quick deploy

1. Create a Google Sheet; note the ID from the URL
2. Open Apps Script (Extensions → Apps Script)
3. Paste `Code.gs` into the editor
4. Project Settings → Script Properties → add:
   - `SHEET_ID` = spreadsheet id
   - `SHARED_TOKEN` = any random string (keep secret-ish)
5. Deploy → New deployment → Web app
   - Execute as: Me
   - Who has access: Anyone
6. Copy the `/exec` URL → paste into `config.local.js` as `GAS_URL`
7. Set the same `SHARED_TOKEN` in `config.local.js` as `TOKEN`

## Security note

The token check in `Code.gs` is a minimal capability gate. It prevents casual
scraping but is **not a substitute for proper auth**. Anyone with the URL +
token can read/write your sheet. For multi-user or sensitive data, switch to
a backend with real authentication (Firebase Auth, Supabase, etc.).
