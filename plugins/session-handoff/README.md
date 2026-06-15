# session-handoff

Compact the current conversation into a handoff document so a fresh agent can pick the work up. Works on both [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Cursor](https://cursor.com) from a single plugin install.

## What it does

| Skill | Trigger | Behavior |
|-------|---------|----------|
| `session-handoff` | "write a handoff doc", "summarize this session for another agent", "compact context before switching" | Writes a goal / state / next-steps / suggested-skills summary to the OS temp dir, references existing artifacts by path instead of duplicating, and redacts secrets |

Distinct from this library's [`agent-handoff`](../plan-to-agents/skills/agent-handoff/SKILL.md), which **dispatches a task to a subagent**. `session-handoff` **summarizes a conversation for a new session**.

## Install

Same two commands in Claude Code or Cursor (one-time per machine):

```text
/plugin marketplace add https://github.com/joemocode-business/joemocode-llm-plugins
/plugin install session-handoff@joemocode-llm-plugins
```

Cursor requires the full `https://github.com/...` URL above; the `owner/repo` shorthand is Claude Code only.

Restart after install.

## Provenance

Forked from [Matt Pocock's `handoff` skill](https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md) (MIT, © 2026 Matt Pocock). This is a starting point — evolve it into your own version.
