# Plugin definitions across Claude Code, Cursor, OpenCode, and Pi

Research date: 2026-07-16

## Scope

This document compares how Claude Code, Cursor, OpenCode, and Pi package reusable
agent behavior. It focuses on four questions:

1. How does each runtime discover and install a plugin or package?
2. How are hooks defined?
3. What is the difference between a skill, command, and subagent?
4. How does this repository map to each runtime today?

The findings come from the current official documentation and from the files in
this repository. Product behavior changes quickly, so the source links at the end
are part of the record.

## Short answer

The four runtimes share Markdown prompts, but their loading models differ:

| Runtime | Distributable unit | Reusable prompt | User command | Delegated agent | Hook system |
|---|---|---|---|---|---|
| Claude Code | Marketplace plugin | `skills/<name>/SKILL.md` | Skills also provide `/plugin:skill`; `commands/` is legacy | `agents/*.md` | `hooks/hooks.json` plus command, prompt, agent, HTTP, or MCP handlers |
| Cursor | Marketplace plugin | `skills/<name>/SKILL.md` | `commands/*.md`, or an explicit-only skill | `agents/*.md` | Cursor JSON hooks that run commands |
| OpenCode | Config plus discovered files; JS/TS plugins for code | `skills/<name>/SKILL.md` | `commands/*.md` | `agents/*.md` with `mode: subagent` | JS/TS plugin event handlers |
| Pi | npm, git, or local package | `skills/<name>/SKILL.md` | Prompt templates, skill commands, or extension commands | No core registry; an official example extension adds one | TypeScript extensions and lifecycle events |

A skill gives the current agent instructions and supporting files. A command is a
user-selected prompt entry point. A subagent gets a separate context and usually
its own model or tool policy. Hooks run because an event occurred, not because the
model selected a prompt.

## Shared terms are not shared contracts

### Skills

All four runtimes understand the Agent Skills directory shape:

```text
skills/
└── planning/
    ├── SKILL.md
    └── plan-template.md
```

`SKILL.md` starts with YAML frontmatter. `name` and `description` are the portable
fields. The body contains instructions, and sibling files can hold templates,
scripts, or references.

The runtimes do not recognize every frontmatter field in the same way:

| Field | Claude Code | Cursor | OpenCode | Pi |
|---|---|---|---|---|
| `name`, `description` | Yes | Yes | Yes | Yes |
| `disable-model-invocation` | Yes | Yes | Ignored | Supported by Pi's skill command behavior |
| `user-invocable` | Yes | Yes | Ignored | Not the same contract |
| `paths` | No common contract | Yes | Ignored | Not the same contract |
| `allowed-tools` | Yes | Runtime-dependent | Ignored; use permissions | Experimental |
| `license`, `compatibility`, `metadata` | Some fields supported | Partial | Yes | Agent Skills fields |

OpenCode explicitly ignores unknown skill frontmatter. A shared skill therefore
cannot rely on a runtime-specific field for safety. Tool restrictions belong in
each runtime's agent or permission configuration when the skill must be portable.

### Commands

A command is primarily a user entry point. It expands a prompt in the current
session, unless the runtime lets the command select or spawn another agent.

* Claude Code still loads flat `commands/*.md`, but its documentation calls that
  layout legacy. New plugins should use skills.
* Cursor still has a first-class `commands/` plugin component. Cursor also
  recommends migrating richer commands to skills. An explicit-only skill uses
  `disable-model-invocation: true`.
* OpenCode commands are current, first-class prompt templates. The Markdown
  filename becomes the command name. `$ARGUMENTS` and positional arguments are
  expanded when the user invokes the command.
* Pi separates prompt templates from skills. Prompt templates use `/name`, skills
  use `/skill:name`, and extensions can register arbitrary slash commands.

### Subagents

A subagent is not a skill with a different folder name. It has a separate model
conversation and receives a task from its parent.

* Claude Code plugin agents use `agents/*.md`. Frontmatter can select a model,
  tools, skills, memory, turn limit, background behavior, and worktree isolation.
* Cursor plugin agents also use `agents/*.md` and run through the Agent or Task
  delegation path. Cursor supports project, user, and compatibility directories.
* OpenCode agents use `agents/*.md` or inline `opencode.json`. `mode: subagent`
  makes the agent available to the `task` tool and `@` mentions. Permissions and
  models can be set per agent.
* Pi core intentionally has no subagent registry. The official example
  `subagent` extension adds a tool and discovers `.pi/agents/*.md`, but a package
  must ship and activate that extension. Shelling out to `pi`, using RPC, or
  using the SDK creates another Pi session without creating a core registry.

