# Contributing to @deessejs/errors

Thank you for your interest in contributing to this project!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/errors.git`
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Workflow

1. Make your changes
2. Ensure all tests pass: `pnpm test`
3. Run linting: `pnpm lint`
4. Run type checking: `pnpm turbo type-check`
5. Build the project: `pnpm build`
6. Commit your changes
7. Open a pull request

## Branching Strategy

This project uses a **staging-first** branching model:

- **`staging`** is the integration branch. Developers open their feature/fix/chore PRs targeting `staging`. Every PR to `staging` must include a `.changeset/*.md` file (enforced by the CI lint).
- **`main`** is the release branch. The release engineer cherry-picks curated batches from `staging` into a `release/*` branch, opens a release PR targeting `main`, and merges. Merging a release PR to `main` triggers the release workflow. No label is required — every merge to `main` with at least one `.changeset/*.md` in the diff produces a release.
- **`dev`** is deprecated and archived.

### Pull Requests

- **Target `staging`** for any feature, fix, refactor, or chore that should ship in a future release.
- **Include a Changeset** in your PR: `pnpm changeset` and commit the generated `.changeset/*.md` file. The CI lint blocks PRs that don't include one.
- **Allowed exemptions** to the changeset requirement: `docs:` only changes, `chore:` only changes, CI/workflow changes under `.github/`, and PRs labeled `no-changeset-required` by a maintainer.

### Hotfixes

For urgent fixes that must skip the staging queue: branch from `main` as `release/hotfix-<slug>`, open a PR directly to `main` with a Changeset and the `[hotfix]` label, and merge. The release workflow runs on merge as for any other merge to `main`.

### Release Engineer

Releases are managed by a single release engineer. The release engineer is the only person who cherry-picks commits from `staging` to `main` and applies the `version bump` label. There is no rotation. If the release engineer is unavailable, the team waits; bypassing the workflow is not a recommended escape hatch.

## Commit Messages

Use conventional commits:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: improve code structure`
- `test: add or update tests`
- `chore: maintenance tasks`

## Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons
- Run Prettier before committing: `pnpm format`

## Testing

Run tests before submitting a PR:

```bash
pnpm test          # Run all tests (watch mode)
pnpm test:run      # Run all tests once
pnpm turbo test    # Run tests across all packages
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all CI checks pass
4. Request review from maintainers

## Questions?

Open an issue or reach out to us at **support@nesalia.com**.
