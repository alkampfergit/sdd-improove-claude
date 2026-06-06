---
name: evaluator
description: >
  Evaluates a Spec Driven Design round by inspecting the current specs
  scaffold, then reviewing its artifacts together. Works on the full round
  (spec.md + plan.md + tasks.md) AND on a partial round of spec.md + plan.md
  alone, before tasks.md exists — pass either and it scores what is present.
  Use when the user asks to "evaluate an SDD round", "score the spec",
  "review spec plan tasks", "review spec and plan", "evaluate spec + plan
  without tasks", "assess SDD quality", or wants 1-10 scores and concrete
  improvements for the specification, technical plan, and (if present) task
  list.
---

# Evaluator skill

Evaluate a Spec Driven Design round as a verifier. The artifacts live in a numbered spec folder under `specs/`:

- `spec.md` — what must be true *(required)*
- `plan.md` — how the feature will be built *(required)*
- `tasks.md` — the implementation sequence *(optional — may not exist yet)*

This skill supports two evaluation modes, chosen automatically from what is on disk:

- **Full round** — `spec.md` + `plan.md` + `tasks.md` are all present. Score all three artifacts and the full traceability chain.
- **Spec + plan** — only `spec.md` + `plan.md` are present, because tasks have not been written yet. Score those two artifacts and the Spec → Plan chain; skip everything that depends on `tasks.md` instead of penalizing the round for not having it.

A folder needs at least `spec.md` and `plan.md` to be evaluable. The absence of `tasks.md` is a valid state (spec + plan mode), not a defect.

This skill is read-only by default. Do not rewrite the artifacts unless the user explicitly asks for edits after seeing the evaluation.

## What every evaluation must produce

Whatever the mode, the output always carries these four things — they are the point of the skill:

1. **An overall vote for the round, on a 1-10 scale.** One number that answers "how ready is this round to move forward?" Derive it from the section votes and the coherence of the chain — never a blind average (a fatal flaw caps the overall vote no matter how strong the parts are; see Step 6).
2. **A vote for each section, on the same 1-10 scale.** Spec and Plan always; Tasks too in full-round mode. Each vote uses the rubric in its scoring step so the numbers mean the same thing every time.
3. **Suggestions.** Concrete, actionable improvements — both the highest-leverage ones for the whole round and per-section "Improve by" lines. A suggestion the implementer can act on without guessing, not vague praise.
4. **Clearly surfaced problems.** Blocking issues called out by name and never buried: constitution/ADR violations, a plan not adherent to the spec, and (full round) tasks not adherent to the plan. These are the failures that justify a low vote, so make them impossible to miss.

The 1-10 scale is mandatory for the overall vote and every section vote — do not substitute letter grades, percentages, or pass/fail for the votes.

## Process

### Step 1 — Locate the round

Use the `specs-scaffold` skill's `list` behavior to understand the current `specs/` directory:

1. Read `specs/specs.md` if present.
2. List direct subfolders matching `specs/NNN_*`.
3. For each folder, check which of `spec.md`, `plan.md`, and `tasks.md` exist. A folder is **evaluable** when it has at least `spec.md` and `plan.md`; note for each evaluable folder whether `tasks.md` is also present (full round) or absent (spec + plan mode).

If the user named a feature or folder, evaluate that folder in whichever mode its files support. If they did not name one:

- If exactly one folder is evaluable, evaluate it.
- If multiple folders are evaluable, evaluate the highest-numbered evaluable folder and state that choice.
- If no folder has both `spec.md` and `plan.md`, stop and report what is missing per folder. Do not infer missing artifacts from memory.

When the user explicitly asks to review only the spec and plan, stay in spec + plan mode even if a `tasks.md` happens to exist — evaluate what they asked for and say you skipped tasks by request.

### Step 2 — Read the project rules and inputs

Read these files before scoring:

1. `.specify/memory/constitution.md` — project principles, stack, forbidden patterns, testing standards
2. Accepted ADRs in `.specify/memory/adrs/`, if the plan references any
3. `specs/<folder>/spec.md`
4. `specs/<folder>/plan.md`
5. `specs/<folder>/tasks.md` — only in full-round mode; skip in spec + plan mode
6. `specs/<folder>/interview.md`, if present, to distinguish intentional decisions from gaps

If the constitution is missing, continue the evaluation but cap the plan and tasks scores at 7 because constitutional compliance cannot be verified.

State the mode you are in (full round vs. spec + plan) at the top of your work so the user knows what was and was not scored.

### Step 3 — Score the specification

Score `spec.md` from 1 to 10 using this rubric:

