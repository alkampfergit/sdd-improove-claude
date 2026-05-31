---
name: specify
description: manual invoke
disable-model-invocation: true  
user-invocable: true 
---

# Specify skill

Turn a feature brief into a reviewable specification. The output is a populated copy of [`.specify/templates/spec.template.md`](../../../.specify/templates/spec.template.md), written as `specs/<folder>/spec.md`. That file becomes the contract between the implementer and the verifier — every implementation task and every verification check derives from it.

The **template is the structural source of truth**. This skill provides the workflow for filling it in; it does not invent its own section layout.

## Process

### Step 1 — Read the constitution

Read `.specify/memory/constitution.md`. Every spec must respect the constitution's principles, stack, and forbidden patterns.

If the constitution doesn't exist, stop and ask the user to run the `constitution` skill first. **Don't try to spec without one** — you'll write requirements that contradict the project's rules.

### Step 2 — Read the template

Read `.specify/templates/spec.template.md`. That file defines the section structure, headings, and placeholder syntax. Your job is to populate it — never invent new sections, rename headings, or change the requirement/success-criterion numbering scheme.

If the template is missing, stop and ask the user to restore it before proceeding.

### Step 3 — Locate the spec folder

Numbered spec folders are owned by the `specs-scaffold` skill (e.g. `specs/001_url_shortener/`). **Always invoke the `specs-scaffold` skill automatically at this step** — pass the feature name as the argument. It will create `specs/` and `specs/specs.md` if they don't exist, pick the next available number, create the subfolder, drop a stub `spec.md` with a back-link to the root index, and update `specs/specs.md`. Do not ask the user to run it manually; run it yourself and continue.

This skill **overwrites** that stub `spec.md` with the populated template. The template carries the back-link forward, so the final file still links back to the root index.

### Step 4 — Get the brief

If the user gave you a feature brief at invocation, use it. Otherwise ask: *"What feature do you want to specify? One to three sentences is enough."*

### Step 5 — Surface assumptions through structured conversation

The brief is always underspecified. Drive the conversation through these five substeps. **One question per turn — never multiple.** See [references/elicitation.md](references/elicitation.md) for the full angle checklist, example questions, and anti-patterns.

**5a. Restate.** Before any questions, restate the brief in one paragraph including the inferred *why*. Ask "is this right?". This catches misreads before they cement.

**5b. Triage.** Silently walk the angle checklist in [references/elicitation.md](references/elicitation.md) — who, why, what, inputs, outputs, when, journeys, edge cases, integration, non-functional, out-of-scope, success criteria. Mark each angle as *answered* (brief or constitution covers it), *implied* (high-confidence inference), or *unknown*. Only **unknown** angles become questions. Do not output this triage.

**5c. Ask, one at a time.** For each unknown, in rough priority order:
1. Briefly reason about 2–3 likely options (defaults, tradeoffs). Show the reasoning so the user can confirm, correct, or redirect.
2. End with a single, clearly stated question.
3. Leave the answer open — the user's own answer is always valid.

**5d. Mid-checkpoint.** After ~3–5 questions, mirror back the working understanding in 3–6 bullets and invite corrections or additions in one open prompt ("Anything missing or wrong before I keep going?"). One open prompt elicits more than three narrow questions, without feeling like an interrogation.

**5e. Stop condition.** Stop asking when **all three** hold:
1. Every P1 acceptance scenario will be testable from current knowledge.
2. You can draft ≥3 measurable success criteria with real numbers.
3. No major scope ambiguity remains.

Cap at ~8 questions unless the user invites more. Remaining unknowns become `[NEEDS CLARIFICATION: <what is unclear>]` markers in the spec — they don't all need answers up front.

**Guardrail.** Never ask implementation questions (database choice, framework, file layout, protocol). Those belong to the `plan` skill. Test: if the answer changes the spec, ask; if it only changes how it's built, skip.

**Logging — write `interview.md` as you go.** Maintain a transcript at `specs/<folder>/interview.md` alongside the spec.

