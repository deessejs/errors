# Implementing an Issue

**What:** End-to-end playbook for a developer picking up an issue, from first read to merged PR. Companion to `releasing-a-new-version.md` (which is for the release engineer).

**Why it matters:** This package uses a staging-first branching model with Changesets, a CI lint that requires a changeset on every PR to `staging`, Conventional Commits, and a pre-commit hook that runs Prettier. None of this is exotic, but each one has tripped someone up at least once. This document is the contract.

## Roles

This package has a **single release engineer** who cherry-picks batches from `staging` into release PRs onto `main`. **Everyone else**, including occasional contributors, lands feature and fix work on `staging` through the process described here. The release engineer's work is documented in `releasing-a-new-version.md`.

The roles do not conflict: a dev pushes to `staging`, the release engineer cherry-picks to `main`. You do not push feature work to `main` directly. The only exception is hotfixes, see the dedicated section at the end.

## Branching model

```
feature/* ──┐
            ├── PR → staging   (you write the code)
fix/*    ──┘
chore/*  ──┘
ci/*     ──┘
docs/*    ──┘

staging  ── cherry-pick PR → main   (release engineer, see other doc)
```

`staging` is the integration branch. All feature, fix, chore, ci, and docs PRs target `staging`. Direct PRs to `main` are reserved for hotfixes.

## Reading the issue first

Before writing any code, read the entire issue — every section.

- **Context / Background** — why this work matters. If it does not, push back before coding.
- **Proposed approach** — if the proposer sketched one, this is the spec. Stay close to it. Deviating for good reason is fine; deviating by accident is not.
- **Acceptance criteria** — the checklist that defines "done". Each criterion is testable. If you cannot write a test for a criterion, the criterion is probably underspecified.
- **Related** — files, plans, past incidents. Read them. Every related doc has been attached because the author thought it was relevant.

If the issue is missing context or the criteria are ambiguous, comment on it before coding. A clarifying comment now is cheaper than a rebase later.

## Local setup

```bash
git fetch origin
git checkout staging
git pull --ff-only origin staging
git status   # Make sure there are no unstaged surprises from a previous session
```

The repo uses pnpm. You will need pnpm 10.x or later (the project ships a `pnpm-lock.yaml`; the GitHub Actions runner installs pnpm via `pnpm/action-setup@v4`).

```bash
pnpm install --frozen-lockfile
pnpm test      # Sanity-check that the green baseline holds before your changes
```

## Branching convention

Create your branch from `staging`:

```bash
git checkout -b <prefix>/<slug>
```

Prefixes used in this repo, observed in `git log --oneline`:

| Prefix | When | Examples |
| ------ | ---- | -------- |
| `feat/` | new feature or capability | `feat/extract-async-errors` |
| `fix/` | bug fix | `fix/from-method-no-cause` |
| `chore/` | non-functional maintenance (deps, scripts, tooling) | `chore/upgrade-pnpm` |
| `ci/` | GitHub Actions workflows and CI logic | `ci/release-workflow-rewrite` |
| `docs/` | documentation under `docs/` | `docs/release-process` |

Branch names are reviewed in the PR. Keep them short and indicative of intent, not of an issue number. `feat/extract-async-errors` reads better than `fix-1234`.

## Writing the code

Three invariants during the work:

1. **Atomic commits**. One commit, one intent. Split work that mixes formatting and logic. Split fixes that show up while you are implementing something else. `git add -p` is your friend.
2. **Conventional Commit messages.** The repo enforces this via `CONTRIBUTING.md`. Format: `<type>(<scope>): <subject>`. The body, when present, explains the **why**, not the **what**. The diff already shows the what.
3. **`packageManager`-aware tooling**. pnpm and Changesets have opinions. Do not work around them. If you hit a friction, change the tool, not the docs.

Commit stages where this is worth keeping in mind:

- `pnpm install --frozen-lockfile` to keep lockfile in sync with `package.json`.
- `pnpm changeset` once you know what shipped.
- `pre-commit` (lint-staged) will auto-run Prettier on `*.{ts,tsx,js,json,md,css,yml,yaml}`. Most of the time you can ignore formatting; the hook handles it on commit. But do not commit past the hook if you can fix forward — Prettier-reflowed commits show weirdly in `git blame` afterwards.

## Adding the changeset

Every PR that touches `@deessejs/errors`, its tests, or its CI infrastructure must include a changeset. This is enforced by `ci.yml` on PRs to `staging`, and a missing changeset will block merge.

Run the interactive helper:

```bash
pnpm changeset
```

You will be prompted for:

- Which package? → `@deessejs/errors` (only one published package)
- Which bump? → `patch` for bug fixes and chores, `minor` for additive features, `major` for breaking changes
- Summary in English, one short line describing the user-facing change

The tool writes a `.changeset/<random-slug>.md` file. Commit it on your branch.

### Edge cases

