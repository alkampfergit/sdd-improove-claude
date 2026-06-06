---
name: plan
description: Turn a spec.md into a reviewable plan.md by populating the project's plan template — resolves constitution conflicts via ADRs, triages architectural changes, and records technical decisions with spec-criterion citations. Covers architecture, data model, API contracts, dependencies, deployment, and risks. Manually invoked as a step in the spec-driven-development flow, after specify and before tasks. Output goes to specs/<feature-name>/plan.md.
disable-model-invocation: true
user-invocable: true
---

# Plan skill

Translate a spec into a technical plan. The plan answers HOW; the spec answered WHAT. Output is a markdown document at `specs/<feature-name>/plan.md` that the implementer follows and the verifier references.

## Process

### Step 1 — Read the inputs in this order

1. `.specify/memory/constitution.md` — the rules you can't break
2. `specs/<feature-name>/spec.md` — the contract you must satisfy
3. `CLAUDE.md` — operational conventions (file layout, build commands)
4. The current codebase structure if this is brownfield work

If `spec.md` doesn't exist, stop and tell the user to run `specify` first. Don't try to plan against a feature that hasn't been specified.

### Step 1b — Constitution conflict gate (do this before drafting anything)

Before writing a single line of plan content, enumerate every place where the plan you are about to write would **deviate from, weaken, or contradict** the constitution. Be honest: look at the constitution's Principles, Stack, Forbidden patterns, and Testing standards sections one by one, and ask "does the design I have in mind comply, line by line?"

Two failure modes to watch for:

