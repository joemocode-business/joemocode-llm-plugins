# AGENTS.md

Guidance for cloud agents working in `joemocode-llm-plugins`.

## Repository status

This repository is a **greenfield skeleton** (as of the initial commit on `main`). It currently contains only `LICENSE` (Apache 2.0). There is no application source, package manifest, CI config, or documented run/lint/test workflow yet.

GitHub description: *Joe's plugins for llms.*

## Cursor Cloud specific instructions

### What is runnable today

Nothing. There are no services, scripts, or build targets to start. Do not expect `npm run dev`, Docker Compose, or similar until project scaffolding lands on `main`.

### VM toolchain (pre-installed)

The cloud VM already provides tooling commonly used for LLM plugin projects:

| Tool | Notes |
|------|--------|
| Git | `git version 2.43.0` |
| Node.js | v22.x via nvm (`/home/ubuntu/.nvm/versions/node/v22.22.2/bin/node`) |
| npm / pnpm | Available on PATH |
| Python | 3.12.3 at `/usr/bin/python3` |

No repo-specific dependency install runs on startup; the update script is a no-op until a lockfile or manifest exists.

### When application code appears

Re-scan the repo root for manifests and follow whatever README / `package.json` scripts / `Makefile` targets define. Typical checks:

1. Identify package manager from lockfile (`package-lock.json` → npm, `pnpm-lock.yaml` → pnpm, etc.).
2. Install dependencies with that manager.
3. Run documented lint, test, and dev commands from the README or root `package.json`.
4. Update this section with concrete service names, ports, and env vars — do not guess.

### Git

- Default branch: `main`
- Remote: `https://github.com/joemocode-business/joemocode-llm-plugins`
- Feature branches for cloud agents should use the `cursor/<descriptive-name>-17db` pattern when creating PRs.

### Secrets / external services

None referenced in the repository today. If future plugins need API keys (e.g. OpenAI, Anthropic), expect `.env.example` or README documentation to be added with the first implementation.
