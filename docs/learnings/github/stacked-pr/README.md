# GitHub Stacked Pull Requests

**What:** Stacked pull requests are a chain of pull requests in the same repository where each PR targets the branch of the PR below it, forming a dependency chain that lands on a single trunk (usually `main` or, in this repo, `staging`).

**Why it matters:** Stacks break a large change into small, independently reviewable layers. Each layer shows only its own diff, so reviewers see something focused rather than a wall of mixed concerns. Rebase cascading is handled by GitHub, so branch management overhead is low.

## Mental model

A stack is a vertical chain. The bottom PR targets the trunk. Each subsequent PR targets the branch of the PR below it.

```
feat/auth-layer     → PR #1 (base: staging)        ← bottom
feat/api-endpoints  → PR #2 (base: feat/auth-layer)
feat/frontend       → PR #3 (base: feat/api-endpoints) ← top
```

**The key principle:** if code in one layer depends on code in another, the dependency must be in the same branch or a lower one. Foundational changes (CI lint, schema, types) go in lower branches. Code that depends on them (workflows, docs that reference the workflow) goes higher.

## Why use stacked PRs

### Faster, focused reviews

Each PR shows a focused diff. A reviewer looking at the lint-PR sees only the lint file, not the workflow rewrite underneath. Smaller diffs are faster to approve and less likely to develop merge conflicts.

### Decoupling concerns

Stacked PRs let you land foundational changes (lint, CI) without being blocked by review of higher-level changes (the workflow itself). Lint can be merged first; the workflow rides on top.

### Cascading rebase

When the bottom PR is merged, the remaining branches are automatically rebased and the next PR targets the trunk. This is the killer feature — without stacks, keeping dependent branches in sync is manual and error-prone.

### CI consolidation

Branch protection rules and CI checks on the trunk apply to every PR in the stack, not just the bottom one. Each layer meets the same quality bar before it can merge.

## When to use stacked PRs

**Use stacked PRs when:**

- The change is large enough that a single PR would be hard to review.
- The change has clear conceptual layers (lint → workflow → docs).
- Each layer can be reviewed and merged independently.
- You want to ship foundational pieces early without waiting for the rest.

**Do NOT use stacked PRs when:**

- The change is small (one file, one workflow, one bug fix).
- The layers are deeply entangled and would not parse in isolation.
- Your reviewer is unfamiliar with the model and the cognitive overhead outweighs the benefit.
- The change crosses forks (cross-fork stacks are not supported).

## Tooling

Stacks are available in:

- **GitHub CLI** via the `gh stack` extension: `gh extension install github/gh-stack`
- **GitHub website** — UI shows a stack icon and a stack map in the merge box
- **GitHub Mobile** — read-only
- **REST API**, **GraphQL**, **Webhooks** — programmatic support

For AI agents, install the `gh-stack` skill: `gh skill install github/gh-stack`.

## Common commands

```bash
# Initialize a stack in the current repo
gh stack init

# Add a new branch to the top of the stack
gh stack add <branch-name>

# Stage, commit, and create the next branch in one step
gh stack add -Am "Commit message"

# Push all branches to the remote
gh stack push

# Create PRs and link them as a stack
gh stack submit

# View the full stack: branches, PR links, statuses
gh stack view
```

## Rules and CI

The merge requirements for any PR in the stack are determined by the **bottom PR's base branch** (typically `main` or `staging` in this repo).

- Branch protection rules apply to every PR in the stack, even mid-stack PRs that don't directly target the trunk.
- CI checks triggered by PRs on the trunk run for every PR in the stack.
- This means a mid-stack PR is held to the same quality bar as a direct-to-trunk PR.

## Merging

Stacks merge **bottom-up**. Three options:

1. **Merge the entire stack** by merging the top PR. Every PR below it merges with it.
2. **Merge part of the stack** by merging a mid-stack PR. The PRs below it merge too; the PRs above stay open and re-target to the trunk.
3. **Merge a single PR** at the bottom. The remaining stack re-targets to the trunk.

Supported merge methods: merge commit, squash, rebase. Stack merging is **merge-queue aware**.

## Limitations

- **Public preview** — feature may change.
- **Same repo only** — cross-fork stacks are not supported.
- **Not supported in GitHub Desktop**.
- Requires `gh` CLI 2.90.0+ and Git 2.20+.

## Application to this repo: release system plan

The release system plan (see `docs/internal/engineering/plans/release-system.md`) is a natural fit for a stack. The plan has four implementation phases that map cleanly to PR layers:

```
staging                       ← trunk
  └── ci(release): add changesets lint on PRs to staging   ← PR #1 (bottom)
        └── ci(release): rewrite release workflow            ← PR #2
              └── docs(release): update CLAUDE.md and CONTRIBUTING.md  ← PR #3 (top)
```

- **PR #1 (lint)** — small, low-risk, foundational. Can be merged first.
- **PR #2 (workflow)** — the core change. Stands on its own for review.
- **PR #3 (docs)** — depends on the workflow. Documentation updates the branching model and references the new `version bump` workflow.

Each layer can be reviewed and merged independently. The cascade rebase handles the dependency chain automatically.

## Things to watch for

- **Stack drift** — if the bottom PR is force-pushed, the whole stack needs re-rebasing. Use `gh stack push` to keep them in sync.
- **Reviewer context** — a reviewer looking at PR #2 should be able to see PR #1 underneath. The stack map in the GitHub UI handles this.
- **CI duplication** — running lint+build+test+type-check on every PR in the stack is normal. This is the same as having 3 separate PRs open against the trunk.
- **Merge conflicts across the stack** — if a high layer has a conflict when the lower layer merges, the cascade rebase handles it. Manual intervention is rarely needed.

## References

- [About stacked pull requests](https://docs.github.com/en/pull-requests/get-started/about-stacked-prs)
- [Quickstart for stacked pull requests](https://docs.github.com/en/pull-requests/get-started/stacked-prs-quickstart)
- [Stacked pull requests CLI commands](https://docs.github.com/en/pull-requests/reference/stacked-prs-cli-commands)
- [Roll out stacked pull requests to your organization](https://docs.github.com/en/pull-requests/tutorials/roll-out-stacked-prs)