- **Documentation-only changes under `docs/`** — strictly exempted from the changeset requirement (see `CONTRIBUTING.md`). You can still add one for consistency, cost is one tool invocation.
- **CI / workflow changes only** (files under `.github/`) — the CI lint accepts these without a changeset when no other path is touched. Same workaround: add one anyway for consistency.
- **A PR that reverts an earlier PR** — write the changeset as if the revert is the change, because the published version will include it. A revert of `feat/x` is at minimum `patch`, possibly `minor` if users were relying on `x`.

## Local checks before pushing

```bash
pnpm test         # vitest run
pnpm lint         # eslint
pnpm type-check   # tsc --noEmit
pnpm build        # tsc -p tsconfig.build.json
```

For a small change, `pnpm test --run` and `pnpm type-check` are the minimum. For a release-adjacent change (publishing or versioning logic), run all four.

If the pre-commit hook fires during `git commit`, do not bypass with `--no-verify`. Let it run, then commit again with the resolved state. Bypassing lands unstaged Prettier diffs in the PR review.

## Pushing and opening the PR

```bash
git push -u origin <branch>
gh pr create --base staging \
  --title "<type>(<scope>): <subject>" \
  --body "## Summary

## Why
```

Title: same format as commit subjects. Body: short. Two sections, **Summary** (what changed) and **Why** (the user-facing motivation). If the PR closes an issue, reference it: `Closes #N` or `Fixes #N`.

Expected checks:

- `Changeset required` — runs only on PRs to `staging`. Pass = a `.changeset/*.md` is in the diff.
- `Lint`
- `Build`
- `Tests`
- `Type Check`

If `Changeset required` fails, you forgot the changeset. `git checkout HEAD~ .changeset/` is rarely the right answer; the right answer is `pnpm changeset` followed by `git add .changeset/ && git commit --amend` if the PR has a single commit, or a new commit if the PR has multiple.

## Review and merge

Default branch protection on `staging` requires at least one approval before merge. For trivial or urgent work, the author can self-review; for non-trivial work, wait for an actual review.

When the review is in:

- Address comments with fix commits, not force-pushes, unless the reviewer explicitly asks for a rebase.
- Mark resolved threads after pushing the fix.
- The release engineer is your reviewer-of-last-resort if no one else is available — they will block only on things that would break staging integration.

After merge, your commit lives on `staging`. The release engineer cherry-picks it into the next release PR. **You do not need to do anything else** — your change is in the integration branch, and it will ship in the next release.

## Hotfixes

For an urgent fix that cannot wait for the staging queue, the path is different. Branch from `main`, not `staging`:

```bash
git checkout main
git checkout -b release/hotfix-<slug>
```

Make the fix and add a changeset as usual. Then:

```bash
git push -u origin release/hotfix-<slug>

gh pr create --base main \
  --head release/hotfix-<slug> \
  --label hotfix \
  --title "fix(...): hotfix for <issue title>" \
  --body "## Hotfix

Closes #N.
"
```

Two things are different from the normal flow:

1. **The PR targets `main`, not `staging`.** The release workflow on `main` is what fires the publish.
2. **The PR carries the `hotfix` label.** This is the trigger for the targeted CI check (issue #48); without the label, the changeset presence is not enforced. Until that issue is implemented, manually verify that the changeset is present before merging.

When the PR is merged, `release.yml` will run on the merge commit, version bump, publish, tag, and create the GitHub Release. Monitor the run:

```bash
gh run list --workflow=Release --limit 1
gh run watch <id>
```

If the release engineer is the one doing the hotfix (single point of failure, accepted by the team), this is the only time they touch the `main` branch without going through the `staging` integration flow.

## Anti-patterns

Things that will trip up a reviewer or break the contract:

- **Force-pushing after a review started.** Reviewers lose their context. Use fix-up commits.
- **Combining an unrelated reformat with a logical change.** Make the reformat a separate commit. Reading 200 lines of whitespace in a 50-line change is miserable.
- **Bypassing the CI lint.** `--no-verify` on commit, skipping the pre-commit hook. The CI lint will catch you anyway.
- **Pushing directly to `main`.** The branch protection on `main` will refuse the push. If it does not, you are an admin and you should still not do it.
- **Big changes without an issue.** Issues are the contract. A big unannounced PR gets reverted. Discuss first.
- **Co-authored commits to flood the contribution graph.** This is a tiny team. Honest attribution, single author per commit is the norm.

## Definition of done

A PR is "done" when:

- [ ] Every acceptance criterion in the issue is met.
- [ ] Local checks pass (`test`, `lint`, `type-check`, `build`).
- [ ] Changeset present (unless the change is genuinely docs-only or CI-only, and even then optional-discipline).
- [ ] PR description has Summary and Why.
- [ ] PR has at least one approval.
- [ ] After merge, the commit is visible on `staging`.
- [ ] If a hotfix: GitHub Release created for the published version.

## References

- `CONTRIBUTING.md` — short contribution overview; this document is the long form.
- `CLAUDE.md` — branching strategy and project context for AI assistants.
- `releasing-a-new-version.md` — release engineer's process, for context on what happens after your PR lands.
- `release-system.md` — the architectural plan underpinning the release system.
