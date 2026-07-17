---
name: configure
description: Set up or update per-harness model defaults for plan-to-agents dispatch. Records which harnesses you use (Claude Code, Cursor, opencode, Pi) and the default model for each, so dispatch never has to ask or probe. User-invoked.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Configure

## Runtime operations

| Harness | User questions | Invocation |
|---------|----------------|------------|
| Claude Code | `AskUserQuestion` | `/plan-to-agents:configure` skill |
| Cursor | `AskUserQuestion` | `/plan-to-agents:configure` skill |
| opencode | `question` | `/configure` skill (explicit-only via `permission.skill` denies in merged `opencode.json`; frontmatter honored on Claude Code / Cursor only) |
| Pi | `question` | `/configure` prompt |

Set up or update per-harness model defaults for plan-to-agents dispatch. Records which harnesses
you use and the default model for each, so dispatch never has to ask or probe.

User-level config path: `${XDG_CONFIG_HOME:-$HOME/.config}/plan-to-agents/config.json`. Editing the
in-repo `.plan-to-agents.json` override is a documented manual path (see
`shared/model-resolution.md`), not this flow.

Schema shape: see `config.example.json` in the plugin root (`version`, `enabled_harnesses`,
`harnesses.<slug>.default_model`, `harnesses.<slug>.models`).

## 1. Load and show current config

If `${XDG_CONFIG_HOME:-$HOME/.config}/plan-to-agents/config.json` exists, read and show it to the
user before making changes.

## 2. Pick enabled harnesses

Call the harness question tool with `multiSelect: true` over the four harnesses:

Use **`AskUserQuestion`** on Claude Code and Cursor; use **`question`** on opencode and Pi.

- **Claude Code**
- **Cursor**
- **opencode**
- **Pi**

Map each selected display name to its **canonical slug** before writing (the schema and
`validate-config.sh` require slugs, not display names):

- **Claude Code** → `claude-code`
- **Cursor** → `cursor`
- **opencode** → `opencode`
- **Pi** → `pi`

Write the mapped slugs to `enabled_harnesses`. On update, pre-check the currently-enabled ones.

## 3. Set models per harness

For each selected harness, ask for its `default_model` (key each entry under `harnesses.<slug>` by
the same canonical slug from step 2):

- **Cursor** — offer `composer-2.5` first.
- **Claude Code** — offer the harness default (`claude-opus-4-8`) first.
- **opencode** and **Pi** — ask the user to type the model id.

Optionally collect extra model ids for the `models` choose-from list. Do **not** probe the harness
to enumerate models — ask the user.

## 4. Write config

`mkdir -p` the config directory, then write
`${XDG_CONFIG_HOME:-$HOME/.config}/plan-to-agents/config.json`, merging onto any existing config
rather than clobbering unrelated fields. Confirm the path to the user.

Run `shared/validate-config.sh` on the written file. If validation fails, surface the error output
to the user and do not treat the config as saved until it passes.

## 5. Report

Show the resulting config, note that it was validated successfully, and explain how dispatch will
use it (see `shared/model-resolution.md`): top-level fields shallow-merge with the repo override
winning; the `harnesses` map merges per-slug and per-field; `default_model` skips prompts; `models`
with two or more entries triggers a picker; otherwise dispatch asks once per harness.
