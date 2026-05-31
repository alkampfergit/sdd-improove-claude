# Feature Specification: [FEATURE NAME]

[↑ Back to specs index](../specs.md)

**Feature Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft
**Input**: "$ARGUMENTS"

## User Scenarios & Testing

> Stories are prioritized (P1 highest). Each must be **independently testable** — implementing one story alone should still deliver a usable slice.
> Each story must satisfy **INVEST**: Independent, Negotiable, Valuable, Estimable, Small, Testable.

### User Story 1 — [Brief Title] (Priority: P1)

[One-paragraph user journey in plain language.]

**Why this priority**: [Value + why it ranks here.]

**Independent Test**: [How this story can be verified on its own.]

**Acceptance Scenarios**:

> Each scenario names a concrete **subject** (`the service`, `the web UI` — never "it"), a reproducible **trigger** in the *When*, and an **observable response** in the *Then* (status code, body, persisted state, UI element). One trigger, one response per scenario. No "handles gracefully" / "works correctly".

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 — [Brief Title] (Priority: P2)

[Journey.]

**Why this priority**: [...]

**Independent Test**: [...]

**Acceptance Scenarios**:

1. **Given** [...], **When** [...], **Then** [...]

---

<!-- Add more stories as needed, each with a priority and acceptance scenarios. -->

### Edge Cases

> Frame each as EARS unwanted-behavior: `If <bad condition>, System MUST <defined response>`.

- [Boundary condition or error scenario]
- [Boundary condition or error scenario]

## Requirements

### Functional Requirements

> Write each requirement in **EARS** notation, using **MUST** consistently throughout this document (the EARS "shall" — pick one verb and don't mix):
> - `System MUST <response>` — **ubiquitous** (invariant always true)
> - `When <trigger>, System MUST <response>` — **event-driven** (most requirements)
> - `While <state>, System MUST <response>` — **state-driven** (conditional on a sustained state)
> - `If <bad condition>, System MUST <defined response>` — **unwanted-behavior** (error/failure cases)
> - `Where <feature is present>, System MUST <response>` — **optional-feature** (config/build variant)
>
> Name a concrete subject and an observable, measurable response. One requirement per statement — split any "and" joining two distinct outcomes.

- **FR-001**: System MUST [capability].
- **FR-002**: Users MUST be able to [interaction].
- **FR-003**: System MUST [data/behavior requirement].

> Mark unknowns explicitly: `[NEEDS CLARIFICATION: <what is unclear>]`.

### Key Entities *(if the feature involves data)*

- **[Entity]**: [What it represents; key attributes; relationships.]

## Success Criteria

Measurable, technology-agnostic outcomes.

- **SC-001**: [e.g., "User completes signup in under 2 minutes."]
- **SC-002**: [e.g., "System sustains 1000 concurrent users with p95 < 300 ms."]
- **SC-003**: [e.g., "90% of users complete the primary task on first attempt."]
