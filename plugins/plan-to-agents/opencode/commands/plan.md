---
description: Draft an implementation plan and write it to docs/plans/
agent: plan
---

Write an implementation plan for: $ARGUMENTS

Follow these conventions exactly.

## Filename and location

Write the plan to:

```
docs/plans/YYYY-MM-DD-<descriptive-kebab-slug>.md
```

- Date = today (`YYYY-MM-DD`).
- Slug = 3–6 word kebab-case summary derived from the plan title (never a random slug).
- Create `docs/plans/` if missing.

Record the chosen filename near the top of the plan body, e.g. `Intended filename: YYYY-MM-DD-<slug>.md`.

## Frontmatter (line 1, no leading blank line)

```yaml
---
title: <Human-readable plan title>
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
status: draft
---
```

Use the actual session date. Start at `status: draft`.

## Sections

Include exactly these sections in order:

1. **Context** — why this change is being made
2. **Approach** — recommended approach
3. **Verification** — how to test end-to-end

Keep the plan focused and actionable. Do not implement — planning only.

When finished, confirm the absolute path of the written file.
