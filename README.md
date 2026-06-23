# joemocode-llm-plugins

Joe's personal plugin library for sharing — dual-platform plugins for [Claude Code](https://code.claude.com/docs/en/quickstart) and [Cursor](https://cursor.com). Each plugin ships manifests for both environments.

## Install (one-time per machine)

Add the marketplace once, then install plugins by name. Works the same in **Claude Code** and **Cursor**:

```text
/plugin marketplace add https://github.com/joemocode-business/joemocode-llm-plugins
/plugin install plan-to-agents@joemocode-llm-plugins
```

Restart after install so hooks and skills load.

> **Cursor:** use the full `https://github.com/...` URL as shown. The `owner/repo` shorthand only works in Claude Code — Cursor's CLI rejects it and prompts for a URL.

**Marketplace name:** install commands use `@joemocode-llm-plugins` — that is the `name` in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json), not necessarily the GitHub repo slug.

**Private repo:** ensure your git credentials work for `joemocode-business/joemocode-llm-plugins` (e.g. `gh auth login`). For Claude Code background updates, set `GITHUB_TOKEN` or `GH_TOKEN` if needed.

### Updates

After a new release is pushed to GitHub:

```text
/plugin marketplace update joemocode-llm-plugins
/plugin update plan-to-agents@joemocode-llm-plugins
```

### Optional — auto-suggest in a project

To prompt install when someone trusts a repo, add to `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "joemocode-llm-plugins": {
      "source": {
        "source": "github",
        "repo": "joemocode-business/joemocode-llm-plugins"
      }
    }
  },
  "enabledPlugins": {
    "plan-to-agents@joemocode-llm-plugins": true
  }
}
```

Plugin details, migration from global hooks, and test checklist: [plugins/plan-to-agents/README.md](./plugins/plan-to-agents/README.md).

---

## Recommended stack: Plannotator + plan-to-agents

| Stage | Tool | Role |
|-------|------|------|
| Before approval | [Plannotator](https://github.com/backnotprop/plannotator) | Interactive plan review |
| After approval | plan-to-agents | Save plan to repo and route implementation |

**Plannotator — Claude Code:**

```text
/plugin marketplace add https://github.com/backnotprop/plannotator
/plugin install plannotator@plannotator
```

**Plannotator — Cursor** (skills only; no Plan Mode hook plugin yet):

```bash
mkdir -p ~/.cursor/skills
for skill in plannotator-annotate plannotator-review plannotator-last plannotator-setup-goal; do
  ln -sf ~/.claude/skills/"$skill" ~/.cursor/skills/"$skill"
done
```

Restart after install. See [Plannotator docs](https://plannotator.ai/docs/getting-started/installation/).

---

## Plugins

| Plugin | Description |
|--------|-------------|
| [plan-to-agents](./plugins/plan-to-agents/README.md) | Post-plan agent delegation: Claude→Cursor CLI, Cursor→Task subagents |
| [session-handoff](./plugins/session-handoff/README.md) | PreCompact hook + research/agent-prompt handoff artifacts: at compaction time, finish the request or capture the session for a fresh agent (forked from [mattpocock/skills](https://github.com/mattpocock/skills)) |

## Related external skills

Skills worth installing from upstream rather than re-publishing here. They install per-machine and update by re-running their installer.

| Source | Get it | Notes |
|--------|--------|-------|
| [mattpocock/skills](https://github.com/mattpocock/skills) — incl. `write-a-skill` | `pnpx skills@latest add mattpocock/skills` | Picker CLI; choose individual skills and target agent(s) (Claude Code and Cursor). Not a marketplace — `/plugin marketplace add` does not apply. |

## Roadmap

[docs/FUTURE.md](./docs/FUTURE.md) — publish to GitHub, Cursor Team Marketplace, Cursor plan hooks, cloud agent automation, CI, public catalog listing.

## Validate

```bash
node scripts/validate-marketplace.mjs
```

## License

This project is licensed under the [Apache License 2.0](./LICENSE).
