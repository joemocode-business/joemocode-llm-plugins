---
name: clear-plans
description: Clear out old plan files from the repo's docs/plans/ directory. Lists existing plans, lets the user pick which to remove, then archives them to docs/archive/plans/ or deletes them — always confirming first. User-invoked cleanup.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Clear plans

## Runtime operations

| Harness | User questions | Invocation |
|---------|----------------|------------|
| Claude Code | `AskUserQuestion` | `/plan-to-agents:clear-plans` skill |
| Cursor | `AskUserQuestion` | `/plan-to-agents:clear-plans` skill |
| opencode | `question` | `/clear-plans` skill (explicit-only; `metadata.opencode/autoinvoke: false`) |
| Pi | `question` | `/clear-plans` prompt |

Clear out old plan files from the repo's canonical `<CWD>/docs/plans/` directory. List the plans,
let the user pick which to remove, then archive or delete them — always confirming first.

## 1. List plans

Enumerate `*.md` files in `<CWD>/docs/plans/`. If the directory does not exist or is empty, tell
the user there is nothing to clear and stop (make no changes). For each plan, show a compact line:
filename, `status:` from its frontmatter (draft/approved/implemented), and `last_updated` (or the
date in the filename) so the user can judge staleness.

## 2. Let the user pick which to clear

Call the harness question tool with `multiSelect: true`, listing the plan files as options so the user
selects which to remove. Use **`AskUserQuestion`** on Claude Code and Cursor; use **`question`** on
opencode and Pi. If the list is long, present them oldest-first; the user may also say
"all".

## 3. Confirm archive vs delete

Call the harness question tool (single-select) with exactly two options:

Use **`AskUserQuestion`** on Claude Code and Cursor; use **`question`** on opencode and Pi.

- **Archive** — move the selected plans to `docs/archive/plans/`.
- **Delete** — permanently remove the selected plans.

This confirmation is required; do not act until the user answers.

## 4. Execute

- **Archive:** `mkdir -p <CWD>/docs/archive/plans/`, then for each selected plan move it there
  (`git mv` when the file is tracked by git, else `mv`), so it leaves `docs/plans/` and is preserved
  under `docs/archive/plans/`. On a name collision in the archive, keep both (e.g. suffix the
  incoming file).
- **Delete:** remove each selected plan from `docs/plans/` (`git rm` when tracked, else `rm`).

## 5. Report

Report the outcome: which files were archived (with their new paths) or deleted, and note that the
changes are staged/unstaged in git but NOT committed (this skill does not commit).
