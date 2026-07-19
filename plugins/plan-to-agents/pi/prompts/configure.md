# Configure

Set up or update per-harness model defaults for plan-to-agents dispatch. Records which harnesses you use and the default model for each, so dispatch never has to ask or probe.

User-level config path: `${XDG_CONFIG_HOME:-$HOME/.config}/plan-to-agents/config.json`. A repo-root `.plan-to-agents.json` can override this file field-by-field at dispatch time (not edited here).

**Schema** — `version` (number), `enabled_harnesses` (array of canonical slugs), `harnesses.<slug>.default_model` (non-empty string or `null`), `harnesses.<slug>.models` (array of strings). Canonical slugs: `claude-code`, `cursor`, `opencode`, `pi`.

```json
{
  "version": 1,
  "enabled_harnesses": ["opencode", "claude-code"],
  "harnesses": {
    "claude-code": { "default_model": "claude-opus-4-8", "models": [] },
    "cursor":      { "default_model": "composer-2.5",   "models": [] },
    "opencode": {
      "default_model": "vllm/Qwen/Qwen3-Coder-30B-A3B-Instruct",
      "models": ["vllm/Qwen/Qwen3-Coder-30B-A3B-Instruct", "anthropic/claude-sonnet-5"]
    },
    "pi": { "default_model": null, "models": [] }
  }
}
```

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

## 4. Write and validate config

`mkdir -p` the config directory, then write `${XDG_CONFIG_HOME:-$HOME/.config}/plan-to-agents/config.json`. Treat the config loaded in step 1 as the merge base:

- Replace `enabled_harnesses` with the canonical slugs selected in step 2.
- Preserve unrelated top-level fields.
- Merge the `harnesses` map per canonical slug. Keep entries for harnesses the user did not edit, including harnesses that are no longer enabled.
- For each edited `harnesses.<slug>` entry, merge per field. Replace only the `default_model` and `models` fields collected in step 3, and preserve any other existing fields.
- Replace arrays as complete values; do not concatenate old and new `enabled_harnesses` or `models` arrays.

Do not replace the whole `harnesses` object with only the selected harnesses. Confirm the written path to the user.

Validate the written JSON yourself before treating it as saved:

- Valid JSON
- `version` is a number (if present)
- `enabled_harnesses` is an array containing only canonical slugs (`claude-code`, `cursor`, `opencode`, `pi`) with no unknown or duplicate slugs
- `harnesses` is an object keyed only by canonical slugs
- Each present harness's `default_model` is a non-empty string or `null`
- Each present `models` is an array of strings

If validation fails, surface the errors to the user and do not treat the config as saved until it passes.

## 5. Report

Show the resulting config, note that it was validated successfully, and explain how dispatch will use it: top-level fields from the repo-root `.plan-to-agents.json` override this file, while the `harnesses` map merges per canonical slug and per field. If neither config exists, dispatch asks the user.
