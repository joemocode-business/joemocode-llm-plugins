# Future work

Roadmap for [joemocode-llm-plugins](../README.md). Ordered by impact and dependency.

## Phase 1 — Publish and dogfood

**Goal:** Make the marketplace installable from GitHub on any machine Joe uses.

- [ ] Push `main` to `joemocode-business/joemocode-llm-plugins` (repo must exist and be accessible)
- [ ] Install on a second machine using README commands only (no manual file copies)
- [ ] Migrate global `~/.claude` hooks/skills to the plugin; confirm `ExitPlanMode` flow end-to-end
- [ ] Add `extraKnownMarketplaces` + `enabledPlugins` to one dogfood repo (e.g. model-marketplace) so teammates get prompted automatically
- [ ] Document required Claude permissions (`Bash(agent:*)`) in plugin README only — keep root README install-focused

**Done when:** `plan-to-agents@joemocode-llm-plugins` installs and works from a clean Claude Code + Cursor setup via git only.

---

## Phase 2 — Cursor Team Marketplace compatibility

**Goal:** Reliable import and refresh in Cursor Dashboard → Team Marketplaces.

Cursor’s indexer has been stricter than Claude Code about marketplace layout. Adjust if Team Marketplace refresh fails:

- [ ] Add [`.cursor-plugin/marketplace.json`](../.claude-plugin/marketplace.json) (mirror of Claude catalog, or single shared file if both readers accept one path)
- [ ] Try `metadata.pluginRoot: "plugins"` with bare `source: "plan-to-agents"` (no `./` prefix) per [cursor/plugins](https://github.com/cursor/plugins) convention
- [ ] Import repo in Cursor Dashboard → Settings → Plugins → Team Marketplaces
- [ ] Connect Cursor GitHub App + enable Auto Refresh on the marketplace repo
- [ ] Validate `afterFileEdit` sync hook fires when installed from Team Marketplace (not just local path)

**Done when:** Team Marketplace refresh succeeds and plugin updates propagate on push without manual reinstall.

---

## Phase 3 — `plan-to-agents` v1.1 (Cursor parity)

**Goal:** Smoother Cursor Plan Mode handoff without relying on explicit skill invocation.

- [ ] Spike `postToolUse` / mode-switch hooks for plan → agent transition (no proven `ExitPlanMode` equivalent yet)
- [ ] If hook works: inject context to offer implement vs handoff (mirror Claude `plan-dispatch.sh`)
- [ ] If hook does not work: document explicit triggers only; consider a slash command / `disable-model-invocation: false` skill alias
- [ ] Align plan mirror paths: optional write to both `<repo>/.cursor/plans/` and `<repo>/.claude/plans/` for cross-tool repos

**Done when:** Cursor users have a documented, reliable post-plan path (hook or explicit) with no ambiguity.

---

## Phase 4 — Cloud agent automation

**Goal:** Replace manual https://cursor.com/agents handoff where possible.

- [ ] Evaluate [@cursor/sdk](https://cursor.com/docs) for programmatic cloud/background agent launch from `plan-dispatch` Branch B and `agent-handoff`
- [ ] Add optional MCP or thin wrapper script if SDK is not hook-friendly
- [ ] Keep manual cloud path as fallback in skills

**Done when:** At least one automated cloud handoff path exists behind an opt-in env var or skill branch.

---

## Phase 5 — CI and release hygiene

**Goal:** Safe iteration on marketplace structure.

- [ ] GitHub Action: `node scripts/validate-marketplace.mjs` on every PR
- [ ] Bump `version` in plugin manifests + marketplace entry on each release (pinned updates for users)
- [ ] Optional: changelog per plugin under `plugins/<name>/CHANGELOG.md`
- [ ] Tag releases (`v0.1.0`) when sharing outside personal machines

**Done when:** Broken manifests cannot merge; version bumps are routine.

---

## Phase 6 — Public discovery (optional)

**Goal:** List in official catalogs, not only git install.

- [ ] Submit to Claude Code [community marketplace](https://code.claude.com/docs/en/plugins) (`anthropics/claude-plugins-community`)
- [ ] Submit to [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish)
- [ ] Add logo + richer marketplace metadata (`description`, `keywords`, `homepage`)

**Done when:** Plugins are discoverable in `/plugin` UI without knowing the GitHub repo name.

---

## Phase 7 — More plugins

**Goal:** Grow the personal library beyond `plan-to-agents`.

Candidates (add to `marketplace.json` + `plugins/<name>/`):

| Plugin idea | Notes |
|-------------|--------|
| Extract model-marketplace agent overrides | Repo-specific `plan-phase-implementer` as an example plugin, not bundled in generic `plan-to-agents` |
| Shared joemocode conventions | Rules/skills for branch policy, AGENTS.md patterns |
| Plannotator Cursor bridge | Native Cursor Plan Mode hooks if/when Plannotator ships a Cursor app target |

**Done when:** Second plugin installs from the same marketplace without structural changes.

---

## Non-goals (for now)

- Replacing Plannotator’s interactive review UI
- Supporting registry-published plugin sources (git-only is fine for personal sharing)
- Bundling repo-specific lint/test commands inside generic implementer agents

---

## References

- [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Cursor plugins docs](https://cursor.com/docs/plugins)
- [plan-to-agents plugin README](../plugins/plan-to-agents/README.md)
