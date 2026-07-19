A plan was approved. Plan path (if omitted, use the most recent file in `docs/plans/`): $ARGUMENTS

Do **not** implement yet.

## 0. Conform the plan

Bring the file in line with the planning conventions:

1. Rename if needed to `YYYY-MM-DD-<descriptive-kebab-name>.md` (date from `created`, or today).
2. Frontmatter: `title`, `created`, `last_updated`, `status: approved` (bump `last_updated` to today).
3. Body sections: `Context`, `Approach`, `Verification`.

Use the conformed path in all steps below.

## 1. Ask how to proceed

Call the **`question`** tool with exactly these two options:

- **Save plan only** — keep the saved plan, stop.
- **Dispatch to agent for orchestration** — split into subtasks and dispatch to a doer backend.

## 2. Pick doer backend (dispatch only)

If dispatching, call **`question`** with doer-backend options. First load merged plugin config: shallow-merge `<repo-root>/.plan-to-agents.json` over `${XDG_CONFIG_HOME:-$HOME/.config}/plan-to-agents/config.json` (repo wins field-by-field; the `harnesses` map merges per-slug and per-field). When the merged config's `enabled_harnesses` is set and non-empty, offer **only** those harnesses; otherwise offer all four: **Claude Code**, **Cursor**, **opencode**, or **Pi**.

## 3. Orchestrate (dispatch only)

You are the ORCHESTRATOR. Do not implement the plan yourself.

Read the approved plan and split it into discrete subtasks. For each subtask, record a unique kebab-case slug, goal, exact target files, acceptance criteria, and dependencies. Mark subtasks that touch different files and have no dependency as independent; dispatch those in parallel. Run dependent or file-overlapping subtasks sequentially after their prerequisites merge.

Capture `base=$(git rev-parse --abbrev-ref HEAD)`. Before dispatch, create a unique branch and worktree for each subtask off `$base` with `git worktree add -b "plan-phase/<subtask-slug>" <absolute-worktree-path> "$base"`. Record every branch and worktree path. Never point two parallel subtasks at the same worktree or run them in the parent working tree.

| When | How |
|------|-----|
| Chosen backend **is Pi** (this session) | Native **`subagent`** tool — spawn `plan-phase-implementer` with each task's absolute worktree path in its `cwd` field |
| Chosen backend **is not Pi** | Headless shell-out per the adapters table from the matching worktree directory (e.g. `cd <absolute-worktree-path> && claude -p`, `agent -p --model composer-2.5`, `opencode run -m <model> "<prompt>"`, `pi --mode rpc`). Resolve `<model>` from the merged plugin config loaded in step 2: use `harnesses.<h>.default_model` if a non-empty string; else if `harnesses.<h>.models` has ≥2 entries, ask the user to pick one; else ask the user to type the model id (offer the known default first, e.g. `composer-2.5` for Cursor). Save defaults via `/configure`. |

Include subtask goal, exact files, and acceptance criteria in every dispatch prompt. Instruct each subagent to commit on its worktree branch.

If a parallel `subagent` call returns `isError`, inspect each task result. Keep successful branches in the merge flow and retry each failed subtask in a fresh branch/worktree with its new `cwd`; do not abort or discard the successful work.

After all implementers finish, review each branch diff and merge verified branches back into `$base`. Only then run `plan-verifier` against the cumulative tree on `$base`. Remove each implementer worktree after its branch merges successfully.

If verification fails, create a fresh `<subtask-slug>-fix-<n>` branch and worktree off the current `$base` for each failing subtask. Re-dispatch the fix implementer with the new absolute worktree path in `cwd`; never use the parent working tree. Review and merge each fix branch, remove its worktree after the successful merge, and run `plan-verifier` again against `$base`.
