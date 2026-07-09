---
name: agent-handoff
description: Explicit agent delegation — hand off a task to a local subagent or Cursor cloud agent. Use when user says "hand off to agent", "delegate to composer", "run this in a subagent", or wants to delegate work without plan mode.
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
| **Model preference** | e.g. `composer-2.5` (default for local dispatch) |
| **Parallel vs sequential** | Independent subtasks that can run concurrently, or ordered dependencies |

If anything is ambiguous, ask a short clarifying question before proceeding.

## 2. Ask how to proceed

Call `AskUserQuestion` (or equivalent) with exactly these options:

- **Local subagent** — orchestrator dispatches to a local agent (Claude → `agent` CLI; Cursor → `Task` tool)
- **Cursor cloud (manual)** — hand off to a Cursor Background/Cloud Agent at https://cursor.com/agents
- **Cancel** — stop without dispatching

Then branch on the answer.

---

## 3. Local branch — platform-specific

Follow [orchestration-pattern.md](../../shared/orchestration-pattern.md) for split → dispatch →
verify → report. Use [dispatch-adapters.md](../../shared/dispatch-adapters.md) for per-backend
dispatch commands.

### Claude Code (orchestrator is Claude)

You are the ORCHESTRATOR. Do not implement the task yourself — dispatch it and verify.

**Single subtask** (current working tree):

```bash
agent -p --force --trust --model composer-2.5 --workspace "<CWD>" "<focused prompt with goal, files, acceptance criteria>"
```

- `-p` non-interactive · `--force` allow edits/shell · `--trust` skip workspace-trust prompt
- Include task goal, exact target files, and acceptance criteria in the prompt

**Parallel independent subtasks** — launch multiple `agent` runs concurrently (background Bash, or one message with several backgrounded calls). To avoid edit conflicts on overlapping files, use separate worktrees:

```bash
agent -p --force --trust --model composer-2.5 --worktree "<name>" --worktree-base "<branch>" "<prompt>"
```

(`agent` prints the worktree path under `~/.cursor/worktrees/<repo>/<name>`; track it for review/merge.)

Run dependent subtasks sequentially after prerequisites are verified.

**Verify:** after each run, read output and inspect `git diff` (or the worktree diff). If wrong/incomplete, re-dispatch with `--resume <id>` to keep that Composer session's context.

### Cursor (orchestrator is Cursor)

You are the ORCHESTRATOR. Do not implement the task yourself — dispatch via the `Task` tool and verify.

Use `subagent_type: generalPurpose` for ad-hoc tasks, or `plan-phase-implementer` when the handoff resembles a plan phase (structured tasks with file lists and acceptance criteria).

**Single subtask:**

```
Task(
  subagent_type: "generalPurpose" | "plan-phase-implementer",
  prompt: "<goal, target files, acceptance criteria>"
)
```

**Parallel independent subtasks** — fire multiple `Task` calls in **one message** so they run concurrently. Pass goal, files, and acceptance criteria in each prompt.

**Verify:** after each Task completes, inspect `git diff` against acceptance criteria. Re-dispatch a corrective Task if needed.

---

## 4. Cloud branch

Manual handoff — there is no one-shot local CLI to launch a Cursor cloud/background agent:

1. Tell the user the workspace path: `<CWD>`
2. Summarize the task goal, target files, and acceptance criteria
3. Point them to https://cursor.com/agents to start an agent against this repo
4. Stop. Make no local edits and no API calls.

---

## 5. Verify and report

1. Run `git diff` (or worktree diff) and check each acceptance criterion
2. Run any verification commands the user specified (build, tests, lint)
3. Report a summary:
   - What was dispatched (local subagent vs cloud manual)
   - Files changed
   - Acceptance criteria: met / not met
   - Follow-up items or blockers