- **9-10**: Clear user value, prioritized INVEST stories, testable Given/When/Then scenarios, EARS-style FRs, measurable technology-agnostic SCs, edge cases, no unresolved critical ambiguity.
- **7-8**: Mostly usable contract with minor ambiguity, weak success criteria, or a few acceptance scenarios that need sharper observable outcomes.
- **5-6**: Understandable intent but stories are coupled, requirements mix implementation with behavior, or several criteria cannot drive tests.
- **3-4**: Major gaps in scope, actors, outcomes, edge cases, or measurable success; downstream planning would require guessing.
- **1-2**: Not a reviewable spec; mostly notes, placeholders, or contradictions.

Check specifically:

- Story priorities make sense, and P1 is independently useful.
- Every acceptance scenario has concrete Given, When, and Then clauses.
- FR IDs are sequential, observable, and technology-agnostic.
- SC IDs are measurable and not disguised implementation details.
- Edge cases cover invalid input, boundaries, absence of data, and failure modes relevant to the feature.
- Open `[NEEDS CLARIFICATION]` markers are acceptable only if they do not block P1 implementation.

### Step 4 — Score the technical plan

Score `plan.md` from 1 to 10 using this rubric:

- **9-10**: Implements the whole spec, complies with constitution and accepted ADRs, makes architectural changes explicit, cites FR/SC IDs beside design decisions, gives concrete module/data/API/deployment details, and names real risks with mitigations.
- **7-8**: Solid implementation guide with small traceability gaps, underdeveloped risks, or minor missing details that an implementer can resolve safely.
- **5-6**: Plausible design but important sections are vague, criterion citations are sparse, ADR/constitution handling is weak, or API/data details are incomplete.
- **3-4**: Requires substantial invention during implementation, contradicts parts of the spec or constitution, or hides load-bearing architecture choices.
- **1-2**: Not an actionable plan; mostly placeholders, generic advice, or incompatible with the spec.

Check specifically:

- Every P1/P2 behavior in `spec.md` is accounted for by a design element.
- The `Constitution check` is real, not boilerplate.
- Referenced ADR links exist and are accepted when needed.
- Project-wide architectural changes are captured as ADRs; local changes are in `Architectural changes`.
- Module layout names concrete files/symbols and aligns with the repository shape.
- Data model, API contract, algorithms, dependencies, deployment plan, and risks are specific enough for implementation.
- The plan avoids speculative work not required by `spec.md`.

### Step 5 — Score the task list *(full-round mode only)*

Skip this step entirely in spec + plan mode — there is no `tasks.md` to score, and a not-yet-written task list is not a defect of the spec or plan. In your output, mark the Tasks row and Task Findings as "Not yet written — evaluate after running the tasks skill" rather than scoring them 0.

In full-round mode, score `tasks.md` from 1 to 10 using this rubric:

- **9-10**: Tasks are atomic 30-60 minute units, topologically ordered, independently verifiable, each with scoped files, a named acceptance test, explicit dependencies, and Done-when lines tied to FR/SC IDs.
- **7-8**: Implementable sequence with minor size, dependency, or traceability issues.
- **5-6**: Useful breakdown but tasks are uneven, acceptance tests are vague, dependencies are incomplete, or spec coverage is hard to prove.
- **3-4**: Too coarse or too fragmented; implementer would need to re-plan before coding.
- **1-2**: Not an actionable implementation sequence.

Check specifically:

- T-01 has no dependencies and establishes only what later tasks need.
- No task depends on a later task; no cycles are implied.
- Tasks that touch the same files are ordered unless explicitly parallel-safe.
- Each acceptance test maps to the behavior it proves.
- Every required spec behavior is covered by at least one task or intentionally deferred as out of scope.
- No task introduces architecture, dependencies, or features absent from the plan/spec.

### Step 6 — Evaluate coherence, flag problems, set the overall vote

After scoring each artifact, evaluate the round as a chain. Which links you can assess depends on the mode:

- **Spec to plan traceability** *(both modes)*: every meaningful FR/SC has a corresponding design decision.
- **Plan to tasks traceability** *(full round only)*: every material design decision has implementation coverage.
- **Tasks to tests traceability** *(full round only)*: every behavior-changing task has a named proving test.
- **Decision hygiene** *(both modes)*: constitution and ADR rules are respected without burying deviations in feature docs.
- **Scope control** *(both modes; in spec + plan mode, check that the plan does not expand beyond the approved spec)*.

In spec + plan mode, mark the tasks-dependent chains as "N/A — tasks not yet written" instead of Fail; the chain is simply not in scope yet.

