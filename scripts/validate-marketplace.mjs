#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(__dirname, "..");

const CLAUDE_MARKETPLACE_REL = ".claude-plugin/marketplace.json";
const CURSOR_MARKETPLACE_REL = ".cursor-plugin/marketplace.json";

const MANIFEST_COMPONENT_KEYS = ["skills", "agents", "commands", "rules", "hooks", "mcp"];

const CURSOR_PLUGIN_EXPECTATIONS = {
  "plan-to-agents": { requireHooks: true },
  "session-handoff": { requireHooks: false },
};

function readJson(path, errors) {
  if (!existsSync(path)) {
    errors.push(`missing file: ${path}`);
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    errors.push(`invalid JSON in ${path}: ${err.message}`);
    return null;
  }
}

function validateMarketplaceShape(marketplace, pathLabel, errors, { forbidStrict = false } = {}) {
  if (!marketplace || typeof marketplace !== "object") {
    errors.push(`${pathLabel}: expected a JSON object`);
    return;
  }

  if (!marketplace.name || typeof marketplace.name !== "string") {
    errors.push(`${pathLabel}: required field 'name' is missing or not a string`);
  }

  if (!marketplace.owner?.name || typeof marketplace.owner.name !== "string") {
    errors.push(`${pathLabel}: required field 'owner.name' is missing or not a string`);
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    errors.push(`${pathLabel}: required field 'plugins' must be a non-empty array`);
    return;
  }

  for (const [index, plugin] of marketplace.plugins.entries()) {
    const label = `${pathLabel} plugins[${index}]`;

    if (!plugin.name || typeof plugin.name !== "string") {
      errors.push(`${label}: required field 'name' is missing or not a string`);
    }

    if (!plugin.source || typeof plugin.source !== "string") {
      errors.push(`${label}: required field 'source' is missing or not a string`);
    }

    if (forbidStrict && Object.prototype.hasOwnProperty.call(plugin, "strict")) {
      errors.push(`${label}: Claude-only field 'strict' must not appear in the Cursor catalog`);
    }
  }
}

function validateDeclaredComponentPaths(manifest, manifestPath, pluginRoot, errors) {
  for (const key of MANIFEST_COMPONENT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(manifest, key)) {
      continue;
    }

    const value = manifest[key];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${manifestPath}: '${key}' must be a non-empty string when declared`);
      continue;
    }

    const resolved = resolve(pluginRoot, value);
    if (!existsSync(resolved)) {
      errors.push(`${manifestPath}: declared '${key}' path does not exist: ${value}`);
    }
  }
}

function validateRuntimeManifest({
  manifestPath,
  manifest,
  expectedName,
  pluginRoot,
  runtime,
  errors,
}) {
  if (!manifest || typeof manifest !== "object") {
    return;
  }

  if (!manifest.name || typeof manifest.name !== "string") {
    errors.push(`${manifestPath}: required field 'name' is missing or not a string`);
  } else if (manifest.name !== expectedName) {
    errors.push(
      `${manifestPath}: manifest name '${manifest.name}' does not match marketplace entry '${expectedName}'`,
    );
  }

  validateDeclaredComponentPaths(manifest, manifestPath, pluginRoot, errors);

  if (runtime !== "cursor") {
    return;
  }

  const expectations = CURSOR_PLUGIN_EXPECTATIONS[expectedName];
  if (!expectations) {
    return;
  }

  const hasHooks = Object.prototype.hasOwnProperty.call(manifest, "hooks");
  if (expectations.requireHooks && !hasHooks) {
    errors.push(`${manifestPath}: Cursor manifest must declare 'hooks' for ${expectedName}`);
  }
  if (!expectations.requireHooks && hasHooks) {
    errors.push(
      `${manifestPath}: Cursor manifest must not declare 'hooks' for ${expectedName} (preCompact is observational only)`,
    );
  }
}

function validatePluginEntry(plugin, label, root, errors) {
  const pluginRoot = resolve(root, plugin.source);
  if (!existsSync(pluginRoot)) {
    errors.push(`${label}: source path does not exist: ${plugin.source}`);
    return;
  }

  const claudeManifestPath = join(pluginRoot, ".claude-plugin", "plugin.json");
  const cursorManifestPath = join(pluginRoot, ".cursor-plugin", "plugin.json");

  const claudeManifest = readJson(claudeManifestPath, errors);
  const cursorManifest = readJson(cursorManifestPath, errors);

  validateRuntimeManifest({
    manifestPath: claudeManifestPath,
    manifest: claudeManifest,
    expectedName: plugin.name,
    pluginRoot,
    runtime: "claude",
    errors,
  });

  validateRuntimeManifest({
    manifestPath: cursorManifestPath,
    manifest: cursorManifest,
    expectedName: plugin.name,
    pluginRoot,
    runtime: "cursor",
    errors,
  });
}

function validateCatalogParity(claudeMarketplace, cursorMarketplace, root, errors) {
  if (!claudeMarketplace?.plugins || !cursorMarketplace?.plugins) {
    return;
  }

  if (claudeMarketplace.name !== cursorMarketplace.name) {
    errors.push(
      `catalog name mismatch: Claude '${claudeMarketplace.name}' vs Cursor '${cursorMarketplace.name}'`,
    );
  }

  if (claudeMarketplace.plugins.length !== cursorMarketplace.plugins.length) {
    errors.push(
      `catalog plugin count mismatch: Claude has ${claudeMarketplace.plugins.length}, Cursor has ${cursorMarketplace.plugins.length}`,
    );
    return;
  }

  for (let index = 0; index < claudeMarketplace.plugins.length; index += 1) {
    const claudePlugin = claudeMarketplace.plugins[index];
    const cursorPlugin = cursorMarketplace.plugins[index];
    const label = `plugins[${index}]`;

    if (claudePlugin.name !== cursorPlugin.name) {
      errors.push(
        `${label}: plugin name mismatch between catalogs ('${claudePlugin.name}' vs '${cursorPlugin.name}')`,
      );
    }

    if (claudePlugin.source !== cursorPlugin.source) {
      errors.push(
        `${label}: plugin source mismatch between catalogs ('${claudePlugin.source}' vs '${cursorPlugin.source}')`,
      );
    }
  }
}

export function validateMarketplace(root = DEFAULT_ROOT) {
  const errors = [];
  const claudePath = join(root, CLAUDE_MARKETPLACE_REL);
  const cursorPath = join(root, CURSOR_MARKETPLACE_REL);

  const claudeMarketplace = readJson(claudePath, errors);
  const cursorMarketplace = readJson(cursorPath, errors);

  if (claudeMarketplace) {
    validateMarketplaceShape(claudeMarketplace, CLAUDE_MARKETPLACE_REL, errors);
  }

  if (claudeMarketplace?.plugins) {
    for (const [index, plugin] of claudeMarketplace.plugins.entries()) {
      validatePluginEntry(plugin, `plugins[${index}]`, root, errors);
    }
  }

  if (cursorMarketplace) {
    validateMarketplaceShape(cursorMarketplace, CURSOR_MARKETPLACE_REL, errors, {
      forbidStrict: true,
    });
  }

  validateCatalogParity(claudeMarketplace, cursorMarketplace, root, errors);

  return { ok: errors.length === 0, errors };
}

function main() {
  const result = validateMarketplace();
  if (!result.ok) {
    for (const message of result.errors) {
      console.error(`error: ${message}`);
    }
    process.exit(1);
  }

  console.log("marketplace validation passed");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
