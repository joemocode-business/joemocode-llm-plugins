#!/usr/bin/env bash
# PostToolUse(ExitPlanMode): copies the just-approved plan into the *repo's* own
# docs/plans/ (the cwd where Claude runs), so the plan becomes part of the repo.
# Runs on EVERY plan approval, independent of how the user later chooses to proceed.
set -euo pipefail

input="$(cat)"
cwd="$(printf '%s' "$input" | jq -r '.cwd // empty')"

_claude_plans_subdir=plans
plans_src="${HOME}/.claude/${_claude_plans_subdir}"

# Nothing to do if we don't know the workspace or have no global plans dir.
[ -n "$cwd" ] || exit 0
[ -d "$plans_src" ] || exit 0

# The active plan is the most-recently-modified *.md: the plan file is written/
# edited immediately before ExitPlanMode fires.
latest="$(ls -t "$plans_src"/*.md 2>/dev/null | head -n1 || true)"
[ -n "$latest" ] || exit 0

dest_dir="$cwd/docs/plans"
mkdir -p "$dest_dir"
cp "$latest" "$dest_dir/"

exit 0
