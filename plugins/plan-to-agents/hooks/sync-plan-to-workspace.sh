#!/usr/bin/env bash
# Mirror Plan Mode (and other agent) writes from ~/.cursor/plans/ into the workspace.
set -euo pipefail

input=$(cat)

# Cursor afterFileEdit: file_path + workspace_roots
# Claude Code PostToolUse (Write|Edit): tool_input.file_path + CLAUDE_PROJECT_DIR
file_path=$(echo "$input" | jq -r '.file_path // .tool_input.file_path // empty')
workspace_root=$(echo "$input" | jq -r '.workspace_roots[0] // empty')
if [[ -z "$workspace_root" && -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
  workspace_root="$CLAUDE_PROJECT_DIR"
fi

if [[ -z "$file_path" || -z "$workspace_root" ]]; then
  exit 0
fi

home_plans_cursor="${HOME}/.cursor/plans"
home_plans_claude="${HOME}/.claude/plans"
workspace_plans="${workspace_root}/.cursor/plans"

mkdir -p "$home_plans_cursor" "$home_plans_claude" "$workspace_plans"

resolve_path() {
  local path="$1" root="$2"
  if [[ "$path" = /* ]]; then
    realpath "$path" 2>/dev/null || echo "$path"
  else
    realpath "${root}/${path}" 2>/dev/null || echo "${root}/${path}"
  fi
}

abs_source=$(resolve_path "$file_path" "$workspace_root")
abs_home_plans_cursor=$(realpath "$home_plans_cursor" 2>/dev/null || echo "$home_plans_cursor")
abs_home_plans_claude=$(realpath "$home_plans_claude" 2>/dev/null || echo "$home_plans_claude")
abs_workspace_plans=$(realpath "$workspace_plans" 2>/dev/null || echo "$workspace_plans")

# Only sync files under the user Cursor or Claude plans directories.
abs_home_plans=""
if [[ "$abs_source" == "$abs_home_plans_cursor" || "$abs_source" == "$abs_home_plans_cursor/"* ]]; then
  abs_home_plans="$abs_home_plans_cursor"
elif [[ "$abs_source" == "$abs_home_plans_claude" || "$abs_source" == "$abs_home_plans_claude/"* ]]; then
  abs_home_plans="$abs_home_plans_claude"
else
  exit 0
fi

# Avoid copying workspace-local plans back onto themselves.
if [[ "$abs_source" == "$abs_workspace_plans" || "$abs_source" == "$abs_workspace_plans/"* ]]; then
  exit 0
fi

if [[ ! -f "$abs_source" ]]; then
  exit 0
fi

rel="${abs_source#"${abs_home_plans}/"}"
if [[ "$rel" == "$abs_source" ]]; then
  rel=$(basename "$abs_source")
fi

dest="${abs_workspace_plans}/${rel}"
mkdir -p "$(dirname "$dest")"
cp -f "$abs_source" "$dest"

if [[ -n "${CURSOR_PLAN_SYNC_DEBUG:-}" ]]; then
  echo "[sync-plan] ${abs_source} -> ${dest}" >&2
fi

exit 0
