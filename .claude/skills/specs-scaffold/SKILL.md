---
name: specs-scaffold
description: >
  Manages the specs/ folder structure for spec-driven development. Initializes
  the root index at specs/specs.md (plural — lists every spec), creates the
  next numbered subfolder (001_brief_description, 002_brief_description, ...)
   with a stub spec.md (singular) back-linked to the root, and lists what
   already exists. When adding a spec, first create or switch to
   feature/<slug>_spec before any writes so each spec lives on its own branch.
   Use when the user asks to "init specs", "scaffold specs folder", "add a
   new spec", "create the next spec folder", "new spec", "list specs", or
   "show spec folders". Does NOT write spec/plan/tasks content — that is
   owned by the specify, plan, and tasks skills which write into the folder
   this skill creates.
---

# specs-scaffold

This skill owns the *shape* of the `specs/` directory. It creates folders, the root index, and an empty stub `spec.md` inside each folder — it does not write spec content. Sibling skills (`specify`, `plan`, `tasks`) overwrite the stub `spec.md` and add `plan.md` / `tasks.md` next to it.

## Naming convention — read this first

Two distinct files, one character apart:

- **`specs/specs.md`** (plural) — the **root index**. Lists every spec in the project. Lives at the top of `specs/`.
- **`specs/NNN_slug/spec.md`** (singular) — the **per-spec file**. One per numbered subfolder. Created here as a stub; populated by the `specify` skill.

If you find yourself writing `specs.md` inside a numbered folder or `spec.md` at the root, stop — you've inverted the convention.

## Branch rule — do this before any writes

When running the `add` operation, the branch is part of the workflow, not an optional suggestion.

- Once the brief has been normalized to a slug, create or switch to `feature/<slug>_spec` before running `init`, creating folders, or editing `specs/specs.md`.
- Use the exact branch pattern `feature/xxx_name_spec`, where `xxx_name` is the normalized snake_case slug.
- If the branch does not exist yet, create it.
- If it already exists, switch to it.
- If the current branch has unrelated uncommitted changes that make switching unsafe, stop and ask the user how to proceed. Never stash, reset, or discard changes automatically.
- The goal is one spec branch per spec folder, so every new `specs/NNN_<slug>/spec.md` starts life on its own feature branch.

## Layout this skill maintains

```
specs/
├── specs.md                              # root index (plural), links to every subfolder
├── 001_brief_description/
│   └── spec.md                           # per-spec file (singular), back-links to ../specs.md
├── 002_another_feature/
│   └── spec.md
└── ...
```

- Numeric prefix is **three digits, zero-padded**, separated from the slug by an underscore.
- Slug is **snake_case** (lowercase, words separated by underscores, no punctuation).

## Operations

This skill supports three operations: `init`, `add`, `list`. Pick the one that matches the user's request.

### init

Use when the user asks to "init specs", "scaffold specs", "set up specs", or when `add`/`list` is requested but `specs/` doesn't exist yet.

1. If `specs/` does not exist, create it.
2. If `specs/specs.md` does not exist, create it with exactly this content:

   ```markdown
   # Specs Index

   This file links to every specification in the project. Each entry below
   points to a numbered subfolder containing its own `spec.md` (populated by
   the `specify` skill) plus the artifacts added by `plan` and `tasks`.

   ## Specifications

   <!-- entries appear here as folders are added by specs-scaffold -->
   ```

3. Report what was created (or that it already existed — do not overwrite).

### add

Use when the user asks to "add a new spec", "create a spec folder", "new spec", "scaffold next spec", etc.

1. **Get the brief description.** If the user gave one at invocation, use it. Otherwise ask: *"One short phrase to describe this spec — what's the feature?"*
2. **Normalize the slug.** Lowercase the brief, replace whitespace and hyphens with underscores, strip everything that is not `[a-z0-9_]`, collapse repeated underscores, trim leading/trailing underscores. Examples:
   - `"User Login & Signup"` → `user_login_signup`
   - `"Bulk import (CSV)"` → `bulk_import_csv`
   - `"URL shortener"` → `url_shortener`
