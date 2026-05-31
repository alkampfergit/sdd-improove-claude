# Elicitation playbook

Detailed methodology for Step 5 of the `specify` skill — surfacing assumptions through structured conversation. The skill body has the 5-substep spine (restate → triage → ask → checkpoint → stop). This file has the depth: angle checklist, example questions, dialog patterns, anti-patterns.

## The angles

The brief is always underspecified. Before deciding what to ask, mentally walk every angle below. For each, mark **answered** (brief or constitution covers it), **implied** (you can infer with high confidence), or **unknown** (must ask). Only **unknown** angles become questions.

### Requirements angles

- **Who** — primary user/actor, secondary actors, anti-personas (who is this explicitly NOT for?)
- **Why** — the underlying problem behind the request. Solutions are often misframed; the stated feature may not be the best solution to the real problem.
- **What** — the capability itself, framed user-side (what they accomplish), not system-side (how it's built).
- **Inputs** — format, validation rules, constraints, source.
- **Outputs** — shape, status codes, side effects, persistence.
- **When** — triggers, lifecycle events, frequency, scheduling.
- **User journeys** — which flows matter, which one is the smallest viable slice (P1).
- **Edge cases** — empty input, malformed input, concurrent access, boundary values, partial failure.
- **Integration** — what external systems, services, or existing features does this touch?
- **Non-functional** — performance budget, security/privacy posture, accessibility, observability.
- **Out of scope** — explicit non-goals for v1 (auth? rate limiting? UI? admin tooling?).
- **Success criteria** — measurable outcomes that prove this works (latency, completion rate, error budget, business metric).

### What's NOT an elicitation angle

These belong to the `plan` skill, not `specify`. Do not ask:

- Which database / framework / library / language feature.
- REST vs GraphQL vs gRPC.
- File layout, module boundaries, naming.
- Sync vs async implementation, threading model.
- Specific algorithms or data structures.

Test: if the answer changes the *spec*, ask. If it only changes *how it's built*, skip.

## The 5-substep dialog shape

### 5a. Restate

Before any questions, restate the brief in one paragraph in your own words — including the inferred *why*. Ask "is this right?"

Half of bad specs come from a misread brief, not missing detail. Catching that here costs one turn and saves the entire rest of the conversation.

**Example:**

> Brief: *"I want to add a URL shortener."*
>
> Restate: *"My read: you want a service where a user submits a long URL and gets back a short token they can share, which then redirects to the original URL when visited. The underlying goal is probably making long URLs shareable in contexts with character limits (SMS, social, print). Is that the right shape?"*

The user can correct ("actually we want it for click tracking on marketing campaigns") and now the whole spec lands somewhere different.

### 5b. Triage

Silently walk the angle checklist. Mark each as answered / implied / unknown using the brief + restated understanding + constitution. Do not output this triage — it's a mental step that produces the question queue.

The constitution often resolves whole angles: if it says "Express + SQLite + JWT auth", you don't ask about auth mechanism. If it forbids sync I/O, you don't ask about that either.

### 5c. Ask, one at a time

For each unknown, in rough priority order:

1. Identify the question.
2. Briefly reason about 2–3 likely options (defaults, tradeoffs). Show the reasoning so the user can confirm, correct, or redirect.
3. End with a single clear question.
4. Leave the answer open — the user's own answer is always valid, not just your options.

**Cap:** aim for 3–7 questions for a typical feature. If you find yourself approaching 10 without a checkpoint, you're either probing implementation (drop those) or you need to mid-checkpoint (next step).

### 5d. Mid-checkpoint

After ~3-5 questions, mirror back the working understanding in 3–6 bullets and invite corrections or additions in one open prompt:

> *"Here's what I've got so far:*
> - *Input: JSON POST with `long_url`*
> - *Output: 201 with short code, 400 on bad URL*
> - *No auth, no rate limiting in v1*
> - *Success means a user gets a usable short URL in under 200ms*
>
> *Anything missing or wrong before I keep going?"*

This elicits more in one prompt than three narrow questions would, without feeling like an interrogation.

### 5e. Stop condition

You have enough when **all three** are true:

1. Every P1 acceptance scenario you'll write is testable from current knowledge (concrete trigger, observable response).
2. You can draft ≥3 measurable success criteria with real numbers, not "fast" or "reliable".
3. No major scope ambiguity remains (you know what's NOT in v1).

If any of these fails, ask one more question targeted at the gap. If all three pass, stop and proceed to Step 6 of the skill — even if angles remain "unknown" but non-blocking. Mark those as `[NEEDS CLARIFICATION: ...]` in the spec.

Hard cap: ~8 questions unless the user invites more depth.

## Example question shapes

Use these as patterns — adapt the wording to context. The reasoning-before-question structure is what matters.

**Inputs:**

> *URLs can arrive in many shapes — raw strings, JSON objects with metadata, form uploads. Most APIs settle on JSON POST with a single `long_url` field plus optional fields like custom alias or expiry. What's the input shape you have in mind, and which optional fields should v1 support?*

**Edge cases:**

> *Three common edges for a shortener: (1) the same long URL submitted twice — return the existing code or mint a new one? (2) an invalid URL — reject hard or try to normalize? (3) a code collision — retry silently or surface an error? Which way do you want each of these to go?*

**Out of scope:**

> *Shorteners typically grow features over time: custom aliases, expiry, click analytics, password-protected links, team workspaces, API keys. For v1, which of these are in, and which are explicitly out so we don't accidentally design for them?*

**Success criteria:**

> *For success, two dimensions usually matter: latency (how fast a redirect resolves — common targets are p95 under 100ms or 200ms) and completion (what fraction of submitted URLs become usable short links — usually 99%+). What numbers should we hold this to?*

## Anti-patterns

**Asking implementation:**

> ✗ *"Should we use Redis for the URL → code lookup, or just SQLite?"*

That's a plan question. Spec doesn't care about storage engine.

**Asking everything in one turn:**

> ✗ *"What's the input format, what status codes do you want, what edge cases matter, and what's your latency target?"*

User has to context-switch four times. They'll answer the easiest one and forget the rest.

**Vague open question:**

> ✗ *"What else should I know?"*

No frame, no defaults. User has nothing to push against. Use mid-checkpoint format instead (mirror + invite).

**Leading question:**

> ✗ *"You want HTTP 201 on creation, right?"*

You've already decided. The user will rubber-stamp it. Frame as "two common choices" and let them pick.

**Forgetting to restate:**

> ✗ Jumping straight to "what's the input format?" without confirming you understood the feature.

If you misread the brief, every subsequent question is worse than wasted — it cements the misread.

**Probing past the stop condition:**

> ✗ Asking question 11 when stop condition already passed at question 6.

Once you can write a testable spec, write it. Remaining unknowns become `[NEEDS CLARIFICATION]` markers — they don't all need answers up front.
