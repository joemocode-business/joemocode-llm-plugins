/**
 * Pure helper tests for agent merge precedence (no Pi runtime).
 */
import assert from "node:assert/strict";

function mergeAgents(userAgents, packageAgents, projectAgents) {
	const agentMap = new Map();
	for (const agent of userAgents) agentMap.set(agent.name, agent);
	for (const agent of packageAgents) agentMap.set(agent.name, agent);
	for (const agent of projectAgents) agentMap.set(agent.name, agent);
	return Array.from(agentMap.values());
}

const user = [{ name: "scout", source: "user" }];
const pkg = [{ name: "plan-phase-implementer", source: "package" }];
const project = [
	{ name: "scout", source: "project" },
	{ name: "plan-verifier", source: "project" },
];

const merged = mergeAgents(user, pkg, project);
assert.equal(merged.length, 3);
assert.equal(merged.find((a) => a.name === "scout")?.source, "project");
assert.equal(merged.find((a) => a.name === "plan-phase-implementer")?.source, "package");
assert.equal(merged.find((a) => a.name === "plan-verifier")?.source, "project");

console.log("agents-discovery.test.mjs: all assertions passed");
