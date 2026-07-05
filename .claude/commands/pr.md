---
description: Verify, commit, push, and open a PR against main
---

Ship the current work as a pull request:

1. If on `main`, create a feature branch first (kebab-case, `feat-`/`fix-` prefix).
2. Run `pnpm check`. If it fails, fix the errors before proceeding (run `pnpm format:write` for class-order/formatting complaints).
3. Review `git status` and `git diff` — stage only files related to this change; never `git add -A` blindly.
4. Commit with a concise message describing the why, then push with `-u origin`.
5. Open a PR against `main` with `gh pr create`. The body should have a short Summary section and a Test plan section (include mobile verification at 375 px if UI changed).
6. If UI files changed (`components/` or `src/app/`), run the design-review agent on the diff first and fix any high-severity findings before opening the PR.

$ARGUMENTS
