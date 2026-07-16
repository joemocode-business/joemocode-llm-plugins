import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	LOOP_GUARD_MINUTES,
	decideCompactionGuard,
	precompactMarkerPath,
	transcriptStashPath,
} from "../lib/compaction-guard.ts";

const NOW = 1_700_000_000_000;

describe("decideCompactionGuard", () => {
	it("allows compaction when SESSION_HANDOFF_NO_PRECOMPACT=1", () => {
		assert.equal(
			decideCompactionGuard({ noPrecompactEnv: "1", markerMtimeMs: null, nowMs: NOW }),
			"allow",
		);
	});

	it("blocks when no opt-out and no recent marker", () => {
		assert.equal(
			decideCompactionGuard({ noPrecompactEnv: "0", markerMtimeMs: null, nowMs: NOW }),
			"block",
		);
	});

	it("allows when marker is within the loop-guard window", () => {
		const fiveMinutesAgo = NOW - 5 * 60 * 1000;
		assert.equal(
			decideCompactionGuard({
				noPrecompactEnv: "0",
				markerMtimeMs: fiveMinutesAgo,
				nowMs: NOW,
				loopGuardMinutes: LOOP_GUARD_MINUTES,
			}),
			"allow",
		);
	});

	it("blocks when marker is older than the loop-guard window", () => {
		const twentyMinutesAgo = NOW - 20 * 60 * 1000;
		assert.equal(
			decideCompactionGuard({
				noPrecompactEnv: "0",
				markerMtimeMs: twentyMinutesAgo,
				nowMs: NOW,
				loopGuardMinutes: LOOP_GUARD_MINUTES,
			}),
			"block",
		);
	});
});

describe("temp paths", () => {
	it("uses session id in marker and transcript stash paths", () => {
		assert.equal(
			precompactMarkerPath("/tmp", "abc-123"),
			"/tmp/session-handoff-precompact-abc-123",
		);
		assert.equal(
			transcriptStashPath("/tmp", "abc-123"),
			"/tmp/session-handoff-transcript-abc-123",
		);
	});
});
