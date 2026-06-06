# Interview — Url Shortener

**Date:** 2026-06-02
**Original brief (verbatim):** "I want a basic url shortener feature that turns url into short format."

---

## Restate — Who & Why
**Restated:** A URL shortener — submit a long URL, get a compact short code; visiting the short link redirects to the original. Why: long URLs are unwieldy to share; a short code is easy to pass around while still resolving to the real destination. Node service (API + React UI, one bundle), SQLite, framework-free core for shortening/lookup.
**Confirmed:** Yes (implicitly accepted; user proceeded to answer Q1).

## Q1 — Who / Access control
**Reasoning shown:** (1) Fully open/anonymous — anyone can create, no login; (2) shared instance, no accounts but a management list; (3) authenticated users who own their links.
**Question:** Who creates the short links, and is there any access control? Lean toward fully open / anonymous, auth out of scope?
**Answer:** "ok first option, fully open"

## Q2 — Scope / Journeys
**Reasoning shown:** (1) Bare minimum — create + redirect only; (2) + link management (list + delete/tombstone); (3) + click analytics.
**Question:** What's in scope beyond create + redirect? Lean toward create + redirect + simple list, leaving delete/tombstone and analytics out.
**Answer:** "ok for create redirect and simple list of created links" — delete/tombstone and click analytics OUT of scope for this spec. (User also asked to use Claude native question UI for subsequent questions.)

## Q3 — Code creation
**Reasoning shown:** (1) Auto-generated only; (2) custom alias only; (3) both (custom optional).
**Question:** How should short codes be created?
**Answer:** "Auto-generated only" — no custom aliases in this spec.

## Q4 — Duplicate URLs
**Reasoning shown:** (1) Always mint a new code; (2) reuse existing code (lookup on normalized URL at create time).
**Question:** When the same long URL is submitted more than once, what should happen?
**Answer:** "Reuse existing code" — idempotent create: identical normalized URL returns the existing short code.

## Mid-checkpoint
**Mirrored back:** open/anonymous; create + redirect + simple list (no delete/analytics); auto-generated codes only; idempotent create; boundary validation (http/https only); codes permanent.
**Answer:** "ok proceed"

## Q5 — Redirect type
**Reasoning shown:** (1) Temporary 302 (no aggressive caching, easier future analytics); (2) Permanent 301 (cacheable, fast hot path, aligns with "URLs are forever").
**Question:** What kind of HTTP redirect should a short link issue?
**Answer:** "Permanent (301)".

## Q6 — Redirect latency target
**Reasoning shown:** p95 < 50 ms / < 10 ms / < 200 ms.
**Question:** What latency target should the redirect hot path meet?
**Answer:** "p95 < 200 ms".

---

### Stop condition met
All P1 scenarios testable; ≥3 measurable success criteria available; no major scope ambiguity. Remaining minor unknowns (short-code length/charset, exact JSON field names) are implementation/plan concerns, left to the `plan` skill. Spec drafted.

---

## Technical questions

### TQ1 — HTTP framework
**Reasoning shown:** Constitution lists "Express (or Fastify)"; Express = ubiquitous/simplest with broad supertest examples, Fastify = faster + built-in schema validation. Both meet the p95<200ms budget.
**Question:** The constitution lists "Express (or Fastify)" — which HTTP framework should the thin web layer use?
**Answer:** Express

### TQ2 — Short-code generation strategy
**Reasoning shown:** Random base62 + UNIQUE-constraint retry (non-enumerable, idempotent reuse via normalized-URL lookup) vs sequential counter→base62 (no retry, shortest, but enumerable and leaks creation order).
**Question:** How should auto-generated short codes be produced? (codes must be unique — FR-009, and never recycled — FR-006)
**Answer:** Random base62, retry on collision

### TQ3 — Short-code length / alphabet
**Reasoning shown:** 6 chars (~56B), 7 chars (~3.5T), or 8 chars (~218T) from the [A-Za-z0-9] alphabet; longer = more collision headroom, marginally longer links.
**Question:** What length and alphabet for the generated short code?
**Answer:** 7 chars, base62
