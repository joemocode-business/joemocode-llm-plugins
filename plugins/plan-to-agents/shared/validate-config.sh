#!/usr/bin/env bash
# Validate plan-to-agents config.json shape (canonical slugs, field types).
set -euo pipefail

CANONICAL_SLUGS=(claude-code cursor opencode pi)

usage() {
  cat <<'EOF'
Usage: validate-config.sh <path-to-config.json>

Validate a plan-to-agents config file. Prints "OK: <path>" on success; errors to stderr.
EOF
}

is_canonical_slug() {
  local slug=$1 s
  for s in "${CANONICAL_SLUGS[@]}"; do
    if [ "$slug" = "$s" ]; then
      return 0
    fi
  done
  return 1
}

fail() {
  echo "validate-config.sh: $*" >&2
  exit 1
}

if [ $# -ne 1 ]; then
  usage >&2
  exit 1
fi

CONFIG_PATH=$1

if [ ! -f "$CONFIG_PATH" ]; then
  fail "file not found: $CONFIG_PATH"
fi

if ! jq empty "$CONFIG_PATH" 2>/dev/null; then
  fail "invalid JSON: $CONFIG_PATH"
fi

if jq -e 'has("version")' "$CONFIG_PATH" >/dev/null; then
  if ! jq -e '.version | type == "number"' "$CONFIG_PATH" >/dev/null; then
    fail "version must be a number"
  fi
fi

if jq -e 'has("enabled_harnesses")' "$CONFIG_PATH" >/dev/null; then
  if ! jq -e '.enabled_harnesses | type == "array"' "$CONFIG_PATH" >/dev/null; then
    fail "enabled_harnesses must be an array"
  fi

  while IFS= read -r slug; do
    if [ -z "$slug" ]; then
      continue
    fi
    if ! is_canonical_slug "$slug"; then
      fail "enabled_harnesses contains unknown slug: $slug"
    fi
  done < <(jq -r '.enabled_harnesses[]' "$CONFIG_PATH")

  dupes=$(jq -r '.enabled_harnesses | group_by(.) | map(select(length > 1) | .[0]) | .[]' "$CONFIG_PATH")
  if [ -n "$dupes" ]; then
    while IFS= read -r slug; do
      if [ -n "$slug" ]; then
        fail "enabled_harnesses contains duplicate slug: $slug"
      fi
    done <<<"$dupes"
  fi
fi

if jq -e 'has("harnesses")' "$CONFIG_PATH" >/dev/null; then
  if ! jq -e '.harnesses | type == "object"' "$CONFIG_PATH" >/dev/null; then
    fail "harnesses must be an object"
  fi

  while IFS= read -r slug; do
    if [ -z "$slug" ]; then
      continue
    fi
    if ! is_canonical_slug "$slug"; then
      fail "harnesses contains unknown slug key: $slug"
    fi
  done < <(jq -r '.harnesses | keys[]' "$CONFIG_PATH")

  for slug in "${CANONICAL_SLUGS[@]}"; do
    if ! jq -e --arg s "$slug" '.harnesses | has($s)' "$CONFIG_PATH" >/dev/null; then
      continue
    fi

    if ! jq -e --arg s "$slug" '
      .harnesses[$s].default_model
      | . == null or (type == "string" and (. | length) > 0)
    ' "$CONFIG_PATH" >/dev/null; then
      fail "harnesses.$slug.default_model must be a non-empty string or null"
    fi

    if jq -e --arg s "$slug" '.harnesses[$s] | has("models")' "$CONFIG_PATH" >/dev/null; then
      if ! jq -e --arg s "$slug" '.harnesses[$s].models | type == "array"' "$CONFIG_PATH" >/dev/null; then
        fail "harnesses.$slug.models must be an array"
      fi

      while IFS= read -r model; do
        if [ -z "$model" ]; then
          continue
        fi
        model_type=$(jq -r --arg s "$slug" --arg m "$model" '
          .harnesses[$s].models[] | select(. == $m) | type
        ' "$CONFIG_PATH" | head -n1)
        if [ "$model_type" != "string" ]; then
          fail "harnesses.$slug.models entries must be strings"
        fi
      done < <(jq -r --arg s "$slug" '.harnesses[$s].models[]' "$CONFIG_PATH")
    fi
  done
fi

printf 'OK: %s\n' "$CONFIG_PATH"
