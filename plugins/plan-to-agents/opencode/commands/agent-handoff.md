---
description: Explicit delegation — hand off a task to a doer backend without plan approval
---

Hand off this task: $ARGUMENTS

Parse from the request and recent context: task goal, target files, acceptance criteria, and whether subtasks can run in parallel. Resolve model per `../../shared/model-resolution.md` for the chosen backend (configured default → ask the user); save defaults via `/plan-to-agents:configure`.

Do **not** use this flow when a plan was just approved — use `/plan-dispatch` instead.

## 1. Ask how to proceed

Ask the user:

- **Dispatch to agent for orchestration**
- **Cancel**

## 2. Pick doer backend (dispatch only)

If dispatching, ask for a doer backend. When the plugin config's `enabled_harnesses` is set and non-empty, offer **only** those harnesses; otherwise offer all four: **Claude Code**, **Cursor**, **opencode**, or **Pi**.

## 3. Orchestrate

You are the ORCHESTRATOR. Do not implement yourself.

Follow `plan-to-agents-shared/orchestration-pattern.md` and `plan-to-agents-shared/dispatch-adapters.md` in your opencode scope (`.opencode/plan-to-agents-shared/` or `~/.config/opencode/plan-to-agents-shared/`):

| When | How |
|------|-----|
| Chosen backend **is opencode** | Native **Task** tool — spawn `plan-phase-implementer` (and `plan-verifier` when criteria need checking) |
| Chosen backend **is not opencode** | Headless shell-out per the adapters table (e.g. `claude -p`, `agent -p --model composer-2.5`, `opencode run -m <model> "<prompt>"`, `pi --mode rpc`). Resolve `<model>` per `plan-to-agents-shared/model-resolution.md` (configured default → choose from list → ask the user). Save defaults via `/plan-to-agents:configure`. |

Include goal, exact files, and acceptance criteria in every prompt. Use separate worktrees/branches per parallel subtask. Verify each subtask branch diff before reporting.
