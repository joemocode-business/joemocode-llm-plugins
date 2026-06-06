#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MARKETPLACE_PATH = join(ROOT, ".claude-plugin", "marketplace.json");

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function writeStubIfMissing(path, content) {
  if (!existsSync(path)) {
    ensureDir(dirname(path));
    writeFileSync(path, JSON.stringify(content, null, 2) + "\n", "utf8");
    console.error(`created stub: ${path}`);
  }
}

function validateMarketplace() {
  if (!existsSync(MARKETPLACE_PATH)) {
    fail(`missing marketplace manifest: ${MARKETPLACE_PATH}`);
  }

  let marketplace;
  try {
    marketplace = JSON.parse(readFileSync(MARKETPLACE_PATH, "utf8"));
  } catch (err) {
    fail(`invalid JSON in ${MARKETPLACE_PATH}: ${err.message}`);
  }

  if (!marketplace.name || typeof marketplace.name !== "string") {
    fail("marketplace.json: required field 'name' is missing or not a string");
  }

  if (!marketplace.owner?.name || typeof marketplace.owner.name !== "string") {
    fail("marketplace.json: required field 'owner.name' is missing or not a string");
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    fail("marketplace.json: required field 'plugins' must be a non-empty array");
  }

  for (const [index, plugin] of marketplace.plugins.entries()) {
    const label = `plugins[${index}]`;

    if (!plugin.name || typeof plugin.name !== "string") {
      fail(`${label}: required field 'name' is missing or not a string`);
    }

    if (!plugin.source || typeof plugin.source !== "string") {
      fail(`${label}: required field 'source' is missing or not a string`);
    }

    const pluginRoot = resolve(ROOT, plugin.source);
    const description =
      plugin.description ||
      "Post-plan agent delegation: Claude→Cursor CLI, Cursor→Task subagents";
    const version = plugin.version || "0.1.0";

    const claudeManifest = join(pluginRoot, ".claude-plugin", "plugin.json");
    const cursorManifest = join(pluginRoot, ".cursor-plugin", "plugin.json");

    writeStubIfMissing(claudeManifest, {
      name: plugin.name,
      version,
      description,
      hooks: "./hooks/hooks.json",
    });

    writeStubIfMissing(cursorManifest, {
      name: plugin.name,
      version,
      description,
      skills: "./skills/",
      agents: "./agents/",
      hooks: "./hooks/hooks-cursor.json",
    });

    if (!existsSync(claudeManifest)) {
      fail(`missing Claude plugin manifest: ${claudeManifest}`);
    }

    if (!existsSync(cursorManifest)) {
      fail(`missing Cursor plugin manifest: ${cursorManifest}`);
    }
  }

  console.log("marketplace validation passed");
}

validateMarketplace();
