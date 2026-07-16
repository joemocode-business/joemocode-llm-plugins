# Configure

Set up or update per-harness model defaults for plan-to-agents dispatch. Records which harnesses you use and the default model for each, so dispatch never has to ask or probe.

User-level config path: `${XDG_CONFIG_HOME:-$HOME/.config}/plan-to-agents/config.json`. Editing the in-repo `.plan-to-agents.json` override is a documented manual path (see `plugins/plan-to-agents/shared/model-resolution.md`), not this flow.

Schema shape: see `plugins/plan-to-agents/config.example.json` (`version`, `enabled_harnesses`, `harnesses.<slug>.default_model`, `harnesses.<slug>.models`).

## 1. Load and show current config

If `${XDG_CONFIG_HOME:-$HOME/.config}/plan-to-agents/config.json` exists, read and show it to the user before making changes.

## 2. Pick enabled harnesses

Call the **`question`** tool with `multiSelect: true` over the four harnesses:

- **Claude Code**
- **Cursor**
- **opencode**
- **Pi**

Map each selected display name to its **canonical slug** before writing:

- **Claude Code** → `claude-code`
- **Cursor** → `cursor`
- **opencode** → `opencode`
- **Pi** → `pi`

Write the mapped slugs to `enabled_harnesses`. On update, pre-check the currently-enabled ones.

## 3. Set models per harness

For each selected harness, call **`question`** to ask for its `default_model` (key each entry under `harnesses.<slug>` by the same canonical slug from step 2):

- **Cursor** — offer `composer-2.5` first.
- **Claude Code** — offer the harness default (`claude-opus-4-8`) first.
- **opencode** and **Pi** — include "Type something." via the question tool for custom model ids.

Optionally collect extra model ids for the `models` choose-from list. Do **not** probe the harness to enumerate models — ask the user.

## 4. Write config

`mkdir -p` the config directory, then write `${XDG_CONFIG_HOME:-$HOME/.config}/plan-to-agents/config.json`, merging onto any existing config rather than clobbering unrelated fields. Confirm the path to the user.

Run `plugins/plan-to-agents/shared/validate-config.sh` on the written file. If validation fails, surface the error output to the user and do not treat the config as saved until it passes.

## 5. Report

Show the resulting config, note that it was validated successfully, and explain how dispatch will use it (see `plugins/plan-to-agents/shared/model-resolution.md`).
