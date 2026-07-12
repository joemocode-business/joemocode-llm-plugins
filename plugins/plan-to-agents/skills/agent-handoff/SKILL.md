---
name: agent-handoff
description: Explicit agent delegation — hand off a task to a doer backend for orchestration (Claude Code, Cursor, opencode, or Pi). Use when user says "hand off to agent", "delegate to composer", "run this in a subagent", or wants to delegate work without plan mode.
disable-model-invocation: false
---

# Agent handoff

Explicit delegation outside the plan-approval flow. Use this when the user wants work dispatched to a subagent without entering Plan Mode or waiting for `ExitPlanMode`.

## When to use

- User says "hand off to agent", "delegate to composer", "run this in a subagent", or similar
- A focused task should be implemented by a subagent, not the current orchestrator
- No approved plan file is required — parse the request from conversation context

Do **not** use this skill when a plan was just approved via `ExitPlanMode`; use `plan-dispatch` instead.

## 1. Parse the handoff

Extract from the user's request and recent context:

| Field | What to capture |
|-------|-----------------|
| **Task goal** | One-sentence objective |
| **Target files** | Paths to read or modify |
| **Acceptance criteria** | How to know the task is done |
| **Model preference** | Per [model-resolution.md](../../shared/model-resolution.md) for the chosen backend (configured default → ask the user); save defaults via `/plan-to-agents:configure` |
| **Parallel vs sequential** | Independent subtasks that can run concurrently, or ordered dependencies |

If anything is ambiguous, ask a short clarifying question before proceeding.

## 2. Ask how to proceed (step 1)

Call `AskUserQuestion` with exactly these options:

- **Dispatch to agent for orchestration** — split the task into subtasks and dispatch to a doer backend
- **Cancel** — stop without dispatching

Then branch on the answer.

## 3. Pick doer backend (step 2, dispatch only)

If the user chose **Dispatch to agent for orchestration**, call `AskUserQuestion` with the
doer-backend options. When the plugin config's `enabled_harnesses` is set and non-empty, present **only** those
harnesses; otherwise present all four:

- **Claude Code**
- **Cursor**
- **opencode**
- **Pi**

Then branch on the answer.

---

## 4. Dispatch branch

You are the ORCHESTRATOR. Do not implement the task yourself — dispatch it on the chosen backend
and verify.

Follow [orchestration-pattern.md](../../shared/orchestration-pattern.md) for split → dispatch →
verify → report. Use [dispatch-adapters.md](../../shared/dispatch-adapters.md) for per-backend
dispatch:

- When the **chosen doer backend matches the current harness**, orchestrate **in-session** using
  that row's in-session column.
- When the **chosen backend differs from the current harness**, **shell out** using that row's
  headless column (`claude -p`, `agent -p --model composer-2.5`, `opencode run`, `pi --mode rpc`,
  etc.). Resolve the `<model>` for headless commands per
  [model-resolution.md](../../shared/model-resolution.md) (configured default → choose from list →
  ask the user). Save defaults via `/plan-to-agents:configure`.

Include the task goal, exact target files, and acceptance criteria in every dispatch prompt.

**Single subtask** (current working tree): dispatch one focused prompt with goal, files, and
acceptance criteria.

**Parallel independent subtasks** — launch multiple dispatches concurrently (background shell, or
one message with several backgrounded calls). Use separate worktrees/branches per subtask when
file overlap would cause edit conflicts.

Run dependent subtasks sequentially after prerequisites are verified.

**Verify:** after each run, read output and inspect the subtask branch diff (`git diff`). If
wrong/incomplete, re-dispatch a corrective prompt (use session resume if the backend supports it).

---

## 5. Verify and report

1. Run `git diff` (or worktree diff) and check each acceptance criterion
2. Run any verification commands the user specified (build, tests, lint)
3. Report a summary:
   - What was dispatched (backend and subtask slugs)
   - Files changed
   - Acceptance criteria: met / not met
   - Follow-up items or blockers
