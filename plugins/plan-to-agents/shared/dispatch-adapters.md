# Dispatch adapters

One row per backend: **in-session** when the orchestrator runs in that harness, **headless** when shelling out to a different backend.

| Backend | In-session (backend == current harness) | Headless (backend != current harness) |
|---------|------------------------------------------|----------------------------------------|
| Claude Code | native subagents / `agent` CLI | `claude -p "<prompt>"` |
| Cursor | native `Task` tool | `cursor-agent` / `agent -p --model composer-2.5` |
| opencode | native `Task` subagents | `opencode run -m <model> "<prompt>"` |
| Pi | `bash`-to-agent / RPC | `pi --mode rpc` (JSONL) or `pi -p` print mode |