## Claude Code

### Packaging and discovery

A marketplace repository has `.claude-plugin/marketplace.json`. Each listed
plugin points to a directory such as `plugins/plan-to-agents/`. That directory can
contain:

```text
.claude-plugin/plugin.json
skills/
commands/
agents/
hooks/hooks.json
.mcp.json
```

Only `plugin.json` belongs inside `.claude-plugin/`. Component directories belong
at the plugin root. The manifest is optional in current Claude Code, although
marketplace plugins normally include it. `name` is the only required manifest
field. Default component directories are discovered automatically.

Marketplace-installed plugins are copied into Claude's plugin cache. Plugin code
must not depend on paths outside its plugin root. Runtime scripts should resolve
their own files with `${CLAUDE_PLUGIN_ROOT}`. Persistent data belongs under
`${CLAUDE_PLUGIN_DATA}`.

Plugin skills and agents are namespaced:

```text
/plan-to-agents:implement-plan
plan-to-agents:plan-verifier
```

### Hooks

Claude hooks use a nested JSON format. This repository registers two command
hooks after `ExitPlanMode`:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "ExitPlanMode",
      "hooks": [
        {
          "type": "command",
          "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/save-plan-to-repo.sh\""
        },
        {
          "type": "command",
          "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/plan-dispatch.sh\""
        }
      ]
    }]
  }
}
```

The event payload arrives as JSON on stdin. A hook can return JSON that blocks an
action, adds model context, or shows a system message. Claude also supports
prompt, agent, HTTP, and MCP hook handlers.

`session-handoff` uses `PreCompact` to block one compaction attempt and ask the
user to capture a handoff. That blocking behavior is specific to Claude Code.

### Repository mapping

`plugins/plan-to-agents/.claude-plugin/plugin.json` relies on default discovery
for skills, agents, and hooks. `plugins/session-handoff/.claude-plugin/plugin.json`
sets an explicit skills path and relies on default hook discovery.

There are no Claude `commands/` in this repository. User-facing slash workflows
are skills. `implement-plan`, `configure`, and `clear-plans` set
`disable-model-invocation: true`.

## Cursor

### Packaging and discovery

Cursor requires `.cursor-plugin/plugin.json` for a native Cursor plugin. The
manifest can name custom paths for `skills`, `agents`, `commands`, `rules`,
`hooks`, and MCP servers. When a custom path is present, it replaces default
discovery for that component.

Cursor's native multi-plugin catalog is `.cursor-plugin/marketplace.json`.
Compatibility support can import Claude plugins, but a native Cursor marketplace
should not depend on the Claude catalog format.

Cursor discovers project and user components outside plugins too:

```text
.cursor/skills/        ~/.cursor/skills/
.cursor/agents/        ~/.cursor/agents/
.cursor/rules/         user and team rules
.cursor/hooks.json     ~/.cursor/hooks.json
```

It also reads selected `.claude/`, `.agents/`, and `.codex/` directories for
compatibility. Native `.cursor/` definitions take precedence on name collisions.

### Hooks

Cursor hooks use camelCase event names and a flatter command entry:

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [{
      "command": "./hooks/sync-plan-to-workspace.sh"
    }]
  }
}
```

Scripts receive JSON on stdin and can return JSON on stdout. Blocking behavior
depends on the event. `preCompact` is observational and cannot stop compaction.
That is why `session-handoff` does not expose its Claude `PreCompact` hook through
the Cursor manifest.

Cursor can map several Claude hook events when third-party configuration support
is enabled. Native plugin hooks are still the clearer contract because the event
names and output behavior differ.

### Repository mapping

`plugins/plan-to-agents/.cursor-plugin/plugin.json` explicitly points to:

```json
{
  "skills": "./skills/",
  "agents": "./agents/",
  "hooks": "./hooks/hooks-cursor.json"
}
```

The Cursor hook mirrors plan edits from `~/.cursor/plans/` into `docs/plans/`.
There is no proven Cursor event equivalent to Claude's approved
`ExitPlanMode`, so dispatch remains explicit.

`plugins/session-handoff/.cursor-plugin/plugin.json` exposes skills only. Its
manual Cursor flow is consistent with Cursor's non-blocking `preCompact`.

This repository has no root `.cursor-plugin/marketplace.json`. Its documented
Cursor install route currently relies on marketplace compatibility with the
Claude catalog. A native Cursor catalog remains a gap.

## OpenCode

### Packaging and discovery

OpenCode has two extension mechanisms:

1. Markdown and configuration for agents, commands, and skills.
2. JavaScript or TypeScript plugins for event hooks and custom tools.

