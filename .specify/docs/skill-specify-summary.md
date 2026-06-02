# Specify Skill: Summary, Workflow & Artifacts

## Overview

The **specify** skill transforms a brief feature description into a reviewable, testable specification document. It's a structured conversation tool that surfaces assumptions, ensures requirements are testable, and produces a contract that guides implementation and verification. It's the second step in the Spec-Driven Development (SDD) workflow, after `constitution` and before `plan`.

---

## Summary

### What the Skill Does

The specify skill runs a structured interview to elicit requirements from a feature brief, then populates a specification template with:

- **User stories** prioritized (P1 = MVP, P2, P3, ...) and verified against INVEST criteria
- **Acceptance scenarios** written in Given/When/Then format using EARS patterns
- **Functional requirements** in EARS notation (MUST statements)
- **Edge cases** framed as unwanted-behavior EARS rules
- **Success criteria** with real numbers (not vague terms like "fast")
- **Key entities** if the feature involves data modeling

The output is a contract between the implementer and verifier — every implementation task and verification check derives from it.

### Core Principles

1. **Template-driven**: The section structure, headings, and format come from `.specify/templates/spec.template.md`. The skill populates it; it never invents new sections.
2. **Structured conversation**: The skill asks ~3–7 questions, one per turn, to surface unknowns. It uses elicitation angles (who, why, what, inputs, outputs, edge cases, etc.) to decide what to ask.
3. **INVEST + EARS discipline**: Every user story must be Independent, Negotiable, Valuable, Estimable, Small, Testable. Every statement uses EARS patterns (ubiquitous, event-driven, state-driven, unwanted-behavior, optional-feature).
4. **Constitutional alignment**: Every requirement must respect the project's constitution (principles, stack, forbidden patterns).
5. **Testability-first**: Acceptance scenarios must describe something reproducible in a test — no "handles gracefully" or "works correctly".

---

## Workflow Schema

```
START
  │
  ├─ Step 1: Validate Prerequisites
  │   ├─ Read .specify/memory/constitution.md
  │   └─ Verify spec template exists
  │
  ├─ Step 2: Initialize Spec Folder
  │   └─ Auto-invoke specs-scaffold skill
  │       └─ Creates specs/<N>_feature_name/
  │
  ├─ Step 3: Elicitation Interview (Structured Conversation)
  │   │
  │   ├─ 5a. Restate Brief
  │   │   └─ Reword user's brief + infer "why"
  │   │   └─ Confirm: "Is this right?"
  │   │
  │   ├─ 5b. Silent Triage (mental step, no output)
  │   │   └─ Walk angle checklist vs. brief + constitution
  │   │   └─ Mark each angle: answered | implied | unknown
  │   │
  │   ├─ 5c. Ask Questions (one per turn)
  │   │   ├─ 3–7 typical questions
  │   │   ├─ Show 2–3 likely options first
  │   │   └─ Leave answer open
  │   │
  │   ├─ 5d. Mid-Checkpoint (~3–5 questions in)
  │   │   └─ Mirror back 3–6 bullets
  │   │   └─ Invite corrections/additions
  │   │
  │   └─ 5e. Stop Condition (all three must be true)
  │       ├─ All P1 scenarios are testable
  │       ├─ Can draft ≥3 measurable success criteria
  │       └─ No major scope ambiguity
  │
  ├─ Step 4: Prioritize User Stories
  │   ├─ Assign P1 (MVP), P2, P3, ...
  │   └─ Verify each story satisfies INVEST
  │       ├─ Independent
  │       ├─ Negotiable
  │       ├─ Valuable
  │       ├─ Estimable
  │       ├─ Small
  │       └─ Testable
  │
  ├─ Step 5: Write Acceptance Scenarios
  │   └─ Given/When/Then format for each story
  │       ├─ Name concrete subject
  │       ├─ Concrete trigger (reproducible)
  │       └─ Observable response (testable)
  │
  ├─ Step 6: Capture Edge Cases & Requirements
  │   ├─ Frame edge cases as EARS unwanted-behavior
  │   └─ Write functional requirements (FR-001, FR-002, ...)
  │       ├─ Use EARS patterns (ubiquitous/event-driven/state/unwanted/optional)
  │       └─ Mark unknowns: [NEEDS CLARIFICATION: ...]
  │
  ├─ Step 7: Define Success Criteria
  │   └─ Number SC-001, SC-002, ... (≥3 measurable)
  │       ├─ Technology-agnostic
  │       └─ Include real numbers (latency, completion rate, etc.)
  │
  ├─ Step 8: Write Files
  │   ├─ Populate spec.template.md → specs/<N>_feature/spec.md
  │   ├─ Create/append interview.md transcript
  │   └─ Remove unused optional sections
  │
  └─ END → Hand Off
      ├─ User reviews spec.md end-to-end
      ├─ Run constitution-check (optional but recommended)
      └─ Run plan skill next
```

