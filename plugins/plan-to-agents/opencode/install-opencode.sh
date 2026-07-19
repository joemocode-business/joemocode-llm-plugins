#!/usr/bin/env bash
# Symlink plan-to-agents shared skills, generated agents, and shared orchestration docs
# into ONE OpenCode discovery scope (project or global).
#
# Skills are the user entry point: /planning, /plan-dispatch, /implement-plan,
# /configure, /agent-handoff, /clear-plans. Draft plans with OpenCode's built-in
# Plan primary agent, then invoke /planning (there is no /plan command).
#
# Optional alternative (do not combine with symlinks — double-loads definitions):
# Merge agent/skill fragments into opencode.json using {file:...} paths instead of
# symlinking. Use symlink install OR inline fragments — never both for the same
# definitions.
#
# Explicit-only skills (implement-plan, configure, clear-plans) need permission.skill
# denies in opencode.json — see opencode.json.example. The installer never overwrites
# an existing opencode.json; merge that example manually.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_SKILLS="$SCRIPT_DIR/../skills"
SOURCE_AGENTS="$SCRIPT_DIR/agents"
SOURCE_SHARED="$SCRIPT_DIR/../shared"
CONFIG_EXAMPLE="$SCRIPT_DIR/opencode.json.example"

SKILL_NAMES=(
  planning
  plan-dispatch
  implement-plan
  configure
  agent-handoff
  clear-plans
)

# Command filenames installed by releases before the native-skills migration.
LEGACY_COMMANDS=(
  plan.md
  plan-dispatch.md
  implement-plan.md
  configure.md
  agent-handoff.md
)

GLOBAL=false

usage() {
  cat <<'EOF'
Usage: install-opencode.sh [--global]

Install plan-to-agents into exactly one OpenCode discovery scope via symlinks:

  (default)  ./.opencode/{skills,agents,plan-to-agents-shared}/   project-local
  --global   ~/.config/opencode/{skills,agents,plan-to-agents-shared}/   global

Installs six shared skill directories (planning, plan-dispatch, implement-plan,
configure, agent-handoff, clear-plans), two generated subagents for the task tool,
and shared orchestration docs.

Planner workflow: switch to OpenCode's built-in Plan primary agent, then /planning.
Do not install both project and global scopes — OpenCode would load duplicates.
Do not combine this symlink install with inline {file:...} fragments in opencode.json
for the same agents or skills.

Reinstall removes stale command symlinks from older installer versions. Commands are
no longer installed.

For explicit-only skills, merge plugins/plan-to-agents/opencode/opencode.json.example
into your project or global opencode.json (permission.skill denies). The installer
does not modify an existing opencode.json.

Run from the repository root for project install.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --global) GLOBAL=true ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "install-opencode.sh: unknown option '$1'" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [ "$GLOBAL" = true ]; then
  TARGET_SKILLS="${HOME}/.config/opencode/skills"
  TARGET_AGENTS="${HOME}/.config/opencode/agents"
  TARGET_COMMANDS="${HOME}/.config/opencode/commands"
  TARGET_SHARED="${HOME}/.config/opencode/plan-to-agents-shared"
  CONFIG_HINT="${HOME}/.config/opencode/opencode.json"
else
  TARGET_SKILLS=".opencode/skills"
  TARGET_AGENTS=".opencode/agents"
  TARGET_COMMANDS=".opencode/commands"
  TARGET_SHARED=".opencode/plan-to-agents-shared"
  CONFIG_HINT="opencode.json"
fi

mkdir -p "$TARGET_SKILLS" "$TARGET_AGENTS" "$TARGET_SHARED"

link_skills() {
  local name
  for name in "${SKILL_NAMES[@]}"; do
    if [ ! -d "$SOURCE_SKILLS/$name" ]; then
      echo "install-opencode.sh: missing skill source directory '$SOURCE_SKILLS/$name'" >&2
      exit 1
    fi
    ln -sfn "$SOURCE_SKILLS/$name" "$TARGET_SKILLS/$name"
  done
}

link_markdown() {
  local src_dir=$1 dest_dir=$2 file
  if [ ! -d "$src_dir" ]; then
    echo "install-opencode.sh: missing agents source directory '$src_dir' (run shared/emit.sh)" >&2
    exit 1
  fi
  shopt -s nullglob
  for file in $(cd "$src_dir" && printf '%s\n' *.md | LC_ALL=C sort); do
    ln -sf "$src_dir/$file" "$dest_dir/$file"
  done
  shopt -u nullglob
}

link_shared() {
  local file
  for file in orchestration-pattern.md dispatch-adapters.md model-resolution.md validate-config.sh; do
    ln -sf "$SOURCE_SHARED/$file" "$TARGET_SHARED/$file"
  done
}

remove_legacy_commands() {
  local file path
  if [ ! -d "$TARGET_COMMANDS" ]; then
    return 0
  fi
  for file in "${LEGACY_COMMANDS[@]}"; do
    path="$TARGET_COMMANDS/$file"
    if [ -L "$path" ]; then
      rm -f "$path"
      echo "Removed stale command symlink → $path"
    elif [ -e "$path" ]; then
      echo "install-opencode.sh: leaving non-symlink command file (not removed): $path" >&2
    fi
  done
}

link_skills
link_markdown "$SOURCE_AGENTS" "$TARGET_AGENTS"
link_shared
remove_legacy_commands

echo "Linked skills  → $TARGET_SKILLS"
for name in "${SKILL_NAMES[@]}"; do
  echo "  $name → $TARGET_SKILLS/$name"
done
echo "Linked agents  → $TARGET_AGENTS"
echo "Linked shared  → $TARGET_SHARED"

if [ -f "$CONFIG_HINT" ]; then
  echo "Found existing $CONFIG_HINT — not modified."
  echo "Merge explicit-only skill permissions from: $CONFIG_EXAMPLE"
elif [ -f "$CONFIG_EXAMPLE" ]; then
  echo "No $CONFIG_HINT found. Merge permission.skill denies from:"
  echo "  $CONFIG_EXAMPLE"
fi
