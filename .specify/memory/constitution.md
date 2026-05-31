# Project Constitution — URL Shortener

> The non-negotiables of this project. Slow-changing. Modify only via ADR.

A URL shortener: a Node.js service that mints short codes for long URLs and redirects on lookup, with a React UI for creating and managing links. A single Node process serves both the JSON API and the built React app.

## Principles

- **Library-first core.** The shortening, encoding, and lookup logic lives in a framework-free module with no knowledge of HTTP, Express, or React. The web layer is a thin adapter over it.
- **Redirects are the hot path.** Lookup-and-redirect must stay fast and side-effect-light. Treat read latency on this path as a first-class constraint, not an afterthought.
- **One service, one bundle.** The Node service owns both the API and the static React build. There is no second deployable to keep in sync.
- **URLs are forever.** A short code, once issued, must always resolve to the same target (or a deliberate tombstone). Never silently recycle or remap a live code.
- **Validate before you store.** Every inbound URL is validated and normalized at the boundary; malformed or unsafe input never reaches persistence.

## Stack

- **Runtime:** Node.js 20 LTS
- **Backend:** Express (or Fastify) — HTTP layer only, no business logic
- **Frontend:** React (SPA), built to static assets and served by the Node service
- **Persistence:** SQLite via `better-sqlite3` (requires persistent local disk)
- **Testing:** Node test runner or Vitest/Jest for unit + integration; supertest for HTTP-level tests

## Forbidden

- **Business logic in route handlers.** Handlers parse the request and call the core module — nothing more.
- **External databases beyond SQLite.** No Postgres, Redis, or hosted DB without an ADR; the persistence choice is constitutional.
- **Serverless / multi-instance deploys (as-is).** SQLite needs persistent local disk and a single writer; horizontal scaling requires an ADR that revisits persistence.
- **Recycling or remapping live short codes.** Once a code resolves, it stays bound to its target for its lifetime.
- **Storing unvalidated URLs.** No write reaches the database before normalization and validation pass.
- **Open redirects without validation.** The redirect endpoint only sends users to URLs that passed boundary validation at creation time.

## Testing standards

- Unit tests cover the core module (code generation, encoding, validation, lookup) in isolation from HTTP and the DB.
- Integration tests exercise the real API surface (create → resolve → redirect) against a throwaway SQLite database.
- `npm test` must exit 0 before any commit; a red suite blocks the commit.
- Test files live beside what they cover or under a top-level `test/` dir, named `*.test.js` (or `*.test.ts`).
