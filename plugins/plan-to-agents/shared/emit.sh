#!/usr/bin/env bash
# Regenerate harness agent files from shared/roles/*.md (deterministic; no timestamps).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROLES_DIR="$SCRIPT_DIR/roles"
AGENTS_DIR="$PLUGIN_DIR/agents"
OPENCODE_AGENTS_DIR="$PLUGIN_DIR/opencode/agents"
PI_AGENTS_DIR="$PLUGIN_DIR/pi/agents"

role_name() {
  case "$1" in
    plan-phase-implementer) printf '%s' 'plan-phase-implementer' ;;
    plan-verifier) printf '%s' 'plan-verifier' ;;
    *)
      echo "emit.sh: no frontmatter mapping for role '$1'" >&2
      exit 1
      ;;
  esac
}

role_description() {
  case "$1" in
    plan-phase-implementer)
      printf '%s' 'Implements a specific phase or group of phases from a plan file. Reads relevant code, applies changes, commits when the project uses git, and reports back. Spawned by the implement-plan skill.'
      ;;
    plan-verifier)
      printf '%s' 'Verifies that acceptance criteria from a plan have been met. Reads the diff to check behavioral and structural outcomes — not a lint or test runner. Spawned by the implement-plan skill after all phases complete. Also usable standalone.'
      ;;
    *)
      echo "emit.sh: no frontmatter mapping for role '$1'" >&2
      exit 1
      ;;
  esac
}

emit_claude_cursor_agents() {
  local role stem body_file out_file
  for role in $(cd "$ROLES_DIR" && printf '%s\n' *.md | LC_ALL=C sort); do
    stem="${role%.md}"
    body_file="$ROLES_DIR/$role"
    out_file="$AGENTS_DIR/$stem.md"

    {
      printf '%s\n' "---"
      printf 'name: %s\n' "$(role_name "$stem")"
      printf 'description: %s\n' "$(role_description "$stem")"
      printf '%s\n' "---"
      printf '\n'
      cat "$body_file"
    } >"$out_file"
  done
}

emit_opencode_agents() {
  local role stem body_file out_file
  for role in $(cd "$ROLES_DIR" && printf '%s\n' *.md | LC_ALL=C sort); do
    stem="${role%.md}"
    body_file="$ROLES_DIR/$role"
    out_file="$OPENCODE_AGENTS_DIR/$stem.md"

    {
      printf '%s\n' "---"
      printf 'description: %s\n' "$(role_description "$stem")"
      printf 'mode: subagent\n'
      if [ "$stem" = "plan-verifier" ]; then
        printf '%s\n' "permission:"
        printf '  edit: deny\n'
      fi
      printf '%s\n' "---"
      printf '\n'
      cat "$body_file"
    } >"$out_file"
  done
}

emit_pi_agents() {
  local role stem body_file out_file
  for role in $(cd "$ROLES_DIR" && printf '%s\n' *.md | LC_ALL=C sort); do
    stem="${role%.md}"
    body_file="$ROLES_DIR/$role"
    out_file="$PI_AGENTS_DIR/$stem.md"

    {
      printf '%s\n' "---"
      printf 'name: %s\n' "$(role_name "$stem")"
      printf 'description: %s\n' "$(role_description "$stem")"
      if [ "$stem" = "plan-verifier" ]; then
        printf 'tools: read,grep,find,ls,bash\n'
      fi
      printf '%s\n' "---"
      printf '\n'
      cat "$body_file"
    } >"$out_file"
  done
}

mkdir -p "$AGENTS_DIR" "$OPENCODE_AGENTS_DIR" "$PI_AGENTS_DIR"
emit_claude_cursor_agents
emit_opencode_agents
emit_pi_agents
