# Dispatch adapters

How to dispatch work **to each supported backend** from any orchestrator harness. The `<model>` used in headless commands below is resolved via [model-resolution.md](./model-resolution.md). After the user picks a doer backend in step 2 of dispatch, use that backend's row — regardless of which harness is running the orchestrator.

| Target backend | In-session (orchestrator runs in this harness) | Headless (orchestrator runs in a different harness) |
|----------------|------------------------------------------------|------------------------------------------------------|
| Claude Code | Native subagents via the **`Task`** tool (`subagent_type`: `plan-phase-implementer`, `plan-verifier`) | `claude -p "<prompt>"` |
| Cursor | Native **`Task`** tool (`subagent_type`: `plan-phase-implementer`, `plan-verifier`) | `agent -p --model <model> "<prompt>"` (e.g. `composer-2.5`) |
| opencode | Native **`task`** tool (`plan-phase-implementer`, `plan-verifier` subagents from `.opencode/agents/` or `~/.config/opencode/agents/`) | `opencode run -m <model> "<prompt>"` |
| Pi | Native **`subagent`** tool (`agent`: `plan-phase-implementer`, `plan-verifier` from the installed package's `pi/agents/`) | `pi --mode rpc` (JSONL) or `pi -p "<prompt>"` |

When the chosen backend matches the current harness, use the **in-session** column. When it differs, **shell out** using the **headless** column for that same row.

## Per-harness user questions

| Harness | Tool for dispatch/configuration prompts |
|---------|----------------------------------------|
| Claude Code | **`AskUserQuestion`** |
| Cursor | **`AskUserQuestion`** |
| opencode | **`question`** |
| Pi | **`question`** (plan-to-agents extension) |

## Installed shared docs (OpenCode)

After `opencode/install-opencode.sh`, orchestration and model docs are symlinked into exactly one scope:

| Scope | Path |
|-------|------|
| Project | `.opencode/plan-to-agents-shared/{orchestration-pattern,dispatch-adapters,model-resolution}.md` and `validate-config.sh` |
| Global | `~/.config/opencode/plan-to-agents-shared/` (same filenames) |

Reference these paths from OpenCode skills instead of the plugin source tree.

## Configure entry points

| Harness | Invocation |
|---------|------------|
| Claude Code | `/plan-to-agents:configure` skill (`configure`) |
| Cursor | `/plan-to-agents:configure` skill (`configure`) |
| opencode | `/configure` skill |
| Pi | `/configure` prompt template |

## Pi explicit workflow prompts

When Pi is the orchestrator harness, use package prompt templates (not Claude/Cursor skills):

| Workflow | Pi prompt |
|----------|-----------|
| Post-approval dispatch | `/plan-dispatch` |
| Implement a plan file | `/implement-plan` |
| Model defaults setup | `/configure` |
| Archive/delete old plans | `/clear-plans` |
