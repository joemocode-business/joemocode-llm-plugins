# session-handoff

Capture the current conversation so a fresh agent, or your future self, can pick the work
up. At compaction time (the moment detail is about to be lost) it asks whether to **finish
the request** or write one of two handoff artifacts. Ships for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Cursor](https://cursor.com), and [Pi](https://pi.dev).

## What it does

| Skill | Trigger | Behavior |
|-------|---------|----------|
| `compact-handoff` | PreCompact hook (Claude Code), Pi `session_before_compact` guard, or "compact handoff" / before compacting | Asks the 3-way question: finish the request, research artifact, or agent-prompt handoff, then routes to the chosen skill |
| `session-research` | "write a research artifact", "dump the sources", or routed from `compact-handoff` | Dumps the session: important context, every captured source link with summaries, and what matters. Defaults to the whole conversation; honors a passed-in scope |
| `session-handoff` | "write a handoff doc", "summarize this session for another agent", or routed from `compact-handoff` | Writes a goal / state / next-steps / **sources** / suggested-skills prompt for the next agent |

Artifacts are written to `<repo>/.claude/handoffs/` (committable). Both skills reference
existing artifacts by path instead of duplicating them, and redact secrets.

Distinct from this library's
[`agent-handoff`](../plan-to-agents/skills/agent-handoff/SKILL.md), which **dispatches a
task to a subagent**. These skills **capture a conversation for a new session**.

## Compaction behavior by harness

### Claude Code (blocking PreCompact hook)

`hooks/hooks.json` registers a `PreCompact` hook (`hooks/precompact-handoff.sh`) that fires
on both `/compact` and automatic compaction. It **blocks the compaction once** and shows you
a message asking you to run `/compact-handoff` while full context is still intact. (On a
PreCompact block, control returns to the user and the model does not take a turn, so the prompt
is a user-facing `systemMessage`, not agent steering.) The hook stashes the `transcript_path`
so the skill can build artifacts from the full pre-compaction transcript even after live
context is compacted.

- **Either choice:** run `/compact-handoff` to capture a handoff, or run `/compact` again to
  compact without one (the loop guard lets the second one through).
- **Loop guard:** blocks at most once per ~15 minutes per session.
- **Opt-out:** `export SESSION_HANDOFF_NO_PRECOMPACT=1` to disable the prompt for a session.

### Cursor (manual only)

Cursor's `preCompact` hook is **observational only**. It cannot block compaction or notify
you in-conversation (only `sessionStart` can inject context). This plugin does not register a
Cursor hook. Invoke `compact-handoff`, `session-research`, or `session-handoff` manually before
compacting.

### Pi (blocking extension)

The Pi package includes `pi/extensions/precompact-handoff.ts`, registered on
`session_before_compact`. It blocks compaction once per ~15 minutes per session (same intent
as Claude), honors `SESSION_HANDOFF_NO_PRECOMPACT=1`, and stashes the session file path for
skills. Run `/skill:compact-handoff` while context is intact, or compact again to skip capture.

Install via the shared repo package:

```bash
pi install git:github.com/joemocode-business/joemocode-llm-plugins@<sha-or-tag>
```

## Install

### Claude Code and Cursor (marketplace)

```text
/plugin marketplace add https://github.com/joemocode-business/joemocode-llm-plugins
/plugin install session-handoff@joemocode-llm-plugins
```

Cursor requires the full `https://github.com/...` URL above; the `owner/repo` shorthand is
Claude Code only.

Restart after install.

**Cursor runtime check (manual):** confirm skills load and that compaction stays manual (no
blocking hook). PreCompact behavior differs from Claude Code by design.

## Provenance

`session-handoff` is forked from
[Matt Pocock's `handoff` skill](https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md)
(MIT, © 2026 Matt Pocock). This is a starting point. Evolve it into your own version.
