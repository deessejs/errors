---
'@deessejs/errors': patch
---

chore: remove vestigial `apps/web/package-lock.json` and ignore npm/yarn lockfiles

The repo is a pnpm monorepo (`packageManager: pnpm@10.34.5` in the root `package.json`); no CI step or build path reads `apps/web/package-lock.json`. It was a stale artifact from the initial commit and still pinned transitive `postcss@8.4.31` (vulnerable) and old `next@16.2.6` / `fumadocs-*@16.9.1` — keeping it around is a permanent source of Dependabot noise that no longer matches the actual install graph.

This PR:

- deletes `apps/web/package-lock.json`
- adds `package-lock.json` and `yarn.lock` to the root `.gitignore` so contributors running `npm install` locally don't re-introduce the file
- adds `package-lock.json` to `apps/web/.gitignore` as defense-in-depth

No dependency changes; the `patch` bump exists only to satisfy the staging changeset requirement.
