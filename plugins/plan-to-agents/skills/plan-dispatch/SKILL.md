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

## Branch B — Cursor cloud (manual)

There is no clean one-shot local CLI to launch a Cursor cloud/background agent, so this is a manual
hand-off today:

1. Tell the user the saved plan path:
   `<CWD>/.claude/plans/YYYY-MM-DD-<descriptive-kebab-name>.md`.
2. Instruct them to open Cursor → Background/Cloud Agents (the cloud icon in the Cursor IDE, or
   https://cursor.com/agents) and start an agent against **this repo**, pointing it at that plan
   file.
3. Hand off and stop. Make no local edits and no API calls.

---

## Branch C — Cursor local, Claude orchestrates

You are the ORCHESTRATOR. Do not implement the approved plan yourself — dispatch it to Cursor's
`composer-2.5` agent and verify the results.

Capture the current feature branch once:

    base=$(git rev-parse --abbrev-ref HEAD)

All subagent work branches off `$base` (the existing feature branch — not a detached HEAD), so
reviewers can compare, cherry-pick, or drop individual subagent branches before merging.

### C1. Split the plan into subtasks

Read the approved plan and break it into discrete subtasks. For each, note its target files and
acceptance criteria, and mark whether it is INDEPENDENT (no ordering/file overlap with others) or
DEPENDENT (must follow an earlier subtask). Derive a short **subtask slug** (kebab-case) for each.

### C2. Dispatch

**Default: one branch + worktree per subtask** (isolated diffs for per-branch review). Dispatch
each subtask into its own worktree on a new branch off `$base`:

    agent -p --force --trust --model composer-2.5 --worktree "<subtask-slug>" --worktree-base "$base" "<focused subtask prompt> — commit your changes on this branch when done"

- `-p` non-interactive · `--force` allow edits/shell · `--trust` skip workspace-trust prompt.
- The prompt should contain the subtask goal + exact files + acceptance criteria from the plan.
- **Instruct each subagent to commit** its work on its worktree branch when finished (do not leave
  uncommitted changes).
- `agent` prints the worktree path under `~/.cursor/worktrees/<repo>/<subtask-slug>`; track slug,
  branch name, and worktree path for every run.

**Parallelize independent subtasks.** Launch multiple `agent` runs concurrently (background Bash,
or one message with several backgrounded calls) and wait for all to finish. Run DEPENDENT subtasks
sequentially after their prerequisites are verified and merged (or after the user confirms the
prerequisite branch is acceptable).

### C3. Verify each subtask

After a run finishes, read its output and review that subtask's **branch diff** (not the main
working tree):

    git -C <worktree> diff "$base"...HEAD

(or `git log` / `git diff <branch>` on the subagent branch). Confirm the diff satisfies the
subtask's acceptance criteria. If wrong/incomplete, re-dispatch a corrective prompt in the same
worktree (use `--continue`/`--resume <id>` to keep that Composer session's context). Only mark a
subtask done once verified.

### C4. Finish

Merge verified subagent branches back into the feature branch (`$base`) — sequentially for
DEPENDENT subtasks, or in the order the user chooses during review. After merges, run the plan's
verification section (build/tests).

Report a summary that includes:

- Each subtask slug, branch name, worktree path, and what that Composer run did.
- The **branch list** so the user can review or merge selectively (cherry-pick / drop branches)
  instead of one squashed diff.
- Per-branch diffs (`git diff "$base"...<branch>`) and the cumulative diff on `$base` after merges.

Continuity (optional): `chat_id=$(agent create-chat)` once, then `agent -p --resume "$chat_id" ...`
to keep Composer context across sequential subtasks (still use a dedicated worktree per subtask).

---

To disable the approval-time dispatch prompt for a session: `export CLAUDE_NO_COMPOSER_DELEGATE=1`.
