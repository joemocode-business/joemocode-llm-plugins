---
description: After a plan is approved — save only or dispatch for orchestration
---

A plan was approved. Plan path (if omitted, use the most recent file in `docs/plans/`): $ARGUMENTS

Do **not** implement yet.

## 0. Conform the plan

Bring the file in line with the planning conventions:

1. Rename if needed to `YYYY-MM-DD-<descriptive-kebab-name>.md` (date from `created`, or today).
2. Frontmatter: `title`, `created`, `last_updated`, `status: approved` (bump `last_updated` to today).
3. Body sections: `Context`, `Approach`, `Verification`.

Use the conformed path in all steps below.

## 1. Ask how to proceed

Ask the user to choose:

- **Save plan only** — keep the saved plan, stop.
- **Dispatch to agent for orchestration** — split into subtasks and dispatch to a doer backend.

## 2. Pick doer backend (dispatch only)

If dispatching, ask the user to choose a doer backend. When the plugin config's `enabled_harnesses` is set, offer **only** those harnesses; otherwise offer all four: **Claude Code**, **Cursor**, **opencode**, or **Pi**.

## 3. Orchestrate (dispatch only)

You are the ORCHESTRATOR. Do not implement the plan yourself.

Follow `plan-to-agents-shared/orchestration-pattern.md` in the same opencode scope as this command (`.opencode/plan-to-agents-shared/` for project install, `~/.config/opencode/plan-to-agents-shared/` for `--global` install — created by `install-opencode.sh`).

Use `plan-to-agents-shared/dispatch-adapters.md` from the same scope:

| When | How |
|------|-----|
| Chosen backend **is opencode** (this session) | Native **Task** tool — spawn `plan-phase-implementer` and `plan-verifier` subagents |
| Chosen backend **is not opencode** | Headless shell-out per the adapters table (e.g. `claude -p`, `agent -p --model composer-2.5`, `opencode run -m <model> "<prompt>"`, `pi --mode rpc`). Resolve `<model>` per `../../shared/model-resolution.md` (configured default → choose from list → ask the user). Save defaults via `/plan-to-agents:configure`. |

Include subtask goal, exact files, and acceptance criteria in every dispatch prompt. Instruct each subagent to commit on its worktree branch.