While checking the chain, flag any **blocking problem** explicitly. These are the failures that must surface in the output and that drag the overall vote down hard:

- **Constitution/ADR violation** — the plan or tasks break a constitutional rule (or a forbidden pattern) without an accepted ADR covering the deviation.
- **Plan not adherent to spec** — a P1/P2 behavior in `spec.md` has no design coverage, or the plan designs something the spec never asked for.
- **Tasks not adherent to plan** *(full round)* — a task contradicts or omits a load-bearing plan decision, or introduces architecture/dependencies absent from the plan.

Now set the **overall vote (1-10)** for the round. Do not average the section scores mechanically — weigh them against the chain:

- Any unresolved blocking problem above caps the overall vote at **4**, however strong the individual sections are. A broken chain is the whole round failing, not a rounding detail.
- With no blocking problems, anchor the overall vote near the section votes, then adjust down for partial-chain weaknesses (e.g. thin spec→plan traceability) or up for an exceptionally coherent round.
- In spec + plan mode the overall vote rests on just the two section votes and the spec→plan handoff — judge that handoff especially carefully, since it is the main thing this mode exists to catch before tasks get written on a shaky foundation.

Always state in one sentence *why* the overall vote landed where it did, naming the blocking problem if one capped it.

### Step 7 — Write the evaluation

Return the evaluation in this structure. In **full-round mode** include every section as shown. In **spec + plan mode** keep the same structure but replace each tasks-related cell/section with the "not yet written" note shown in the comments — do not drop the rows, so the reader can see what is pending.

```markdown
# SDD Round Evaluation: <NNN_slug>

_Mode: <Full round (spec + plan + tasks) | Spec + plan (tasks not yet written)>_

## Overall Vote: <1-10>/10

<One sentence on why the round landed at this vote. If a blocking problem capped it, name that problem here.>

## Section Votes

| Artifact | Vote | Verdict |
|---|---:|---|
| Spec | <1-10>/10 | <one sentence> |
| Plan | <1-10>/10 | <one sentence> |
| Tasks | <1-10>/10 _(or "—")_ | <one sentence, or "Not yet written — evaluate after the tasks skill runs"> |

## Blocking Problems

<!-- List every blocking problem found, or write "None — no blocking problems found." Never omit this section. -->

- **<Constitution/ADR violation | Plan not adherent to spec | Tasks not adherent to plan>:** <what is wrong, with the specific rule, FR/SC ID, or task ID> → <what must change to clear it>

## Highest-Leverage Improvements (Suggestions)

1. <Most important improvement across the whole round.>
2. <Second improvement.>
3. <Third improvement.>

## Spec Findings

- **Strength:** <specific evidence from spec.md>
- **Gap:** <specific issue, with section or ID>
- **Improve by:** <concrete rewrite or addition>

## Plan Findings

- **Strength:** <specific evidence from plan.md>
- **Gap:** <specific issue, with section or ID>
- **Improve by:** <concrete rewrite or addition>

## Task Findings

<!-- Full-round mode: fill in the three bullets below.
     Spec + plan mode: replace this whole block with the single line:
     "Tasks not yet written — re-run the evaluator in full-round mode after the tasks skill produces tasks.md." -->

- **Strength:** <specific evidence from tasks.md>
- **Gap:** <specific issue, with task ID or section>
- **Improve by:** <concrete rewrite or addition>

## Traceability

| Chain | Status | Notes |
|---|---|---|
| Spec → Plan | Pass/Partial/Fail | <short note> |
| Plan → Tasks | Pass/Partial/Fail _(or "N/A — tasks not yet written")_ | <short note> |
| Tasks → Tests | Pass/Partial/Fail _(or "N/A — tasks not yet written")_ | <short note> |
| Constitution/ADR compliance | Pass/Partial/Fail | <short note> |

## Score Upgrade Path

- **Spec to <next score>:** <one or two concrete actions>
- **Plan to <next score>:** <one or two concrete actions>
- **Tasks to <next score>:** <one or two concrete actions, or "N/A until tasks.md exists"> 
```

Keep findings evidence-based. Prefer citing IDs and headings over broad judgment. If an artifact is excellent, still name the next marginal improvement; a 10/10 means no material improvement is worth doing before implementation.

## What this skill is NOT for

- Writing or rewriting `spec.md`, `plan.md`, or `tasks.md` during the first evaluation pass
- Implementing tasks
- Approving constitutional deviations without accepted ADRs
- Replacing the `constitution-check` skill for a single-artifact compliance audit

