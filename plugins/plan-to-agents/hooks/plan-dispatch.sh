#!/usr/bin/env bash
# PostToolUse(ExitPlanMode): fires only when a plan was APPROVED. Steers Claude to
# invoke the `plan-dispatch` skill, which asks how to proceed (save plan only /
# dispatch to agent for orchestration, then pick a doer backend) instead of implementing
# directly. The plan has already been auto-saved into <cwd>/docs/plans/ by
# save-plan-to-repo.sh.
set -euo pipefail

input="$(cat)"
cwd="$(printf '%s' "$input" | jq -r '.cwd // empty')"

# Opt-out: `export CLAUDE_NO_COMPOSER_DELEGATE=1` to fall back to normal in-session implementation.
if [ "${CLAUDE_NO_COMPOSER_DELEGATE:-0}" = "1" ]; then
  exit 0
fi

read -r -d '' ctx <<EOF || true
The plan is approved and has been auto-saved to ${cwd}/docs/plans/. Do NOT implement
it yourself. Invoke the \`plan-dispatch\` skill now to ask how to proceed: save the plan
only, or dispatch to an agent for orchestration (then pick Claude Code, Cursor, opencode,
or Pi as the doer backend).
Workspace: ${cwd}.
EOF

jq -n --arg ctx "$ctx" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: $ctx
  }
}'
