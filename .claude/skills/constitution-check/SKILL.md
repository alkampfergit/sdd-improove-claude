---
name: constitution-check
description: Audit a spec, plan, tasks file, or ADR against the project constitution (as amended by accepted ADRs). Catches direct violations, silent deviations (deviations missing an ADR), and speculative additions (artifact content with no spec citation). Propose-then-confirm — never auto-fix. Use when the user asks to "check against the constitution", "audit the plan", "verify compliance", or after running specify / plan / tasks / adr.
---

# Constitution check skill

Audit an artifact (`spec.md`, `plan.md`, `tasks.md`, or an ADR file) against the project's constitution and produce a findings table. The skill that *wrote* the artifact is the worst auditor of its own work — this skill exists so a fresh invocation reads cold and catches drift the author rationalized away.

The constitution is the rule-set. Accepted ADRs amend that rule-set. The artifact under audit must comply with the **effective** rule-set: constitution + Accepted ADRs.

## When to invoke

- The user asks to "check the plan against the constitution," "audit tasks.md," "verify compliance," or similar.
- A hand-off from `specify`, `plan`, `tasks`, or `adr` recommends running this skill on what was just produced.
- An implementer noticed an artifact has accreted behavior over time and wants a sweep.

Do **not** invoke on throwaway exploration documents, scratch notes, or files outside `specs/*/` and `.specify/memory/`. The skill audits SDD artifacts, not arbitrary markdown.

## Process

### Step 1 — Identify the target artifact

The user names a path or invokes with no argument. If no argument, default to the most recently modified file in `specs/*/` (excluding `interview.md`). If multiple candidates are recent, ask which one.

Determine the **artifact type** from the filename:

| Filename | Type | Needs sibling spec? |
|----------|------|---------------------|
| `spec.md` | spec | no |
| `plan.md` | plan | yes (`./spec.md`) |
| `tasks.md` | tasks | yes (`./spec.md` + `./plan.md`) |
| `NNNN-*.md` under `.specify/memory/adrs/` | adr | no |

If a required sibling is missing, stop and tell the user — you cannot check traceability without the spec.

### Step 2 — Load the effective rule-set

Read in order:

1. `.specify/memory/constitution.md` — the base rules.
2. `.specify/memory/adrs/*.md` — every ADR with `Status: Accepted`. Skip `Proposed`, `Rejected`, and `Superseded` ADRs; they are not in force.

For each Accepted ADR, note which constitution clauses it amends or which constitution-silent gaps it establishes as precedent. The effective rule-set is: constitution as written, with Accepted ADR amendments and Accepted ADR gap-filling decisions applied.

State the rule-set explicitly to the user before checking — they need to see which ADRs you considered in force, so they can correct you if an ADR is in the wrong state.

When the target artifact is an ADR, audit it as a governance instrument against that rule-set. Do **not** treat the ADR's proposed decision itself as a violation merely because it differs from the pre-ADR constitution; the question is whether the ADR correctly captures a real amendment or gap-filling decision.

### Step 3 — Walk the artifact for findings

Check each constitution clause and each artifact element. First branch by artifact type.

For `spec.md`, `plan.md`, and `tasks.md`, produce findings in these three categories:

**Category A — Direct violations.** The artifact contradicts a constitution Principle, Forbidden pattern, Stack rule, or Testing standard. Example: a task that puts DB calls in a route handler violates layered architecture.

**Category B — Silent deviations.** The artifact uses something other than the constitution's stack/principles without citing an Accepted ADR. Example: `plan.md` chose Postgres instead of SQLite without `ADRs referenced` listing an amendment ADR.

**Category C — Speculative additions.** The artifact introduces behavior, files, endpoints, or assertions that do not trace back to any FR/SC in the spec (or, for plans, to any FR/SC the plan declared it satisfies). This is the constitution's "no speculative abstractions" rule applied concretely.

  - For plan.md: every module, endpoint, dependency, and design decision should cite the FR/SC it serves. Untraced design is suspect.
  - For tasks.md: every task's acceptance test should assert behavior tied to an FR/SC or to scaffolding the plan explicitly mandates. Untraced assertions are suspect.
  - "Good hygiene" patterns (health endpoints, SPA fallback, premature placeholders, `.keep` files, defensive helpers) are the most common form. Be specific in the finding: name the artifact location and the spec citation that is missing.

For ADR files, use these three categories instead:

**Category A — ADR process violations.** The ADR fails the project's governance rules or its required structure. Examples: the ADR records more than one decision; the `## Decision` section does not state a crisp decision; an `Accepted` ADR says it amends the constitution but the constitution was not updated/cited.

**Category B — Unsupported amendment or gap claim.** The ADR says it amends a clause or fills a gap, but it does not identify the touched clause/gap, or the effective rule-set already covers the decision without needing an ADR. Example: the ADR says "No constitution impact — fills a gap" even though the constitution already names that stack choice.

