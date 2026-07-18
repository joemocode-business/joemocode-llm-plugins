#!/usr/bin/env node
/**
 * Structural smoke checks for plan-to-agents Pi packaging (no Pi runtime required).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PI_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(PI_ROOT, "../../..");
const PACKAGE_JSON = path.join(REPO_ROOT, "package.json");

const FORBIDDEN_PROMPT_TOKENS = [/\bTask\b/, /\bAskUserQuestion\b/, /\bExitPlanMode\b/];

function fail(message) {
	console.error(`FAIL: ${message}`);
	process.exitCode = 1;
}

function ok(message) {
	console.log(`ok: ${message}`);
}

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertExists(filePath, label) {
	if (!fs.existsSync(filePath)) {
		fail(`missing ${label}: ${path.relative(REPO_ROOT, filePath)}`);
		return false;
	}
	ok(`found ${label}`);
	return true;
}

function checkPackageJson() {
	const pkg = readJson(PACKAGE_JSON);
	if (!pkg.pi) {
		fail("package.json missing pi key");
		return;
	}
	if (!Array.isArray(pkg.pi.skills) || pkg.pi.skills.length === 0) {
		fail("package.json pi.skills must be non-empty");
	}
	if (!Array.isArray(pkg.pi.extensions) || pkg.pi.extensions.length < 3) {
		fail("package.json pi.extensions must list subagent, question, and session-handoff extensions");
	}
	if (!Array.isArray(pkg.pi.prompts) || pkg.pi.prompts.length === 0) {
		fail("package.json pi.prompts must be set");
	}
	const extPaths = pkg.pi.extensions.map((p) => path.resolve(REPO_ROOT, p));
	for (const extPath of extPaths) {
		if (!fs.existsSync(extPath)) {
			fail(`pi.extensions path does not exist: ${extPath}`);
		}
	}
	ok("package.json pi manifest");
}

function checkPrompts() {
	const promptsDir = path.join(PI_ROOT, "prompts");
	const required = ["implement-plan.md", "plan-dispatch.md", "configure.md", "clear-plans.md"];
	for (const name of required) {
		const filePath = path.join(promptsDir, name);
		if (!assertExists(filePath, `prompt ${name}`)) continue;
		const text = fs.readFileSync(filePath, "utf8");
		if (!/subagent/.test(text)) {
			// configure/clear-plans use question only
			if (name === "implement-plan.md" || name === "plan-dispatch.md") {
				fail(`${name} should reference subagent tool`);
			}
		}
		if (!/question/.test(text)) {
			if (name !== "implement-plan.md") {
				fail(`${name} should reference question tool`);
			}
		}
		for (const pattern of FORBIDDEN_PROMPT_TOKENS) {
			if (pattern.test(text)) {
				fail(`${name} contains forbidden token ${pattern}`);
			}
		}
	}

	const implementPlanText = fs.readFileSync(path.join(promptsDir, "implement-plan.md"), "utf8");
	if (!implementPlanText.includes("git worktree add")) {
		fail("implement-plan.md must create isolated worktrees");
	}
	if (!implementPlanText.includes('"cwd": "<absolute-worktree-path>"')) {
		fail("implement-plan.md must pass each parallel task its worktree cwd");
	}
	if (!implementPlanText.includes("create a fresh `<group-slug>-fix-<n>` branch and worktree")) {
		fail("implement-plan.md must isolate verifier-failure re-dispatches");
	}
	if (!implementPlanText.includes("Only after all successful implementer branches have merged")) {
		fail("implement-plan.md must merge implementer branches before verification");
	}
	if (!implementPlanText.includes("Inspect every task result instead of aborting")) {
		fail("implement-plan.md must preserve successful branches after a partial failure");
	}

	const planDispatchText = fs.readFileSync(path.join(promptsDir, "plan-dispatch.md"), "utf8");
	if (!planDispatchText.includes("git worktree add")) {
		fail("plan-dispatch.md must create isolated worktrees");
	}
	if (!planDispatchText.includes("worktree path in its `cwd` field")) {
		fail("plan-dispatch.md must pass each Pi subtask its worktree cwd");
	}
	if (!planDispatchText.includes("split it into discrete subtasks")) {
		fail("plan-dispatch.md must decompose the approved plan before dispatch");
	}
	if (!planDispatchText.includes("merged plugin config loaded in step 2")) {
		fail("plan-dispatch.md must resolve headless models from merged config");
	}
	if (!planDispatchText.includes("Only then run `plan-verifier`")) {
		fail("plan-dispatch.md must merge implementer branches before verification");
	}
	if (!planDispatchText.includes("create a fresh `<subtask-slug>-fix-<n>` branch and worktree")) {
		fail("plan-dispatch.md must isolate verifier-failure re-dispatches");
	}

	const configureText = fs.readFileSync(path.join(promptsDir, "configure.md"), "utf8");
	if (!configureText.includes("Merge the `harnesses` map per canonical slug")) {
		fail("configure.md must preserve harness config per canonical slug");
	}
	if (!configureText.includes("merge per field")) {
		fail("configure.md must merge edited harness entries per field");
	}
	ok("prompt templates use Pi-native tools");
}

function checkExtensions() {
	const files = [
		path.join(PI_ROOT, "extensions/subagent/index.ts"),
		path.join(PI_ROOT, "extensions/subagent/agents.ts"),
		path.join(PI_ROOT, "extensions/question.ts"),
	];
	for (const filePath of files) {
		if (!assertExists(filePath, path.basename(filePath))) continue;
		const text = fs.readFileSync(filePath, "utf8");
		if (!text.includes("Upstream reference")) {
			fail(`${path.basename(filePath)} missing upstream reference comment`);
		}
		if (!text.includes("earendil-works/pi")) {
			fail(`${path.basename(filePath)} missing upstream repo link`);
		}
	}
	const agentsText = fs.readFileSync(path.join(PI_ROOT, "extensions/subagent/agents.ts"), "utf8");
	if (!agentsText.includes('"package"')) {
		fail("agents.ts must support package agent source");
	}
	ok("extension upstream references");
}

function checkAgentsDir() {
	const agentsDir = path.join(PI_ROOT, "agents");
	const required = ["plan-phase-implementer.md", "plan-verifier.md"];
	if (!fs.existsSync(agentsDir)) {
		fail("missing pi/agents/ directory — run shared/emit.sh");
		return;
	}
	for (const name of required) {
		const filePath = path.join(agentsDir, name);
		if (!assertExists(filePath, `generated agent ${name}`)) continue;
		const text = fs.readFileSync(filePath, "utf8");
		if (!/^---\nname: /m.test(text)) {
			fail(`${name} missing Pi name frontmatter`);
		}
		if (!/^description: /m.test(text)) {
			fail(`${name} missing description frontmatter`);
		}
		if (name === "plan-verifier.md" && !/^tools: read,grep,find,ls,bash$/m.test(text)) {
			fail("plan-verifier.md must restrict tools to read,grep,find,ls,bash");
		}
	}
	ok("generated Pi agents from emit.sh");
}

console.log("plan-to-agents Pi structural smoke\n");
checkPackageJson();
checkExtensions();
checkPrompts();
checkAgentsDir();

if (process.exitCode) {
	console.error("\nSmoke checks failed.");
	process.exit(process.exitCode);
}
console.log("\nAll smoke checks passed.");
