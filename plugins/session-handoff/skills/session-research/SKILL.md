---
name: session-research
description: Dump the current session as a research artifact — important context, every captured documentation/source link with summaries, and what matters most. Use when the user says "write a research artifact", "capture this session's research", "dump the sources", or when routed here by the compact-handoff skill.
argument-hint: "Optional scope/type (default: whole conversation)"
disable-model-invocation: false
---

# Session research artifact

Write a research dump of the session so its findings and sources survive into a fresh
context. Save it to `<cwd>/.claude/handoffs/`.

## Source of content

- If a `transcript_path` was provided (e.g. by the `compact-handoff` / PreCompact flow),
  read it for **full fidelity** — the whole conversation may already be compacted in live
  context, but the transcript JSONL on disk still holds the detail and the links.
- Otherwise, summarize the current conversation.

## Scope

Default to the **whole conversation**. If the user passed a scope/type argument, honor it
and narrow the artifact to that topic (e.g. `research: auth flow` → only auth-related
context and sources).

## Output

Write to `<cwd>/.claude/handoffs/YYYY-MM-DD-<slug>-research.md`, where `<slug>` is a short
kebab-case description of the session topic. Create the directory if needed. Use these
sections:

- **Summary** — what the session is about and what matters most, in a few sentences.
- **Key context** — the important decisions, findings, and current state.
- **Sources** — every captured link with a one-line summary AND why it matters:
  - URLs fetched/searched (WebFetch / WebSearch results),
  - referenced files as `path:line`,
  - commits, PRs, issues, docs.

  Order by relevance. Each entry: `- <link or path> — <one-line summary; why it matters>`.

## Leave out / redact

- Don't duplicate content already captured in plans, PRDs, ADRs, issues, commits, diffs —
  reference them by path or URL instead.
- Redact secrets: API keys, passwords, tokens, personally identifiable information.