Project discovery uses `.opencode/`; global discovery uses
`~/.config/opencode/`:

```text
agents/
commands/
skills/<name>/SKILL.md
plugins/
```

The same definitions can be written inline in `opencode.json`. A JS/TS package
listed in the config's `plugin` array does not package Markdown commands or
agents. It loads executable plugin code. This repository therefore uses a
symlink installer for its Markdown files.

### Hooks

An OpenCode plugin exports a function that receives runtime context and returns
event handlers. Examples include `tool.execute.before`, `tool.execute.after`,
`file.edited`, `session.idle`, and `experimental.session.compacting`.

These are not Claude-style shell hook declarations. A handler may call a shell
script, but the registration and lifecycle live in JS or TS.

This repository ships no OpenCode plugin module and no OpenCode hooks. Users run
`/plan-dispatch` explicitly.

### Commands, skills, and agents

OpenCode commands use Markdown frontmatter such as `description`, `agent`,
`model`, and `subtask`. The command body is the prompt template.

OpenCode skills are loaded on demand through the `skill` tool. It discovers
`.opencode/skills/`, `.claude/skills/`, and `.agents/skills/` at project and user
scopes. Skills can be allowed, denied, or require confirmation by name pattern.

OpenCode agent Markdown uses fields including:

```yaml
---
description: Verify a completed plan
mode: subagent
model: provider/model
permission:
  edit: deny
---
```

The filename is the agent name. A parent invokes it with the `task` tool, while a
user can invoke it with `@name`.

### Repository mapping and gaps

`plugins/plan-to-agents/opencode/install-opencode.sh` symlinks:

* `opencode/agents/*.md`
* `opencode/commands/*.md`
* selected `shared/` files

It does not install `skills/` into an OpenCode discovery path. The repository
README's description of OpenCode as commands plus agents is accurate for the
installer, but incomplete for current OpenCode, which now has native skills.

The installed `configure.md` command is `/configure`, not
`/plan-to-agents:configure`. References to the namespaced form inside OpenCode
instructions are incorrect.

The repository often calls OpenCode's delegation primitive `Task`. The actual
tool name in OpenCode documentation is `task`. The intent is clear, but docs and
prompts should use the runtime's real name.

## Pi

### Packaging and discovery

Pi packages use ordinary `package.json`:

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

Packages can come from npm, git, or local paths. Global installs update
`~/.pi/agent/settings.json`; project installs update `.pi/settings.json`. Pi can
install missing project packages after the user trusts the project.

Without a manifest, Pi discovers conventional `extensions/`, `skills/`,
`prompts/`, and `themes/` directories. Project resources require project trust.

### Extensions and hooks

Pi extensions are TypeScript modules. An extension receives `ExtensionAPI` and
can register lifecycle handlers, tools, commands, shortcuts, flags, providers,
and UI.

```typescript
export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    // inspect, modify, or block
  })

  pi.registerCommand("plan-dispatch", {
    description: "Dispatch an approved plan",
    handler: async (args, ctx) => {
      // command implementation
    },
  })
}
```

Useful events include `session_start`, `resources_discover`,
`before_agent_start`, `tool_call`, `tool_result`, `agent_end`, and
`session_before_compact`. Extensions are Pi's current event and hook mechanism.

### Commands, skills, and subagents

Pi prompt templates are Markdown files invoked as `/template-name`. Skills are
shown as `/skill:name` when skill commands are enabled. Extensions can register
arbitrary `/name` commands with code-backed handlers.

Pi core does not register Markdown subagents. The official example subagent
extension implements that behavior by spawning isolated Pi child processes and
reading `.pi/agents/*.md`. RPC mode and the SDK are lower-level ways to run or
control another Pi session.

### Repository mapping and gaps

The root `package.json` contains only:

```json
{
  "pi": {
    "skills": ["./plugins/*/skills/*"]
  }
}
```

The package ships all nine skill directories from `plan-to-agents` and
`session-handoff`. It ships no Pi extensions, prompt templates, hooks, or agent
definitions.

`docs/pidev-setup.md` shows an `extensions` glob, but the actual package does not
contain that field or any extension directory. The example describes a possible
future shape, not current behavior.

The `plan-to-agents` README says shared role bodies "surface as skills via the
package glob." They do not. `shared/roles/*.md` is outside
`plugins/*/skills/*`, so Pi never receives those files as skills or agents.

