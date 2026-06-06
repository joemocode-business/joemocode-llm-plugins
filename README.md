# joemocode-llm-plugins

A dual-platform plugin marketplace for [Claude Code](https://code.claude.com/docs/en/quickstart) and [Cursor](https://cursor.com). Plugins in this repo ship manifests for both platforms so you can install the same capabilities in either environment.

## Prerequisites

Install the CLIs before adding plugins from this marketplace.

### Claude Code

Native installer (recommended — auto-updates, no Node.js required):

**macOS, Linux, WSL:**

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows PowerShell:**

```powershell
irm https://claude.ai/install.ps1 | iex
```

Verify and start:

```bash
claude --version
claude
```

Add `~/.local/bin` to your `PATH` if `claude` is not found. See the [Claude Code quickstart](https://code.claude.com/docs/en/quickstart) for Homebrew, WinGet, and other options.

### Cursor Agent CLI

Required for `plan-to-agents` when Claude Code dispatches local implementation to Composer (`agent -p ...`).

**macOS, Linux, WSL:**

```bash
curl https://cursor.com/install -fsS | bash
```

**Windows PowerShell:**

```powershell
irm 'https://cursor.com/install?win32=true' | iex
```

Add to `PATH` (zsh example):

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

Verify:

```bash
agent --version
```

See [Cursor CLI installation](https://cursor.com/docs/cli/installation) for updates (`agent update`) and troubleshooting.

---

## Recommended stack: Plannotator + plan-to-agents

For the full plan workflow, install **[Plannotator](https://github.com/backnotprop/plannotator)** alongside `plan-to-agents`:

| Stage | Tool | Role |
|-------|------|------|
| Before approval | Plannotator | Interactive plan review — annotate, refine, approve or request changes in the browser |
| After approval | plan-to-agents | Save the plan into the repo and route implementation (Cursor cloud, local `agent` CLI, or Cursor Task subagents) |

They compose cleanly: Plannotator hooks into plan review; `plan-to-agents` handles post-approval dispatch only.

### Install Plannotator

**1. Install the `plannotator` CLI** (same binary for both tools):

**macOS / Linux / WSL:**

```bash
curl -fsSL https://plannotator.ai/install.sh | bash
```

**Windows PowerShell:**

```powershell
irm https://plannotator.ai/install.ps1 | iex
```

**2. Claude Code — install the plugin:**

```text
/plugin marketplace add backnotprop/plannotator
/plugin install plannotator@plannotator
```

Restart Claude Code after install. Plan review runs automatically on `ExitPlanMode`. The installer also copies Plannotator skills into `~/.claude/skills/`.

**3. Cursor — install skills for annotate/review commands:**

Plannotator does not ship a Cursor Plan Mode hook plugin today. After running the CLI installer above, expose the skills to Cursor:

```bash
mkdir -p ~/.cursor/skills
for skill in plannotator-annotate plannotator-review plannotator-last plannotator-setup-goal; do
  ln -sf ~/.claude/skills/"$skill" ~/.cursor/skills/"$skill"
done
```

Restart Cursor. Use skills such as `plannotator-annotate` and `plannotator-review` explicitly, or invoke `plannotator annotate <path>` from the terminal. Pair with `plan-to-agents` for post-approval implementation via `implement-plan` or `agent-handoff`.

See [Plannotator installation docs](https://plannotator.ai/docs/getting-started/installation/) for version pinning and attestation verification.

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
