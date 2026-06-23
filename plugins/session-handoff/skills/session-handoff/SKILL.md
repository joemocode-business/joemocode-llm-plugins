---
name: session-handoff
description: Compact the current conversation into a handoff document so a fresh agent can continue the work. Use when the user says "write a handoff doc", "summarize this session for another agent", "compact context before switching", or is about to hand the thread to a new session.
argument-hint: "What will the next session be used for?"
disable-model-invocation: false
---

# Session handoff

Write a handoff document summarising the current conversation so a fresh agent can continue
the work. Save it to `<cwd>/.claude/handoffs/`.

## Source of content

If a `transcript_path` was provided (e.g. by the `compact-handoff` / PreCompact flow), read
it for full fidelity — the live context may already be compacted, but the transcript JSONL
on disk still holds the detail. Otherwise, summarise the current conversation.

## What to include

- **Goal** — what the work is trying to achieve, in one or two sentences.
- **State** — what is done, what is in progress, what is blocked.
- **Next steps** — the concrete actions the next session should take first.
- **Sources** — the links and files that matter to the next task, each with a one-line
  summary, ordered by relevance: fetched/searched URLs, referenced files as `path:line`,
  commits, PRs, issues, docs.
- **Suggested skills** — a short list of skills the next agent should invoke.

## Output

Write to `<cwd>/.claude/handoffs/YYYY-MM-DD-<slug>-handoff.md`, where `<slug>` is a short
kebab-case description of the work. Create the directory if needed.

## What to leave out

- Do **not** duplicate content already captured in other artifacts (PRDs, plans, ADRs,
  issues, commits, diffs). Reference them by path or URL instead.
- Redact sensitive information: API keys, passwords, tokens, personally identifiable
  information.

## Arguments

If the user passed an argument, treat it as a description of what the next session will
focus on and tailor the document toward that.

---

_Forked from [Matt Pocock's `handoff` skill](https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md) (MIT, © 2026 Matt Pocock). Renamed to `session-handoff` to disambiguate from this library's `agent-handoff` (task dispatch) skill. Evolve freely._
