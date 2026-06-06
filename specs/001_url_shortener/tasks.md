# Tasks: URL Shortener

[↑ Back to spec](./spec.md) · [Plan](./plan.md)

> Atomic units of work, each completable in 30 to 60 minutes. Tests named here match files under `test/`. Implement in topological order. Each task starts with a `- [ ]` checkbox — flip it to `- [x]` when the task is executed (acceptance test passing, work committed).

## T-01 — Project skeleton + test config

- [x] **Executed** — tick when `T-01`'s acceptance test passes and the work is committed
- **Files touched:** `package.json`, `.gitignore`, `test/smoke.test.js`
- **Acceptance test:** `test/smoke.test.js` — a trivial `node:test` assertion proves the runner is wired and `npm test` exits 0
- **Depends on:** (none)
- **Done when:** `npm test` runs the `node:test` runner and exits 0; `package.json` declares Node 20 engine, `test` script, and placeholder `start`/`build` scripts. Verifies no A-ID — establishes the build/test substrate the rest depend on.

## T-02 — Core: URL validation + normalization

- [x] **Executed** — tick when `T-02`'s acceptance test passes and the work is committed
- **Files touched:** `src/core/url.js`, `test/core.test.js`
- **Acceptance test:** `test/core.test.js` — `validateUrl` accepts `http`/`https`, rejects missing/empty/non-string, non-`http(s)` scheme, and `> 4000` chars; `normalizeUrl` lowercases scheme+host, strips default ports, collapses trailing slash while preserving path/query verbatim
- **Depends on:** T-01
- **Done when:** FR-002, FR-003, SC-003 and Story 3 scenario 2 (normalization collapse) are satisfied by unit tests against the framework-free module (no DB/HTTP imports).

## T-03 — Core: short-code generation + validation

- [x] **Executed** — tick when `T-03`'s acceptance test passes and the work is committed
- **Files touched:** `src/core/code.js`, `test/core.test.js`
- **Acceptance test:** `test/core.test.js` — `generateCode()` returns a 7-char string over `[A-Za-z0-9]`; `isValidCode` accepts code-shaped strings and rejects wrong length / out-of-alphabet chars; a large batch of draws yields no duplicates
- **Depends on:** T-02 (sequential by design — shares `test/core.test.js` with T-02)
- **Done when:** FR-009 is satisfied — codes are 7-char base62 drawn from `node:crypto`, validity check matches the redirect route's alphabet (supports FR-005 malformed-code rejection).

## T-04 — DB: connection + schema migration

- [x] **Executed** — tick when `T-04`'s acceptance test passes and the work is committed
- **Files touched:** `src/db/db.js`, `test/db.test.js`
- **Acceptance test:** `test/db.test.js` — `openDb(':memory:')` creates the `links` table with `short_code` PRIMARY KEY, `target_url NOT NULL UNIQUE`, and `created_at` default; `migrate` is idempotent (safe to run twice)
- **Depends on:** T-01
- **Done when:** FR-010 schema exists — table matches the plan's DDL; opening a throwaway DB initializes it without error.

## T-05 — DB: links repository

- [x] **Executed** — tick when `T-05`'s acceptance test passes and the work is committed
- **Files touched:** `src/db/links-repo.js`, `test/repo.test.js`
- **Acceptance test:** `test/repo.test.js` — `insertLink` persists a row; `findByCode` and `findByTarget` round-trip it; `listAll` returns all rows (and `[]` when empty); a duplicate `target_url` insert raises the UNIQUE constraint error
- **Depends on:** T-04
- **Done when:** repository CRUD-read methods work against a throwaway SQLite DB; the UNIQUE backstop for idempotent create surfaces as a catchable error (FR-007, FR-009, FR-010).

## T-06 — Service: createLink (validate → normalize → dedup → mint → retry)

- [x] **Executed** — tick when `T-06`'s acceptance test passes and the work is committed
- **Files touched:** `src/service/links-service.js`, `test/service.test.js`
- **Acceptance test:** `test/service.test.js` — valid URL mints a code and persists one row; an invalid/non-`http(s)` URL throws a validation error and persists nothing; submitting the same (or normalization-equal) URL twice returns the identical code with exactly one stored row; an injected forced collision triggers regenerate-and-retry
- **Depends on:** T-02, T-03, T-05
- **Done when:** FR-001, FR-002, FR-003, FR-007, FR-009, SC-003, SC-004 are satisfied in the framework-free service (no HTTP imports); retry is bounded and never remaps a live code (FR-006).

## T-07 — Service: resolveCode + listLinks