---

## Output Artifacts

### 1. **spec.md** — The Specification Contract

**Location**: `specs/<N>_feature_name/spec.md`

**Purpose**: The authoritative specification document. Every implementation task and verification check derives from this.

**Contents** (populated from template):

- **Header metadata**:
  - Feature branch name (e.g., `feature/url_shortener_spec`)
  - Creation date (`YYYY-MM-DD`)
  - Status (Draft)
  - Original brief (verbatim from user input)

- **User Scenarios & Testing**: Each user story consists of:
  - **Title + Priority**: e.g., "User Story 1 — Create a short link (Priority: P1)"
  - **User Journey**: One paragraph describing the user's goal and flow
  - **Why this priority**: Value proposition + ranking rationale (e.g., "This is the MVP feature; without it, the service doesn't work")
  - **Independent Test**: How to verify this story in isolation without other stories
  - **Acceptance Scenarios**: 1–3 Given/When/Then scenarios per story
    - Concrete subject (`the service`, `the web UI`)
    - Reproducible trigger (specific request, action, event)
    - Observable response (status code, response body, persisted state, UI element)

- **Edge Cases** *(optional section; remove if empty)*:
  - EARS unwanted-behavior format: `If <bad condition>, System MUST <defined response>`
  - Examples: missing input, malformed input, boundary values, concurrent access, partial failure

- **Functional Requirements** (FR-001, FR-002, ...):
  - EARS-notation MUST statements
  - Patterns used:
    - `System MUST <capability>` (ubiquitous)
    - `When <trigger>, System MUST <response>` (event-driven)
    - `While <state>, System MUST <response>` (state-driven)
    - `If <bad condition>, System MUST <defined response>` (unwanted-behavior)
    - `Where <feature is present>, System MUST <response>` (optional-feature)
  - Unknowns marked inline: `[NEEDS CLARIFICATION: <what is unclear>]`

- **Key Entities** *(optional if data-heavy)*:
  - Entity name, what it represents
  - Key attributes and relationships
  - Example: `Link: Represents a mapping from short code to long URL. Key attributes: id, short_code, long_url, created_at, redirect_count.`

- **Success Criteria** (SC-001, SC-002, SC-003, ...):
  - ≥3 measurable, technology-agnostic outcomes
  - Must include real numbers (latency, completion rate, error rate, throughput, business metrics)
  - Bad: "System should be fast and reliable"
  - Good: "Redirect resolves in p95 < 200ms" and "Link creation succeeds on 99% of valid submissions"

**Format**: Markdown. Populated from `.specify/templates/spec.template.md`. Back-link to specs index is preserved.

---

### 2. **interview.md** — Decision Transcript

**Location**: `specs/<N>_feature_name/interview.md`

**Purpose**: The decision log. Downstream skills (`plan`, `tasks`) read this to understand *why* each requirement is shaped as it is.

**Contents**:

- **Header section**:
  - Feature name
  - Creation date
  - Original brief (verbatim, as user stated it)

- **Restate exchange** (from Step 5a):
  - The skill's restatement of the brief
  - Inferred "why" (underlying problem)
  - User's confirmation or correction

- **Q/A entries** (one per question, from Step 5c):
  ```markdown
  ## Q1 — Inputs

  **Reasoning shown:** <2–3 options laid out for the user>
  **Question:** <what was asked>
  **Answer:** <user's reply, verbatim>
  ```

- **Mid-checkpoint exchange** (from Step 5d):
  - Skill's summary of understanding in 3–6 bullets
  - User's corrections or additions

- **Revision sections** (if spec is re-run):
  ```markdown
  ## Revision — 2026-06-15

  [New questions and answers go here]
  ```
  The file is append-only; previous revisions are preserved.

