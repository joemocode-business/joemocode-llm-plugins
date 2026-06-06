---
name: plan-dispatch
description: After a plan is approved (via the plan-to-agents plugin), ask how to proceed with implementation — hand off to a Cursor cloud/background agent (manual), delegate to a local Cursor composer-2.5 agent with Claude orchestrating, or just keep the saved plan (no implementation). The approved plan has already been auto-copied into the repo's .claude/plans/.
---

# Plan dispatch

A plan was just approved. The approval hook has already auto-saved the plan into the repo at
`<CWD>/.claude/plans/`. Do NOT start implementing yet — first ask the user how to proceed.

## 1. Ask how to proceed

Call `AskUserQuestion` with exactly these three options:

- **Cursor cloud (manual)** — hand off to a Cursor Background/Cloud Agent.
- **Cursor local — Claude orchestrates** — delegate to a local `composer-2.5` agent; Claude splits,
  dispatches, and verifies.
- **Save plan only** — keep the saved plan, do nothing else.

Then branch on the answer.

---

## Branch A — Save plan only

The plan is already saved at `<CWD>/.claude/plans/<name>.md` (copied by the approval hook). Confirm
the path to the user and stop. Do **not** implement anything.

---

## Branch B — Cursor cloud (manual)

There is no clean one-shot local CLI to launch a Cursor cloud/background agent, so this is a manual
hand-off today:

1. Tell the user the saved plan path: `<CWD>/.claude/plans/<name>.md`.
2. Instruct them to open Cursor → Background/Cloud Agents (the cloud icon in the Cursor IDE, or
   https://cursor.com/agents) and start an agent against **this repo**, pointing it at that plan
   file.
3. Hand off and stop. Make no local edits and no API calls.

---

## Branch C — Cursor local, Claude orchestrates

You are the ORCHESTRATOR. Do not implement the approved plan yourself — dispatch it to Cursor's
`composer-2.5` agent and verify the results.

### C1. Split the plan into subtasks

Read the approved plan and break it into discrete subtasks. For each, note its target files and
acceptance criteria, and mark whether it is INDEPENDENT (no ordering/file overlap with others) or
DEPENDENT (must follow an earlier subtask).

### C2. Dispatch

Command template (current working tree — the default):

    agent -p --force --trust --model composer-2.5 --workspace "<CWD>" "<focused subtask prompt>"

- `-p` non-interactive · `--force` allow edits/shell · `--trust` skip workspace-trust prompt.
- The prompt should contain the subtask goal + exact files + acceptance criteria from the plan.

**Parallelize independent subtasks.** Launch multiple `agent` runs concurrently (background Bash,
or one message with several backgrounded calls) and wait for all to finish. To avoid edit
conflicts, run parallel subtasks that touch the same files in **separate worktrees**:

    agent -p --force --trust --model composer-2.5 --worktree "<name>" --worktree-base "<branch>" "<prompt>"

(`agent` prints the worktree path under `~/.cursor/worktrees/<repo>/<name>`; track it for review/merge.)
Use a worktree only when subtasks would otherwise collide, or when the approved plan explicitly
asks for isolation. Run DEPENDENT subtasks sequentially after their prerequisites are verified.

### C3. Verify each subtask

After a run finishes, read its output and inspect `git diff` (or the worktree diff) to confirm it
satisfies the subtask's acceptance criteria. If wrong/incomplete, re-dispatch a corrective prompt
(use `--continue`/`--resume <id>` to keep that Composer session's context). Only mark a subtask
done once verified.

### C4. Finish

After all subtasks (and any worktree merges) are complete, run the plan's verification section
(build/tests), then report a summary of what each Composer run did plus the cumulative diff.

Continuity (optional): `chat_id=$(agent create-chat)` once, then `agent -p --resume "$chat_id" ...`
to keep Composer context across sequential subtasks.

---

To disable the approval-time dispatch prompt for a session: `export CLAUDE_NO_COMPOSER_DELEGATE=1`.
