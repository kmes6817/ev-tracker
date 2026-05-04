# CLAUDE.md

Auto-loaded context for any Claude Code session working in this repo. Read this before touching code.

## What this is

Personal **cashbook** — mobile-first expense tracking PWA. Single-user, Chinese UI (Traditional, zh-TW). Owned by kmes6817.

Originally `ev-tracker` (electric-vehicle expense tracker). Refactored into a generic cashbook with EV remaining as an opt-in preset/extension. The legacy GitHub Pages URL `kmes6817.github.io/ev-tracker/` may still resolve until the repo is renamed on GitHub.

## Stack decisions (don't undo without discussion)

- **Vanilla JS ES modules, no framework.** Single-user app — React/Vue/Svelte would be overkill. No build step for production.
- **Vitest for tests** (node env, no jsdom for util/pure modules).
- **Prettier + ESLint 9 flat config.** Enforced in CI.
- **Google Apps Script + Google Sheets as backend.** Free, zero-ops, pairs well with single user.
- **Service worker caches app shell, never GAS responses.**

## File layout

```
index.html
css/app.css
js/
  app.js                    — main app logic, state, renderers, event delegation
  util.js                   — pure helpers
  categories.js             — preset + user-custom merger
  ledgers.js                — multi-ledger config + helpers
  csv.js                    — RFC 4180 parse/serialise + upsert merge
  api.js                    — GAS sync, localStorage cache, retry queue
  icons.js                  — SVG icon library
  presets/
    ev-preset.js
    general-preset.js
  extensions/
    ev/stats.js             — EV charging metrics
    general/stats.js        — generic monthly/category stats
    budget/budget.js        — monthly cap warnings
config.local.js             — gitignored; GAS_URL + TOKEN + CATEGORY_PRESET
config.example.js           — template
manifest.webmanifest
sw.js
gas/Code.gs                 — Apps Script backend
tests/*.test.js
```

## Non-obvious behaviours

- **Cache-first render.** Don't revert to `await api.load()` before first render — that reintroduces a 2-5s cold-start blank screen.
- **`api.save()` is clear-and-rewrite on GAS side.** Concurrent edits on two devices can overwrite — acceptable for single-user.
- **Retry queue.** On save failure sets `cashbook_pending_v3` (legacy: `ev_pending_v2`).
- **Event delegation.** Single document-level click listener; no inline `onclick` (strict CSP).
- **Schema versioned.** Current LS key `cashbook_data_v3`. Legacy `ev_data_v2`, `ev_records`, `ev_loan` migrate on first read.
- **Config alias.** `window.APP_CONFIG` is canonical; `window.EV_CONFIG` still read for backwards compat.

## Rules when changing things

1. **Always go via PR.** Direct push to main is blocked.
2. **Run before push:** `npm run format && npm run lint && npm test`.
3. **New pure logic → new file.** Modules <400 lines ideal, 800 hard max.
4. **Escape all user data** rendered via `innerHTML`. Use `escapeHtml()`.
5. **Don't introduce `unsafe-inline` script-src.** Style-src `'unsafe-inline'` is acceptable for dynamic colours.
6. **If adding a backend field:** update `gas/Code.gs` headers + `js/sw.js` CACHE version + affected tests.

## Config / secrets map

| Layer                | Key               | Where                                     | Notes                                          |
| -------------------- | ----------------- | ----------------------------------------- | ---------------------------------------------- |
| GitHub repo secret   | `GAS_URL`         | Settings → Secrets → Actions              | Injected at deploy time                        |
| GitHub repo secret   | `GAS_TOKEN`       | same                                      | Currently empty; enable with `SHARED_TOKEN`    |
| Apps Script property | `SHEET_ID`        | AS → Project Settings → Script Properties | `1rs_a1fY_GF0lPWrbJzKRR19NBJes64hEDGjZ3wpl-Ng` |
| Apps Script property | `SHARED_TOKEN`    | same                                      | Unset = token check skipped (backwards compat) |
| User's local         | `config.local.js` | gitignored in repo root                   | Mirror of secrets for local dev                |

If "連線失敗", check those three layers in order.

## Commit style

- Conventional commits (feat/fix/chore/refactor/test/ci/docs)
- Chinese OR English commit bodies both fine
- No Co-Authored-By trailers (attribution disabled in user's global Claude settings)

## What's been done

- PR #1 — Refactor: single file → modules, fix XSS, CSP, retry queue, UUID, dark mode
- PR #2 — GitHub Pages auto-deploy with secrets injection
- PR #3 — Mileage/kWh + CSV import/export + 35 Vitest unit tests
- PR #4 — GAS backwards-compat
- PR #5 — Mobile UX: cache-first paint, haptic, pull-to-refresh
- PR #6 — **Rename ev-tracker → cashbook**; APP_CONFIG (EV_CONFIG kept as legacy alias)
- PR #7 — Category presets + user-custom categories
- PR #8 — Multi-ledger support
- PR #9 — Extension architecture: EV stats + generic stats + budget alerts
- PR #10 — Recurring expenses (subscriptions/rent/loan generalised)