- [x] **Executed** — tick when `T-07`'s acceptance test passes and the work is committed
- **Files touched:** `src/service/links-service.js`, `test/service.test.js`
- **Acceptance test:** `test/service.test.js` — `resolveCode` returns the stored target for an existing code and a not-found result for a missing or malformed code; `listLinks` returns all entries and an empty list when none exist
- **Depends on:** T-06 (sequential by design — shares `src/service/links-service.js` and `test/service.test.js` with T-06)
- **Done when:** FR-004, FR-005, FR-008 are satisfied at the service layer — resolve is a side-effect-free read (supports SC-001).

## T-08 — HTTP: app factory + POST /api/links

- [x] **Executed** — tick when `T-08`'s acceptance test passes and the work is committed
- **Files touched:** `src/http/app.js`, `test/api.test.js`
- **Acceptance test:** `test/api.test.js` (supertest) — POST a valid URL returns 201 with `{ code, shortUrl, url }` and `code.length === 7`; an invalid/missing/non-`http(s)` URL returns 400 `{ error }` and persists nothing; reposting the same URL returns the existing code (200, no second row)
- **Depends on:** T-06
- **Done when:** Story 1 scenarios 1 & 3 and Story 3 scenario 1 hold over the real HTTP surface; the handler only parses the request and delegates to the service (FR-001, FR-003, FR-007, SC-003, SC-004).

## T-09 — HTTP: GET /:code redirect, GET /api/links, SPA catch-all

- [x] **Executed** — tick when `T-09`'s acceptance test passes and the work is committed
- **Files touched:** `src/http/app.js`, `test/api.test.js`
- **Acceptance test:** `test/api.test.js` (supertest) — requesting an issued code returns 301 with `Location` equal to the stored target and writes nothing; both an **unknown** code (code-shaped, no row) and a **malformed** code (chars/length outside the alphabet) return 404 with no redirect; `GET /api/links` returns 200 with both created links (and `[]` when empty); `GET /` serves the SPA `index.html`
- **Depends on:** T-07, T-08 (sequential by design — shares `src/http/app.js` and `test/api.test.js` with T-08)
- **Done when:** Story 1 scenarios 2 & 4 and Story 2 scenarios 1 & 2 hold; the redirect handler owns every non-API single-segment path so unknown **and** malformed codes both 404 (spec edge cases) while the SPA is served only at `/` + static assets (FR-004, FR-005, FR-008, SC-001).

## T-10 — Server entry point + static SPA serving

- [ ] **Executed** — tick when `T-10`'s acceptance test passes and the work is committed
- **Files touched:** `src/server.js`, `package.json` (`start` script)
- **Acceptance test:** `test/api.test.js` (extended) — wiring `openDb(DB_PATH)` → service → `createApp` boots without error; a create-then-resolve round trip succeeds against a real on-disk throwaway DB, and the mapping survives reopening the DB
- **Depends on:** T-08, T-09
- **Done when:** `node src/server.js` reads `DB_PATH` (default `./data/links.db`), wires db → service → app, serves `web/dist`, and listens; durability across restart is demonstrated (FR-010, SC-005).

## T-11 — React SPA: create form + links list

- [ ] **Executed** — tick when `T-11`'s acceptance test passes and the work is committed
- **Files touched:** `web/index.html`, `web/src/main.jsx`, `web/src/App.jsx`, `vite.config.js`, `package.json` (`build` script)
- **Acceptance test:** manual — `npm run build` emits `web/dist`; with the server running, the form POSTs a URL and renders the returned short link, and the list view shows created links with their code + original URL
- **Depends on:** T-10
- **Done when:** Story 1 (create) and Story 2 (browse) are usable from the React UI, built to static assets served by the single Node bundle (FR-001, FR-008).

## T-12 — Build + run end-to-end deploy smoke

- [ ] **Executed** — tick when `T-12`'s acceptance test passes and the work is committed
- **Files touched:** `package.json` (scripts), `README.md`
- **Acceptance test:** manual — `npm run build && npm start`, then `curl -i` a create request, capture the code, `curl -i` the code and observe `301` + correct `Location`; reload the page and confirm the link persists
- **Depends on:** T-11
- **Done when:** the single Node 20 process serves API + static SPA from one `npm start`, with a documented `DB_PATH` and build step; SC-001/SC-002 verified manually against the live process.

## Dependency graph

```
T-01 ─┬─ T-02 ── T-03 ──┐
      │                 ├─ T-06 ── T-07 ──┐
      └─ T-04 ── T-05 ──┘                 │
                                          ├─ T-08 ── T-09 ── T-10 ── T-11 ── T-12
                                          │
                              (T-08 also depends on T-06)
```