**Format**: Markdown. Conversations are logged immediately after each Q/A pair (not batched) to survive interruption.

---

### 3. **specs/specs.md** — Spec Index

**Location**: `specs/specs.md`

**Purpose**: Navigable index of all spec folders.

**Contents**:
- List of all numbered spec folders (001_feature_name, 002_another_feature, ...)
- Each entry links to its folder's spec.md and interview.md

**Created by**: `specs-scaffold` skill (auto-invoked by specify in Step 2)

---

### 4. **specs/<N>_feature_name/** — Spec Folder

**Location**: `specs/<N>_feature_name/`

**Purpose**: Container for this spec's documents.

**Contents**:
- `spec.md` (main specification)
- `interview.md` (decision transcript)

**Created by**: `specs-scaffold` skill (auto-invoked by specify in Step 2)

---

### 5. **Git Branch** — Feature Spec Branch

**Branch name**: `feature/<slug>_spec` (e.g., `feature/url_shortener_spec`)

**Purpose**: Isolates spec work from other features. Once the spec is approved, this branch is merged to the main branch before implementation starts.

**Created by**: `specs-scaffold` skill (auto-invoked by specify in Step 2)

---

## Elicitation Angles (What the Skill Asks About)

The skill uses a checklist of requirement angles to decide what to ask:

### Requirements Angles

