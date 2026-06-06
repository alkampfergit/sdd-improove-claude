---
name: implement
description: Execute a tasks.md, one task at a time in dependency order — verify each task's named acceptance test exists, implement the task, run the build/compile and the full test suite, and only on green commit the task and tick its checkbox. Also parses the dependency graph and shared files to report which tasks are parallel-safe. The fourth step of the spec-driven-development flow, after specify, plan, and tasks. Manually invoked. Operates on specs/<feature-name>/tasks.md.
disable-model-invocation: true
user-invocable: true
---

# Implement skill

Turn a `tasks.md` into working, committed, test-backed code — task by task. This is the fourth and final SDD step: `specify` answered WHAT, `plan` answered HOW, `tasks` broke the HOW into atomic units, and `implement` executes those units under a test-and-build gate.

The contract is already written. Your job is not to re-decide anything — it's to execute the task list faithfully, prove each task with its named test, keep the suite and build green, and leave an honest trail of commits and ticked checkboxes.

Three things this skill takes seriously, because they are where implementation usually goes wrong:

- **Tests must actually exist.** A task is not done because the code "looks right." It's done because the acceptance test the task names exists, runs, and passes. A missing or stubbed test is a red flag, not a detail.
- **Compilation and the suite gate every commit.** The constitution says `npm test` must exit 0 before any commit. Nothing gets committed and no checkbox gets ticked while the build is broken or the suite is red.
- **Parallelism is computed from the graph, not guessed.** Tasks that don't depend on each other and don't touch the same files are parallel-safe. This skill reports those waves so the human can see the critical path — even though it then executes them serially.

## Process

### Step 1 — Read the inputs

Read, in this order:

1. `.specify/memory/constitution.md` — the rules the code must not break (stack, forbidden patterns, **testing standards**, the `npm test` exit-0 gate).
2. `specs/<feature-name>/tasks.md` — the work to execute. This is the spine of the whole run.
3. `specs/<feature-name>/plan.md` — the design each task implements. Consult it whenever a task's "how" is not obvious from its title.
4. `specs/<feature-name>/spec.md` — the acceptance criteria (FR/SC IDs) the tasks cite in their "Done when" lines.
5. `CLAUDE.md` — operational conventions: the actual build, test, and lint commands; file layout.

If `tasks.md` does not exist, stop and tell the user to run the `tasks` skill first. Do not invent a task list — implementing against an unwritten contract is exactly what SDD exists to prevent.

If there are multiple feature folders, ask which one (or take the one named at invocation).

### Step 2 — Parse the task list into a model

Read every task in `tasks.md` and extract, for each:

- **ID** (`T-01`, `T-02`, …)
- **Checkbox state** — `- [ ]` (pending) or `- [x]` (already executed)
- **Files touched**
- **Acceptance test** — the named test file and what it asserts, or "manual" for tasks verified by hand (e.g. a `curl` against a live process, a UI check)
- **Depends on** — the predecessor task IDs, or "(none)"
- **Done when** — the definition of done and the FR/SC IDs it cites

Already-checked (`- [x]`) tasks are done — skip them, but keep them in the model because later tasks depend on them. The checkbox is the single source of truth for progress; trust it, and never re-run or re-commit a task that's already ticked.

Cross-check the `Depends on` lines against the `## Dependency graph` block at the bottom of `tasks.md`. If they disagree, the task list is internally inconsistent — surface it to the user before executing, because a wrong dependency means a wrong build order.

### Step 3 — Compute and report the parallelism waves

Before implementing anything, analyze the graph and show the user the **execution waves** — the batches of tasks that *could* run at the same time. This is the single most useful view the skill produces: it reveals the critical path and how much of the work is independent.

Two tasks are **parallel-safe** when **both** hold:

