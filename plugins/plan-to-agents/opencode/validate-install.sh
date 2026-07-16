#!/usr/bin/env bash
# Structural validator for plan-to-agents OpenCode symlink installs.
# Checks skill/agent/shared layout, resolved symlinks, absence of legacy commands,
# and optional opencode.json permission.skill denies for explicit-only skills.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_EXAMPLE="$SCRIPT_DIR/opencode.json.example"

SKILL_NAMES=(
  planning
  plan-dispatch
  implement-plan
  configure
  agent-handoff
  clear-plans
)

AGENT_NAMES=(
  plan-phase-implementer.md
  plan-verifier.md
)

SHARED_FILES=(
  orchestration-pattern.md
  dispatch-adapters.md
  model-resolution.md
  validate-config.sh
)

LEGACY_COMMANDS=(
  plan.md
  plan-dispatch.md
  implement-plan.md
  configure.md
  agent-handoff.md
)

EXPLICIT_ONLY_SKILLS=(
  implement-plan
  configure
  clear-plans
)

GLOBAL=false
FAILURES=0

usage() {
  cat <<'EOF'
Usage: validate-install.sh [--global]

Validate a plan-to-agents OpenCode install in the selected scope:

  (default)  ./.opencode/     project-local
  --global   ~/.config/opencode/   global

Exits non-zero when required symlinks, files, or permission denies are missing.
EOF
}

fail() {
  echo "validate-install.sh: $1" >&2
  FAILURES=$((FAILURES + 1))
}

while [ $# -gt 0 ]; do
  case "$1" in
    --global) GLOBAL=true ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "validate-install.sh: unknown option '$1'" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [ "$GLOBAL" = true ]; then
  ROOT="${HOME}/.config/opencode"
  CONFIG_FILE="${HOME}/.config/opencode/opencode.json"
else
  ROOT=".opencode"
  CONFIG_FILE="opencode.json"
fi

TARGET_SKILLS="$ROOT/skills"
TARGET_AGENTS="$ROOT/agents"
TARGET_COMMANDS="$ROOT/commands"
TARGET_SHARED="$ROOT/plan-to-agents-shared"

if [ ! -d "$ROOT" ]; then
  fail "missing install root: $ROOT"
  exit 1
fi

for name in "${SKILL_NAMES[@]}"; do
  skill_dir="$TARGET_SKILLS/$name"
  if [ ! -e "$skill_dir" ]; then
    fail "missing skill link: $skill_dir"
    continue
  fi
  if [ ! -f "$skill_dir/SKILL.md" ]; then
    fail "missing SKILL.md in $skill_dir (symlink may be broken)"
  fi
done

for file in "${AGENT_NAMES[@]}"; do
  agent_path="$TARGET_AGENTS/$file"
  if [ ! -f "$agent_path" ]; then
    fail "missing agent: $agent_path"
  fi
done

for file in "${SHARED_FILES[@]}"; do
  shared_path="$TARGET_SHARED/$file"
  if [ ! -e "$shared_path" ]; then
    fail "missing shared file: $shared_path"
  fi
done

if [ -d "$TARGET_COMMANDS" ]; then
  for file in "${LEGACY_COMMANDS[@]}"; do
    if [ -e "$TARGET_COMMANDS/$file" ]; then
      fail "stale legacy command still present: $TARGET_COMMANDS/$file"
    fi
  done
fi

seen_skills=""
for name in "${SKILL_NAMES[@]}"; do
  case " $seen_skills " in
    *" $name "*) fail "duplicate skill id: $name" ;;
  esac
  seen_skills="$seen_skills $name"
done

if [ -f "$CONFIG_FILE" ]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$CONFIG_FILE" "${EXPLICIT_ONLY_SKILLS[@]}" <<'PY' || fail "opencode.json permission.skill denies missing for explicit-only skills"
import json
import sys

config_path = sys.argv[1]
required_denies = sys.argv[2:]

with open(config_path, encoding="utf-8") as handle:
    data = json.load(handle)

skill_perm = data.get("permission", {}).get("skill", {})
missing = [name for name in required_denies if skill_perm.get(name) != "deny"]
if missing:
    print(
        "opencode.json permission.skill deny missing for: "
        + ", ".join(missing),
        file=sys.stderr,
    )
    raise SystemExit(1)
PY
  else
    echo "validate-install.sh: python3 not found; skipping opencode.json permission checks" >&2
  fi
elif [ -f "$CONFIG_EXAMPLE" ]; then
  echo "validate-install.sh: no $CONFIG_FILE — merge $CONFIG_EXAMPLE for explicit-only skill denies" >&2
fi

if [ "$FAILURES" -gt 0 ]; then
  echo "validate-install.sh: $FAILURES check(s) failed" >&2
  exit 1
fi

echo "validate-install.sh: OK ($ROOT)"
