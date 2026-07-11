---
name: configure
description: Set up or update per-harness model defaults for plan-to-agents dispatch. Records which harnesses you use (Claude Code, Cursor, opencode, Pi) and the default model for each, so dispatch never has to ask or probe. User-invoked.
disable-model-invocation: true
---

# Configure

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

Call `AskUserQuestion` with `multiSelect: true` over the four harnesses:

- **Claude Code**
- **Cursor**
- **opencode**
- **Pi**

Write the selection to `enabled_harnesses`. On update, pre-check the currently-enabled ones.

## 3. Set models per harness

For each selected harness, ask for its `default_model`:

- **Cursor** — offer `composer-2.5` first.
- **Claude Code** — offer the harness default (`claude-opus-4-8`) first.
- **opencode** and **Pi** — ask the user to type the model id.

Optionally collect extra model ids for the `models` choose-from list. Do **not** probe the harness
to enumerate models — ask the user.

## 4. Write config

`mkdir -p` the config directory, then write
`${XDG_CONFIG_HOME:-$HOME/.config}/plan-to-agents/config.json`, merging onto any existing config
rather than clobbering unrelated fields. Confirm the path to the user.

## 5. Report

Show the resulting config and note how dispatch will use it (see `shared/model-resolution.md`):
repo override shallow-merges onto this user file; `default_model` skips prompts; `models` with two
or more entries triggers a picker; otherwise dispatch asks once per harness.
