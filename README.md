# joemocode-llm-plugins

Joe's personal plugin library for sharing — dual-platform plugins for [Claude Code](https://code.claude.com/docs/en/quickstart) and [Cursor](https://cursor.com). Each plugin ships manifests for both environments.

## Recommended stack: Plannotator + plan-to-agents

For the full plan workflow, pair **[Plannotator](https://github.com/backnotprop/plannotator)** with `plan-to-agents`:

| Stage | Tool | Role |
|-------|------|------|
| Before approval | Plannotator | Interactive plan review — annotate, refine, approve or request changes |
| After approval | plan-to-agents | Save the plan into the repo and route implementation |

**Plannotator — Claude Code:**

```text
/plugin marketplace add backnotprop/plannotator
/plugin install plannotator@plannotator
```

**Plannotator — Cursor** (skills only; no Plan Mode hook plugin yet):

```bash
mkdir -p ~/.cursor/skills
for skill in plannotator-annotate plannotator-review plannotator-last plannotator-setup-goal; do
  ln -sf ~/.claude/skills/"$skill" ~/.cursor/skills/"$skill"
done
```

Restart after install. See [Plannotator docs](https://plannotator.ai/docs/getting-started/installation/) for details.

---

## Install plugins from this marketplace

### Claude Code

```text
/plugin marketplace add joemocode-business/joemocode-llm-plugins
/plugin install plan-to-agents@joemocode-llm-plugins
```

### Cursor

```text
/plugin marketplace add joemocode-business/joemocode-llm-plugins
/plugin install plan-to-agents@joemocode-llm-plugins
```

## Plugins

| Plugin | Description |
|--------|-------------|
| [plan-to-agents](./plugins/plan-to-agents/README.md) | Post-plan agent delegation: Claude→Cursor CLI, Cursor→Task subagents |

## Validate

```bash
node scripts/validate-marketplace.mjs
```

## License

This project is licensed under the [Apache License 2.0](./LICENSE).
