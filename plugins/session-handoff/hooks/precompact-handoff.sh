#!/usr/bin/env bash
# PreCompact: fires right before the conversation is compacted (manual /compact or
# auto when context fills). Blocks the compaction ONCE and tells the USER (via
# systemMessage) to run the `compact-handoff` skill, which asks whether to finish the
# request, write a research artifact, or write an agent-prompt handoff — while full
# context is still intact. This mirrors the manual Cursor flow (the user drives the skill).
#
# On a PreCompact block, control returns to the user and the model does NOT take a turn,
# so `reason` is effectively ignored; the user-facing message goes in `systemMessage`.
#
# Loop guard: blocks at most once per ~15 min per session, so if the user just wants to
# compact (run /compact again) the next compaction proceeds normally instead of looping.
set -euo pipefail

input="$(cat)"
trigger="$(printf '%s' "$input" | jq -r '.trigger // "auto"')"
transcript_path="$(printf '%s' "$input" | jq -r '.transcript_path // empty')"
cwd="$(printf '%s' "$input" | jq -r '.cwd // empty')"
session_id="$(printf '%s' "$input" | jq -r '.session_id // "unknown"')"

# Opt-out: `export SESSION_HANDOFF_NO_PRECOMPACT=1` to let compaction proceed untouched.
if [ "${SESSION_HANDOFF_NO_PRECOMPACT:-0}" = "1" ]; then
  exit 0
fi

# One-shot loop guard: if we already blocked for this session within the last 15 minutes,
# allow compaction to proceed this time.
marker="${TMPDIR:-/tmp}/session-handoff-precompact-${session_id}"
if [ -f "$marker" ] && [ -n "$(find "$marker" -mmin -15 2>/dev/null)" ]; then
  exit 0
fi
: > "$marker"

# Stash the transcript path so the manually-run skill can build from the full
# pre-compaction transcript even though the model wasn't handed it directly.
printf '%s' "$transcript_path" > "${TMPDIR:-/tmp}/session-handoff-transcript-${session_id}"

msg="Compaction paused. Run /compact-handoff to finish the request or capture a handoff artifact (research dump or agent-prompt). Or run /compact again to proceed without one."

jq -n --arg msg "$msg" '{
  decision: "block",
  reason: $msg,
  systemMessage: $msg
}'
