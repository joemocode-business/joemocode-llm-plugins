Implement the plan at: $ARGUMENTS

**Requires a plan path.** If `$ARGUMENTS` is empty, stop and ask the user which file under `docs/plans/` to implement (list available plans if helpful). Do not pick a default.

You are the ORCHESTRATOR. Do not implement phases yourself — use the native **`subagent`** tool to spawn child agents.

## 1. Read the plan

Extract phases (`##` sections or `### Phase N`), tasks, target files, acceptance criteria (`Verification`, `Acceptance criteria`, or derived from goals), and dependencies.

## 2. Classify size

| Size | Condition | Action |
|------|-----------|--------|
| Small | ≤2 phases AND ≤6 tasks | One `plan-phase-implementer` subagent with the full plan |
| Large | 3+ phases OR 7+ tasks | Multiple `plan-phase-implementer` subagents — one per independent phase group |

Parallelize groups that touch different files. Capture `base=$(git rev-parse --abbrev-ref HEAD)` once. Before dispatching any implementer, create a unique branch and worktree for its group off `$base`:

```bash
worktree_root="${TMPDIR:-/tmp}/plan-to-agents-$$"
mkdir -p "$worktree_root"
git worktree add -b "plan-phase/<group-slug>" "$worktree_root/<group-slug>" "$base"
```

Use a distinct `<group-slug>` for every group. Record its branch and absolute worktree path. Never run parallel implementers in the parent working tree or point two tasks at the same worktree. Instruct each implementer to commit its changes on its worktree branch.

## 3. Spawn implementers

Pass each implementer's absolute worktree path through `cwd`. Use **`subagent`** in parallel mode when groups are independent:

```json
{
  "tasks": [
    {
      "agent": "plan-phase-implementer",
      "task": "... Commit all changes on the current worktree branch.",
      "cwd": "<absolute-worktree-path>"
    }
  ]
}
```

For a single implementer, set the top-level `cwd` to that group's absolute worktree path. Fire all independent implementers in one response. Prompt each with its phase(s), full plan for context, and previously completed phases. Wait for all to finish.

Parallel mode sets the overall tool result to `isError` when any task fails. Inspect every task result instead of aborting the whole orchestration: continue with successful branches, and re-dispatch each failed group in a fresh branch/worktree with its new `cwd`.

## 4. Merge implementer branches

Review each branch with `git -C <worktree-path> diff "$base"...HEAD`. Merge verified implementer branches back into `base` so per-phase commits remain separate but the cumulative diff on `base` reflects the full implementation. After a branch merges successfully, remove its worktree with `git worktree remove <worktree-path>`. Do not remove a worktree that contains uncommitted changes or whose branch has not merged.

## 5. Spawn verifier

Only after all successful implementer branches have merged in step 4, fire one `plan-verifier` subagent against the cumulative tree on `$base` with the base branch name, acceptance criteria, and the change manifest. Run it from the parent checkout on `$base`; do not pass an implementer worktree as its `cwd`.

## 6. Fix and re-verify

If the verifier reports `FAIL`, repeat the isolation workflow from step 2 for every failing group: create a fresh `<group-slug>-fix-<n>` branch and worktree off the current `$base`, then re-dispatch `plan-phase-implementer` with that absolute worktree path in `cwd`. Never run a fix implementer in the parent working tree. Verify and merge the fix branch, remove its worktree only after a successful merge, then re-run the verifier.

## 7. Report

Summarize phases run, verifier pass/fail per criterion, branch list, and outstanding blockers.
