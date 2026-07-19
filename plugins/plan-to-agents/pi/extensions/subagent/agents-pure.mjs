export function mergeAgents(userAgents, packageAgents, projectAgents) {
	const agentMap = new Map();
	for (const agent of userAgents) agentMap.set(agent.name, agent);
	for (const agent of packageAgents) agentMap.set(agent.name, agent);
	for (const agent of projectAgents) agentMap.set(agent.name, agent);
	return Array.from(agentMap.values());
}

export function formatAgentList(agents, maxItems) {
	if (agents.length === 0) return { text: "none", remaining: 0 };
	const listed = agents.slice(0, maxItems);
	const remaining = agents.length - listed.length;
	return {
		text: listed.map((a) => `${a.name} (${a.source}): ${a.description}`).join("; "),
		remaining,
	};
}
