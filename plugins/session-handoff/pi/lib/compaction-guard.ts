/** Minutes within which a second compaction attempt is allowed after a block. */
export const LOOP_GUARD_MINUTES = 15;

export const BLOCK_MESSAGE =
	"Compaction paused. Run /skill:compact-handoff to finish the request or capture a handoff artifact (research dump or agent-prompt). Or run /compact again to proceed without one.";

export type CompactionGuardDecision = "allow" | "block";

export interface CompactionGuardInput {
	noPrecompactEnv?: string;
	markerMtimeMs?: number | null;
	nowMs?: number;
	loopGuardMinutes?: number;
}

/** Pure decision logic mirrored from hooks/precompact-handoff.sh. */
export function decideCompactionGuard(input: CompactionGuardInput): CompactionGuardDecision {
	if (input.noPrecompactEnv === "1") {
		return "allow";
	}

	const now = input.nowMs ?? Date.now();
	const loopGuardMs = (input.loopGuardMinutes ?? LOOP_GUARD_MINUTES) * 60 * 1000;

	if (input.markerMtimeMs != null && now - input.markerMtimeMs < loopGuardMs) {
		return "allow";
	}

	return "block";
}

export function precompactMarkerPath(tmpdir: string, sessionId: string): string {
	return `${tmpdir}/session-handoff-precompact-${sessionId}`;
}

export function transcriptStashPath(tmpdir: string, sessionId: string): string {
	return `${tmpdir}/session-handoff-transcript-${sessionId}`;
}
