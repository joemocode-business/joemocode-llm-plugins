---
name: planning
description: Use when writing, drafting, or refining an implementation plan (e.g. "write a plan", "draft a plan", "plan this", or working in Plan Mode). Ensures the plan has a descriptive task-based name, a date in the filename, and frontmatter with title/created/last_updated/status.
disable-model-invocation: false
---

# Planning

Use this skill whenever you write, draft, or refine an implementation plan.

## 1. Read the template

Read `plan-template.md` in **this skill's directory** (same folder as this file) and follow its structure for every plan you produce.

## 2. Choose a descriptive name

- Pick a **human-readable title** that summarizes the task.
- Derive a **3–6 word kebab-case slug** from that title (e.g. `add-last-updated-frontmatter`).
- **Never** keep the harness's random slug — always replace it with your descriptive name.

## 3. Write frontmatter

At the top of the plan (after any HTML comment block from the template), include YAML frontmatter with:

| Key | Value |
|-----|-------|
| `title` | Your human-readable plan title |
| `created` | Today's date (`YYYY-MM-DD`) |
| `last_updated` | Today's date (`YYYY-MM-DD`) |
| `status` | `draft` |

Use the **actual session/current date** — do not guess or use a placeholder.

On **every subsequent edit** of the plan, bump `last_updated` to today's date.

## 4. Record the intended filename

The on-disk filename must be:

```
YYYY-MM-DD-<descriptive-kebab-name>.md
```

In Claude Code Plan Mode the harness fixes the path while you draft; the **plan-dispatch** skill performs the final rename at save time. To make that rename unambiguous, record the intended filename in the plan body (e.g. a short note near the top or in a `## Metadata` line):

```
Intended filename: YYYY-MM-DD-<descriptive-kebab-name>.md
```

## 5. Fill in the plan sections

Complete the template sections:

- **Context** — why this change is being made
- **Approach** — recommended approach
- **Verification** — how to test end-to-end
