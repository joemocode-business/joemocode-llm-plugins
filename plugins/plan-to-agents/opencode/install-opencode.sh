#!/usr/bin/env bash
# Symlink plan-to-agents opencode agents/commands/shared into ONE discovery scope (project or global).
#
# Optional alternative (do not combine with symlinks — double-loads definitions):
# Merge into opencode.json instead of symlinking:
#
#   {
#     "$schema": "https://opencode.ai/config.json",
#     "agent": {
#       "plan-phase-implementer": {
#         "description": "...",
#         "mode": "subagent",
#         "prompt": "{file:plugins/plan-to-agents/opencode/agents/plan-phase-implementer.md}"
#       },
#       "plan-verifier": {
#         "description": "...",
#         "mode": "subagent",
#         "permission": { "edit": "deny" },
#         "prompt": "{file:plugins/plan-to-agents/opencode/agents/plan-verifier.md}"
#       }
#     },
#     "command": {
#       "plan": {
#         "description": "Draft an implementation plan",
#         "agent": "plan",
#         "template": "{file:plugins/plan-to-agents/opencode/commands/plan.md}"
#       }
#     }
#   }
#
# Use symlink install OR inline {file:...} fragments — never both for the same definitions.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_AGENTS="$SCRIPT_DIR/agents"
SOURCE_COMMANDS="$SCRIPT_DIR/commands"
SOURCE_SHARED="$SCRIPT_DIR/../shared"
GLOBAL=false

usage() {
  cat <<'EOF'
Usage: install-opencode.sh [--global]

Install plan-to-agents opencode agents, commands, and shared orchestration docs via
symlinks into exactly one scope:

  (default)  ./.opencode/{agents,commands,plan-to-agents-shared}/     project-local
  --global   ~/.config/opencode/{agents,commands,plan-to-agents-shared}/   global

Run from the repository root for project install. Do not install both scopes — opencode would load duplicates.
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
  TARGET_AGENTS="${HOME}/.config/opencode/agents"
  TARGET_COMMANDS="${HOME}/.config/opencode/commands"
  TARGET_SHARED="${HOME}/.config/opencode/plan-to-agents-shared"
else
  TARGET_AGENTS=".opencode/agents"
  TARGET_COMMANDS=".opencode/commands"
  TARGET_SHARED=".opencode/plan-to-agents-shared"
fi

mkdir -p "$TARGET_AGENTS" "$TARGET_COMMANDS" "$TARGET_SHARED"

link_markdown() {
  local src_dir=$1 dest_dir=$2 file
  for file in $(cd "$src_dir" && printf '%s\n' *.md | LC_ALL=C sort); do
    ln -sf "$src_dir/$file" "$dest_dir/$file"
  done
}

link_shared() {
  local file
  for file in orchestration-pattern.md dispatch-adapters.md model-resolution.md validate-config.sh; do
    ln -sf "$SOURCE_SHARED/$file" "$TARGET_SHARED/$file"
  done
}

link_markdown "$SOURCE_AGENTS" "$TARGET_AGENTS"
link_markdown "$SOURCE_COMMANDS" "$TARGET_COMMANDS"
link_shared

echo "Linked agents  → $TARGET_AGENTS"
echo "Linked commands → $TARGET_COMMANDS"
echo "Linked shared  → $TARGET_SHARED"
