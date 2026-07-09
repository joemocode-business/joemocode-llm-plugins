---
description: Explicit delegation — hand off a task to a doer backend without plan approval
---

Hand off this task: $ARGUMENTS

Parse from the request and recent context: task goal, target files, acceptance criteria, and whether subtasks can run in parallel.

Do **not** use this flow when a plan was just approved — use `/plan-dispatch` instead.

## 1. Ask how to proceed

Ask the user:

- **Dispatch to agent for orchestration**
- **Cancel**

## 2. Pick doer backend (dispatch only)

If dispatching, ask: **Claude Code**, **Cursor**, **opencode**, or **Pi**.

## 3. Orchestrate

You are the ORCHESTRATOR. Do not implement yourself.

Follow `plugins/plan-to-agents/shared/orchestration-pattern.md` and `plugins/plan-to-agents/shared/dispatch-adapters.md`:

| When | How |
|------|-----|
| Chosen backend **is opencode** | Native **Task** tool — spawn `plan-phase-implementer` (and `plan-verifier` when criteria need checking) |
| Chosen backend **is not opencode** | Headless shell-out (`claude -p`, `agent -p --model composer-2.5`, `opencode run -m <model> "<prompt>"`, `pi --mode rpc`) |

Include goal, exact files, and acceptance criteria in every prompt. Use separate worktrees/branches per parallel subtask. Verify each subtask branch diff before reporting.
