---
name: adr
description: Record an Architecture Decision Record when a plan, task, or implementation needs to deviate from the constitution, or when a load-bearing decision deserves to be locked in for future readers. Output goes to `.specify/memory/adrs/NNNN-slug.md`. Use when the user asks to "write an ADR", "record a decision", "amend the constitution", or when a constitution-conflict gate fires in the plan skill.
---

# ADR skill

Produce an Architecture Decision Record — a short, dated, immutable document that captures one decision, the context that forced it, and the consequences the team now lives with.

ADRs are the **only sanctioned way** to deviate from the constitution. The constitution is slow-changing and says so explicitly (`Modify only via ADR`). When a plan, task, or in-flight implementation discovers that the constitution must bend, write an ADR before you write the deviating code.

## When to invoke

- The plan skill's constitution-conflict gate identified a deviation that the user wants to formalize
- An implementer discovered mid-task that the documented stack/principle can't satisfy the spec
- A non-obvious decision (data model shape, retry policy, framework swap) needs to be locked in so the next reader doesn't relitigate it
- The user explicitly says "write an ADR for X"

Do **not** invoke for reversible day-to-day code choices (variable names, file layout within a module, refactors that don't touch the constitution).

## Process

### Step 1 — Locate the ADR folder and pick the next number

ADRs live in `.specify/memory/adrs/`. Create the folder if it does not exist.

Find existing ADRs (`ls .specify/memory/adrs/`) and pick the next number, zero-padded to 4 digits: `0001`, `0002`, …. Numbers are never reused. If an ADR is superseded, the new ADR gets the next free number; the old one stays in place with its status updated.

### Step 2 — Gather the inputs

Before drafting, you need:

1. **The triggering context.** What plan, task, or implementation surfaced the need? Link to it.
2. **The constitution clauses touched** (if any). Read `.specify/memory/constitution.md` and quote the exact lines the ADR affects. If the ADR doesn't touch the constitution, say so — that's a valid ADR too (it just locks in a decision the constitution was silent on).
3. **The decision itself, stated as a sentence.** "We will use X instead of Y." If you can't state it that crisply, the decision isn't ready to record.

If any of these are missing, ask the user — one or two pointed questions, not a wall.

### Step 3 — Ask only the non-obvious

Most ADR content is derivable. Ask only when:

- The user has not stated the decision crisply
- The alternatives considered are not obvious from the triggering context
- The consequences are genuinely uncertain (in which case write them as "uncertain — to revisit if X")

Two questions max per turn.

### Step 4 — Read the template and write the ADR as Proposed

The ADR structure lives in [`.specify/templates/adr.template.md`](../../../.specify/templates/adr.template.md). That file is the **structural source of truth** — this skill provides the workflow for filling it in; it does not invent its own section layout. If the template is missing, stop and ask the user to restore it before proceeding.

Copy the template to `.specify/memory/adrs/NNNN-kebab-case-slug.md`, replacing every `[bracket placeholder]` with concrete content. Preserve the template's headings, section order, and `Status: Proposed` exactly. Remove the bracket-comment guidance from the final file. Keep the prose plain — future readers want to know *why*, not be sold on the choice.

Substitutions to make as you populate:

- `[NNNN]` → the zero-padded number picked in Step 1.
- `[Title]` → a one-line title that names the decision (e.g., "Use node:sqlite over better-sqlite3 for async-everywhere compliance").
- `[YYYY-MM-DD]` → today's date in ISO format.
- `[Triggered by]` → the link or short description from Step 2's input gathering.
- Context, Decision, Consequences, Alternatives, Follow-ups → populated per the guidance inside each section's brackets.

**Always write new ADRs with `Status: Proposed`** — the file goes to disk first, the user decides next. Never write `Accepted` on the first pass; that comes only after explicit user confirmation in Step 5.

Rules for the file:

- **One decision per ADR.** If you find yourself writing "and also we'll change Y" — that's a second ADR.
- **Immutable once Accepted.** After acceptance, the file is not edited except to flip Status to `Superseded by ADR-XXXX`. New decisions go in new ADRs.
- **Rejected ADRs stay on disk.** They are part of the audit trail — they answer "did we consider X?" for future readers. Never delete a Rejected ADR.
- **Date in ISO format.** Use the project's current date.

### Step 5 — Ask the user to Accept or Reject

After writing the Proposed ADR, **stop and ask the user explicitly** whether to Accept or Reject it. Use `AskUserQuestion` with the two options. Do not proceed past this step on your own — the whole point of an ADR is that the human owns the decision.

Show the user:
- A one-line summary of what the ADR decides.
- The path to the file you wrote, so they can read it before answering.
- The two options: **Accept** (adopt the decision) or **Reject** (don't adopt; keep the file as a record of refusal).

Wait for the answer. Then:

**If Accepted:**
1. Edit the ADR file: flip `Status: Proposed` to `Status: Accepted`.
2. If the ADR amends a constitution clause, edit `.specify/memory/constitution.md` to reflect the new rule, leaving a one-line citation next to the changed line: `(amended by [ADR-NNNN](./adrs/NNNN-slug.md) on YYYY-MM-DD)`. Do not delete the original wording without the citation — the constitution is the canonical source; readers need to walk from the live rule back to the decision that produced it.
3. If the ADR does not amend the constitution (it locks in a decision the constitution was silent on), skip the constitution edit.
4. Continue with whatever workflow triggered the ADR (e.g., return to the plan skill so it can cite ADR-NNNN and proceed).

**If Rejected:**
1. Edit the ADR file: flip `Status: Proposed` to `Status: Rejected`.
2. Add a `## Rejection rationale` section at the end of the file with the user's stated reason (verbatim if they gave one; "User rejected without further detail" if they did not).
3. Do **not** edit the constitution.
4. Return control to the triggering workflow. The triggering skill (typically `plan`) must now choose a different path — usually option (a) of its conflict gate (revise the design to comply with the constitution as written). It must **not** silently proceed as if the ADR had been accepted.

In both cases the file remains on disk. Rejected ADRs are how the project remembers what it considered and chose not to do.

### Step 6 — Hand off

Tell the user the final state in one paragraph:

1. ADR-NNNN was Accepted / Rejected.
2. If Accepted and the constitution changed, name the lines that changed.
3. If Accepted and a plan or tasks file referenced "TBD via ADR" or contained an unresolved deviation paragraph, point out that those should now cite this ADR.
4. If Rejected, point the user back to the triggering workflow and remind them which option (typically: revise to comply) is next.

## What this skill is NOT for

- **Day-to-day code decisions** that don't touch the constitution. Comments and PR descriptions cover those.
- **Re-opening accepted ADRs.** If you disagree with ADR-0007, write ADR-0023 that supersedes it. Don't edit 0007.
- **Speculative future decisions.** ADRs record decisions that are happening now, not ones that might happen.
- **Multi-decision documents.** One ADR, one decision. Split if necessary.

## Example trigger from the plan skill

> "The plan needs `node:sqlite` (async, Node 22+) but the constitution recommends `better-sqlite3` (synchronous) while also forbidding sync I/O. The constitution is internally inconsistent. Resolve via ADR before writing plan.md."

The resulting ADR would have:
- **Title:** `ADR-0001: Use node:sqlite over better-sqlite3 for async-everywhere compliance`
- **Context:** quotes both clauses, names the contradiction
- **Decision:** "We use the built-in `node:sqlite` module on Node.js 22+ as the SQLite driver for all persistence."
- **Consequences:** bumps minimum Node version; loses `better-sqlite3`'s synchronous test ergonomics; gains async compliance.
- **Constitution impact:** amends the Stack section's recommended driver and the runtime version.