1. **External conflicts** — your plan needs to use a different library, runtime version, framework, or pattern than the constitution names. (Example: constitution says SQLite; your plan needs Postgres.)
2. **Internal contradictions** — the constitution itself contains two rules that cannot both be satisfied by any plan. (Example: constitution recommends a synchronous driver *and* forbids sync I/O in the request path. Both can't hold.)

For each conflict you find, choose exactly one of:

- **(a) Revise the plan to comply.** Pick the design that satisfies the constitution. This is the default — try it first.
- **(b) Formalize the deviation via an ADR.** Invoke the `adr` skill to draft the decision *before* writing `plan.md`. The `adr` skill writes the file as `Status: Proposed` and asks the user to Accept or Reject. **Wait for that decision** — do not write `plan.md` until the ADR resolves. Then:
  - If the user **Accepts**, the ADR flips to `Accepted` and `plan.md` cites it by ID, with no inline justification of the deviation. The ADR — not the plan — is where the deviation is argued and consequences are owned.
  - If the user **Rejects**, the ADR file stays on disk as `Status: Rejected` (audit trail), and you must fall back to option (a): revise the design to comply with the constitution as written. Do not write the deviating plan anyway.
- **(c) Stop and ask the user** which of (a) or (b) they want. If the conflict is small and the answer is obvious, just do (a). If the conflict touches stack or principles, default to surfacing it.

**Do not "flag and continue."** A `plan.md` paragraph that says "the constitution says X but we'll do Y because Z" is not a valid resolution — it bakes a deviation into a per-feature document that future readers will not know to consult. Deviations live in ADRs; plans cite them.

If you find no conflicts, say so explicitly in the plan's `## Constitution check` section (added in Step 5). "No conflicts" is a useful finding for the verifier.

### Step 2 — Detect architectural changes and triage them (do this before writing)

Before anything else, decide whether this feature requires changes to the **existing architecture**, or whether it fits within it. Look for these signals:

- **New persistence concerns** — new tables, new external services, new caches, new file stores
- **New traffic shapes** — long-running jobs, websockets, batch processing, scheduled work
- **New trust boundaries** — auth, multi-tenant data isolation, untrusted input
- **New deployment requirements** — additional processes, additional containers, scheduled jobs
- **New cross-cutting concerns** — observability, rate limiting, audit logging, internationalization

For **each** signal you detect, triage it into one of two buckets. This step exists because the categories above mix one-way-door, project-wide decisions with within-architecture local changes, and they belong in different artifacts.

**Bucket 1 — Project-wide, load-bearing changes → ADR.**

A change is project-wide if any of the following are true:

- It's the **first time** the project takes on a class of behavior (first background job, first outbound mail, first websocket, first auth boundary, first cache).
- It introduces a **new operational surface** that future features will inherit and reason about (a new deploy target, a new credential to manage, a new failure mode).
- It would surprise a future engineer reading only the constitution (they'd ask "wait, when did we decide we do X?").
- The constitution is **silent** on the topic and this feature establishes the precedent.

These belong in an ADR — not in plan.md. The adr skill explicitly supports "filling a gap the constitution was silent on" as a valid ADR shape, and ADRs are the only artifact future readers reliably walk to find load-bearing decisions. **Hand off to the `adr` skill now**, before drafting plan.md, just like the Step 1b conflict gate. Wait for Accept/Reject; on Accept, plan.md cites the ADR(s) in its `ADRs referenced` section and the `## Architectural changes` section can simply say "see [ADR-NNNN]" rather than restating the decision.

**Bucket 2 — Within-architecture, local changes → plan.md `## Architectural changes` section.**

A change is local if it adds new shape inside an established pattern without introducing a class of behavior the project hasn't seen before:

- A new database table inside the existing DB.
- A new module in an already-established layer (a new repository, a new service).
- A new endpoint on the existing HTTP surface.
- New validation, new error mapping, new logging — none of which establish a new cross-cutting concern.

These are useful to call out so the implementer sees them in context, but they're not load-bearing for the project as a whole. Document them in `## Architectural changes` in plan.md.

**Examples of the line:**

| Signal | Bucket | Why |
|---|---|---|
| First feature that needs to send email | ADR | First outbound mail — new credential, new failure mode, new operational surface |
| Tenth feature that adds a new email template | plan.md local | Pattern is established; this is a within-pattern addition |
| First feature that introduces background jobs | ADR | New traffic shape, new deploy concern, future features will inherit it |
| First feature that needs a new table on the existing SQLite DB | plan.md local | Persistence is already established; new table is a local data-model change |
| First feature that needs Postgres because SQLite can't satisfy it | ADR (and a constitution-conflict ADR per Step 1b) | Changes the Stack rule itself, not just shape |
| Feature that adds auth to a previously anonymous app | ADR | First trust boundary — defines a pattern every future feature will follow |
| Feature that adds a new validation rule to existing auth | plan.md local | Auth pattern already exists; this is an in-pattern refinement |

**If your triage finds zero items in Bucket 1 and zero in Bucket 2**, say "none — this fits existing patterns" in plan.md's `## Architectural changes` section. That's a valid and useful finding.

**If your triage finds Bucket 1 items**, do not write plan.md until those ADRs are Accepted (or Rejected and you've chosen the within-constitution alternative). Same wait-for-the-human rule as Step 1b.

### Step 3 — Ask only the non-obvious questions

Most of the plan can be derived from spec + constitution. Ask the user only when:

- A design decision has genuine trade-offs the spec is silent on (e.g. "store the full URL or hash it?")
- A library choice isn't obvious from the constitution (e.g. "Express or Fastify?" — only ask if neither is mentioned)
- The deployment target needs special handling (e.g. "this needs a writable path on Azure App Service — where?")
- The migration path matters (e.g. "how do existing users see this new column?")

Ask **two to four questions per turn**. Never ask things you can infer from the spec or the constitution.

### Step 3b — Log every technical question and answer to `interview.md`

After each round of questions, append the exchange to `specs/<feature-name>/interview.md` under a top-level section titled `## Technical questions` (created on first append, reused on subsequent rounds). The `specify` skill owns the rest of that file; this skill only appends — it never edits or removes earlier content.

Format for each entry, mirroring the existing `Q<n>` style in `interview.md`:

```markdown
## Technical questions

### TQ1 — <short label, e.g. "SQLite driver">
**Reasoning shown:** <one line summarizing the options/trade-offs you presented>
**Question:** <the exact question asked>
**Answer:** <the user's selected option, verbatim — include any "Other" free-text>
```

Number entries `TQ1`, `TQ2`, … across the whole feature (continue numbering on later plan runs; do not restart). If the user overrides an earlier technical decision in a later turn, add a new `TQ<n>` entry that supersedes it rather than editing the earlier one — the history matters.

Write the append immediately after the user answers, before drafting the plan, so the record exists even if plan generation is interrupted. If `interview.md` does not exist (rare — `specify` should have created it), create it with just the `## Technical questions` section and proceed.

### Step 4 — Cite spec criterion IDs

Every design decision should reference the spec criterion it satisfies. For each major design choice in the plan, write `(satisfies A3)` or `(supports NFR2)`. This makes the plan auditable end-to-end and gives the verifier explicit handles.

### Step 5 — Read the template and write the file

The plan structure lives in [`.specify/templates/plan.template.md`](../../../.specify/templates/plan.template.md). That file is the **structural source of truth** — this skill provides the workflow for filling it in; it does not invent its own section layout. If the template is missing, stop and ask the user to restore it before proceeding.

Copy the template to `specs/<feature-name>/plan.md`, replacing every `[bracket placeholder]` with concrete content from Steps 1b through 4 (constitution-conflict resolutions, architectural-change triage results, TQ answers, and the design decisions you've gathered). Preserve the template's headings and section order exactly. Remove the bracket-comment guidance from the final file — only the populated sections should remain.

Substitutions to make as you populate:

- `[Feature Name]` → the human-readable feature name (matches the title in `spec.md`).
- `Constitution check` → the resolution from Step 1b: either "No conflicts …" or the list of ADR IDs that resolved deviations. Never use this section to argue why a deviation is fine — that's the anti-pattern Step 1b warned against.
- `ADRs referenced` → the ADR IDs both Step 1b and Step 2 produced. Empty list is valid.
- `Architectural changes` → only Bucket-2 (within-architecture, local) items from Step 2's triage. Bucket-1 items live in their ADRs; this section references them, it does not restate them.
- Module layout, Data model, API contract, Algorithms, Dependencies, Deployment plan, Risks, Out of scope → populated per the guidance inside each section's brackets, citing spec criterion IDs (FR-xxx, SC-xxx, NFR-xxx) next to every concrete design decision per Step 4.

Remove unused optional sections (e.g. `Data model` if the feature has no data model changes — replace its body with `No data model changes.` rather than deleting the heading, so the template's section order stays auditable).

### Step 5b — Post-draft ADR sweep (do this before handoff)

Step 1b ran *before* drafting and caught conflicts you saw coming. But design decisions crystallize *during* drafting — the user's TQ answers pick specific libraries, you pin specific versions, you choose specific deployment shapes. Each of those is a fresh chance to deviate from the constitution that the pre-draft gate had no way to see. So before handing off, re-walk the **drafted** plan against the constitution one more time.

Open `plan.md` and the constitution side-by-side. For every section that names a concrete choice — `Module layout`, `Data model`, `API contract`, `Algorithms / key decisions`, `Dependencies`, `Deployment plan` — ask:

- Does this choice match what the constitution's Stack section names? If the constitution says "Persistence: X (Y recommended)" and you picked Z, that is a deviation **even if Z is technically allowed** by another clause. "Recommended" choices in the Stack section are the project's defaults; overriding them is the kind of decision the constitution wants formalized.
- Does this choice violate any Principle, Forbidden pattern, or Testing standard?
- Does the user's answer to a TQ question pick something other than the constitution's named default? (TQ answers are the most common source of post-draft deviations — the user picked an option that satisfied one rule but quietly overrode another.)

For each deviation found, the resolution rules are the same as Step 1b: revise the plan to comply, write an ADR via the `adr` skill, or stop and ask. **Do not paper over a deviation by writing a "Constitution check" paragraph that argues why the deviation is fine** — that's the same anti-pattern Step 1b warned against, just discovered later.

Common shapes this step catches that Step 1b cannot:

- The user picked a library option in TQ that is not the one the Stack section recommends.
- A version pin in `Dependencies` requires a runtime newer than the constitution's stated minimum.
- A choice in `Algorithms` introduces a pattern the Forbidden section names (e.g. a sync DB call inside what looked async at the gate).
- The chosen deployment shape requires a process/container/job the constitution's deployment assumptions don't include.

If the sweep finds nothing, say so explicitly in your handoff message ("post-draft ADR sweep: no new deviations"). That's a useful signal for the verifier.

If the sweep finds one or more deviations and an ADR is the right resolution, hand off to the `adr` skill **now**, before Step 6. The plan's `Constitution check` and `ADRs referenced` sections must be updated to cite the resulting ADR(s) once Accepted — same flow as Step 1b.

### Step 6 — Hand off

Tell the user the plan is written and offer:

1. **Read the `Architectural changes` and `Risks` sections carefully.** Those are where decisions get baked in. Push back on anything you disagree with before approving.
2. Recommended: run the `constitution-check` skill on `plan.md` before decomposing — it audits the plan against the constitution + accepted ADRs and catches speculative design that the plan-writing model rationalized. The Step 5b sweep is your own pass; `constitution-check` is the independent fresh-context audit. Both are worth running because the author of an artifact is structurally the worst auditor of it.
3. Run the `tasks` skill to decompose this plan into atomic implementation tasks.

## What this skill is NOT for

- Acceptance criteria — those live in spec.md
- Task-level breakdown — use `tasks` next
- Code generation — the implementer will do that, task by task, using a different loop
- Speculative future features — out of scope is out of scope

## Example: when to flag an architectural change

Spec says: *"WHEN a user requests a password reset, the system SHALL email a reset link valid for 1 hour."*

If the project already sends emails: **no architectural change.** Just a new email template and a new endpoint.

If the project has never sent an email before: **architectural change.** You're adding a new dependency on an outbound mail provider, a new failure mode (mail delivery), new credentials to manage, new monitoring. Flag it explicitly. The implementer needs to know they're not just writing a route handler.