**Category C — Speculative or bundled ADR scope.** The ADR records a future maybe-decision, bundles unrelated decisions, or has no concrete trigger forcing the decision now. Example: one ADR says "switch to Postgres and later add Redis".

When auditing an ADR, do not flag the decision merely because it differs from the current constitution. Instead, check whether the ADR is the correct, minimal, traceable mechanism for changing or extending the rule-set.

Findings table format:

```markdown
| # | Severity | Category | Clause / Spec gap | Artifact location | Finding | Suggested resolution |
|---|----------|----------|-------------------|-------------------|---------|----------------------|
| 1 | high     | A — violation | Principles → "No DB queries in route handlers" | tasks.md T-07 | Acceptance test imports `db` directly into the route test | Move DB access into repository test; assert via repo, not route |
| 2 | medium   | C — speculative | No FR/SC | tasks.md T-01 | `/healthz` endpoint not requested by spec | Replace acceptance test with one that asserts `createApp({})` returns an Express app instance |
```

Severity calibration:
- **high** — direct violation, or speculative addition that adds runtime behavior (endpoints, middleware, side effects).
- **medium** — speculative addition that's test-only or file-only (placeholder files, extra assertions), or a silent deviation that's clearly minor.
- **low** — borderline traceability gaps where reasonable people might disagree.

If you find **zero issues**, say so explicitly — that's a useful finding and you should state which clauses you walked through to reach that conclusion.

### Step 4 — Present findings and resolve one at a time

Show the user the full table. Then walk through findings **one at a time** — do not bulk-confirm.

For each finding, present options via `AskUserQuestion` based on the finding type:

- **Category A or B on `spec.md`, `plan.md`, or `tasks.md`:**
  1. **Fix artifact** — revise the artifact to remove or correct the issue. You apply the edit after confirmation.
  2. **Write ADR** — the deviation is legitimate and should be formalized. Hand off to the `adr` skill, which writes a Proposed ADR and awaits Accept/Reject.
  3. **Dismiss as false positive** — only if the artifact already complies and you can point to the exact clause, Accepted ADR, or spec citation that clears it. This is not a path for keeping a real violation or silent deviation without change.

- **Category C on `spec.md`, `plan.md`, or `tasks.md`:**
  1. **Fix artifact** — remove or tighten the speculative content.
  2. **Dismiss as traced / not speculative** — only if you can point to the exact FR/SC or plan requirement that justifies it.

- **ADR findings:**
  1. **Fix ADR** — revise the ADR so it correctly captures one decision, its trigger, and its constitution impact.
  2. **Dismiss as false positive** — only if the ADR already satisfies the governance rule you cited.
  3. **Return to triggering artifact** — if the ADR is fine but it exposed an unresolved problem in the plan/tasks artifact that needs to be fixed or formalized there.

There is no "accept and keep the noncompliant artifact" path for a real Category A or B finding. If the user wants to keep behavior that truly conflicts with the effective rule-set, the artifact must be fixed or the deviation must be formalized via ADR.

Apply each Fix immediately after confirmation, then move to the next finding. Do not batch edits — partial application is easier to review than a single sweeping diff.

For ADR hand-offs: pass enough context that the `adr` skill can draft the ADR without re-asking the user about scope. The user will still Accept or Reject the resulting ADR in the `adr` flow.

### Step 5 — Hand off

After the last finding is resolved, tell the user:

1. The number of findings by severity (e.g., "2 high, 1 medium, 0 low").
2. What was Fixed, what triggered a new ADR (and its number), what was dismissed as a false positive, and what was sent back to the triggering artifact.
3. If any Category C findings were Fixed by removal, name the artifact sections that shrank — the user should be able to look at the diff and see the simplification.
4. If new ADRs were written, name them and remind the user they're `Proposed` until they Accept/Reject through the `adr` skill.

## What this skill is NOT for

- **Reading code.** This is a documentation audit. Source code compliance is the implementer's job at task time.
- **Re-litigating accepted ADRs.** If an ADR is `Accepted`, it amends the constitution; the artifact need not justify the deviation again.
- **Style or wording cleanup.** Findings must tie to a constitution clause or a missing spec citation. Don't surface prose nits.
- **Auto-fixing.** Always propose, always confirm — same principle as the `adr` Accept/Reject flow.
- **Auditing files outside `specs/*/` and `.specify/memory/`.** Those are SDD artifacts; the constitution governs them. Random markdown elsewhere is out of scope.

## Why this is a separate skill, not a step inside specify/plan/tasks

The skill that wrote the artifact rationalized every line it produced. A fresh invocation with only the rules + spec + artifact in context is structurally better positioned to catch drift. The cost is one extra explicit step; the benefit is that "good hygiene" patterns like `/healthz`, SPA fallback, premature placeholder files, and other muscle-memory additions actually get caught instead of being waved through by the author.
