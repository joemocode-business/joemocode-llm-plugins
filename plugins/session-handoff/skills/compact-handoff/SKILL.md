---
name: compact-handoff
description: At compaction time, ask whether to finish the current request or capture a handoff artifact (research dump or agent-prompt). Invoked automatically by the PreCompact hook, or manually before compacting. Use when the user says "compact handoff", "handoff before compact", or the PreCompact hook asks to invoke it.
argument-hint: "Optional scope/type for the artifact (e.g. 'research: auth flow')"
disable-model-invocation: false
---

# Compact handoff

The conversation is about to be compacted (or the user invoked this directly). Before
detail is lost, ask how to proceed and route to the right artifact generator.

On Claude Code the `PreCompact` hook **blocks the compaction once** and shows the user a
message asking them to run `/compact-handoff` — so the user drives this skill, the same way
they do on Cursor (whose `preCompact` hook is observational and can neither block nor steer).

When the hook blocked compaction it stashed the full transcript path at
`${TMPDIR:-/tmp}/session-handoff-transcript-<session_id>`. To recover it, read the
most-recently-modified `session-handoff-transcript-*` file in the temp dir and use that as
the `transcript_path` for full-fidelity artifacts:

```bash
cat "$(ls -t "${TMPDIR:-/tmp}"/session-handoff-transcript-* 2>/dev/null | head -n1)"
```

If no such file exists (e.g. invoked manually outside the hook flow), summarize live context.

## What to do

1. **Ask** — ask the user — `AskUserQuestion` on Claude Code / Cursor, the `question` tool on Pi — with exactly these three options:

   - **Finish the request** — do nothing; keep working. (On Claude Code, the next
     compaction will proceed normally — the hook's loop guard won't block again this
     window.)
   - **Research artifact** — invoke the `session-research` skill to dump the session's
     important context, every captured source link, and a summary of what matters.
   - **Agent-prompt handoff** — invoke the `session-handoff` skill to write a prompt
     telling the next agent what to do, what happened, and the relevant sources.

2. **Route** — branch on the answer:
   - *Finish the request* → stop. Confirm you're continuing; take no further handoff action.
   - *Research artifact* → invoke `session-research`.
   - *Agent-prompt handoff* → invoke `session-handoff`.

3. **Pass context through** — when forwarding to the chosen skill, pass along:
   - the recovered `transcript_path` (see above) so the artifact is built from the
     **full pre-compaction transcript**, not just live context;
   - any scope/type argument the user supplied (default: the whole conversation).

Both artifact skills write to `<cwd>/.claude/handoffs/`.
