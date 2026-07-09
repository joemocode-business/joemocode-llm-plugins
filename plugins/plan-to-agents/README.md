# plan-to-agents

Route approved plans and explicit delegation requests to implementer agents. Works on both [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Cursor](https://cursor.com) from a single plugin install.

## What it does

| Flow | Platform | Trigger | Behavior |
|------|----------|---------|----------|
| **Post-approval dispatch** | Claude Code | `ExitPlanMode` (plan approved) | Hooks save the plan to the repo and steer Claude to invoke `plan-dispatch` — save plan only, or dispatch for orchestration (then pick Claude Code, Cursor, opencode, or Pi) |
| **Plan implementation** | Cursor | Explicit: "implement this plan" + path | `implement-plan` skill orchestrates `plan-phase-implementer` and `plan-verifier` subagents |
| **Explicit handoff** | Both | Natural language: "hand off to agent", "delegate to composer", etc. | `agent-handoff` skill parses the task, asks dispatch vs cancel, picks a doer backend, dispatches, and verifies |

```mermaid
flowchart TB
  subgraph claude [Claude Code]
    approve[ExitPlanMode approved]
    saveHook[save-plan-to-repo.sh]
    dispatchHook[plan-dispatch.sh]
    dispatchSkill[plan-dispatch skill]
    approve --> saveHook --> dispatchHook --> dispatchSkill
    dispatchSkill --> saveOnly[Save plan only]
    dispatchSkill --> pickBackend[Pick doer backend]
    pickBackend --> orchestrate[Orchestrate via shared pattern]
  end

  subgraph cursor [Cursor IDE]
    planEdit[Plan file written]
    syncHook[sync-plan-to-workspace.sh]
    explicit[User invokes implement-plan or agent-handoff]
    taskOrch[Cursor orchestrates Task subagents]
    planEdit --> syncHook
    explicit --> taskOrch
  end

  orchestrate -->|"native or headless per backend"| doers[Claude / Cursor / opencode / Pi]
```

---

## Components

| Type | File | Role |
|------|------|------|
| **Hook** | `hooks/save-plan-to-repo.sh` | Claude: copies latest harness-global plan → `<repo>/docs/plans/` on plan approval |
| **Hook** | `hooks/plan-dispatch.sh` | Claude: injects context after approval so Claude invokes `plan-dispatch` instead of implementing directly |
| **Hook** | `hooks/sync-plan-to-workspace.sh` | Cursor: mirrors harness-global plan writes → `<repo>/docs/plans/` |
| **Hook config** | `hooks/hooks.json` | Claude `PostToolUse` matcher for `ExitPlanMode` |
| **Hook config** | `hooks/hooks-cursor.json` | Cursor `afterFileEdit` plan sync |
| **Skill** | `skills/plan-dispatch/SKILL.md` | Claude-primary: two-step post-approval dispatch |
| **Skill** | `skills/implement-plan/SKILL.md` | Cursor-primary: phase-based Task orchestration + verification |
| **Skill** | `skills/agent-handoff/SKILL.md` | Both: explicit delegation without plan approval |
| **Skill** | `skills/planning/SKILL.md` | Both: guides plan writing — descriptive dated filename + frontmatter |
| **Template** | `skills/planning/plan-template.md` | Canonical plan skeleton: filename convention + frontmatter `title` / `created` / `last_updated` / `status` |
| **Agent** | `agents/plan-phase-implementer.md` | Implements one phase/group from a plan file |
| **Agent** | `agents/plan-verifier.md` | Verifies acceptance criteria from the diff |

---

## Install

Same two commands in Claude Code or Cursor (one-time per machine):

```text
/plugin marketplace add https://github.com/joemocode-business/joemocode-llm-plugins
/plugin install plan-to-agents@joemocode-llm-plugins
```

Cursor requires the full `https://github.com/...` URL above; the `owner/repo` shorthand is Claude Code only.

Restart after install. Updates: `/plugin marketplace update joemocode-llm-plugins` then `/plugin update plan-to-agents@joemocode-llm-plugins`.

See the [marketplace README](../../README.md) for optional project-level `extraKnownMarketplaces` setup.

---

## Migration from global `~/.claude` hooks

If you previously installed plan-dispatch hooks globally, remove the duplicates after installing this plugin.

### 1. Remove global hooks from `~/.claude/settings.json`

Delete the `hooks.PostToolUse` entries that reference `save-plan-to-repo.sh` and `plan-dispatch.sh`:

```json
// REMOVE this block from ~/.claude/settings.json:
"hooks": {
  "PostToolUse": [
    {
      "matcher": "ExitPlanMode",
      "hooks": [
        { "type": "command", "command": "~/.claude/hooks/save-plan-to-repo.sh", ... },
        { "type": "command", "command": "~/.claude/hooks/plan-dispatch.sh", ... }
      ]
    }
  ]
}
```

The plugin registers the same hooks via `hooks/hooks.json` using `${CLAUDE_PLUGIN_ROOT}` paths.

### 2. Remove global skill

```bash
rm -rf ~/.claude/skills/plan-dispatch
```

The plugin ships its own copy under `skills/plan-dispatch/`.

### 3. Keep required permissions

Ensure `~/.claude/settings.json` still allows the Cursor `agent` CLI:

```json
"permissions": {
  "allow": ["Bash(agent:*)", "Bash(cursor-agent:*)"]
}
```

### 4. Restart Claude Code

Restart the session so the plugin hooks load and global duplicates are gone.

---

## Required permissions

| Platform | Permission | Why |
|----------|------------|-----|
| Claude Code | `Bash(agent:*)` | Headless Cursor dispatch via the `agent` CLI when Claude orchestrates a Cursor doer |
| Claude Code | `Bash(cursor-agent:*)` | Alternate CLI name on some installs |

Add to `~/.claude/settings.json` → `permissions.allow` (see migration section above).

On Cursor, the `Task` tool is built-in; no extra CLI permissions are needed for `implement-plan` or `agent-handoff`.

---

## Plan storage

| Host | Global plans dir | Repo mirror | Mechanism |
|------|------------------|-------------|-----------|
| Claude Code | Claude harness global plans dir | `<repo>/docs/plans/` | `save-plan-to-repo.sh` on `ExitPlanMode` approval |
| Cursor | `~/.cursor/plans/` | `<repo>/docs/plans/` | `sync-plan-to-workspace.sh` on `afterFileEdit` |

Recommend git-tracking repo plan directories so approved plans travel with the codebase.

Saved plans follow the `YYYY-MM-DD-<descriptive-name>.md` naming convention and carry a `last_updated` frontmatter field (bumped on every edit).

**Debug sync:** set `CURSOR_PLAN_SYNC_DEBUG=1` to log mirror copies to stderr:

```bash
export CURSOR_PLAN_SYNC_DEBUG=1
```

---

## Skills

### `planning` (both)

Guides plan writing in Plan Mode or when drafting/refining a plan. Invoked for requests like "write a plan", "draft a plan", or "plan this".

- **Filename:** `YYYY-MM-DD-<descriptive-name>.md` — the date is the day the plan was created; the name is a 3–6 word kebab-case summary of the task. Names must be descriptive, not random harness slugs.
- **Frontmatter:** `title`, `created`, `last_updated`, `status` — set `created` and `last_updated` to today's date on first write; bump `last_updated` on every subsequent edit; `status` is one of `draft`, `approved`, or `implemented`.
- **Template:** [`skills/planning/plan-template.md`](skills/planning/plan-template.md) is the source of truth for filename convention and frontmatter structure.

### `plan-dispatch` (Claude)

Triggered automatically after plan approval (via hook context injection). Two-step choice:

1. **Save plan only** — keep the saved plan, no implementation
2. **Dispatch to agent for orchestration** — then pick **Claude Code**, **Cursor**, **opencode**, or **Pi** as the doer backend (native in-session when the backend matches the current harness; headless shell-out otherwise — see `shared/dispatch-adapters.md`)

**Opt out of dispatch prompt** (save hook still runs):

```bash
export CLAUDE_NO_COMPOSER_DELEGATE=1
```

### `implement-plan` (Cursor, explicit)

Slash or explicit invocation only (`disable-model-invocation: true`). Say "implement this plan" with a `.md` path.

Orchestrates:

1. Phase extraction and size classification
2. Parallel `plan-phase-implementer` Tasks for independent phase groups
3. `plan-verifier` Task for acceptance criteria check
4. Fix loop if verifier reports failures

### `agent-handoff` (both, explicit)

Natural-language triggers enabled (`disable-model-invocation: false`). Use for ad-hoc delegation without Plan Mode:

- "hand off to agent"
- "delegate to composer"
- "run this in a subagent"

Parses task goal, files, and acceptance criteria; asks dispatch vs cancel; picks a doer backend; dispatches and verifies via `git diff` (see `shared/orchestration-pattern.md` and `shared/dispatch-adapters.md`).

---

## Plannotator (recommended)

[Plannotator](https://github.com/backnotprop/plannotator) handles interactive plan review before approval. This plugin handles **post-approval routing** only. Use both for the full workflow:

1. **Plannotator** — annotate, refine, approve or request changes in the browser
2. **plan-to-agents** — save the approved plan to the repo and dispatch implementation

### Install Plannotator

**Claude Code** (automatic Plan Mode hooks on `ExitPlanMode`):

```text
/plugin marketplace add backnotprop/plannotator
/plugin install plannotator@plannotator
```

Restart Claude Code. The installer also places skills under `~/.claude/skills/` (`plannotator-annotate`, `plannotator-review`, etc.).

**Cursor** (skills only — no Plan Mode hook plugin yet):

```bash
mkdir -p ~/.cursor/skills
for skill in plannotator-annotate plannotator-review plannotator-last plannotator-setup-goal; do
  ln -sf ~/.claude/skills/"$skill" ~/.cursor/skills/"$skill"
done
```

Restart Cursor. Invoke review/annotate skills explicitly, or run `plannotator annotate <path>` from the terminal. After you approve a plan, use `implement-plan` or `agent-handoff` from this plugin.

No conflicts between the two plugins — install both independently.

---

## Test checklist

### Claude Code

- [ ] `/plugin marketplace add` + `/plugin install plan-to-agents@joemocode-llm-plugins`
- [ ] Remove global hooks from `~/.claude/settings.json` and `~/.claude/skills/plan-dispatch/`; restart Claude Code
- [ ] Enter Plan Mode → approve plan → confirm plan copied to `<repo>/docs/plans/`
- [ ] Confirm `plan-dispatch` skill invoked (two-step question)
- [ ] Dispatch path: confirm headless dispatch works when orchestrator and doer backend differ
- [ ] `CLAUDE_NO_COMPOSER_DELEGATE=1` → normal Claude implementation (save hook still runs)

### Cursor

- [ ] Install same marketplace plugin in Cursor
- [ ] Plan Mode: edit plan → confirm sync to `<repo>/docs/plans/`
- [ ] Explicit: "implement this plan" with path → `implement-plan` spawns subagents
- [ ] Explicit: "hand off this refactor to a subagent" → `agent-handoff` works

### Cross-platform

- [ ] Plan approved in Claude, dispatch to Cursor → subagents implement
- [ ] Plan created in Cursor, implement via `implement-plan` without Claude involved

---

## Environment variables

| Variable | Default | Effect |
|----------|---------|--------|
| `CLAUDE_NO_COMPOSER_DELEGATE` | `0` | Set to `1` to skip the post-approval dispatch prompt; Claude implements normally. Save hook still copies the plan. |
| `CURSOR_PLAN_SYNC_DEBUG` | unset | Set to any value to log plan mirror copies (`<source> -> <dest>`) to stderr |

---

## Out of scope (v1)

- Cursor auto-prompt on plan approval (no proven `ExitPlanMode` equivalent)
- Cursor SDK (`@cursor/sdk`) for programmatic cloud agent launch

Project-level agent overrides in `<repo>/.cursor/agents/` take priority over the plugin's bundled agents.
