/**
 * Pi session_before_compact guard for session-handoff.
 *
 * Blocks compaction once per ~15 minutes per session so the user can run
 * /skill:compact-handoff while full context is intact. Honors
 * SESSION_HANDOFF_NO_PRECOMPACT=1. Uses Pi's { cancel: true } contract and
 * ctx.ui.notify — not Claude PreCompact JSON semantics.
 */
import { tmpdir } from "node:os";
import { writeFile, stat } from "node:fs/promises";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	BLOCK_MESSAGE,
	decideCompactionGuard,
	precompactMarkerPath,
	transcriptStashPath,
} from "../lib/compaction-guard.ts";

async function markerMtimeMs(path: string): Promise<number | null> {
	try {
		const st = await stat(path);
		return st.mtimeMs;
	} catch {
		return null;
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("session_before_compact", async (_event, ctx) => {
		const sessionId = ctx.sessionManager.getSessionId();
		const tmp = process.env.TMPDIR ?? tmpdir();
		const markerPath = precompactMarkerPath(tmp, sessionId);

		const decision = decideCompactionGuard({
			noPrecompactEnv: process.env.SESSION_HANDOFF_NO_PRECOMPACT,
			markerMtimeMs: await markerMtimeMs(markerPath),
		});

		if (decision === "allow") {
			return;
		}

		await writeFile(markerPath, "", { flag: "w" });

		const sessionFile = ctx.sessionManager.getSessionFile();
		if (sessionFile) {
			await writeFile(transcriptStashPath(tmp, sessionId), sessionFile, "utf8");
		}

		ctx.ui.notify(BLOCK_MESSAGE, "warning");

		return { cancel: true };
	});
}
