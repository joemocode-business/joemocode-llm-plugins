# Orchestration pattern

Backend-neutral doer pattern for implementing an approved plan via subagents.

You are the ORCHESTRATOR. Do not implement the approved plan yourself — dispatch it to subagents and verify the results.

Capture the current feature branch once:

    base=$(git rev-parse --abbrev-ref HEAD)

All subagent work branches off `$base` (the existing feature branch — not a detached HEAD), so reviewers can compare, cherry-pick, or drop individual subagent branches before merging.

## 1. Split the plan into subtasks

Read the approved plan and break it into discrete subtasks. For each, note its target files and acceptance criteria, and mark whether it is INDEPENDENT (no ordering/file overlap with others) or DEPENDENT (must follow an earlier subtask). Derive a short **subtask slug** (kebab-case) for each.

## 2. Dispatch

**Default: one branch + worktree per subtask** (isolated diffs for per-branch review). Dispatch each subtask into its own worktree on a new branch off `$base`.

See [dispatch-adapters.md](./dispatch-adapters.md) for the in-session (native) and headless dispatch command for your target backend.

- The prompt should contain the subtask goal + exact files + acceptance criteria from the plan.
- **Instruct each subagent to commit** its work on its worktree branch when finished (do not leave uncommitted changes).
- Track subtask slug, branch name, and worktree path for every run.

**Parallelize independent subtasks.** Launch multiple dispatches concurrently (background shell, or one message with several backgrounded calls) and wait for all to finish. Run DEPENDENT subtasks sequentially after their prerequisites are verified and merged (or after the user confirms the prerequisite branch is acceptable).

## 3. Verify each subtask

After a run finishes, read its output and review that subtask's **branch diff** (not the main working tree):

    git -C <worktree> diff "$base"...HEAD

(or `git log` / `git diff <branch>` on the subagent branch). Confirm the diff satisfies the subtask's acceptance criteria. If wrong/incomplete, re-dispatch a corrective prompt in the same worktree (use session resume if the backend supports it). Only mark a subtask done once verified.

## 4. Finish

Merge verified subagent branches back into the feature branch (`$base`) — sequentially for DEPENDENT subtasks, or in the order the user chooses during review. After merges, run the plan's verification section (build/tests).

Report a summary that includes:

- Each subtask slug, branch name, worktree path, and what that subagent run did.
- The **branch list** so the user can review or merge selectively (cherry-pick / drop branches) instead of one squashed diff.
- Per-branch diffs (`git diff "$base"...<branch>`) and the cumulative diff on `$base` after merges.
