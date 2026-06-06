# Plan: [Feature Name]

> Technical design satisfying [spec.md](./spec.md). Cite spec criterion IDs (FR-xxx, SC-xxx, NFR-xxx, ...) next to design decisions.

## Architecture overview

[Two to four paragraphs — the shape of the solution. A small ASCII diagram is welcome if it helps.]

## Constitution check

[Per the plan skill's Step 1b. One of:
- "No conflicts — design complies with the constitution as written."
- "Deviations resolved via ADR(s): ADR-NNNN — <title>, ADR-MMMM — <title>." (List each ADR; do not restate its content here.)
If unresolved deviations remain, the plan should not have reached this step. Go back.]

## ADRs referenced

[List the ADR IDs this plan depends on. Format: `- [ADR-NNNN](../../.specify/memory/adrs/NNNN-slug.md) — one-line summary.` Empty list is valid.]

## Architectural changes

[List only the **Bucket 2** (within-architecture, local) changes from the plan skill's Step 2 triage: new tables on the existing DB, new modules in established layers, new endpoints on the existing surface, etc. These are useful for the implementer's situational awareness but are not load-bearing for the project as a whole.

For **Bucket 1** (project-wide, load-bearing) changes — first time the project takes on a class of behavior, new operational surface, new trust boundary, etc. — the decision should already be captured in an ADR per Step 2, and this section should reference it: `See [ADR-NNNN](../../.specify/memory/adrs/NNNN-slug.md).` Do not restate the decision here; the ADR is the canonical record.

"None — fits existing patterns" is a valid and useful answer when triage produced neither bucket.]

## Module layout

| File | Exports | Depends on |
|------|---------|------------|
| `[path]` | `[symbols]` | `[external/internal]` |

## Data model

[DDL for new tables, schema for new messages, or "no data model changes — uses existing X". Include CREATE TABLE statements, JSON schemas, or message shapes as appropriate.]

## API contract

[One block per endpoint or interface. For each: method + path, request shape, response shape, status codes. Reference spec criterion IDs.]

## Algorithms / key decisions

[Short notes on non-obvious choices — collision retry strategy, sort order, caching policy, etc. One paragraph each, with the reasoning. Cite the spec criterion each decision serves.]

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| [name]  | [semver] | [one line] |

## Deployment plan

[What changes about how this feature is deployed. Specific commands if relevant. Configuration values that need to be set. "No deployment changes" is valid if true.]

## Risks and mitigations

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | [risk] | [how it's handled, or "accepted — see X"] |

## Out of scope

[What this plan does NOT cover, even if related. Helps the implementer not over-build.]
