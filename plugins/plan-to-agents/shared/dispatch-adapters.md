# Dispatch adapters

How to dispatch work **to each supported backend** from any orchestrator harness. The `<model>` used in headless commands below is resolved via [model-resolution.md](./model-resolution.md), so that placeholder has a single, unambiguous source. After the user picks a doer backend in step 2 of dispatch, use that backend's row — regardless of which harness is running the orchestrator.

| Target backend | In-session (orchestrator runs in this harness) | Headless (orchestrator runs in a different harness) |
|----------------|------------------------------------------------|------------------------------------------------------|
| Claude Code | native subagents | `claude -p "<prompt>"` |
| Cursor | native `Task` tool | `cursor-agent` / `agent -p --model composer-2.5` |
| opencode | native `Task` subagents | `opencode run -m <model> "<prompt>"` |
| Pi | `bash`-to-agent / RPC | `pi --mode rpc` (JSONL) or `pi -p` print mode |

When the chosen backend matches the current harness, use the **in-session** column. When it differs, **shell out** using the **headless** column for that same row.
