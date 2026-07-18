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

Capture `base=$(git rev-parse --abbrev-ref HEAD)`. Each subtask gets its own branch and worktree off `$base`; after verification, merge subagent branches back into `$base`.

| When | How |
|------|-----|
| Chosen backend **is Pi** (this session) | Native **`subagent`** tool — spawn `plan-phase-implementer` and `plan-verifier` |
| Chosen backend **is not Pi** | Headless shell-out per the adapters table (e.g. `claude -p`, `agent -p --model composer-2.5`, `opencode run -m <model> "<prompt>"`, `pi --mode rpc`). Resolve `<model>`: use `harnesses.<h>.default_model` if a non-empty string; else if `harnesses.<h>.models` has ≥2 entries, ask the user to pick one; else ask the user to type the model id (offer the known default first, e.g. `composer-2.5` for Cursor). Save defaults via `/configure`. |

Include subtask goal, exact files, and acceptance criteria in every dispatch prompt. Instruct each subagent to commit on its worktree branch.
