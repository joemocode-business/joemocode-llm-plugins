---
description: Implement a plan file via plan-phase-implementer and plan-verifier subagents
---

Implement the plan at: $ARGUMENTS

If no path was given, use the most recent file in `docs/plans/`.

You are the ORCHESTRATOR. Do not implement phases yourself — use the native **Task** tool to spawn subagents.

## 1. Read the plan

Extract phases (`##` sections or `### Phase N`), tasks, target files, acceptance criteria (`Verification`, `Acceptance criteria`, or derived from goals), and dependencies.

## 2. Classify size

| Size | Condition | Action |
|------|-----------|--------|
| Small | ≤2 phases AND ≤6 tasks | One `plan-phase-implementer` Task with the full plan |
| Large | 3+ phases OR 7+ tasks | Multiple `plan-phase-implementer` Tasks — one per independent phase group |

Parallelize groups that touch different files. Follow `plugins/plan-to-agents/shared/orchestration-pattern.md` — each Task works in its own branch/worktree off `base=$(git rev-parse --abbrev-ref HEAD)` and commits there.

## 3. Spawn implementers

Fire all independent `plan-phase-implementer` Tasks in one response. Prompt each with its phase(s), full plan for context, and previously completed phases. Wait for all to finish.

## 4. Spawn verifier

Fire one `plan-verifier` Task with acceptance criteria and the change manifest.

## 5. Fix and re-verify

If the verifier reports `FAIL`, re-dispatch `plan-phase-implementer` for failing groups, then re-run the verifier.

## 6. Report

Summarize phases run, verifier pass/fail per criterion, branch list, and outstanding blockers.
