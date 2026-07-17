import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateMarketplace } from "./validate-marketplace.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeFixture(root, files) {
  for (const [relativePath, value] of Object.entries(files)) {
    writeJson(join(root, relativePath), value);
  }
}

const baseCatalog = {
  name: "test-marketplace",
  owner: { name: "Test Owner" },
  metadata: { description: "fixture", version: "0.0.0" },
  plugins: [
    {
      name: "plan-to-agents",
      source: "./plugins/plan-to-agents",
      description: "plan plugin",
    },
    {
      name: "session-handoff",
      source: "./plugins/session-handoff",
      description: "handoff plugin",
    },
  ],
};

const planManifests = {
  ".claude-plugin/plugin.json": {
    name: "plan-to-agents",
    description: "plan plugin",
    hooks: "./hooks/hooks.json",
  },
  ".cursor-plugin/plugin.json": {
    name: "plan-to-agents",
    description: "plan plugin",
    skills: "./skills/",
    agents: "./agents/",
    hooks: "./hooks/hooks-cursor.json",
  },
};

const handoffManifests = {
  ".claude-plugin/plugin.json": {
    name: "session-handoff",
    description: "handoff plugin",
    skills: "./skills/",
  },
  ".cursor-plugin/plugin.json": {
    name: "session-handoff",
    description: "handoff plugin",
    skills: "./skills/",
  },
};

function writeValidPluginTree(root) {
  writeFixture(root, {
    ".claude-plugin/marketplace.json": baseCatalog,
    ".cursor-plugin/marketplace.json": baseCatalog,
    "plugins/plan-to-agents/.claude-plugin/plugin.json": planManifests[".claude-plugin/plugin.json"],
    "plugins/plan-to-agents/.cursor-plugin/plugin.json": planManifests[".cursor-plugin/plugin.json"],
    "plugins/session-handoff/.claude-plugin/plugin.json": handoffManifests[".claude-plugin/plugin.json"],
    "plugins/session-handoff/.cursor-plugin/plugin.json": handoffManifests[".cursor-plugin/plugin.json"],
  });

  for (const relativePath of [
    "plugins/plan-to-agents/skills/.gitkeep",
    "plugins/plan-to-agents/agents/.gitkeep",
    "plugins/plan-to-agents/hooks/hooks.json",
    "plugins/plan-to-agents/hooks/hooks-cursor.json",
    "plugins/session-handoff/skills/.gitkeep",
  ]) {
    const fullPath = join(root, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, "{}", "utf8");
  }
}

test("passes on repository root", () => {
  const result = validateMarketplace(REPO_ROOT);
  assert.equal(result.ok, true, result.errors.join("; "));
});

test("fails when Cursor catalog is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "marketplace-fixture-"));
  writeValidPluginTree(root);
  unlinkSync(join(root, ".cursor-plugin/marketplace.json"));

  const result = validateMarketplace(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /missing file:.*\.cursor-plugin\/marketplace\.json/);
});

test("fails on bad plugin manifest when Cursor catalog is absent", () => {
  const root = mkdtempSync(join(tmpdir(), "marketplace-fixture-"));
  writeFixture(root, {
    ".claude-plugin/marketplace.json": {
      ...baseCatalog,
      plugins: [baseCatalog.plugins[0]],
    },
    "plugins/plan-to-agents/.claude-plugin/plugin.json": {
      ...planManifests[".claude-plugin/plugin.json"],
      name: "wrong-name",
    },
  });
  mkdirSync(join(root, "plugins/plan-to-agents/hooks"), { recursive: true });
  writeFileSync(join(root, "plugins/plan-to-agents/hooks/hooks.json"), "{}", "utf8");

  const result = validateMarketplace(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /does not match marketplace entry 'plan-to-agents'/);
});

test("fails when Cursor catalog includes Claude-only strict field", () => {
  const root = mkdtempSync(join(tmpdir(), "marketplace-fixture-"));
  writeValidPluginTree(root);
  writeJson(join(root, ".cursor-plugin/marketplace.json"), {
    ...baseCatalog,
    plugins: baseCatalog.plugins.map((plugin) => ({ ...plugin, strict: true })),
  });

  const result = validateMarketplace(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Claude-only field 'strict'/);
});

test("fails when manifest name does not match marketplace entry", () => {
  const root = mkdtempSync(join(tmpdir(), "marketplace-fixture-"));
  writeValidPluginTree(root);
  writeJson(join(root, "plugins/session-handoff/.cursor-plugin/plugin.json"), {
    ...handoffManifests[".cursor-plugin/plugin.json"],
    name: "wrong-name",
  });

  const result = validateMarketplace(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /does not match marketplace entry 'session-handoff'/);
});

test("fails when session-handoff declares Cursor hooks", () => {
  const root = mkdtempSync(join(tmpdir(), "marketplace-fixture-"));
  writeValidPluginTree(root);
  writeJson(join(root, "plugins/session-handoff/.cursor-plugin/plugin.json"), {
    ...handoffManifests[".cursor-plugin/plugin.json"],
    hooks: "./hooks/hooks-cursor.json",
  });
  writeJson(join(root, "plugins/session-handoff/hooks/hooks-cursor.json"), { version: 1, hooks: {} });

  const result = validateMarketplace(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /must not declare 'hooks' for session-handoff/);
});

test("fails when declared component path is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "marketplace-fixture-"));
  writeValidPluginTree(root);
  writeJson(join(root, "plugins/plan-to-agents/.cursor-plugin/plugin.json"), {
    ...planManifests[".cursor-plugin/plugin.json"],
    agents: "./missing-agents/",
  });

  const result = validateMarketplace(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /declared 'agents' path does not exist/);
});
