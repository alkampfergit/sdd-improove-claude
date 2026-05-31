# User Story Quality: INVEST + EARS

Reference for the `specify` skill. Two complementary criteria govern how
user stories are shaped and how the statements inside them are written:

- **INVEST** — a *story-level* quality check. Applies to each user story as a whole.
- **EARS** — a *statement-level* notation. Applies to every requirement or
  acceptance criterion written inside (or alongside) a story.

A spec is well-formed when **every** story passes INVEST **and** the
requirement/acceptance statements inside it use EARS (or its
Given/When/Then equivalent — see the mapping below).

## Contents

- [INVEST — criteria for a good user story](#invest)
- [EARS — notation for requirement statements](#ears)
- [Mapping EARS to Given/When/Then](#mapping-ears-to-given-when-then)
- [Checklist before you save a story](#checklist)

## INVEST

INVEST is a six-letter checklist for the story as a whole. If any letter
fails, the story is the wrong shape — rewrite, split, or merge before
moving on.

| Letter | Stands for | What it means here | How to check |
|---|---|---|---|
| **I** | Independent | The story can be delivered, tested, and shipped on its own — it does not silently depend on another story. | Can you implement *only* this story and still have something testable and valuable? If not, the story is coupled — split or merge. |
| **N** | Negotiable | The story captures the user intent, not a frozen implementation. Details can still shift during planning. | The story should not name specific libraries, schemas, or function signatures. Those belong in the plan. |
| **V** | Valuable | The story delivers observable value to a real user or operator. | Name the user (end user, admin, automated client). State the value in the *Why this priority* field. If no one would notice it shipping, it is not a story. |
| **E** | Estimable | A reader can roughly size the work without further clarification. | If the team would have to ask "what does X mean?" before estimating, the story is too vague. Add specifics or push the unknown to a `[NEEDS CLARIFICATION]` marker. |
| **S** | Small | The story fits comfortably inside one release/iteration; ideally one tightly scoped slice. | Rule of thumb: each story translates to a handful of tasks, not dozens. If it is too big, split by user journey, by happy-path vs. edge-case, or by surface (API vs. UI). |
| **T** | Testable | There is a concrete, observable check that proves the story works. | The *Independent Test* field plus the acceptance scenarios must describe something you could put in a test runner. "Then it feels good" is not testable. |

**Common failures and how to fix them:**

- *Not Independent*: "Story B can only be tested after Story A ships." → Either fold B into A, or make B testable in isolation (e.g. seed fixtures instead of depending on A's create path).
- *Not Valuable*: "Refactor the routing layer." → That is a task, not a story. Find the user-visible outcome it enables and write that as the story.
- *Not Small*: "User can use the full admin panel." → Split per panel feature.
- *Not Testable*: "System should be reliable." → Replace with a measurable success criterion (SC-xxx) and concrete acceptance scenarios.

## EARS

EARS (Easy Approach to Requirements Syntax) is a small set of templates
for writing single, unambiguous requirement statements. Every
acceptance criterion or functional requirement should match one of
these five patterns. If a sentence does not fit any of them, it is
probably ambiguous and should be rewritten.

| Pattern | Template | When to use | Example |
|---|---|---|---|
| **Ubiquitous** | *The `<system>` shall `<response>`.* | An invariant that is always true. | *The service shall reject any `long_url` whose scheme is not `http` or `https`.* |
| **Event-driven** | *When `<trigger>`, the `<system>` shall `<response>`.* | A discrete external event causes a response. **Most acceptance scenarios use this form.** | *When a client POSTs a valid URL to `/api/v1/links`, the service shall respond HTTP 201 with the short URL and code.* |
| **State-driven** | *While `<state>`, the `<system>` shall `<response>`.* | The behavior is conditional on a sustained state. | *While the `ADMIN_SECRET` env var is unset, the service shall refuse to start.* |
| **Unwanted-behavior** | *If `<unwanted condition>`, then the `<system>` shall `<response>`.* | A failure or error case that must produce a defined response. | *If the request body is missing `long_url`, then the service shall respond HTTP 400 with `{"error": "<reason>"}`.* |
| **Optional-feature** | *Where `<feature is present>`, the `<system>` shall `<response>`.* | Behavior only applies in a configuration/build variant. | *Where rate limiting is enabled, the service shall respond HTTP 429 after 60 requests per minute per IP.* |

Statements may be combined (e.g. "When *X* and while *Y*, the system shall *Z*") for **complex** requirements — but prefer one trigger per statement when possible.

**Style rules for EARS statements:**

- Name the **subject** (`the service`, `the web UI`) — never "it" or "the system" if multiple systems are in play.
- Use **shall** for normative force in EARS; the spec template's functional requirements equivalently use **MUST**. Pick one and stay consistent inside a single document.
- One requirement per statement. If you find an "and" joining two distinct outcomes, split into two requirements.
- Observable, measurable response. "Shall handle gracefully" is not a response; "shall respond HTTP 400 with body `{...}`" is.

## Mapping EARS to Given/When/Then

The spec template asks for acceptance scenarios as **Given/When/Then**.
G/W/T is functionally a scenario-flavored rendering of EARS:

| EARS field | G/W/T field |
|---|---|
| precondition / state | **Given** `<initial state>` |
| `When <trigger>` | **When** `<action>` |
| `the <system> shall <response>` | **Then** `<expected outcome>` |

Therefore:

- Write **acceptance scenarios** as Given/When/Then (matches the template).
- Write **functional requirements (FR-xxx)** in EARS-flavored MUST form
  (matches the template's `System MUST …` style — equivalent to EARS
  ubiquitous/event-driven/unwanted patterns).
- Either way, the **EARS discipline still applies**: name the subject,
  make the trigger concrete, make the response observable.

## Checklist

Before saving a user story, walk this list:

- [ ] **I** — Implementable and testable on its own, without any other story.
- [ ] **N** — Captures user intent, not a fixed implementation.
- [ ] **V** — Names the user and the value; *Why this priority* is filled in.
- [ ] **E** — Specific enough to estimate; unknowns marked `[NEEDS CLARIFICATION]`.
- [ ] **S** — Fits one iteration; large stories split by journey, surface, or happy/edge.
- [ ] **T** — *Independent Test* describes a runnable check.
- [ ] Every acceptance scenario fits one of the EARS patterns (typically event-driven), rendered as Given/When/Then.
- [ ] Each scenario names a concrete subject, trigger, and observable response — no "handles gracefully", no "works correctly".
