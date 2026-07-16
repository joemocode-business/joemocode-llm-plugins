---
name: planning
description: Use when writing, drafting, or refining an implementation plan (e.g. "write a plan", "draft a plan", "plan this", or working in Plan Mode). Ensures the plan has a descriptive task-based name, a date in the filename, and frontmatter with title/created/last_updated/status.
disable-model-invocation: false
---

# Planning

## Runtime operations

| Harness | Plan authoring | Post-approval dispatch |
|---------|----------------|------------------------|
| Claude Code | Plan Mode + this skill | `plan-dispatch` skill (via `ExitPlanMode` hook) |
| Cursor | Plan Mode + this skill | `plan-dispatch` skill (via `afterFileEdit` hook) |
| opencode | Built-in Plan agent + `/planning` skill | `/plan-dispatch` skill |
| Pi | This skill + `/planning` if needed | `/plan-dispatch` prompt |

Use this skill whenever you write, draft, or refine an implementation plan.

## 1. Read the template

Read `plan-template.md` in **this skill's directory** (same folder as this file) and follow its structure for every plan you produce.

## 2. Choose a descriptive name

- Pick a **human-readable title** that summarizes the task.
- Derive a **3–6 word kebab-case slug** from that title (e.g. `add-last-updated-frontmatter`).
- **Never** keep the harness's random slug — always replace it with your descriptive name.

## 3. Write frontmatter

The plan file must **start on line 1** with YAML frontmatter (no leading comment or blank line, or parsers won't recognize it):

| Key | Value |
|-----|-------|
| `title` | Your human-readable plan title |
| `created` | Today's date (`YYYY-MM-DD`) |
| `last_updated` | Today's date (`YYYY-MM-DD`) — bump to today on every edit |
| `status` | One of `draft`, `approved`, `implemented`; start at `draft` |

Use the **actual session/current date** — do not guess or use a placeholder.

On **every subsequent edit** of the plan, bump `last_updated` to today's date.

## 4. Record the intended filename

The on-disk filename must be:

```
YYYY-MM-DD-<descriptive-kebab-name>.md
```

where the date is the day the plan was created and the name is a 3–6 word kebab-case summary of the task (not a random slug) — e.g. `2026-06-10-add-last-updated-frontmatter.md`.

All planners (Claude Code, Cursor, opencode, Pi) should save plans to `<repo>/docs/plans/` using the filename above. In the parent harness's Plan Mode the harness may fix the path while you draft; **plan-dispatch** (skill or `/plan-dispatch` prompt on Pi) performs the final rename at save time into `docs/plans/`. To make that rename unambiguous, record the intended filename in the plan body (e.g. a short note near the top or in a `## Metadata` line):

```
Intended filename: YYYY-MM-DD-<descriptive-kebab-name>.md
```

## 5. Fill in the plan sections

Complete the template sections:

- **Context** — why this change is being made
- **Approach** — recommended approach
- **Verification** — how to test end-to-end