1. **No dependency between them** — neither is in the other's transitive `Depends on` set.
2. **Disjoint files** — their `Files touched` sets do not overlap. Tasks that share a file (even logically independent ones — `tasks.md` flags these as "sequential by design — shares X") must be serialized to avoid clobbering each other.

Compute waves greedily, Kahn-style:

- **Wave 1** = every pending task whose dependencies are all already executed (ticked, or completed earlier in this run).
- Within that ready set, drop any task that shares a file with another task already placed in the wave; defer it to a later wave. The result is a conflict-free batch.
- Mark those tasks executed, recompute the ready set, and form the next wave. Repeat until every pending task is placed.

Present the waves as a short list — wave number, the task IDs in it, and a one-line "why these are independent" (or "serial: shares `<file>` with `T-NN`"). Call out the **critical path** (the longest dependency chain) since that's the real floor on completion.

Then state plainly: **execution will proceed serially in topological order** (this skill reports parallelism but does not fan out into concurrent subagents). The waves are the map; the serial order is the route. Within a wave, implement in ascending task-ID order.

See the worked example at the end of this file for what a good wave report looks like.

### Step 4 — Implement each task, in order, under the gate

Walk the tasks in topological order (respecting the waves' ordering; ascending ID within a wave). For each pending task, run this loop. Do **not** move to the next task until the current one is green and committed — a half-finished task left behind poisons everything downstream.

**4a. Confirm the acceptance test exists — write it if it doesn't.**
Open the test file the task names. The test that proves this task must exist and must actually exercise the behavior in the "Acceptance test" line — not a `TODO`, not an empty `it.skip`, not an assertion-free stub. If it's missing or hollow, write it first, from the task's acceptance line and the spec criteria (FR/SC IDs) in "Done when". The test encodes the contract; writing it first keeps the implementation honest.

For tasks whose acceptance test is **manual** (a `curl` round-trip, a UI interaction, a build-output check), there's no file to assert on. Carry out the manual steps yourself where the environment allows, capture the observed result (status code, `Location` header, rendered output), and report it. If the environment can't run the manual check, say so explicitly rather than ticking the box on faith.

**4b. Implement the task — only the files it names.**
Write the code to satisfy the task, touching the `Files touched` set and not wandering outside it. The design is the plan's job; respect the constitution's principles (e.g. library-first core, no business logic in route handlers) as you write. If implementing the task correctly requires touching a file the task doesn't list, that's a signal the task list was wrong — note it and tell the user rather than silently expanding scope.

**4c. Compile / build.**
Run the project's build or typecheck command (from `CLAUDE.md` / `package.json` — e.g. `npm run build`, or `tsc --noEmit` for a TypeScript project). For a plain-Node project with no build step, at minimum confirm the changed modules load without a syntax/import error. A task whose code doesn't compile is not done, no matter what the tests say.

**4d. Run the full test suite — not just the new test.**
Run `npm test` (or the project's test command). Run the **whole** suite, not only the file you just touched: the point of the gate is to catch the task you just wrote breaking a task you finished an hour ago. The constitution is explicit — `npm test` must exit 0.

**4e. Gate.**
- **Green** (build succeeds *and* suite exits 0) → proceed to 4f.
- **Red** → fix it. Fix the implementation, not the test — if you find yourself weakening the acceptance test to get green, stop: either the test was right and the code is wrong, or the task/spec is wrong and the user needs to decide. Do not commit, do not tick the box, do not advance. If you can't get it green after honest effort, stop and report exactly what's failing with the output. A red suite blocks the commit, full stop.

**4f. Commit the task.**
Commit the task's changes with a message that names the task and what it did, e.g. `T-04: DB connection + schema migration`. End the commit message with the project's required trailer. One commit per task keeps the history aligned with the task list and makes a single task trivial to revert. (If not already on a feature branch for this work, create one before the first commit rather than committing to the default branch.)

**4g. Tick the checkbox.**
Flip that task's `- [ ]` to `- [x]` in `tasks.md` and save. The checkbox means exactly one thing: **the acceptance test passed and the work is committed.** Never tick it before 4f; never tick it on a red suite. After ticking, `tasks.md` should always reflect reality — anyone opening it sees precisely what's been executed.

Then move to the next task and repeat 4a–4g.

### Step 5 — Final verification

After the last task:

1. Run the full build and `npm test` one more time from a clean state — the final state must be green end-to-end, not just green task-by-task.
2. Confirm every task that was meant to be executed is now `- [x]`. If any remain `- [ ]`, say which and why (blocked, deferred, manual check not runnable here) — do not quietly leave them unexplained.
3. Spot-check coverage of the **testing standards** in the constitution: the core/library module has unit tests in isolation from HTTP and the DB; the API surface has integration tests against a throwaway DB. If a constitutional testing standard has no test behind it, flag it — a green suite that doesn't honor the standards is a false green.

### Step 6 — Hand off

Report to the user:

- **What ran:** the tasks executed this session, each with its commit and confirmed-passing test.
- **The wave map** from Step 3, so they can see how the work decomposed and what the critical path was.
- **Final gate state:** build + `npm test` both green (or exactly what's red and why).
- **Anything outstanding:** unticked tasks, manual checks that couldn't run here, or scope mismatches you hit in 4b.

Then offer:

1. Run the `verify` skill to confirm the feature behaves as specified by driving the real app (the test suite proves units; `verify` proves the running system).
2. Recommended: run `constitution-check` on the final diff to confirm the implementation didn't drift from the constitution (e.g. business logic that crept into a route handler).
3. Review the commit history against `tasks.md` — one commit per ticked task, in order.

## What this skill is NOT for

- **Re-planning or re-architecting.** If a task forces a design decision, the plan was incomplete — surface it; don't improvise a new architecture mid-implementation.
- **Editing the spec, plan, or acceptance tests to make things pass.** The test is the contract. Weakening it to get green defeats the entire point.
- **Decomposing work into tasks.** That's the `tasks` skill. This skill consumes `tasks.md`; it doesn't write it.
- **Fanning out into concurrent subagents.** It *reports* parallelism but executes serially, so the test-and-commit gate stays sequential and the history stays clean.
- **Committing on a red suite or ticking a box on faith.** Both break the one invariant the checkbox is supposed to guarantee.

## Example: a wave report for the URL Shortener tasks

Given the `tasks.md` dependency graph (T-01 → {T-02, T-04} → …), the parallelism analysis produces:

```
Wave 1: T-01                  — skeleton + test config (no deps)
Wave 2: T-02, T-04            — parallel-safe: core/url.js vs db/db.js, disjoint files, both depend only on T-01
Wave 3: T-03, T-05            — parallel-safe: core/code.js vs db/links-repo.js; T-03 after T-02, T-05 after T-04
Wave 4: T-06                  — service.createLink; joins core (T-02,T-03) + repo (T-05)
Wave 5: T-07, T-08            — parallel-safe: service (links-service.js) vs http (app.js); both after T-06
Wave 6: T-09                  — http redirect + list; after T-07 (service) and T-08 (app)
Wave 7: T-10                  — server entry point; after T-08, T-09
Wave 8: T-11                  — React SPA; after T-10
Wave 9: T-12                  — deploy smoke (manual); after T-11

Critical path: T-01 → T-02 → T-03 → T-06 → T-08 → T-09 → T-10 → T-11 → T-12  (9 of 12 tasks)
```

Note T-03 is serialized after T-02 (not parallel with it) because both touch `test/core.test.js` — "sequential by design" in the task list, exactly the shared-file rule from Step 3. The report shows the human that the 12 tasks collapse into a 9-deep critical path with three points where two tasks could proceed independently — then implementation runs them serially in ID order: T-01, T-02, T-04, T-03, T-05, T-06, T-07, T-08, T-09, T-10, T-11, T-12.
