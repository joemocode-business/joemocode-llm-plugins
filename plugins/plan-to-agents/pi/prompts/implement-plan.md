Implement the plan at: $ARGUMENTS

**Requires a plan path.** If `$ARGUMENTS` is empty, stop and ask the user which file under `docs/plans/` to implement (list available plans if helpful). Do not pick a default.

You are the ORCHESTRATOR. Do not implement phases yourself — use the native **`subagent`** tool to spawn child agents.

## 1. Read the plan

Extract phases (`##` sections or `### Phase N`), tasks, target files, acceptance criteria (`Verification`, `Acceptance criteria`, or derived from goals), and dependencies.

## 2. Classify size

| Size | Condition | Action |
|------|-----------|--------|
| Small | ≤2 phases AND ≤6 tasks | One `plan-phase-implementer` subagent with the full plan |
| Large | 3+ phases OR 7+ tasks | Multiple `plan-phase-implementer` subagents — one per independent phase group |

Parallelize groups that touch different files. Each subagent works on its own branch off `base=$(git rev-parse --abbrev-ref HEAD)` and commits there.

## 3. Spawn implementers

Use **`subagent`** in parallel mode when groups are independent:

```json
{
  "tasks": [
    { "agent": "plan-phase-implementer", "task": "..." }
  ]
}
```

Fire all independent implementers in one response. Prompt each with its phase(s), full plan for context, and previously completed phases. Wait for all to finish.

## 4. Merge implementer branches

Merge verified implementer branches back into `base` so per-phase commits remain separate but the cumulative diff on `base` reflects the full implementation.

## 5. Spawn verifier

Fire one `plan-verifier` subagent with the base branch name, acceptance criteria, and the change manifest.

## 6. Fix and re-verify

If the verifier reports `FAIL`, re-dispatch `plan-phase-implementer` for failing groups, then re-run the verifier.

## 7. Report

Summarize phases run, verifier pass/fail per criterion, branch list, and outstanding blockers.
