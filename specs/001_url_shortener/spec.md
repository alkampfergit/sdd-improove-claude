# Feature Specification: Url Shortener

[↑ Back to specs index](../specs.md)

**Feature Branch**: `feature/url_shortener_spec`
**Created**: 2026-06-02
**Status**: Draft
**Input**: "I want a basic url shortener feature that turns url into short format."

## User Scenarios & Testing

> Stories are prioritized (P1 highest). Each must be **independently testable** — implementing one story alone should still deliver a usable slice.
> Each story must satisfy **INVEST**: Independent, Negotiable, Valuable, Estimable, Small, Testable.

### User Story 1 — Shorten a URL and follow it (Priority: P1)

A person has a long, unwieldy URL they want to share. They submit it to the service and immediately receive a compact short link. Later, anyone who visits that short link is sent straight to the original destination. This create-and-redirect round trip is the core of the product.

**Why this priority**: This is the minimum viable slice — without both minting a code and redirecting through it, the product delivers no value. Everything else builds on this round trip.

**Independent Test**: Submit a valid `https://` URL to the create endpoint, capture the returned short code, then issue a request to that short code and assert the response is a redirect to the original URL. No other story needs to exist for this to be verified end to end.

**Acceptance Scenarios**:

> Each scenario names a concrete **subject** (`the service`, `the web UI` — never "it"), a reproducible **trigger** in the *When*, and an **observable response** in the *Then* (status code, body, persisted state, UI element). One trigger, one response per scenario.

1. **Given** an empty store, **When** a client submits a valid `http`/`https` URL to the create endpoint, **Then** the service responds HTTP 201 with a body containing the short code and the full short URL, and persists the normalized mapping.
2. **Given** a short code that the service previously issued for `https://example.com/page`, **When** a client requests that short code, **Then** the service responds HTTP 301 with a `Location` header equal to `https://example.com/page`.
3. **Given** the create request body is missing the URL field, or the value is not a string, or the value does not start with `http://` or `https://`, **When** a client submits it to the create endpoint, **Then** the service responds HTTP 400 with a JSON body `{"error": "<reason>"}` and persists nothing.
4. **Given** no link exists for a given short code, **When** a client requests that short code, **Then** the service responds HTTP 404 and issues no redirect.

---

### User Story 2 — Browse created links (Priority: P2)

A user wants to see the short links that have been created on this instance — the short code alongside the original URL it points to — so they can find and copy a link they made earlier. The React UI presents this as a simple list.

**Why this priority**: The instance is open and shared, and the UI needs something to display beyond the create form. Useful, but the round trip in Story 1 is fully functional without it.

**Independent Test**: Create two distinct short links, then request the list; assert both appear, each showing its short code and original URL.

**Acceptance Scenarios**:

1. **Given** two short links have been created, **When** a client requests the links list, **Then** the service responds HTTP 200 with a collection containing both entries, each including its short code and original URL.
2. **Given** no links have been created, **When** a client requests the links list, **Then** the service responds HTTP 200 with an empty collection.

---

### User Story 3 — Reuse the code for a repeated URL (Priority: P3)

When a user shortens a URL that has already been shortened on this instance, the service returns the existing short code instead of minting a new one. This keeps one canonical short link per destination and avoids needless proliferation of codes.

**Why this priority**: A refinement of the create flow. Story 1 is viable while always minting new codes; idempotent reuse improves consistency but is not required for a usable product.

**Independent Test**: Submit the same valid URL twice and assert both responses return the identical short code, and that only one mapping is persisted.

**Acceptance Scenarios**:

1. **Given** `https://example.com/a` has already been shortened to code `abc123`, **When** a client submits `https://example.com/a` again to the create endpoint, **Then** the service responds with the existing code `abc123` and does not create a second mapping.
2. **Given** two URLs that normalize to the same value (e.g. differing only by trailing slash or case-insensitive host), **When** both are submitted, **Then** the service stores a single mapping and returns the same short code for both.

---

### Edge Cases

> Framed as EARS unwanted-behavior: `If <bad condition>, System MUST <defined response>`.

- If the create request omits the URL field, sends an empty string, or sends a non-string value, the System MUST respond HTTP 400 with a JSON error body and persist nothing.
- If the submitted URL does not use the `http` or `https` scheme, the System MUST reject it with HTTP 400 and persist nothing.
- If the submitted URL exceeds the maximum accepted length, the System MUST reject it with HTTP 400. Maximum length is 4000.
- If a client requests a short code that does not exist, the System MUST respond HTTP 404 and MUST NOT issue a redirect.
- If a client requests a malformed short code (characters outside the code alphabet), the System MUST respond HTTP 404 and MUST NOT issue a redirect.

## Requirements

### Functional Requirements

> EARS notation, using **MUST** throughout.

- **FR-001**: When a client submits a valid `http`/`https` URL to the create endpoint, System MUST generate a unique short code, persist the normalized URL-to-code mapping, and respond HTTP 201 with the short code and full short URL.
- **FR-002**: System MUST validate and normalize every inbound URL at the boundary before persistence; only `http` and `https` URLs are accepted.
- **FR-003**: If a submitted URL is missing, empty, not a string, or not a valid `http`/`https` URL, System MUST respond HTTP 400 with a JSON error body and MUST NOT persist any mapping.
- **FR-004**: When a client requests an existing short code, System MUST respond with an HTTP 301 (permanent) redirect whose `Location` is the original target URL.
- **FR-005**: If a client requests a short code that does not exist, System MUST respond HTTP 404 and MUST NOT issue a redirect.
- **FR-006**: System MUST permanently bind a short code to its target URL once issued; System MUST NOT recycle or remap a live short code.
- **FR-007**: When a client submits a URL that, after normalization, matches an already-stored URL, System MUST return the existing short code rather than minting a new one.
- **FR-008**: Users MUST be able to retrieve a list of all created short links, each entry exposing its short code and original URL.
- **FR-009**: System MUST ensure every generated short code is unique across all stored links.
- **FR-010**: System MUST persist link mappings durably so that issued short codes continue to resolve across service restarts.

### Key Entities

- **Link**: A single shortening record. Attributes: short code (unique, the lookup key), original target URL (normalized, validated `http`/`https`), creation timestamp. One Link maps one short code to exactly one target URL for the code's lifetime.

## Success Criteria

Measurable, technology-agnostic outcomes.

- **SC-001**: On the redirect hot path, 95% of short-code lookups complete in under 200 ms server-side under normal load.
- **SC-002**: For 100% of valid URL submissions, the user receives a working short link in a single create request, and visiting that link redirects to the original target on the first attempt.
- **SC-003**: 0 invalid or non-`http(s)` URLs are ever persisted — every malformed submission is rejected before reaching storage.
- **SC-004**: Submitting the same URL any number of times results in exactly one stored mapping and one short code.
- **SC-005**: 0 remapping or recycling events occur — a short code resolves to the same target across restarts and throughout the link's lifetime.