`implement-plan/SKILL.md` tells the runtime to use a `Task` subagent and names
`plan-phase-implementer` and `plan-verifier`. Pi does not have those definitions
or that core tool. The skill loads, but its main execution path is not portable
to Pi without a Pi extension, generated Pi agents, or Pi-specific RPC prompts.

The other shared skills also contain some Claude and Cursor terms such as
`AskUserQuestion` and `ExitPlanMode`. Pi can often follow the conversational
intent, but those names are not Pi APIs.

## How this repository is generated

The repository keeps canonical subagent prompt bodies under:

```text
plugins/plan-to-agents/shared/roles/
```

`shared/emit.sh` adds runtime-specific frontmatter and writes:

* `plugins/plan-to-agents/agents/*.md` for Claude Code and Cursor
* `plugins/plan-to-agents/opencode/agents/*.md` for OpenCode

CI runs the emitter and checks for a clean diff. Pi has no emitter target.

This split is sound. Prompt bodies can stay shared, while discovery metadata must
remain runtime-specific. The same approach would work for Pi if the project
chooses a concrete Pi subagent extension and package contract.

## Current compatibility findings

| Finding | Impact |
|---|---|
| OpenCode supports skills, but the installer does not install them | OpenCode uses duplicated commands and cannot load the shared skills through the documented install |
| OpenCode's installed setup command is `/configure` | OpenCode instructions that say `/plan-to-agents:configure` point to a command that does not exist |
| Pi package contains skills only | Hooks, prompts, and delegated-agent roles are absent |
| Pi shared roles are outside the package glob | The README's claim that they become Pi skills is false |
| Pi `implement-plan` requires non-Pi `Task` behavior | The skill is discoverable but not executable as written |
| Cursor has no native marketplace catalog in the repo | Cursor installation depends on Claude marketplace compatibility |
| Cursor cannot block `preCompact` | Manual session handoff on Cursor is the correct current design |
| Claude and Cursor agent wrappers share one body | `emit.sh` prevents prompt drift while preserving runtime metadata |

## Recommended documentation and implementation follow-ups

1. Decide whether OpenCode should consume native skills or keep commands as the
   public interface. If skills are desired, install them under
   `.opencode/skills/` and remove duplicated command prose where possible.
2. Correct OpenCode references from `/plan-to-agents:configure` to `/configure`,
   or install commands under a namespace that produces the documented name.
3. Stop claiming Pi receives `shared/roles/` through the skill glob.
4. Either mark `implement-plan` unsupported on Pi or ship a Pi extension and
   generated `.pi/agents/` definitions that provide the required delegation
   contract.
5. Change `docs/pidev-setup.md` so its package example matches the skills-only
   root `package.json`, or label extensions as a future option.
6. Add `.cursor-plugin/marketplace.json` if native Cursor marketplace publishing
   is a goal. Keep `.claude-plugin/marketplace.json` for Claude Code.
7. Keep hook files runtime-specific. Event names, blocking rules, input schemas,
   and output schemas are not portable even when the scripts can be shared.

## Sources

### Claude Code

* [Plugins reference](https://code.claude.com/docs/en/plugins-reference)
* [Create plugins](https://code.claude.com/docs/en/plugins)
* [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
* [Skills](https://code.claude.com/docs/en/skills)
* [Subagents](https://code.claude.com/docs/en/sub-agents)
* [Hooks](https://code.claude.com/docs/en/hooks)

### Cursor

* [Plugins](https://cursor.com/docs/plugins)
* [Plugins reference](https://cursor.com/docs/reference/plugins)
* [Skills](https://cursor.com/docs/skills)
* [Subagents](https://cursor.com/docs/subagents)
* [Hooks](https://cursor.com/docs/hooks)
* [Rules](https://cursor.com/docs/rules)
* [CLI changelog](https://cursor.com/docs/cli/changelog)

### OpenCode

* [Configuration](https://opencode.ai/docs/config/)
* [Plugins](https://opencode.ai/docs/plugins/)
* [Commands](https://opencode.ai/docs/commands/)
* [Agents](https://opencode.ai/docs/agents/)
* [Skills](https://opencode.ai/docs/skills/)
* [Tools](https://opencode.ai/docs/tools/)
* [Permissions](https://opencode.ai/docs/permissions/)

### Pi

* [Packages](https://pi.dev/docs/latest/packages)
* [Skills](https://pi.dev/docs/latest/skills)
* [Extensions](https://pi.dev/docs/latest/extensions)
* [Usage](https://pi.dev/docs/latest/usage)
* [Settings](https://pi.dev/docs/latest/settings)
* [SDK](https://pi.dev/docs/latest/sdk)
* [RPC source documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md)
* [Official subagent extension example](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent)
