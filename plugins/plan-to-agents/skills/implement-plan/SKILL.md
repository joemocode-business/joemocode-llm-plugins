---
name: implement-plan
description: Implement a plan file by orchestrating parallel subagents per phase, then verifying acceptance criteria. Use when the user provides a plan file path (e.g. docs/plans/YYYY-MM-DD-name.md) or names a specific plan to implement. Requires an explicit plan path — do not run without one.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---
# Implement Plan

## Runtime operations

| Harness | Subagent delegation | Explicit entry | Configure |
|---------|---------------------|----------------|-----------|
| Claude Code | `Task` (`plan-phase-implementer`, `plan-verifier`) | `/plan-to-agents:implement-plan` skill | `/plan-to-agents:configure` |
| Cursor | `Task` (`plan-phase-implementer`, `plan-verifier`) | `/plan-to-agents:implement-plan` skill | `/plan-to-agents:configure` |
| opencode | `task` (`plan-phase-implementer`, `plan-verifier`) | `/implement-plan` skill (explicit-only via `permission.skill` denies in merged `opencode.json`; frontmatter honored on Claude Code / Cursor only) | `/configure` |
| Pi | `subagent` (`plan-phase-implementer`, `plan-verifier`) | `/implement-plan` prompt | `/configure` prompt |

Implement a plan file using parallel subagents for large plans, a single subagent for small plans, then a verifier.

## 1. Read the plan

**Requires an explicit plan path.** This skill is on-demand — do not guess or pick a default from `docs/plans/`.

Read the file at the path provided in the user's request or slash-command argument (e.g. `docs/plans/YYYY-MM-DD-name.md`). If no path was given, stop and ask the user which plan to implement; you may list `docs/plans/*.md` to help them choose. Extract:
- **Phases**: `##`-level sections, numbered top-level steps, or `### Phase N` headings
- **Tasks**: bullet/numbered items under each phase
- **Files**: any file paths mentioned per phase
- **Acceptance criteria**: section named "Acceptance criteria", "Test strategy", "Verification", "Risk", or the plan's numbered sequencing steps
- **Dependencies**: any explicit `depends on: Phase N` annotations or clear sequential ordering

If no acceptance criteria section exists, derive criteria from the plan's "after shape", "goal", or the final step's expected state.

## 2. Classify plan size

| Size | Condition | Action |
|------|-----------|--------|
| Small | ≤2 phases AND ≤6 tasks total | One `plan-phase-implementer` with the full plan |
| Large | 3+ phases OR 7+ tasks | Multiple `plan-phase-implementer` dispatches, one per independent phase group |

On Claude Code and Cursor, fire **`Task`** calls. On opencode, fire **`task`** calls. On Pi, fire **`subagent`** calls (parallel `tasks` array when groups are independent).

## 3. For large plans — identify parallelizable groups

- Phases that touch **different files** → run in parallel (separate delegation calls in one response)
- Phases that share files, or where one `depends on` another → group together and run sequentially within a single implementer Task
- When file overlap is unclear, put each phase in its own group and let the implementer run them sequentially

## 4. Spawn implementers

Capture the feature branch once: `base=$(git rev-parse --abbrev-ref HEAD)`.

For parallelizable phase groups, each subagent should work in its own branch/worktree off `$base` and commit there — following [orchestration-pattern.md](../../shared/orchestration-pattern.md) — so per-phase diffs are reviewable as separate branches before merging back.

For each independent group, dispatch a **`plan-phase-implementer`** subagent (see Runtime operations for the harness tool name).
Fire all independent groups **in the same response** (parallel).

Inject this prompt per subagent:

```
Implement the following phase(s) of the plan.

**Your phases:**
[paste the phase title(s) + all task bullets from the plan for this group]

**Full plan for context (do not implement phases outside your group):**
[paste full plan text]

**Previously completed phases (do not re-implement):**
[list completed phase names, or "none"]

Report back: files changed, commands run, blockers.
```

Wait for all implementer subagents to complete before continuing.

## 5. Collect results and check for blockers

Review each implementer's report. If any phase is `blocked`:
- Resolve the blocker (ask user if needed)
- Re-spawn just that group before continuing

Compile a change manifest: list of files changed across all groups.

## 6. Merge implementer branches

Merge verified implementer branches back into `$base` (sequentially when phases depended on each other). The goal is **separate commits per phase** for granular review, then **one cumulative tree on `$base`** for plan-level verification.

## 7. Spawn verifier

Fire one **`plan-verifier`** subagent (see Runtime operations) with:

```
**Base branch:** $base

**Acceptance criteria from the plan:**
[paste extracted criteria]

**Files changed:**
[paste change manifest]
```

## 8. Fix verifier failures (if any)

If the verifier reports any `FAIL` criteria or code-review annotations requiring changes:

1. Identify which phases own the failing code
2. Spawn a new **`plan-phase-implementer`** subagent for each failing group, passing:
   - The specific failing criteria as the "Acceptance criteria to fix"
   - The verifier's evidence / code-review annotations as context
3. Wait for the fix implementer(s) to complete, then re-run the verifier (step 7) once more
4. Repeat until the verifier passes or a criterion is explicitly marked `NEEDS-MANUAL`

## 9. Report to user and update PR

Summarize:
- Which phases ran and how (parallel groups or single)
- Verifier output: pass/fail per criterion
- Code-review findings from the verifier and whether they were resolved
- Outstanding blockers or follow-up items from the plan's "Out of scope" / "Follow-ups" section

**Add the full summary to the PR description.** If no PR exists yet, create one with `gh pr create` and include the summary in the body. To update an existing PR, use:

```bash
gh pr edit --body "$(cat <<'EOF'
[summary]
EOF
)"
```
