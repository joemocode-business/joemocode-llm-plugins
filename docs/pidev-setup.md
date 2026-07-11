# Pi.dev — Setup & Configuration Management

How to set up Pi, where its config lives, how to share your own config across
environments, and how Pi interoperates with other harnesses (Claude Code,
Cursor, opencode) and the plugins in this repo.

> For *what to install* (recommended plugins, the research→plan→implement stack,
> and security vetting), see [recommended-plugins.md](./recommended-plugins.md).

## What Pi is

Pi is a CLI coding agent distributed as an npm package
(`@earendil-works/pi-coding-agent`). It runs in your project directory and
drives a model through `read` / `write` / `edit` / `bash` tools (plus read-only
helpers like grep/find via config).

Three layers matter:

| Layer | Lives in | Purpose |
|-------|----------|---------|
| Machine/global config | `~/.pi/agent/` | credentials, sessions, global `AGENTS.md`, settings, themes, installed packages |
| Project context | `AGENTS.md` or `CLAUDE.md` (discovered walking up from cwd) | per-project instructions |
| Packages ("plugins") | `package.json` with a `pi` key | shareable extensions/skills/prompts/themes |

**Key compatibility fact:** Pi implements the Agent Skills standard and can read
`~/.claude/skills` directly, and it discovers `CLAUDE.md` as a context file. The
skills and context files you already use with Claude Code work in Pi with no
rewrite.

## Where config lives

Everything machine-local sits under `~/.pi/agent/`:

- `~/.pi/agent/AGENTS.md` — global instructions loaded first.
- credentials, sessions, settings.
- installed packages: `~/.pi/agent/npm/`, `~/.pi/agent/git/<host>/<path>`.

Skill discovery locations:

- Global: `~/.pi/agent/skills/`, `~/.agents/skills/`
- Project: `.pi/skills/`, `.agents/skills/`
- Packages: `skills/` directories declared in a `package.json`
- Cross-harness: point config at `~/.claude/skills`

## Authentication

Pi supports subscription logins (Claude Pro/Max, ChatGPT Plus) and provider API
keys. Pick a model provider per session with `--provider <name>` /
`--model <pattern>`, or switch at runtime (`set_model`, `cycle_model` in RPC).

## Sharing your own config — two-repo strategy

Split by lifecycle. These are different concerns and belong in different places:

### A. Personal environment → a separate `pi-config` / dotfiles repo (private)

Machine state you pull and symlink into `~/.pi/agent/`:

- `~/.pi/agent/AGENTS.md` — your cross-project defaults (e.g. TypeScript,
  pnpm-only, oxlint, vitest, serverless/DynamoDB leanings).
- settings, themes, keybindings.

Use stow/symlinks so a fresh machine is: `git clone` → symlink → start coding.

### B. Reusable capabilities → this repo (`joemocode-llm-plugins`)

Skills, agents, and plugins meant to be shared. This repo ships as a Claude Code
/ Cursor marketplace plugin, opencode markdown via a symlink installer, and a Pi
package via the top-level `package.json`:

```json
{
  "name": "joemocode-llm-plugins",
  "keywords": ["pi-package"],
  "pi": {
    "skills": ["./plugins/*/skills/*"],
    "extensions": ["./plugins/*/extensions"]
  }
}
```

Then install with a pinned ref:

```bash
pi install git:github.com/joemocode-business/joemocode-llm-plugins@<sha-or-tag>
```

### The "pull a config per codebase and go" layering

This is native to Pi once the split above is in place:

- **Global** `~/.pi/agent/AGENTS.md` — your defaults everywhere.
- **Per-project** committed `AGENTS.md` + `.pi/settings.json` — stack specifics
  (this codebase is SolidJS not React; this one is React Native; this one is
  fly.io not AWS).

`.pi/settings.json` can declare the packages a project needs, and **Pi installs
any missing packages automatically on startup**. That is the "pull in a config
and start coding" behavior, scoped per repo.

