---
name: constitution
description: Generate a project constitution from a brief description. Captures slow-changing principles, stack rules, forbidden patterns, and testing standards. Use once per project before any spec is written. Re-run only when the project changes direction. Output goes to .specify/memory/constitution.md.
---

# Constitution skill

Create the project's constitution — a markdown document at `.specify/memory/constitution.md` that captures the non-negotiables governing every spec, plan, and task that follows.

The constitution is the **slow-changing layer**. AGENTS.md changes when build commands change. The constitution changes only when the project changes direction. Treat amendments as ADR territory.

## Process

### Step 1 — Read the room first

Before asking the user anything, look around. Most "obvious" answers are already on disk:

- Read `AGENTS.md`, `CLAUDE.md`, or `README.md` at the repo root if they exist
- Skim `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod` for stack hints
- Glance at the directory layout for architectural cues

Don't ask the user about anything you can already see.

### Step 2 — Ask only what you can't infer

Ask **one to three focused questions per turn**. Never dump a whole questionnaire. Cover only the gaps:

- **Purpose** — one to three sentences. What does this project do? Who is it for?
- **Stack details that aren't obvious** — versions, key library choices, target deployment.
- **Architectural style** — library-first / monolith / serverless / microservices / something else.
- **Forbidden patterns** — what must this project NEVER do? (e.g. "no synchronous I/O in route handlers", "no external databases beyond SQLite", "no client-side rendering")
- **Testing minimum** — unit only? unit + integration? characterization tests for legacy seams?

If the user gave you a brief at invocation time, use it as input. Don't re-ask things they already told you.

### Step 3 — Push back when something contradicts

- "No auth" + multi-tenant data → flag the contradiction.
- "Serverless deployment" + "SQLite for persistence" → flag the contradiction (SQLite needs persistent local disk).
- "Test-first" + "no testing infrastructure" → flag the contradiction.

If the user can't name any forbidden patterns, don't invent. Write `TBD — add via ADR` and move on.

### Step 4 — Write the file

Output to `.specify/memory/constitution.md`. Use this structure:

```markdown
# Project Constitution[ — <name>]

> The non-negotiables of this project. Slow-changing. Modify only via ADR.

<optional 1–2 sentence framing paragraph: what this project is and the spirit of the rules below — include only if it adds context the principles don't already carry>

## Principles

- **<short name>.** <one or two sentences explaining what and why>
- ... (3 to 6 total — fewer is better than more)

## Stack

- **Runtime:** <language and version>
- **Framework:** <if applicable>
- **Persistence:** <if applicable>
- **Testing:** <runner and key libraries>
- ... (other rows as appropriate)

## Forbidden

- **<pattern>.** <one sentence on what it means in practice>
- ... (3 to 8 items)

## Testing standards

- <rule about test types and structure>
- <rule about CI gate — e.g. "npm test must exit 0 before commit">
- <rule about naming or coverage>
```

Keep bullets short; bold the lead phrase so readers can scan. If the user didn't give the project a name, drop the `— <name>` suffix entirely rather than inventing one.

### Step 5 — Link the constitution from the host tool's memory file (tool-agnostic)

A constitution the coding agent never loads is wasted work. After writing the constitution, **you must** ensure the main memory file of whichever AI coding tool is in use references `.specify/memory/constitution.md`. This step is mandatory — do not skip it, even if the user did not explicitly ask.

**Detect existing memory files** by checking the repo root (and a couple of well-known subpaths) for each of these. Multiple may coexist:

| Tool | Memory file | Import syntax |
|------|-------------|---------------|
| OpenAI Codex CLI / generic cross-tool | `AGENTS.md` | `@.specify/memory/constitution.md` |
| Claude Code | `CLAUDE.md` | `@.specify/memory/constitution.md` |
| Gemini CLI | `GEMINI.md` | `@.specify/memory/constitution.md` |
| Cursor | `.cursor/rules/*.mdc` or `.cursorrules` | plain reference (no native import) |
| GitHub Copilot | `.github/copilot-instructions.md` | plain reference (no native import) |
| Aider | `CONVENTIONS.md` | plain reference (no native import) |
| Windsurf | `.windsurfrules` | plain reference (no native import) |

**For every memory file that exists**, ensure it contains a reference to the constitution. Be idempotent — if a reference already exists (in any form), leave it alone. Otherwise:

- **Tools that support `@import`** (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`): append (or insert near the top, before day-to-day notes) a section:

  ```markdown
  ## Project constitution

  @.specify/memory/constitution.md
  ```

- **Tools without native import** (`.cursorrules`, `.github/copilot-instructions.md`, `CONVENTIONS.md`, `.windsurfrules`, `.cursor/rules/*.mdc`): append a section with an explicit instruction so the agent knows to read it:

  ```markdown
  ## Project constitution

  Before planning or writing code, read [.specify/memory/constitution.md](.specify/memory/constitution.md). It defines the slow-changing rules of this project — principles, stack, forbidden patterns, and testing standards. Everything you produce must comply with it.
  ```

**If no memory file exists**, create `AGENTS.md` at the repo root (it is the most broadly supported cross-tool convention) with this minimal stub:

```markdown
# AGENTS.md

Operational context for coding agents working in this repository.

## Project constitution

@.specify/memory/constitution.md

The constitution is the slow-changing layer — principles, stack, forbidden patterns, testing standards. Always load and comply with it before planning or coding. For agents whose harness does not resolve `@` imports, treat the line above as: read `.specify/memory/constitution.md` first.

## Day-to-day

<add build / test / run commands and file-layout notes here as the project grows>
```

Report back to the user every memory file you touched (or created) and the exact line/section added.

### Step 6 — Hand off

After writing the constitution and wiring it into the host tool's memory file, tell the user what you did and offer two next steps:

1. Review the memory file(s) you updated — they're the entry point coding agents will see.
2. Run the `specify` skill to scope the first feature.

Do not run either automatically.

## What this skill is NOT for

- Per-feature requirements — use `specify`
- Implementation details — use `plan`
- Day-to-day operational facts (`npm test`, file layout) — those go in AGENTS.md
- Anything that changes weekly — that's not constitutional

## Example brief that should produce a clean constitution

> *"Build a URL shortener service in Node.js. Express + SQLite + better-sqlite3. Deployable to Azure App Service Linux, Node 20 runtime. No auth, no UI. Library-first design — business logic separate from HTTP layer."*

That brief is enough to write a 30-line constitution with at most one or two clarifying questions (likely about testing and forbidden patterns).
