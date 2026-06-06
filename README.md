# URL Shortener

A simple URL shortener service with a React UI. Single Node.js process serving both the JSON API and the built React SPA.

## Features

- **Create short links** — Submit a long URL and receive a compact 7-character code
- **Redirect** — Visit a short code to be redirected to the original URL (301 permanent)
- **Browse links** — View all previously created links with their codes and original URLs
- **Persistent storage** — Links are stored durably in SQLite and survive server restarts
- **Normalized URLs** — Automatically normalize URLs (lowercase host, strip default ports) to avoid duplicate entries
- **Idempotent create** — Submitting the same URL twice returns the same code

## Build

```bash
npm run build
```

This builds the React SPA to `web/dist` using Vite.

## Run

```bash
npm start
```

Starts the server on `http://localhost:3000` (default).

Environment variables:
- `DB_PATH` — SQLite database file path (default: `./data/links.db`)
- `PORT` — Server port (default: 3000)

The server:
1. Creates the data directory if it doesn't exist
2. Opens/initializes the SQLite database
3. Serves the JSON API at `/api/links`
4. Serves the React SPA at `/` and static assets
5. Handles short-code redirects at `/:code`

## Test

```bash
npm test
```

Runs the full test suite with Node's built-in test runner:
- Unit tests for core modules (URL validation, code generation)
- Integration tests for database operations
- Integration tests for service layer
- HTTP-level tests using supertest
- Server integration tests with real on-disk database persistence

## API

### POST /api/links

Create a short link.

**Request:**
```json
{
  "url": "https://example.com/very/long/url"
}
```

**Response (201 Created / 200 OK):**
```json
{
  "code": "ab3xK9z",
  "shortUrl": "http://localhost:3000/ab3xK9z",
  "url": "https://example.com/very/long/url"
}
```

- Returns `201` for new links
- Returns `200` when the URL has already been shortened
- Returns `400` for invalid/missing/non-http(s) URLs

### GET /:code

Redirect to the original URL.

**Response (301 Moved Permanently):**
```
Location: https://example.com/very/long/url
```

- Returns `301` for valid codes
- Returns `404` for unknown or malformed codes

### GET /api/links

List all created links.

**Response (200 OK):**
```json
[
  {
    "code": "ab3xK9z",
    "url": "https://example.com/very/long/url",
    "shortUrl": "http://localhost:3000/ab3xK9z",
    "createdAt": "2026-06-06 12:34:56"
  }
]
```

- Returns an empty array if no links exist

### GET /

Serves the React SPA.

## Architecture

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

### Core Modules

- **src/core/url.js** — URL validation and normalization (WHATWG URL API)
- **src/core/code.js** — Short-code generation and validation (node:crypto randomness)

### Database

- **src/db/db.js** — SQLite connection and schema migration
- **src/db/links-repo.js** — Repository pattern for link CRUD

### Service Layer

- **src/service/links-service.js** — Business logic for link creation, resolution, and listing

### HTTP Layer

- **src/http/app.js** — Express app factory with API routes
- **src/server.js** — Entry point: wires db → service → app, serves static files

### Frontend

- **web/src/App.jsx** — React SPA with create form and links list
- **web/vite.config.js** — Vite configuration for React build
- **web/package.json** — Web project dependencies

## Design Principles

- **Library-first core** — All business logic in framework-free modules
- **Thin HTTP layer** — Route handlers only parse requests and delegate to the service
- **One bundle** — Single Node process serves both API and static SPA
- **Permanent codes** — Codes are never recycled or remapped once issued
- **Boundary validation** — All URLs validated and normalized before persistence
- **Hot path optimization** — Redirect is a side-effect-free single PK lookup (301)

## Constitution

See `.specify/memory/constitution.md` for the project's non-negotiables around stack, principles, forbidden patterns, and testing standards.
