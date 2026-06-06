---
name: tasks
description: Take a plan.md and produce tasks.md with atomic tasks (T-01, T-02, ...) that can each be completed in 30 to 60 minutes. Each task has files touched, an acceptance test name, and explicit dependencies. Output goes to specs/<feature-name>/tasks.md.
---

# Tasks skill

Decompose a plan into atomic units of work. The output is a markdown document at `specs/<feature-name>/tasks.md` that drives the implementer through the feature one task at a time.

## Process

### Step 1 — Read the plan and the spec

Read `specs/<feature-name>/plan.md` and `specs/<feature-name>/spec.md`. You need both — the plan tells you the design, the spec tells you the acceptance criteria each task should satisfy.

If either is missing, stop and tell the user. Don't try to decompose without them.

### Step 2 — Decompose into atomic tasks

Break the plan into atomic tasks. Each task must:

- Be **completable in 30 to 60 minutes** for an AI-assisted developer
- Have **clear inputs and outputs** — no "and various other things"
- Touch a **scoped set of files** — don't bundle unrelated changes
- Have **one named acceptance test** that proves it works
- List **dependencies on previous task IDs** explicitly

Heuristics:

- If a task is too big (more than 60 minutes), split it. The most common split is library code from HTTP code: T-N is "the function," T-N+1 is "the endpoint that calls the function."
- If a task is trivially small (less than 15 minutes of real work), fold it into a neighbor.
- The first task is almost always "project skeleton + test config" so the rest of the tasks have something to build on.
- If the plan involves deployment, the last task is a deploy task. Its acceptance test is usually manual (a curl against a live URL).

### Step 3 — Order topologically

Tasks form a DAG. Rules:

- **T-01 has zero dependencies** — it can start immediately
- **Each subsequent task depends on tasks that come before it** (not after)
- **No cycles** — if you find one, the decomposition is wrong
- **Tasks that share the same file should usually be ordered**, even if logically independent, to avoid merge conflicts

Tasks that are genuinely parallel (different files, no shared state) can be marked as parallel-safe in the dependency line.

### Step 4 — Cite the EARS criterion each task verifies

For each task, identify which spec criterion(criteria) the acceptance test exercises. Reference them in the task's "Done when" line. This closes the loop spec → tasks → tests, so the verifier can later trace each criterion to a passing test.

Not every task verifies a criterion (e.g. "project skeleton" doesn't verify any A-ID), and that's fine. Just don't omit it where it does apply.

### Step 5 — Ask only when truly stuck

The plan should give you everything you need. Ask the user only if:

- A task's scope is genuinely ambiguous from the plan
- The plan is silent on something that prevents decomposition (rare — if this happens, the plan probably needs revision before tasks)

Don't ask for confirmation of every task. Don't ask the user to choose IDs. Just write the file.

### Step 6 — Write the file

Output to `specs/<feature-name>/tasks.md` with this structure.

Every task **must** lead with a checkbox (`- [ ]`). This is the execution marker: the implementer flips it to `- [x]` once the task is done. It uses GitHub task-list syntax so it renders as a real, tickable checkbox and gives an at-a-glance view of progress through the feature. Always emit it unchecked (`- [ ]`) — writing tasks is not the same as executing them.

**Do not commit to git.** Write `tasks.md` to disk and stop there — no `git add`, no `git commit`, no branch creation. Committing the artifact is the user's call; they may want to review or edit `tasks.md` first. Even if the user's request implied "finish the tasks step," that does not include a commit. Leave the file as an uncommitted working-tree change.

```markdown
# Tasks: <Feature Name>

> Atomic units of work, each completable in 30 to 60 minutes. Tests named here match files under `tests/`. Implement in topological order. Each task starts with a `- [ ]` checkbox — flip it to `- [x]` when the task is executed (acceptance test passing, work committed).

## T-01 — <imperative title>

- [ ] **Executed** — tick when `T-01`'s acceptance test passes and the work is committed
- **Files touched:** `<comma-separated list of files>`
- **Acceptance test:** `<test file name>` — <what it asserts in one line>
- **Depends on:** (none) | T-XX[, T-YY]
- **Done when:** <one-line definition of done, citing spec criterion IDs where applicable>

## T-02 — <title>

- [ ] **Executed** — tick when `T-02`'s acceptance test passes and the work is committed
- **Files touched:** ...
- **Acceptance test:** ...
- **Depends on:** ...
- **Done when:** ...

## ...

## Dependency graph

```
T-01 ─┬─ T-02 ──┐
      │         │
      └─ T-03 ──┴─ T-04 ── T-05 ── ...
```
```

### Step 7 — Evaluate the round

Before handing off, spawn the **`sdd-evaluator` subagent** (via the Agent tool, `subagent_type: "sdd-evaluator"`) to independently score the completed round — `spec.md` + `plan.md` + the `tasks.md` you just wrote. It runs in a fresh context, so it catches gaps your own context is blind to. Pass it the feature folder path and ask for scores, blocking problems, and concrete improvements.

Relay its findings to the user. If it flags blocking problems in `tasks.md`, fix them and re-evaluate before handing off. The evaluator is read-only — it never edits the artifacts, so any fixes are yours to make.

### Step 8 — Hand off

Tell the user the task list is written to `specs/<feature-name>/tasks.md` as an **uncommitted** change (you did not commit it — see Step 6), summarize the `sdd-evaluator` result, and offer:

1. **Review T-01.** Does it have zero dependencies and a clear acceptance test? If yes, ready to implement.
2. Recommended: run the `constitution-check` skill on `tasks.md` before starting implementation — it audits each task's acceptance test against spec FR/SCs and catches "good hygiene" additions (placeholder endpoints, premature files, defensive scaffolding) that the tasks-writing model added without a spec citation.
3. **Implement T-01 with the test-first loop:** ask the agent to write the failing test, run it, confirm it fails, then ask the agent to make it pass without changing the test, run again, commit. Then **flip that task's `- [ ]` checkbox to `- [x]` in `tasks.md`** so the file always reflects what has actually been executed. Repeat for T-02, T-03, ...

The checkbox is the single source of truth for progress: a task is only ticked once its acceptance test passes and the work is committed — never before. Anyone opening `tasks.md` can see at a glance which tasks remain.

## What this skill is NOT for

- Writing the implementation — that's a separate, task-by-task loop with the test-first cycle. Don't bundle implementation into the tasks file.
- Re-deriving acceptance criteria — those came from the spec. Tasks reference them, they don't redefine them.
- Architectural decisions — those should already be in the plan. If a task forces an architectural decision, the plan was incomplete.

## Example: a well-scoped task

```
## T-04 — API: POST /api/v1/links

- [ ] **Executed** — tick when `T-04`'s acceptance test passes and the work is committed
- **Files touched:** `src/routes.js`, `tests/create.test.js`
- **Acceptance test:** `tests/create.test.js` — covers A1: 201 + short_code + long_url returned, short_code ≥ 6 chars, two posts of the same URL get different codes
- **Depends on:** T-02, T-03
- **Done when:** A1 is satisfied with all three sub-cases passing
```

Compare to a poorly-scoped task:

```
## T-04 — Build the API

- [ ] **Executed**
- **Files touched:** lots
- **Acceptance test:** various
- **Depends on:** previous tasks
- **Done when:** everything works
```

The first one carries an execution checkbox, names files, names the test, lists dependencies, ties to a spec ID. The second is a wishlist. Always write the first kind.
