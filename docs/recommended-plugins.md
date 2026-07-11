# Recommended Plugins & Security Vetting

What to install for a **research → plan → implement** workflow across Claude
Code, Cursor, opencode, and Pi — and how to vet third-party packages before
trusting them.

> For *how Pi is configured and managed* (config layers, sharing your own
> config, RPC/SDK interop), see [pidev-setup.md](./pidev-setup.md).

## The research → plan → implement stack

You already own most of the plan/implement half in this repo.

| Stage | Tool | Status |
|-------|------|--------|
| Research | built-in read/grep/bash + web fetch; a thin "research" skill that codifies your method | build a skill |
| Plan | [Plannotator](https://github.com/backnotprop/plannotator) (interactive review) + [plan-to-agents](../plugins/plan-to-agents/README.md) | in repo |
| Implement | [plan-to-agents](../plugins/plan-to-agents/README.md) (two-step dispatch to Claude / Cursor / opencode / Pi) | in repo |

## plan-to-agents — opencode

For opencode as planner or doer, install markdown agents and commands via the
symlink installer (opencode's npm `"plugin"` array cannot ship agents/commands):

```bash
bash plugins/plan-to-agents/opencode/install-opencode.sh          # project → .opencode/
bash plugins/plan-to-agents/opencode/install-opencode.sh --global   # global → ~/.config/opencode/
```

Use **one** scope only. Commands: `/plan`, `/plan-dispatch`, `/implement-plan`,
`/agent-handoff`. opencode-as-doer uses native `Task` subagents; headless target
from another harness: `opencode run -m <model>`. Details:
[pidev-setup.md § plan-to-agents — opencode](./pidev-setup.md#plan-to-agents--opencode).

## plan-to-agents — Pi

Install this repo as a Pi package (pinned ref):

```bash
pi install git:github.com/joemocode-business/joemocode-llm-plugins@<sha-or-tag>
```

Do **not** also symlink the same skills into `~/.claude/skills` — that
double-loads. Pi-as-doer: `pi --mode rpc` or `bash`-to-agent per subtask.
Details: [pidev-setup.md § plan-to-agents — Pi](./pidev-setup.md#plan-to-agents--pi).

### Honest note on the Pi package gallery

The pi.dev/packages gallery is new and small. Rather than chase named
third-party packages that may be unmaintained or unauditable, the durable
recommendations are sources whose provenance you control or can read:

- **Your own** plan-to-agents / session-handoff (re-export this repo as a Pi
  package — see [pidev-setup.md](./pidev-setup.md#b-reusable-capabilities--this-repo-joemocode-llm-plugins)).
- **mattpocock/skills** — `pnpx skills@latest add mattpocock/skills`. Markdown
  skills, low risk, already referenced in the repo README.
- **Anthropic's official skills** — markdown, vetted source.

### Stack-specific skills worth authoring

Markdown + scripts, portable across Claude Code / Cursor / opencode / Pi.
Tailored to your
stack (TypeScript, React/SolidJS, React Native, AWS/fly.io/supabase, serverless,
DynamoDB):

- `vitest` runner skill
- `oxlint` gate (see deterministic gates below)
- `aws-serverless` scaffolding skill
- `dynamodb-single-table` reference skill

### Deterministic gates — make linters/tests hooks, not skills

Model-invoked skills are non-deterministic. Enforce with **hooks/extensions**
that fire on events:

- Claude Code: PostToolUse hook running `oxlint` / `vitest`.
- Pi: an extension or hook in the same package.

The model suggests; the hook enforces. Keep enforcement out of the prompt layer.

## Vetting third-party packages

A Pi package can ship `extensions/` (`.ts`/`.js` **code**), `skills`/`prompts`
(markdown), and `themes` (json). Risk is **not uniform** — rank by blast radius.

### Risk tiers

1. **`extensions/` (`.ts`/`.js`) — highest. Arbitrary code in the agent process.**
   Read the source before installing. Red flags:
   - network calls (`fetch`/`http`)
   - reads of `process.env`, `~/.aws`, `~/.ssh`, `~/.pi/agent/credentials`
   - `child_process` / `exec`
   - writes outside the project
   - minified/obfuscated/base64 blobs
   - telemetry / "phone home"
   - `postinstall` scripts
2. **Hooks / shell scripts — high.** Run on triggers, often unattended. Read
   every line. `curl … | sh`, credential reads, and "disable confirmation"
   patterns are disqualifying.
3. **Skills / prompts (`.md`) — lower, but real (prompt injection).** A skill can
   *instruct* the agent to run dangerous bash or exfiltrate. Skim for "run this
   curl", "export your token", "ignore previous safeguards".
4. **Themes (`.json`) — negligible.**

### Process rules

- **Pin versions.** `npm:@scope/pkg@1.2.3`, `git:…@<tag-or-sha>` — never floating
  `@latest` for anything that runs code.
- **Treat `.pi/settings.json` auto-install as a supply-chain surface.** When you
  "trust" a cloned repo, its committed settings can pull packages on startup.
  Review that file *before* first run in any repo you didn't author.
- **Prefer markdown-only, source-available, single-trusted-maintainer, small.**
  A 40-line skill you can read beats a clever extension you can't.
- **Sandbox unknowns first.** Run a new package in a throwaway container/VM with
  no real credentials mounted before letting it near a real project. Keep secrets
  out of the agent-accessible env where possible.
- **Use Pi's permission model.** Constrain installed skills via `allowed-tools`
  / tool gating in SKILL.md frontmatter.

### Net recommendation

Publish your own skills and curate a short allowlist of readable, pinned,
markdown-first packages rather than chasing the gallery. Accept `extensions/`
only from sources you would `git blame` line by line.

## Security testing & sandboxing

Two distinct concerns. Pi's own docs make the second urgent: **Pi ships no
built-in sandbox** — built-in tools and extensions run with your full process
permissions, and the project trust model is only an input-loading guard, not a
runtime restriction.

### A. Using Pi to security-test your code

- **`@vigolium/piolium`** — `pi install npm:@vigolium/piolium@<ver>`. Multi-phase
  security audits with specialist sub-agents, isolated context windows, capped
  concurrency, resumable state. The most directly "security testing" package in
  the gallery.
- **`pi-hermes-memory`** — `pi install npm:pi-hermes-memory@<ver>`. Bundles
  **secret scanning** alongside memory/session search.
- **Claude Code `/security-review`** — diff-scoped review skill. Markdown,
  lowest-risk, and portable to Pi (Pi reads `~/.claude/skills`). Good default.
- **Deterministic scanning gate** — wire `gitleaks` / `semgrep` as a hook so
  scanning is enforced, not model-dependent (see deterministic gates above).

### B. Hardening Pi itself

Real isolation comes from the OS/container boundary, not from Pi:

- **Official sandbox extension** — in the Pi repo at
  `packages/coding-agent/examples/extensions/sandbox/`, built on
  `@anthropic-ai/sandbox-runtime`, with configurable filesystem/network
  restrictions. Closest to first-party.
- **`pi-landstrip`** / **carderne `pi-sandbox`** — OS-level (Landlock /
  namespaces) sandboxing with interactive permission prompts.
- **brownag `pi-sandbox`** — Bubblewrap (`bwrap`) setup scripts.
- **`@gotgenes/pi-permission-system`** — permission-enforcement extension
  (allowlists / gating).
- **Built-in trust model** — `defaultProjectTrust` (default `"ask"`), decisions
  stored in `~/.pi/agent/trust.json`, overridable per session with `--approve` /
  `-a` or `--no-approve` / `-na`. Use it, but it guards only *input loading*, not
  what tools do once you are working.

### The irony — vet the security tools hardest

A sandbox or permission **extension is itself `.ts` running with full
permissions** → Tier 1 (highest scrutiny) under the risk tiers above. Read the
source, pin the version (`npm:…@x.y.z`, never `@latest`), and prefer the official
example extension or community ones you can `git blame`. For genuinely untrusted
work, run Pi in a container / VM / micro-VM with only the workspace mounted and
**not** host `~/.pi/agent` — that beats any in-process extension.

## Sources

- Pi security model (no built-in sandbox, trust model, `defaultProjectTrust`, `trust.json`) — <https://pi.dev/docs/latest/security>
- Pi packages gallery — <https://pi.dev/packages>
- Official sandbox extension (`@anthropic-ai/sandbox-runtime`) — <https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/sandbox/index.ts>
- carderne/pi-sandbox — <https://github.com/carderne/pi-sandbox>
- brownag/pi-sandbox — <https://github.com/brownag/pi-sandbox>
- Building a safe sandbox around Pi — <https://dasroot.net/posts/2026/04/build-safe-sandbox-pi-dev-coding-agents/>
- Pi sandbox analysis — <https://agent-safehouse.dev/docs/agent-investigations/pi>
- Pi packages (manifest, distribution, auto-install) — <https://pi.dev/docs/latest/packages>
- Pi skills & extensions (Agent Skills standard, `allowed-tools`) — <https://pi.dev/docs/latest/skills>
- Pi quickstart / config layout — <https://pi.dev/docs/latest/quickstart>
- Plannotator — <https://github.com/backnotprop/plannotator>
- mattpocock/skills — <https://github.com/mattpocock/skills>

*Captured 2026-06-17. Pi docs track `latest`; re-verify before relying on
specific behaviors.*
