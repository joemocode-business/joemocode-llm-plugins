# Model resolution

How a dispatch orchestrator picks the model for a chosen doer harness before shelling out or
spawning a subagent.

## Config locations

Config is layered; **first match wins** per field (see merge below):

1. **`<repo-root>/.plan-to-agents.json`** — optional in-repo override (pin a model for a repo or
   team; gitignorable).
2. **`${XDG_CONFIG_HOME:-$HOME/.config}/plan-to-agents/config.json`** — per-machine default.
3. **Neither exists** → ask the user at dispatch time.

Top-level fields are **shallow-merged** with the repo override winning field-by-field; unset
top-level fields inherit from the user file. The `harnesses` map is merged **per-slug and
per-field**: a repo override of one harness does not drop the user file's other harness entries.

Validate any config file (repo override or user default) with `shared/validate-config.sh` (or the
copy installed under `.opencode/plan-to-agents-shared/validate-config.sh` /
`~/.config/opencode/plan-to-agents-shared/validate-config.sh` after OpenCode install).

## Schema

| Field | Meaning |
|-------|---------|
| `enabled_harnesses` | Array of canonical harness slugs the user uses. Narrows the dispatch backend picker. Absent or empty → show all four. |
| `harnesses.<slug>.default_model` | Non-empty string model id passed straight to the headless command. `null`, absent, or empty string = not set. |
| `harnesses.<slug>.models` | Optional choose-from list of model ids. |

**Canonical harness slugs:** `claude-code`, `cursor`, `opencode`, `pi`.

See `config.example.json` in the plugin root for a full example.

## Resolution algorithm

Given a chosen harness `<h>`:

1. **Load config** — repo override merged onto user default (top-level fields shallow-merge; each
   `harnesses.<slug>` entry merges per-field); treat as empty if neither file exists.
2. If `harnesses.<h>.default_model` is set (a non-empty string) → **use it** and dispatch.
3. Else if `harnesses.<h>.models` has **2 or more** entries → ask the user to pick one from that
   list using the harness question tool:
   - Claude Code / Cursor: **`AskUserQuestion`**
   - opencode / Pi: **`question`**
4. Else → ask the user to type the model id (same question tools as step 3), offering the well-known
   default first where one exists (`composer-2.5` for Cursor, the harness default for Claude Code).
   Include a short note that the user can save a default and skip this prompt next time via the
   configure entry point for their harness:
   - Claude Code / Cursor: `/plan-to-agents:configure`
   - opencode / Pi: `/configure`

Because every path ends in a configured value or a direct question, the orchestrator never needs to
discover or validate a model itself (no `opencode models`, `auth list`, `curl`, or version/`which`
checks).
