# CLAUDE.md

Auto-loaded context for any Claude Code session working in this repo. Read this before touching code.

## What this is

Personal Electric Vehicle cost tracking PWA. Single-user, Chinese UI (Traditional, zh-TW). Owned by kmes6817.

Live at https://kmes6817.github.io/ev-tracker/ (deployed from `main` via GitHub Actions).

## Stack decisions (don't undo without discussion)

- **Vanilla JS ES modules, no framework.** Single-user app — React/Vue/Svelte would be overkill. No build step for production.
- **Vitest for tests** (node env, no jsdom for util/pure modules).
- **Prettier + ESLint 9 flat config.** Enforced in CI.
- **Google Apps Script + Google Sheets as backend.** Free, zero-ops, pairs well with single user.
- **Service worker caches app shell, never GAS responses** — so data stays fresh online, offline is snappy.

## File layout

```
index.html                  — shell (CSP meta, minimal markup)
css/app.css                 — all styles, dark mode via prefers-color-scheme
js/
  app.js                    — main app logic, state, renderers, event delegation
  util.js                   — pure helpers (escape, uuid, dates, loan math)
  categories.js             — single CATEGORIES object (color/bg/icon/type)
  evStats.js                — pure EV metrics (kwh, km, $/km, $/kWh, efficiency)
  csv.js                    — RFC 4180 parse/serialise + upsert merge
  api.js                    — GAS sync, localStorage cache, retry queue
config.local.js             — gitignored; GAS_URL + TOKEN (user's copy)
config.example.js           — template
manifest.webmanifest        — PWA manifest
sw.js                       — service worker
gas/Code.gs                 — Apps Script backend
tests/*.test.js             — Vitest unit tests
.github/workflows/
  ci.yml                    — lint + format check + unit tests on PR
  deploy.yml                — deploy to Pages on push to main, injects config from secrets
```

## Non-obvious behaviours

- **Cache-first render.** `app.load()` paints localStorage immediately, fetches GAS in background, re-renders only if data changed. Don't revert to `await api.load()` before first render — that reintroduces the 2-5s cold-start blank screen.
- **`api.save()` is clear-and-rewrite on GAS side.** Simple and guarantees client == server. Means concurrent edits on two devices can overwrite each other — acceptable for single-user.
- **Retry queue.** On save failure, sets `ev_pending_v2` flag in localStorage. `api.flushPending()` runs on `online` event and on next successful load.
- **Event delegation.** Single document-level click listener dispatches via `data-action` attrs. No inline `onclick` — required by strict CSP (`script-src 'self'`).
- **Schema versioned.** Key is `ev_data_v2`. Legacy `ev_records` / `ev_loan` keys migrated on read.

## Rules when changing things

1. **Always go via PR.** Direct push to main is blocked.
2. **Run before push:** `npm run format && npm run lint && npm test`.
3. **New pure logic → new file.** Keep modules <400 lines ideal, 800 hard max.
4. **Escape all user data** rendered via `innerHTML`. Use `escapeHtml()` from `util.js`.
5. **Don't introduce `unsafe-inline` script-src.** Styles stay `'unsafe-inline'` for dynamic colors — acceptable.
6. **If adding a backend field:** update `gas/Code.gs` RECORD_HEADERS + read/write AND bump `js/sw.js` CACHE version AND `tests/csv.test.js` if CSV touches the field.

## Config / secrets map

| Layer                | Key               | Where                                     | Notes                                          |
| -------------------- | ----------------- | ----------------------------------------- | ---------------------------------------------- |
| GitHub repo secret   | `GAS_URL`         | Settings → Secrets → Actions              | Injected at deploy time                        |
| GitHub repo secret   | `GAS_TOKEN`       | same                                      | Currently empty; enable with `SHARED_TOKEN`    |
| Apps Script property | `SHEET_ID`        | AS → Project Settings → Script Properties | `1rs_a1fY_GF0lPWrbJzKRR19NBJes64hEDGjZ3wpl-Ng` |
| Apps Script property | `SHARED_TOKEN`    | same                                      | Unset = token check skipped (backwards compat) |
| User's local         | `config.local.js` | gitignored in repo root                   | Mirror of secrets for local dev                |

If the user reports "連線失敗", check these three layers in order. Script Properties is the layer most often forgotten after a code paste.

## Commit style

- Conventional commits (feat/fix/chore/refactor/test/ci/docs)
- Chinese OR English commit bodies both fine; repo mixes them
- No Co-Authored-By trailers (attribution disabled in user's global Claude settings)

## What's been done

See `git log --oneline` for authoritative history. Rough summary:

- PR #1 — Refactor: single file → modules, fix XSS, CSP, retry queue, UUID, dark mode
- PR #2 — GitHub Pages auto-deploy with secrets injection
- PR #3 — Mileage/kWh + CSV import/export + 35 Vitest unit tests
- PR #4 — GAS backwards-compat (optional SHEET_ID/SHARED_TOKEN, auto-migrate header)
- PR #5 — Mobile UX: cache-first paint, 16px inputs, 100dvh, 52px tap targets, haptic, pull-to-refresh

## What's on the menu (user hasn't committed yet)

- Delete undo (10s toast restore)
- Budget alert (monthly cap → red stat + toast)
- Quick-add charging shortcut on home screen
- E2E tests (Playwright)
- Drop CSP `unsafe-inline` for style-src
- Multi-vehicle support

The user wants to use the app first and see what real pain points emerge before building more.
