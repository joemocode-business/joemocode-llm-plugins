---
name: plan-dispatch
description: After a plan is approved (via the plan-to-agents plugin), ask how to proceed — save the plan only, or dispatch to an agent for orchestration (then pick Claude Code, Cursor, opencode, or Pi as the doer backend). The approved plan has already been auto-copied into the repo's docs/plans/.
---

# Plan dispatch

A plan was just approved. The approval hook has already auto-saved the plan into the repo at
`<CWD>/docs/plans/`. Do NOT start implementing yet — first conform the saved plan to the
template, then ask the user how to proceed.

## 0. Conform the saved plan to the template

The approval hook copies the plan into `<CWD>/docs/plans/` (often with a harness random slug).
Before anything else, bring that file in line with the **planning** skill and
`skills/planning/plan-template.md` (source of truth for structure and frontmatter):

1. **Rename** if needed to `YYYY-MM-DD-<descriptive-kebab-name>.md` — date = the plan's `created`
   date (or today if missing); name = 3–6 word kebab-case slug derived from the plan title (never
   keep the harness random slug).
2. **Frontmatter** — ensure the template fields exist (`title`, `created`, `last_updated`, `status`).
   Set `status: approved` and bump `last_updated` to today.
3. **Body** — align sections with the template (`Context`, `Approach`, `Verification`) if they are
   missing or out of order; do not rewrite substantive content.

Use the conformed path (`<CWD>/docs/plans/YYYY-MM-DD-<descriptive-kebab-name>.md`) in all
branches below.

## 1. Ask how to proceed (step 1)

Call `AskUserQuestion` with exactly these two options:

- **Save plan only** — keep the saved plan, do nothing else.
- **Dispatch to agent for orchestration** — split the plan into subtasks and dispatch to a doer
  backend.

Then branch on the answer.

## 2. Pick doer backend (step 2, dispatch only)

If the user chose **Dispatch to agent for orchestration**, call `AskUserQuestion` with the
doer-backend options. When the plugin config's `enabled_harnesses` is set and non-empty, present **only** those
harnesses; otherwise present all four:

- **Claude Code**
- **Cursor**
- **opencode**
- **Pi**

Then branch on the answer.

---

## Branch A — Save plan only

The plan is already saved at `<CWD>/docs/plans/YYYY-MM-DD-<descriptive-kebab-name>.md` (copied
by the approval hook and conformed in step 0). Confirm the path to the user and stop. Do **not**
implement anything.

---

## Branch B — Dispatch to agent for orchestration

You are the ORCHESTRATOR. Do not implement the approved plan yourself — dispatch it to subagents on
the chosen backend and verify the results.

Follow the backend-neutral orchestration pattern in
[orchestration-pattern.md](../../shared/orchestration-pattern.md) (split plan → branch/worktree per
subtask off `$base` → dispatch → verify → merge → run plan Verification → report).

Use [dispatch-adapters.md](../../shared/dispatch-adapters.md) for per-backend dispatch:

- When the **chosen doer backend matches the current harness**, orchestrate **in-session** using
  that row's in-session column (native subagents, `Task` tool, etc.).
- When the **chosen backend differs from the current harness**, **shell out** using that row's
  headless column (`claude -p`, `agent -p --model composer-2.5`, `opencode run`, `pi --mode rpc`,
  etc.). Resolve the `<model>` for headless commands per
  [model-resolution.md](../../shared/model-resolution.md) (configured default → choose from list →
  ask the user). Save defaults via `/plan-to-agents:configure`.

Capture `base=$(git rev-parse --abbrev-ref HEAD)` once per
[orchestration-pattern.md](../../shared/orchestration-pattern.md).

---

To disable the approval-time dispatch prompt for a session: `export CLAUDE_NO_COMPOSER_DELEGATE=1`.
