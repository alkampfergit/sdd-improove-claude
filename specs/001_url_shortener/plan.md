# Plan: URL Shortener

> Technical design satisfying [spec.md](./spec.md). Cite spec criterion IDs (FR-xxx, SC-xxx) next to design decisions.

## Architecture overview

A single Node.js 20 process serves both a JSON API and the built React SPA, per the constitution's "one service, one bundle" principle. The codebase is layered so that all shortening, encoding, validation, and lookup logic lives in a framework-free **core** with no knowledge of HTTP, Express, or React; the Express layer is a thin adapter that parses requests and delegates to a **service** that orchestrates the core functions over a **repository** abstraction backing onto SQLite.

```
HTTP (Express)        thin handlers: parse req → call service → map result to status
   │
service (framework-free)   create / resolve / list orchestration, collision retry
   │            │
core (pure)   repository (better-sqlite3)
 validate      insert / findByCode / findByTarget / listAll
 normalize
 generateCode
```

The redirect endpoint is the hot path (constitution: "redirects are the hot path"). It performs a single primary-key point lookup on `short_code` via synchronous `better-sqlite3` and issues a 301 with no write — keeping read latency side-effect-light and comfortably inside the p95 < 200 ms budget (SC-001). Creation runs the full boundary pipeline — validate → normalize → dedup lookup → mint code → insert — so no unvalidated or non-`http(s)` URL ever reaches storage (FR-002, FR-003, SC-003).

Persistence is a single SQLite table on local disk with a single writer, exactly as the constitution mandates; no external database is introduced. Short codes are permanent: `short_code` is the primary key and is never updated or recycled once issued (FR-006, SC-005).

## Constitution check

No conflicts — design complies with the constitution as written. The framework-free core, thin Express adapter, single Node bundle serving the React build, SQLite via `better-sqlite3`, 301 redirects, boundary validation, and permanent codes all match the constitution's Principles, Stack, Forbidden, and Testing sections line by line. Post-draft ADR sweep (Step 5b): no new deviations — every concrete choice (Express, `better-sqlite3`, `node:test` + supertest, random base62 codes) matches a constitution-named default.

## ADRs referenced

None — this feature establishes no project-wide decisions beyond what the constitution already fixes.

## Architectural changes

- **New `links` table** inside the existing (constitutionally mandated) SQLite store — a Bucket 2 local data-model change, not a new class of behavior. (supports FR-001, FR-010)
- **New modules** in the layers the constitution already establishes: a pure core module, a service, a repository, and the Express app factory. All within established patterns.
- **New endpoints** on the single HTTP surface: `POST /api/links`, `GET /api/links`, and the `GET /:code` redirect. Within the existing surface.

No Bucket 1 (project-wide / load-bearing) items — nothing here introduces a new operational surface, trust boundary, or traffic shape. (This is the first feature, but the constitution already fixes runtime, framework, persistence, and deploy shape.)

## Module layout

| File | Exports | Depends on |
|------|---------|------------|
| `src/core/url.js` | `normalizeUrl(raw)`, `validateUrl(raw)` | `node:url` (WHATWG `URL`) — no DB/HTTP |
| `src/core/code.js` | `generateCode()`, `isValidCode(s)`, `CODE_ALPHABET`, `CODE_LENGTH` | `node:crypto` — no DB/HTTP |
| `src/db/db.js` | `openDb(path)` (connection + schema init), `migrate(db)` | `better-sqlite3` |
| `src/db/links-repo.js` | `insertLink`, `findByCode`, `findByTarget`, `listAll` | `db.js` |
| `src/service/links-service.js` | `createLink(input)`, `resolveCode(code)`, `listLinks()` | `core/*`, `links-repo.js` — no HTTP |
| `src/http/app.js` | `createApp({ service, staticDir })` (Express app factory) | `express`, `links-service.js` |
| `src/server.js` | entry point — wires db → service → app, serves SPA, `listen` | all of the above |
| `web/` | React SPA (create form + links list), built with Vite to `web/dist` | `react`, `react-dom`, `vite` |
| `test/core.test.js` | unit tests for `core/*` | `node:test` |
| `test/api.test.js` | integration tests (create → resolve → redirect → list) | `node:test`, `supertest` |

