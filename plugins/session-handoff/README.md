# session-handoff

Capture the current conversation so a fresh agent — or your future self — can pick the work
up. At compaction time (the moment detail is about to be lost) it asks whether to **finish
the request** or write one of two handoff artifacts. Works on both
[Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Cursor](https://cursor.com)
from a single plugin install.

## What it does

| Skill | Trigger | Behavior |
|-------|---------|----------|
| `compact-handoff` | PreCompact hook (Claude Code), or "compact handoff" / before compacting | Asks the 3-way question — finish the request, research artifact, or agent-prompt handoff — then routes to the chosen skill |
| `session-research` | "write a research artifact", "dump the sources", or routed from `compact-handoff` | Dumps the session: important context, every captured source link with summaries, and what matters. Defaults to the whole conversation; honors a passed-in scope |
| `session-handoff` | "write a handoff doc", "summarize this session for another agent", or routed from `compact-handoff` | Writes a goal / state / next-steps / **sources** / suggested-skills prompt for the next agent |

Artifacts are written to `<repo>/.claude/handoffs/` (committable). Both skills reference
existing artifacts by path instead of duplicating them, and redact secrets.

Distinct from this library's
[`agent-handoff`](../plan-to-agents/skills/agent-handoff/SKILL.md), which **dispatches a
task to a subagent**. These skills **capture a conversation for a new session**.

## The PreCompact hook (Claude Code)

`hooks/hooks.json` registers a `PreCompact` hook (`hooks/precompact-handoff.sh`) that fires
on both `/compact` and automatic compaction. It **blocks the compaction once** and shows you
a message asking you to run `/compact-handoff` — so *you* drive the skill, while full context
is still intact. (On a PreCompact block, control returns to the user and the model doesn't
take a turn, so the prompt is a user-facing `systemMessage`, not agent steering.) The hook
stashes the `transcript_path` so the skill can build artifacts from the full pre-compaction
transcript even after live context is compacted.

- **Either choice:** run `/compact-handoff` to capture a handoff, or run `/compact` again to
  compact without one (the loop guard lets the second one through).
- **Loop guard:** blocks at most once per ~15 minutes per session.
- **Opt-out:** `export SESSION_HANDOFF_NO_PRECOMPACT=1` to disable the prompt for a session.

### Cursor

Cursor's `preCompact` hook is **observational only** — it cannot block compaction or notify
you in-conversation (only `sessionStart` can inject context). So no Cursor hook is wired; the
flow is the same user-driven one — invoke `compact-handoff`, `session-research`, or
`session-handoff` manually before compacting.

## Install

Same two commands in Claude Code or Cursor (one-time per machine):

```text
/plugin marketplace add https://github.com/joemocode-business/joemocode-llm-plugins
/plugin install session-handoff@joemocode-llm-plugins
```

Cursor requires the full `https://github.com/...` URL above; the `owner/repo` shorthand is
Claude Code only.

Restart after install.

## Provenance

`session-handoff` is forked from
[Matt Pocock's `handoff` skill](https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md)
(MIT, © 2026 Matt Pocock). This is a starting point — evolve it into your own version.
