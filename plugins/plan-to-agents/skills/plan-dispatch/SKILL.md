---
name: plan-dispatch
description: After a plan is approved (via the plan-to-agents plugin), ask how to proceed with implementation — hand off to a Cursor cloud/background agent (manual), delegate to a local Cursor composer-2.5 agent with Claude orchestrating, or just keep the saved plan (no implementation). The approved plan has already been auto-copied into the repo's .claude/plans/.
---

# Plan dispatch

A plan was just approved. The approval hook has already auto-saved the plan into the repo at
`<CWD>/.claude/plans/`. Do NOT start implementing yet — first conform the saved plan to the
template, then ask the user how to proceed.

## 0. Conform the saved plan to the template

The approval hook copies the plan into `<CWD>/.claude/plans/` (often with a harness random slug).
Before anything else, bring that file in line with the **planning** skill and
`skills/planning/plan-template.md` (source of truth for structure and frontmatter):

1. **Rename** if needed to `YYYY-MM-DD-<descriptive-kebab-name>.md` — date = the plan's `created`
   date (or today if missing); name = 3–6 word kebab-case slug derived from the plan title (never
   keep the harness random slug).
2. **Frontmatter** — ensure the template fields exist (`title`, `created`, `last_updated`, `status`).
   Set `status: approved` and bump `last_updated` to today.
3. **Body** — align sections with the template (`Context`, `Approach`, `Verification`) if they are
   missing or out of order; do not rewrite substantive content.

Use the conformed path (`<CWD>/.claude/plans/YYYY-MM-DD-<descriptive-kebab-name>.md`) in all
branches below.

## 1. Ask how to proceed

Call `AskUserQuestion` with exactly these three options:

- **Cursor cloud (manual)** — hand off to a Cursor Background/Cloud Agent.
- **Cursor local — Claude orchestrates** — delegate to a local `composer-2.5` agent; Claude splits,
  dispatches, and verifies.
- **Save plan only** — keep the saved plan, do nothing else.

Then branch on the answer.

---

## Branch A — Save plan only

The plan is already saved at `<CWD>/.claude/plans/YYYY-MM-DD-<descriptive-kebab-name>.md` (copied
by the approval hook and conformed in step 0). Confirm the path to the user and stop. Do **not**
implement anything.

---

## Branch B — Cursor cloud (publish + hand off)

A cloud agent clones from `origin`, so the plan must be pushed to a branch first. Publish it to a
dedicated `plan/<slug>` branch so the cloud agent's work stacks on the plan commit and the PR comes
from `plan/<slug>` — `develop` and any feature branch stay untouched.

`<slug>` = the conformed plan filename without extension (e.g. `2026-06-17-reduce-handoff-friction`).

### B1. Publish the plan to a dedicated branch

Branch `plan/<slug>` off the current branch, commit **only the plan file**, and push:

    base=$(git rev-parse --abbrev-ref HEAD)
    branch="plan/<slug>"
    plan_file=".claude/plans/<conformed-filename>.md"

    git checkout -b "$branch" "$base"
    git add "$plan_file"
    git commit -m "Add plan: <slug>"
    git push -u origin "$branch"

Guardrails:

- **No `origin` remote**: stop — a cloud agent needs a pushed branch. Offer "Save plan only" or
  Branch C (local) instead.
- **Branch already exists** (locally or on origin): append a suffix (`plan/<slug>-2`).
- **Other uncommitted changes**: stage only the plan file, never the user's unrelated work.

### B2. Hand off

1. Tell the user the pushed branch `plan/<slug>`.
2. Have them start a Cursor Background/Cloud Agent (https://cursor.com/agents) against **this repo on
   `plan/<slug>`**, pointed at `<CWD>/.claude/plans/<conformed-filename>.md`.
3. Stop. Make no further edits and no API calls.

---

## Branch C — Cursor local, Claude orchestrates

You are the ORCHESTRATOR. Do not implement the approved plan yourself — dispatch it to Cursor's
`composer-2.5` agent and verify the results.

Follow the backend-neutral orchestration pattern in
[orchestration-pattern.md](../../shared/orchestration-pattern.md) (split plan → branch/worktree per
subtask off `$base` → dispatch → verify → merge → run plan Verification → report).

Dispatch using the **Claude Code** in-session column in
[dispatch-adapters.md](../../shared/dispatch-adapters.md) — shell out via the Cursor `agent` CLI
with `composer-2.5`, one worktree per subtask off `$base`:

    agent -p --force --trust --model composer-2.5 --worktree "<subtask-slug>" --worktree-base "$base" "<focused subtask prompt> — commit your changes on this branch when done"

- `-p` non-interactive · `--force` allow edits/shell · `--trust` skip workspace-trust prompt.
- `agent` prints the worktree path under `~/.cursor/worktrees/<repo>/<subtask-slug>`; track slug,
  branch name, and worktree path for every run.

Continuity (optional): `chat_id=$(agent create-chat)` once, then `agent -p --resume "$chat_id" ...`
to keep Composer context across sequential subtasks (still use a dedicated worktree per subtask).

---

To disable the approval-time dispatch prompt for a session: `export CLAUDE_NO_COMPOSER_DELEGATE=1`.