> ⚠️ That auto-install is also a supply-chain surface — see the vetting section
> in [recommended-plugins.md](./recommended-plugins.md#vetting-third-party-packages).

## Packages: format & distribution

Manifest (in `package.json`):

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

Paths support globs and exclusions (`!legacy.ts`). Without a manifest Pi
auto-discovers conventional dirs: `extensions/` (`.ts`/`.js`), `skills/`
(SKILL.md folders + top-level `.md`), `prompts/` (`.md`), `themes/` (`.json`).

Distribution sources:

- npm: `npm:@scope/pkg@1.2.3` → `~/.pi/agent/npm/` or `.pi/npm/`
- git: `git:github.com/user/repo@v1` or `https://github.com/user/repo@v1` →
  `~/.pi/agent/git/<host>/<path>`
- local: `/absolute/path` or `./relative/path`

Management: `pi install …`, `pi remove …`, `pi update`, `pi list`.

## plan-to-agents — opencode

[plan-to-agents](../plugins/plan-to-agents/README.md) ships opencode agents and
slash commands under `plugins/plan-to-agents/opencode/`. opencode discovers
markdown under `.opencode/{agents,commands}/` (project) or
`~/.config/opencode/{agents,commands}/` (global). Its `"plugin": [...]` npm
array loads **JS/TS hook modules only** — it cannot register agents or commands,
so this repo uses a symlink installer instead of a package manifest.

**Install** (from the repository root):

```bash
# project scope → ./.opencode/{agents,commands}/
bash plugins/plan-to-agents/opencode/install-opencode.sh

# global scope → ~/.config/opencode/{agents,commands}/
bash plugins/plan-to-agents/opencode/install-opencode.sh --global
```

**Single scope / no double-load:** pick project **or** global, never both.
Alternatively, merge inline `{file:...}` fragments into `opencode.json` — use
symlinks **or** inline config, never both for the same definitions.

**Commands:** `/plan` (draft to `docs/plans/`), `/plan-dispatch` (two-step save
or orchestrate), `/implement-plan`, `/agent-handoff`.

**As doer:** when opencode is the current harness, dispatch uses native `Task`
subagents in-session. When another harness targets opencode, shell out with
`opencode run -m <model> "<prompt>"` (see
[`shared/dispatch-adapters.md`](../plugins/plan-to-agents/shared/dispatch-adapters.md)).

There is no plan-approved event in opencode — run `/plan-dispatch` explicitly
after the plan is ready.

## plan-to-agents — Pi

Install the repo as a Pi package using the top-level `package.json` `pi` key
(skills glob `./plugins/*/skills/*`):

```bash
pi install git:github.com/joemocode-business/joemocode-llm-plugins@<sha-or-tag>
```

**Single install route:** use the `pi install` package path only. Do **not**
also symlink these skills into `~/.claude/skills` — Pi discovers both package
skills and `~/.claude/skills`, so duplicating paths loads definitions twice.

**Skills loaded:** `planning`, `plan-dispatch`, `implement-plan`,
`agent-handoff` (Agent Skills standard frontmatter).

**As planner:** invoke `planning` or follow `plan-dispatch` after a plan is
ready; writes and reads `docs/plans/YYYY-MM-DD-<slug>.md`.

**As doer:** when Pi is the current harness, orchestrate in-session via `bash`
to other agents or `pi --mode rpc` (JSONL: `prompt`, `steer`, `follow_up`,
`get_state`, session ops). When another harness targets Pi headlessly, shell out
with `pi --mode rpc` or `pi -p` print mode (see
[`shared/dispatch-adapters.md`](../plugins/plan-to-agents/shared/dispatch-adapters.md)).

Pi has no native subagent registry — role bodies from `shared/roles/` surface as
skills via the package glob; orchestration follows
[`shared/orchestration-pattern.md`](../plugins/plan-to-agents/shared/orchestration-pattern.md).

## Interoperability — Pi with other harnesses

Pi works both as an orchestrator and as something another harness drives.

### Pi reads what you already have

Point Pi's config at `~/.claude/skills` (or install this repo as a package) and
your existing skills load unchanged. `CLAUDE.md` is read as a context file.

### Pi driven *by* another harness

- **RPC mode:** `pi --mode rpc [--provider <name>] [--model <pattern>] [--name <name>] [--no-session]`
  speaks JSONL over stdin/stdout. Commands: `prompt`, `steer`, `follow_up`,
  `abort`, `get_state`, `get_messages`, `get_session_stats`, `set_model`,
  `cycle_model`, `get_available_models`, `bash`, plus session ops (`new_session`,
  `switch_session`, `fork`, `clone`). Events stream back: `agent_start`/`_end`,
  `turn_start`/`_end`, `message_update` (streaming deltas),
  `tool_execution_start`/`update`/`end`, `queue_update`.
- **SDK:** for Node/TS, use `AgentSession` from `@earendil-works/pi-coding-agent`
  directly instead of spawning a subprocess.

This is the same pattern this repo's **plan-to-agents** already uses to shell out
to the Cursor CLI — a "Claude → Pi RPC" route is a natural addition.

### Pi *as* orchestrator

Pi calls other agents through its `bash` tool (e.g. `cursor-agent`, `claude`),
mirroring the delegation design already in plan-to-agents.

## Deterministic gates (linters / tests)

Do **not** implement enforcement as model-invoked skills (non-deterministic).
Use **hooks/extensions** that fire on events:

- Claude Code: a PostToolUse hook running `oxlint` / `vitest`.
- Pi: an extension or hook in the same package.

The model may suggest; the hook enforces. Keep the gate out of the prompt layer.

## Sources

- Pi quickstart / overview — <https://pi.dev/docs/latest/quickstart>
- Pi packages — <https://pi.dev/docs/latest/packages>
- Pi skills & extensions — <https://pi.dev/docs/latest/skills>
- Pi RPC / SDK / programmatic modes — <https://pi.dev/docs/latest/rpc>
- npm package — `@earendil-works/pi-coding-agent`

*Captured 2026-06-17. Pi docs track `latest`; verify paths/flags against the live
docs as they evolve.*