- Before the restate (5a), create the file with a header: feature name, today's date, the original brief verbatim.
- After every Q/A pair, append immediately (don't batch — must survive interruption). Log the restate and mid-checkpoint exchanges too, not just numbered questions.
- Format each entry as:
  ```markdown
  ## Q<n> — <angle, e.g. "Inputs">
  **Reasoning shown:** <the 2–3 options you laid out>
  **Question:** <what you asked>
  **Answer:** <user's reply, verbatim>
  ```
- If `interview.md` already exists (re-running `specify` on an existing folder), do **not** clobber it. Append a new dated section: `## Revision — <YYYY-MM-DD>` and continue logging beneath.

The interview file is the decision log behind the spec. Downstream skills (`plan`, `tasks`) can read it to understand *why* a requirement is shaped the way it is.

### Step 6 — Prioritize user stories

Each story is **P1, P2, P3, ...** where P1 is most critical. P1 alone should be a viable MVP.

Every story MUST satisfy **INVEST**: Independent, Negotiable, Valuable, Estimable, Small, Testable. The most common failure is *Independent* — if a story can only be tested in combination with another, split it or merge it. See [references/user-stories.md](references/user-stories.md) for the full INVEST checklist and how to fix each failure mode.

For each story, you'll need:

- **Brief title** + priority tag
- **Journey** in plain language
- **Why this priority** — the value and why it ranks here (this is the *Valuable* check from INVEST)
- **Independent Test** — how to verify the story on its own (the *Independent* + *Testable* check)
- **Acceptance Scenarios** as Given/When/Then (one or more)

### Step 7 — Write acceptance scenarios in Given/When/Then

Every acceptance scenario follows this shape:

> **Given** `<initial state>`, **When** `<action>`, **Then** `<expected outcome>`.

Given/When/Then is the scenario-flavored rendering of the **EARS** event-driven pattern (*When `<trigger>`, the `<system>` shall `<response>`*). Apply EARS discipline to every scenario:

- **Name the subject** (`the service`, `the web UI`) — never just "it" or "the system" when multiple systems are in play.
- **Concrete trigger** in the *When* — a specific request, action, or event you could reproduce in a test.
- **Observable response** in the *Then* — status code, response body, persisted state, UI element — something a test can assert on.
- **One trigger, one response per scenario.** If an "and" joins two distinct outcomes, split it into two scenarios.

Self-check: can you picture the test that proves this scenario? "Then the system handles it gracefully" is not a test — rewrite. For error-shaped scenarios, use the EARS unwanted-behavior pattern (*If `<bad condition>`, then the `<system>` shall `<defined response>`*) as the underlying shape. The full set of EARS patterns and when to use each is in [references/user-stories.md](references/user-stories.md).

### Step 8 — Write functional requirements

Number them **FR-001, FR-002, ...** sequentially. Each is a MUST statement, technology-agnostic. The MUST patterns below are the EARS notation expressed in this template's vocabulary — see [references/user-stories.md](references/user-stories.md#ears) for the full mapping (ubiquitous / event-driven / state-driven / unwanted-behavior / optional-feature).

Patterns to use:

- **System MUST** `<capability>` — EARS ubiquitous. E.g. "System MUST persist redirect counts across restarts."
- **When `<trigger>`, System MUST** `<response>` — EARS event-driven. E.g. "When a client POSTs a valid URL, System MUST respond HTTP 201 with the short URL."
- **Users MUST be able to** `<interaction>` — capability framed from the user's perspective. E.g. "Users MUST be able to retrieve click stats by short code."
- **If `<bad condition>`, System MUST** `<defined response>` — EARS unwanted-behavior. E.g. "If `long_url` is missing or empty, System MUST respond HTTP 400 with `{\"error\": \"<reason>\"}`."
- **System MUST NOT** `<forbidden behavior>` — when prohibition is the requirement.

Mark unknowns inline: `[NEEDS CLARIFICATION: <what is unclear>]`. Don't fabricate values that weren't discussed.

### Step 9 — Define success criteria

Number them **SC-001, SC-002, ...**. Each must be **measurable** and **technology-agnostic** — no library names, no framework specifics, no implementation hints.

Good: *"Users complete signup in under 2 minutes on first attempt."*
Bad: *"The React form is fast."*

Aim for 3–5 criteria covering the dimensions that actually matter (user outcome, throughput, error rate, satisfaction, business metric).

### Step 10 — Write the file

Copy the structure of `.specify/templates/spec.template.md` to `specs/<folder>/spec.md`, replacing every `[bracket placeholder]` with concrete content. This overwrites the stub left by `specs-scaffold`. Keep the back-link line (`[↑ Back to specs index](../specs.md)`) exactly as it appears in the template. Substitutions:

| Placeholder | Fill with |
|---|---|
| `[FEATURE NAME]` | Title-cased feature name derived from the folder slug |
| `[###-feature-name]` | Folder number + kebab-cased slug (e.g. `001-url-shortener`) |
| `[DATE]` | Today's date in `YYYY-MM-DD` |
| `"$ARGUMENTS"` | The user's original brief, verbatim |
| Story/edge/FR/SC placeholders | Concrete content from Steps 5–9 |

Preserve the template's headings, section order, and numbering format exactly. Remove unused optional sections (e.g. *Key Entities* if the feature has no data model). Remove the template's `<!-- comments -->` from the final spec.

### Step 11 — Hand off

Tell the user the spec is written. Point at both files in the folder:

- `spec.md` — the contract.
- `interview.md` — the Q/A transcript that produced it.

Then offer:

1. **Read `spec.md` end-to-end before approving.** This is the contract for everything that follows. If you wouldn't sign it, don't approve it.
2. Recommended: run the `constitution-check` skill on `spec.md` before moving on — it audits the spec against the project constitution and surfaces any speculative requirements before they propagate into the plan.
3. Run the `plan` skill to translate this spec into a technical plan.

Do not proceed automatically.

## What this skill is NOT for

- Implementation details — those go in the plan
- Architectural decisions — also in the plan
- Task breakdown — use `tasks` after `plan`
- Folder creation or numbering — use `specs-scaffold`
- Anything that's not a requirement (e.g. "we'll probably use Redis later") — that's a design note, not a spec

## Example: a clean Given/When/Then vs a vague one

**Vague** (don't write this):

> *Given a bad URL, When the user submits it, Then the system handles it gracefully.*

What's "bad"? What's "gracefully"? You can't write a test.

**Concrete** (write this):

> *Given the request body is missing `long_url`, or the value is not a string, or the value does not start with `http://` or `https://`, When the client POSTs to `/api/v1/links`, Then the service returns HTTP 400 with a JSON body `{"error": "<reason>"}`.*

Specific trigger, named subject, observable response, testable.
