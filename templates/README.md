# Project templates

## `claude-project-settings.json`

Per-repo recommendation block that makes Claude Code **prompt to install**
`session-handoff` and `plan-to-agents` when you trust the project folder.

### Use it in a new project

If the project has no `.claude/settings.json` yet, just copy it in:

```bash
mkdir -p .claude
cp /path/to/joemocode-llm-plugins/templates/claude-project-settings.json .claude/settings.json
```

If the project already has a `.claude/settings.json`, merge the two keys in
(`extraKnownMarketplaces`, `enabledPlugins`) with `jq`:

```bash
jq -s '.[0] * .[1]' .claude/settings.json \
  /path/to/joemocode-llm-plugins/templates/claude-project-settings.json \
  > .claude/settings.json.tmp && mv .claude/settings.json.tmp .claude/settings.json
```

Commit `.claude/settings.json`. Next time the folder is trusted, Claude Code
prompts to install both plugins.

### How updates work

- The plugins use **commit-SHA versioning** (no `version` field), so every new
  commit pushed to `main` is treated as a new version.
- `"autoUpdate": true` on the marketplace entry refreshes the marketplace and
  pulls those updates at startup; you'll be nudged to run `/reload-plugins`.
- Auto-update for third-party marketplaces is off by default, which is why it's
  set explicitly here.
