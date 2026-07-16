Clear out old plan files from the repo's canonical `<CWD>/docs/plans/` directory.

## 1. List plans

Enumerate `*.md` files in `<CWD>/docs/plans/`. If the directory does not exist or is empty, tell the user there is nothing to clear and stop. For each plan, show filename, `status:` from frontmatter, and `last_updated`.

## 2. Let the user pick which to clear

Call the **`question`** tool with `multiSelect: true`, listing the plan files as options. Include an **All plans** option when more than one file exists.

## 3. Confirm archive vs delete

Call **`question`** (single-select) with exactly two options:

- **Archive** — move the selected plans to `docs/archive/plans/`.
- **Delete** — permanently remove the selected plans.

Do not act until the user answers.

## 4. Execute

- **Archive:** `mkdir -p <CWD>/docs/archive/plans/`, then move each selected plan there (`git mv` when tracked, else `mv`). On name collision, suffix the incoming file.
- **Delete:** remove each selected plan (`git rm` when tracked, else `rm`).

## 5. Report

Report which files were archived (with new paths) or deleted. Note changes are staged/unstaged in git but NOT committed.