3. **Create or switch to the branch before any writes.** The branch name must be `feature/<slug>_spec`. Use that exact pattern before running `init`, creating folders, or editing any spec files. If the working tree prevents a safe switch, stop and ask the user how to proceed.
4. **Run `init` first** if `specs/` or `specs/specs.md` is missing.
5. **Find the next number.** Scan `specs/` for directories matching `^\d{3}_`. Take the highest existing number; the new number is that + 1. If none exist, start at `001`. Always format as three digits, zero-padded.
6. **Refuse to clobber.** If `specs/NNN_<slug>/` already exists, stop and ask the user whether to pick a different slug or abort. Never overwrite an existing folder.
7. **Create the folder** `specs/NNN_<slug>/`.
8. **Create the stub `specs/NNN_<slug>/spec.md`** with exactly this content (the `specify` skill will overwrite this with the populated template):

   ```markdown
   # NNN — <Title Cased Brief Description>

   [↑ Back to specs index](../specs.md)

   <!--
   Stub created by specs-scaffold. Run the `specify` skill to populate this
   file from .specify/templates/spec.template.md. The back-link above is
   carried over by the template.
   -->
   ```

   Replace `NNN` with the actual number and `<Title Cased Brief Description>` with the brief description in Title Case (e.g. `001 — User Login Signup`).

9. **Append an entry to `specs/specs.md`** under the `## Specifications` section, in numeric order. The entry format is:

   ```markdown
   - [NNN — Title Cased Brief Description](NNN_<slug>/spec.md)
   ```

   If the `<!-- entries appear here ... -->` comment is still in the file, leave it (it's harmless). Append below existing entries so the list stays in numeric order.

10. Report the created path and confirm the index was updated. Tell the user the next step is to run the `specify` skill to populate `spec.md` from the template.

### list

Use when the user asks to "list specs", "show specs", "what specs exist", "spec status", etc.

1. If `specs/` does not exist, say so and offer to run `init`.
2. Read `specs/` and collect every direct subdirectory matching `^\d{3}_`. Ignore other entries.
3. For each match, check which of `spec.md`, `plan.md`, `tasks.md` exist in that folder.
4. Print a compact table:

   ```
   NNN  slug                        spec  plan  tasks
   001  user_login_signup            ✓     ✓     ·
   002  bulk_import_csv              ✓     ·     ·
   ```

   Use `✓` for present, `·` for missing. Sort ascending by number.
5. If the count of subfolders disagrees with the number of entries in `specs/specs.md`, mention it — the root index may be out of sync.

## Invariants

These hold at all times. If you find them violated, fix them before doing anything else.

- The root `specs/specs.md` (plural) exists whenever any `specs/NNN_*` folder exists.
- Numeric prefixes are unique, three-digit, zero-padded. Contiguous numbering from `001` is **not required** — gaps are allowed, never renumber.
- Every `specs/NNN_*/spec.md` (singular) contains a back-link to `../specs.md` — either via the stub above, or carried forward by the `specify` skill's template.
- For `add`, the branch `feature/<slug>_spec` is created or checked out before any spec-related writes happen.
- This skill never deletes folders and never edits `plan.md` or `tasks.md`. It only writes the stub `spec.md`; once `specify` runs, this skill leaves `spec.md` alone.

## What this skill is NOT for

- Writing spec content → use `specify` (overwrites the stub)
- Writing plans → use `plan`
- Writing tasks → use `tasks`
- Project-wide rules → use `constitution`
- Renaming or deleting existing spec folders (out of scope for v1; do it manually and update `specs/specs.md` by hand)

## Examples

**Example 1: fresh project**

User: *"scaffold the specs folder"*

Action: Run `init`. Create `specs/` and `specs/specs.md` with the empty index template. Report what was created.

**Example 2: adding the first spec**

User: *"add a new spec for the URL shortener"*

Action:
1. Slug → `url_shortener`.
2. Create or switch to `feature/url_shortener_spec` before any writes.
3. `specs/` is missing → run `init` first.
4. No existing `NNN_` folders → next number is `001`.
5. Create `specs/001_url_shortener/spec.md` (stub) with title `001 — Url Shortener` and the back-link.
6. Append `- [001 — Url Shortener](001_url_shortener/spec.md)` to `specs/specs.md`.
7. Tell the user the folder is ready and suggest running `specify`.

**Example 3: adding a second spec**

User: *"new spec: bulk import from CSV"*

Action:
1. Slug → `bulk_import_from_csv`.
2. Create or switch to `feature/bulk_import_from_csv_spec` before any writes.
3. Existing folders: `001_url_shortener` → next number is `002`.
4. Create `specs/002_bulk_import_from_csv/spec.md` (stub).
5. Append to `specs/specs.md` under the existing `001` entry.

**Example 4: listing**

User: *"what specs do we have?"*

Action: Print the table described in the `list` operation.