Business logic lives in `links-service.js`, never in `http/app.js` handlers (constitution: "no business logic in route handlers").

## Data model

New table in the existing SQLite database (FR-010 — durable across restarts):

```sql
CREATE TABLE IF NOT EXISTS links (
  short_code  TEXT PRIMARY KEY,          -- lookup key, hot path (SC-001); never recycled (FR-006)
  target_url  TEXT NOT NULL UNIQUE,      -- normalized canonical URL; UNIQUE enforces one mapping per URL (FR-007, SC-004)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- `short_code` as PRIMARY KEY gives an O(log n) point lookup with an implicit index for the redirect hot path (SC-001) and guarantees code uniqueness (FR-009).
- `target_url` stores the **normalized** URL and carries a UNIQUE constraint so idempotent create is enforced at the storage boundary, not just in application code (FR-007, SC-004). The redirect's `Location` is this stored normalized value (FR-004).
- No `DELETE`/`UPDATE` paths exist for `links` — codes are permanent (FR-006, SC-005).

## API contract

### POST /api/links — create a short link (FR-001, FR-002, FR-003, FR-007)
- **Request:** `{ "url": "<string>" }`
- **201 Created:** `{ "code": "Ab3xK9z", "shortUrl": "<origin>/Ab3xK9z", "url": "<normalized target>" }` — new mapping persisted.
- **201 / 200 on repeat:** identical URL (after normalization) returns the **existing** `code`; no second row written (FR-007, SC-004). Returns 200 on the idempotent reuse path to signal "no new resource created".
- **400 Bad Request:** `{ "error": "<reason>" }` when `url` is missing, empty, non-string, not `http(s)`, or exceeds 4000 chars (FR-003, edge cases). Nothing persisted (SC-003).

### GET /:code — resolve and redirect (FR-004, FR-005)
- **301 Moved Permanently:** `Location: <target_url>` for an existing code (FR-004). No write on this path (hot path, SC-001).
- **404 Not Found:** code does not exist, **or** is malformed (chars/length outside the code alphabet) — both cases return 404 with no redirect issued (FR-005, edge cases). The redirect handler owns every single-segment top-level path, so a malformed code lands on 404 rather than falling through to the SPA.

### GET /api/links — list all links (FR-008)
- **200 OK:** `[ { "code": "...", "url": "...", "shortUrl": "...", "createdAt": "..." }, ... ]`; empty array when none exist (Story 2 scenario 2).

### Static SPA
- `GET /` and the built static assets (e.g. `web/dist/assets/*`) serve the React app (constitution: one bundle). The SPA is a single create-form + links-list page with **no client-side router**, so there is no broad catch-all over arbitrary paths — every non-API, single-segment path is a short-code lookup, not an SPA route.

## Algorithms / key decisions

**Short-code generation — random base62, 7 chars, retry on collision (TQ2, TQ3; FR-009).** `generateCode()` draws 7 characters from `[A-Za-z0-9]` (~3.5 × 10¹² space) using `node:crypto` randomness. The service inserts under the PRIMARY KEY constraint and, on the rare `SQLITE_CONSTRAINT` for `short_code`, regenerates and retries (bounded to e.g. 5 attempts, then errors). Non-sequential codes are not enumerable and do not leak creation order. (satisfies FR-009)

**Idempotent create (FR-007, SC-004).** Before minting, the service does a `findByTarget(normalized)` lookup; a hit returns the existing code with no insert. The `target_url` UNIQUE constraint is the backstop against a race, so correctness does not depend on lookup-then-insert being atomic — a concurrent duplicate insert fails the constraint and the service re-reads the winner.

**URL normalization & validation (FR-002, FR-003, SC-003).** `validateUrl` parses with the WHATWG `URL` API and rejects anything whose scheme is not `http`/`https`, anything non-string/empty, or anything over 4000 chars (edge cases). `normalizeUrl` produces a conservative canonical form — lowercased scheme and host, default ports stripped — so that inputs differing only by host case or a trailing slash collapse to one mapping (Story 3 scenario 2) without altering path/query semantics.

**Redirect status & hot path (FR-004, SC-001).** 301 permanent (interview Q5) is cacheable by clients/proxies, reducing repeat load and aligning with "URLs are forever". The lookup is a synchronous `better-sqlite3` PK read with no side effects, so server-side latency stays well under the p95 < 200 ms target (SC-001, interview Q6).

**Route precedence.** Express matches `/api/*` first, then the static assets and `GET /` (SPA), then `GET /:code` as the single-segment handler for everything else. Because the SPA has no client-side router (see Static SPA), the redirect handler owns every other top-level path: it resolves the code if a row exists (301, FR-004) and otherwise returns 404 — whether the code is simply unknown **or** malformed/outside the alphabet (FR-005, spec edge cases lines 71–72). The redirect handler never falls through to the SPA, so the spec's "malformed code → 404" guarantee holds and there are no React client routes for it to shadow.

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.19 | HTTP layer only — thin adapter (TQ1) |
| `better-sqlite3` | ^11 | SQLite persistence, synchronous single-writer (constitution Stack) |
| `react`, `react-dom` | ^18 | SPA: create form + links list |
| `vite` | ^5 | Build React to static assets in `web/dist` (dev dependency) |
| `supertest` | ^7 | HTTP-level integration tests (dev dependency) |
| `node:test`, `node:crypto`, `node:url` | built-in | Test runner, secure randomness, URL parsing (no extra dep) |

Test runner is Node's built-in `node:test` (constitution's first-named option) — zero added runtime weight.

## Deployment plan

Single Node 20 process, single deployable (constitution). Build step: `npm run build` runs `vite build` to emit `web/dist`; `npm start` runs `node src/server.js`, which serves the API and the static `web/dist` bundle.

- **Writable disk for SQLite:** the DB file path is read from a `DB_PATH` env var (default `./data/links.db`); the deploy target must provide a persistent, writable local path with a single writer (constitution: SQLite needs persistent local disk). No serverless / multi-instance target without an ADR.
- **Native module:** `better-sqlite3` compiles a native binding; the deploy environment must have a compatible prebuilt binary or a build toolchain for Node 20 (see R2).
- No external services, no additional processes, no scheduled jobs.

## Risks and mitigations

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | `GET /:code` redirect route shadows React SPA client routes | The SPA has no client-side router, so there are no client routes to shadow; the SPA is served only at `/` plus static assets, and every other single-segment path is owned by the redirect handler (301 if found, else 404 for unknown or malformed). See Route precedence. |
| R2 | `better-sqlite3` native build fails on the deploy target | Pin Node 20 LTS; rely on prebuilt binaries or ensure a build toolchain is present in the deploy image; covered by an integration test that opens a real DB. |
| R3 | Collision-retry exhaustion at large scale | 7-char space (~3.5 × 10¹²) makes collisions vanishingly rare; bounded retry (5) then a 500-class error rather than a silent remap (never violates FR-006). Accepted. |
| R4 | Over-aggressive normalization changes a URL's meaning | Conservative rules only (scheme/host case, default port, trailing-slash collapse); path and query preserved verbatim. Unit-tested against Story 3 scenario 2. |
| R5 | Idempotent-create race writes two rows for one URL | `target_url` UNIQUE constraint is the atomic backstop; loser re-reads the winning code (see Idempotent create). |

## Out of scope

Per interview Q1–Q3 and the spec, this plan does **not** cover: link deletion / tombstoning, click analytics or counters, custom/vanity aliases, user accounts or authentication, and rate limiting. These are deliberately excluded; the implementer should not build toward them.
