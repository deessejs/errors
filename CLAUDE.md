# CLAUDE.md

This file provides guidance to Claude (claude.ai) about working within this codebase.

## Project Purpose

This is **`@deessejs/errors`**, a TypeScript library that reimagines error handling in JavaScript/TypeScript — inspired by Python's error system. It provides exception chaining, hierarchical inheritance, and rich error semantics through a function-based API.

**This is NOT the template.** This is an actual package under active development, based on `nesalia-inc/errors`.

### Related Repositories

- **Template**: `nesalia-inc/complete-package-template` — Use this when creating new packages
- **This package**: `nesalia-inc/errors` — Production error handling library

## Communication

- **Always communicate in English.** All explanations, comments, and documentation must be in English.

## Branching Strategy

This project uses a **staging-first** branching model. The convention is:

- **`staging`** is the integration branch. Developers open their feature/fix/chore PRs targeting `staging`. Every PR to `staging` must include a `.changeset/*.md` file (enforced by the CI lint in `.github/workflows/ci.yml`).
- **`main`** is the release branch. The release engineer cherry-picks curated batches of commits from `staging` into a `release/*` branch, opens a release PR targeting `main`, and merges. Merging a release PR to `main` triggers the release workflow: `pnpm changeset version`, then `pnpm changeset publish`, then push the `@deessejs/errors@X.Y.Z` tag. No label is required — every merge to `main` with at least one `.changeset/*.md` in the diff produces a release.
- **`dev`** is **deprecated** and will be archived. It is not part of the current flow.

### Hotfix path

For urgent fixes that must skip the staging queue: branch from `main` as `release/hotfix-<slug>`, open a PR directly to `main` with a Changeset and the `[hotfix]` label, and merge. The release workflow fires on merge as for any other merge to `main`.

### Release cadence

Each merge to `main` that contains at least one `.changeset/*.md` publishes one release per package with pending changesets. Multiple changesets in a single merge become one version bump per affected package (Changesets default behavior). A merge without changesets is a no-op.

### Resync procedure

If `main` ever gets ahead of `staging` (a hotfix merged to main while staging had pending changesets, or a release published out of order), the recovery is:

1. **Merge `main` into `staging`** with `--no-ff` to preserve history. Resolve conflicts in favor of `main` for files that are part of the published release (e.g. `error.ts`, `types.ts`, `package.json`). For consumer-facing files (`index.ts`, `is/index.ts`), align imports/exports to the main version.
2. **Drop pending changesets in staging that are now obsoleted** by the release on main. A changeset that says "add feature X" when main already has feature X is misleading in the changelog.
3. **Merge `staging` into `main`** with `--no-ff` to publish the remaining changesets as the next version.
4. **CI must pass on both branches** before declaring the resync done. Build, Tests, and Type Check are the gates; Lint may fail on pre-existing prettier issues and is not a blocker.

Run `git rev-list --left-right --count origin/main...origin/staging` periodically to catch drift early. A non-zero count in either direction means the branches have diverged.

## Web Search

When performing web searches, you MUST use the `fresh` CLI tool. Never use other search methods.

### Fresh CLI Usage

```bash
# Search the web
fresh search "your search query"

# Fetch content from a specific URL
fresh fetch <url>
```

### Examples

```bash
# Search for React documentation
fresh search "React documentation 2026"

# Get content from a specific page
fresh fetch https://react.dev/docs
```

Available commands:

- `fresh auth` - Authentication commands
- `fresh search [options]` - Search the web using Exa.ai
- `fresh fetch [options] <url>` - Fetch and extract content from a URL
