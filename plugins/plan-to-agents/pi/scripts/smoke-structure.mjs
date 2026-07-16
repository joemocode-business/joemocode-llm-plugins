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
	if (!Array.isArray(pkg.pi.extensions) || pkg.pi.extensions.length < 2) {
		fail("package.json pi.extensions must list subagent and question extensions");
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
		if (!/\*\*subagent\*\*/.test(text) && !/subagent/.test(text)) {
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

function checkAgentsDirPlaceholder() {
	const agentsDir = path.join(PI_ROOT, "agents");
	if (!fs.existsSync(agentsDir)) {
		ok("agents/ directory pending emit.sh generation (expected in Wave 2)");
		return;
	}
	const mdFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
	if (mdFiles.length === 0) {
		ok("agents/ exists but empty — emit.sh integration pending");
	} else {
		ok(`agents/ has ${mdFiles.length} markdown file(s)`);
	}
}

console.log("plan-to-agents Pi structural smoke\n");
checkPackageJson();
checkExtensions();
checkPrompts();
checkAgentsDirPlaceholder();

if (process.exitCode) {
	console.error("\nSmoke checks failed.");
	process.exit(process.exitCode);
}
console.log("\nAll smoke checks passed.");