- **Who** — primary user/actor, secondary actors, anti-personas
- **Why** — underlying problem behind the request (solutions are often misframed)
- **What** — the capability itself (framed from user's perspective, not system internals)
- **Inputs** — format, validation rules, constraints, source
- **Outputs** — shape, status codes, side effects, persistence
- **When** — triggers, lifecycle events, frequency, scheduling
- **User journeys** — which flows matter; which one is P1 (MVP)?
- **Edge cases** — empty input, malformed input, concurrent access, boundary values, partial failure
- **Integration** — what external systems or existing features does this touch?
- **Non-functional** — performance budget, security/privacy posture, accessibility, observability
- **Out of scope** — explicit non-goals for v1 (helps prevent scope creep)
- **Success criteria** — measurable outcomes (latency, completion rate, error budget, business metrics)

### What the Skill Does NOT Ask About

These belong to the `plan` skill, not `specify`. The skill skips questions about:

- Which database / framework / library / language feature
- REST vs GraphQL vs gRPC
- File layout, module boundaries, naming
- Sync vs async implementation, threading model
- Specific algorithms or data structures

**Test**: If the answer changes the *spec*, ask. If it only changes *how it's built*, skip.

---

## Quality Gates

Before handoff, the spec must satisfy all of these:

### 1. Constitutional Alignment
- All requirements respect project principles (from `.specify/memory/constitution.md`)
- Stack choices (database, framework, runtime) are constitutional or have an ADR
- Forbidden patterns are not required

### 2. INVEST Compliance (User Story Level)
Every user story must be:
- **I**ndependent: Implementable and testable on its own; does not silently depend on another story
- **N**egotiable: Captures user intent, not a frozen implementation (no library names, schema details, function signatures)
- **V**aluable: Delivers observable value to a real user or operator (state the "Why this priority")
- **E**stimable: Specific enough for a reader to size the work without further clarification
- **S**mall: Fits comfortably in one iteration; ideally one tightly scoped slice
- **T**estable: The *Independent Test* + acceptance scenarios describe something reproducible in a test runner

### 3. EARS Discipline (Statement Level)
Every acceptance scenario and functional requirement must use one of five EARS patterns:

| Pattern | Template | Example |
|---------|----------|---------|
| **Ubiquitous** | `System MUST <capability>` | "System MUST reject any URL whose scheme is not http or https" |
| **Event-driven** | `When <trigger>, System MUST <response>` | "When a client POSTs a valid URL, the service MUST respond HTTP 201 with the short code" |
| **State-driven** | `While <state>, System MUST <response>` | "While the database is read-only, System MUST reject all write requests" |
| **Unwanted-behavior** | `If <bad condition>, System MUST <defined response>` | "If the request body is missing long_url, the service MUST respond HTTP 400 with {error: '<reason>'}" |
| **Optional-feature** | `Where <feature is present>, System MUST <response>` | "Where rate limiting is enabled, System MUST respond HTTP 429 after 60 requests/min per IP" |

**Style rules**:
- Name a concrete subject (`the service`, `the web UI` — never "it")
- One requirement per statement (split any "and" that joins two distinct outcomes)
- Observable, measurable response (no "handles gracefully"; yes "returns HTTP 400 with body {...}")

### 4. Testability
- Every P1 acceptance scenario has a concrete trigger and observable response
- A reader could write a test from the scenario without asking clarifying questions
- No vague language like "works correctly", "feels responsive", "is reliable"

### 5. Measurability
- Success criteria include real numbers (latency p95 < 200ms, 99% success rate, etc.)
- Not vague terms: "fast", "reliable", "scalable"
- ≥3 success criteria covering user outcome, throughput, error rate, or business metrics

### 6. No Implementation Leakage
- No library names, database choices, file paths, algorithm specifics
- No deployment topology, containerization, or infrastructure concerns
- No internal module structure or naming

---

## Stop Condition — When to Stop Asking

The skill stops asking when **all three** are true:

1. **Every P1 acceptance scenario is testable** from current knowledge. You can write a concrete Given/When/Then scenario with a reproducible trigger and observable response.

2. **You can draft ≥3 measurable success criteria** with real numbers, not vague terms. E.g., "redirect p95 < 200ms", "99% success rate", "90% of users complete signup on first attempt".

3. **No major scope ambiguity remains.** You know what's NOT in v1, and the user has confirmed the boundary.

If any of these fails, ask one more targeted question. If all three pass, proceed to write the spec — even if minor angles remain unknown. Mark those as `[NEEDS CLARIFICATION: <what>]` in the spec.

**Hard cap**: ~8 questions unless the user invites more depth.

---

## Anti-Patterns — What the Skill Avoids

| Anti-pattern | Why it's bad | What to do instead |
|--------------|-------------|-------------------|
| Asking implementation questions | "Should we use Redis or SQLite?" | Skip; that's for the plan skill |
| Asking everything in one turn | User has to context-switch 4 times | Ask one question per turn; mid-checkpoint after 3–5 |
| Vague open-ended questions | "What else should I know?" | Use mid-checkpoint: mirror back bullets + invite corrections |
| Leading questions | "You want HTTP 201, right?" | Frame as "two common choices" and let them pick |
| Jumping straight to questions | Missing the "restate" step | Always restate first; catches misreads before they cement |
| Asking past the stop condition | Wasting turns on minor details | Write the spec once stop condition passes; mark remaining unknowns `[NEEDS CLARIFICATION]` |

---

## Handoff Checklist

Once the spec is written, the skill:

1. Points at both files in the folder:
   - `spec.md` — the contract
   - `interview.md` — the Q/A transcript that produced it

2. Asks the user to:
   - **Read `spec.md` end-to-end before approving.** This is the contract for everything that follows.
   - *(Recommended)* Run the `constitution-check` skill to audit the spec against the project constitution.
   - Run the `plan` skill to translate this spec into a technical plan.

3. Does **not** proceed automatically.

---

## Output Artifacts Summary Table

| Artifact | Location | Purpose | Owner |
|----------|----------|---------|-------|
| **spec.md** | `specs/<N>_feature/spec.md` | The contract: testable requirements, acceptance criteria, success metrics | specify skill |
| **interview.md** | `specs/<N>_feature/interview.md` | Decision log: Q/A transcript showing why each requirement is shaped as it is | specify skill |
| **specs/specs.md** | `specs/specs.md` | Index of all spec folders, cross-referenced | specs-scaffold (auto-invoked) |
| **specs/<N>_feature/** | `specs/<N>_feature/` | Folder containing spec.md + interview.md | specs-scaffold (auto-invoked) |
| **Git branch** | `feature/<slug>_spec` | Feature branch for this spec (created by specs-scaffold) | specs-scaffold (auto-invoked) |

---

## References

- **Skill definition**: `.claude/skills/specify/SKILL.md`
- **Spec template**: `.specify/templates/spec.template.md`
- **Elicitation angles & dialog patterns**: `.claude/skills/specify/references/elicitation.md`
- **INVEST + EARS patterns**: `.claude/skills/specify/references/user-stories.md`
- **Project constitution**: `.specify/memory/constitution.md`
