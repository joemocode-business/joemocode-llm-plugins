/**
 * Regression tests for Pi subagent extension runtime (jiti loader + discovery).
 *
 * Requires @earendil-works/pi-coding-agent (global Pi install or peer deps).
 * Run: node plugins/plan-to-agents/pi/tests/subagent-runtime.test.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PI_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(PI_ROOT, "../../..");
const SUBAGENT_EXT = path.join(PI_ROOT, "extensions/subagent/index.ts");
const PACKAGE_AGENTS_DIR = path.join(PI_ROOT, "agents");

function fail(message) {
	console.error(`FAIL: ${message}`);
	process.exitCode = 1;
}

async function loadPiCodingAgent() {
	try {
		return await import("@earendil-works/pi-coding-agent");
	} catch {
		const globalRoot = spawnSync("npm", ["root", "-g"], { encoding: "utf8" }).stdout?.trim();
		if (!globalRoot) throw new Error("Cannot resolve @earendil-works/pi-coding-agent");
		const entry = path.join(globalRoot, "@earendil-works/pi-coding-agent/dist/index.js");
		return import(`file://${entry}`);
	}
}

async function main() {
	const sandbox = fs.mkdtempSync(path.join(path.dirname(PI_ROOT), "pi-subagent-test-"));
	const { discoverAndLoadExtensions, createEventBus } = await loadPiCodingAgent();

	const { extensions, errors } = await discoverAndLoadExtensions(
		[SUBAGENT_EXT],
		sandbox,
		undefined,
		createEventBus(),
	);

	if (errors?.length) {
		fail(`extension load errors: ${errors.map((e) => e.message ?? e).join("; ")}`);
		return;
	}

	const subagentTool = extensions[0]?.tools?.get("subagent");
	if (!subagentTool?.definition?.execute) {
		fail("subagent tool not registered");
		return;
	}

	const execute = subagentTool.definition.execute;
	const ctx = { cwd: sandbox, hasUI: false, ui: { notify() {}, confirm: async () => true } };

	// ctx.cwd must reach discoverAgents (jiti regression: CONFIG_DIR_NAME import broke ctx binding)
	let invalidMode;
	try {
		invalidMode = await execute("tc-invalid", {}, new AbortController().signal, undefined, ctx);
	} catch (e) {
		fail(`execute threw before discovery: ${e.message}`);
		return;
	}

	const invalidText = invalidMode.content?.[0]?.text ?? "";
	assert.match(invalidText, /Invalid parameters/);
	assert.match(invalidText, /plan-phase-implementer/);
	assert.match(invalidText, /plan-verifier/);
	console.log("ok: package agents discovered via Pi extension loader");

	assert.equal(invalidMode.details?.packageAgentsDir, PACKAGE_AGENTS_DIR);
	console.log("ok: PACKAGE_AGENTS_DIR resolves to pi/agents");

	// YAML list-style tools in project agent frontmatter must not abort discovery
	const projectAgentsDir = path.join(sandbox, ".pi", "agents");
	fs.mkdirSync(projectAgentsDir, { recursive: true });
	fs.writeFileSync(
		path.join(projectAgentsDir, "yaml-tools-agent.md"),
		`---
name: yaml-tools-agent
description: agent with list-style tools
tools:
  - read
  - bash
---
body
`,
		"utf-8",
	);

	let yamlToolsDiscovery;
	try {
		yamlToolsDiscovery = await execute(
			"tc-yaml-tools",
			{ agentScope: "both" },
			new AbortController().signal,
			undefined,
			ctx,
		);
	} catch (e) {
		fail(`execute threw during discovery with YAML list tools: ${e.message}`);
		return;
	}

	const yamlToolsText = yamlToolsDiscovery.content?.[0]?.text ?? "";
	assert.match(yamlToolsText, /Invalid parameters/);
	assert.match(yamlToolsText, /yaml-tools-agent/);
	assert.match(yamlToolsText, /plan-phase-implementer/);
	console.log("ok: YAML list-style tools frontmatter does not abort discovery");

	// Single mode: past discovery (unknown agent lists package agents, no ctx.cwd TypeError)
	const single = await execute(
		"tc-single",
		{ agent: "nonexistent-agent", task: "noop" },
		new AbortController().signal,
		undefined,
		ctx,
	);
	assert.equal(single.isError, true);
	const singleText = single.content?.[0]?.text ?? "";
	assert.match(singleText, /Unknown agent/);
	assert.match(singleText, /plan-phase-implementer/);
	console.log("ok: single mode passes discovery");

	// Parallel mode: past discovery (returns parallel structure without ctx.cwd TypeError)
	const parallel = await execute(
		"tc-parallel",
		{
			tasks: [
				{ agent: "nonexistent-a", task: "t1" },
				{ agent: "nonexistent-b", task: "t2" },
			],
		},
		new AbortController().signal,
		undefined,
		ctx,
	);
	assert.equal(parallel.details?.mode, "parallel");
	assert.equal(parallel.details?.results?.length, 2);
	assert.match(parallel.content?.[0]?.text ?? "", /Parallel: 0\/2 succeeded/);
	assert.equal(parallel.isError, true);
	console.log("ok: parallel mode passes discovery");

	// Parallel mode: partial failure still marks the batch as error
	const parallelMixed = await execute(
		"tc-parallel-mixed",
		{
			tasks: [
				{ agent: "plan-phase-implementer", task: "noop", cwd: path.join(sandbox, "nonexistent-cwd") },
				{ agent: "nonexistent-b", task: "t2" },
			],
		},
		new AbortController().signal,
		undefined,
		ctx,
	);
	assert.equal(parallelMixed.details?.mode, "parallel");
	assert.equal(parallelMixed.details?.results?.length, 2);
	assert.equal(parallelMixed.isError, true);
	console.log("ok: parallel mode sets isError when any task fails");

	// Optional: aborted spawn for a real package agent (no credentials required)
	const abortController = new AbortController();
	abortController.abort();
	let aborted;
	try {
		aborted = await execute(
			"tc-abort",
			{ agent: "plan-phase-implementer", task: "noop" },
			abortController.signal,
			undefined,
			ctx,
		);
	} catch (e) {
		assert.match(e.message, /aborted/i);
		console.log("ok: real package agent reaches spawn path (aborted via throw)");
		aborted = null;
	}
	if (aborted) {
		assert.equal(aborted.isError, true);
		assert.match(aborted.content?.[0]?.text ?? "", /aborted|failed/i);
		console.log("ok: real package agent reaches spawn path (aborted via result)");
	}

	if (!process.exitCode) {
		console.log("subagent-runtime.test.mjs: all assertions passed");
	}
}

main().catch((e) => {
	fail(e.message);
});
