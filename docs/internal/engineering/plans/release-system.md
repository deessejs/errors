# Release System Plan

## Status

🎯 **Proposed** — awaiting release engineer approval.

## Background

The current release pipeline for `@deessejs/errors` is built on **Changesets** with a manually triggered GitHub Actions workflow. While functional, it has accumulated operational debt that puts the package at risk for the next release cycle. This document captures the diagnosis, proposes a new release system, and lays out the migration plan.

### Current state (as observed)

| Aspect                     | Reality                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Versioning tool            | Changesets (`.changeset/*.md`)                                                                             |
| Release trigger            | Manual `workflow_dispatch` on GitHub Actions                                                               |
| Target branch for release  | `origin/main` (workflow checkout)                                                                          |
| Tag format                 | `@deessejs/errors@X.Y.Z`                                                                                   |
| Working branch             | `staging` (PRs merged there first)                                                                         |
| Promotion path             | `staging` → `main` via a release engineer cherry-pick PR                                                   |
| Release cadence            | **Every merge to `main` publishes one release per package with pending changesets**                        |
| `staging` status           | Frozen at `45d9c4f` (the PRs merged into `main` already exceeded what `staging` holds)                     |
| `dev` status               | Frozen at `5548772` (initial v1.0.0 release commit) — to be archived                                       |
| `CLAUDE.md` accuracy       | **Outdated** — describes a `main ← staging ← dev` flow that is not what the release engineer actually runs |
| Tag @deessejs/errors@1.1.1 | Pointed at a merge commit (`569c96d`), not at a Changesets version bump commit                             |
| Tag @deessejs/errors@1.0.0 | Local-only, not pushed to remote                                                                           |

### Pain points

1. **Cherry-pick PRs are not auditable from git history** — when a release engineer creates a PR from `staging` to `main`, the SHA identity of the commit is preserved but the merge is a no-fast-forward. The reviewer sees "Release v1.1.1" instead of the actual feature commits, so post-mortem on a bad release means digging through cherry-pick logs.
2. **Branch drift** — `main` is 28 PRs ahead of `staging`. Whoever promotes the next batch from `staging` must cherry-pick selectively, not fast-forward.
3. **Tag drift** — `@deessejs/errors@1.1.1` is on a merge commit, breaking the convention that release tags point at the version bump commit produced by `pnpm changeset version`.
4. **No enforced changeset** — a PR can be merged into `staging` without `.changeset/*.md`, and the release workflow will publish an empty bump. There is no lint to catch it.
5. **Release engineer is a single point of failure** — every merge to `main` requires the engineer to create the cherry-pick PR, run the workflow, and confirm publish. No rotation, no delegation.
6. **Monorepo blind spot** — only `@deessejs/errors` is versioned here, but the workspace also contains `apps/web`. Changesets can handle multi-package, but the config is currently single-package.

## Goals

1. **Restore trust in the release pipeline** — running the release job must always produce a tag that points to the correct commit on the correct branch.
2. **Make releases automatable _and_ reversible** — automation with a clear manual override path, no silent failures.
3. **Align docs and practice** — `CLAUDE.md` and the workflows agree on the branching model.
4. **Reduce release engineer mental load** — every release should be a recognizable, repeatable ritual, not a rescue operation.
5. **Cover the monorepo** — the system must work for `@deessejs/errors` _and_ any future package.

## Non-goals

- Not switching to `semantic-release` or `release-please` (Changesets is a deliberate choice; the diagnosis is configuration, not tool).
- Not implementing per-PR canary or blue/green publishing.
- Not introducing a public registry mirror outside npm.

## Proposed release system

### 1. Branching model (clarification)

Adopt the convention the repo actually follows, and document it explicitly:

```
feature/* ──┐
            ├── PR → staging   (devs land their work here)
fix/*    ──┤

staging  ── cherry-pick PR → main   (release engineer)
                                      │
                                      ▼
                          pnpm changeset version
                          pnpm changeset publish
                          git tag @deessejs/errors@X.Y.Z
```

**Rules of the road:**

- **Devs** push their feature/fix/chore PRs to `staging`. `staging` is where the integration story happens.
- **Release engineer** regularly cherry-picks a curated batch of commits from `staging` into a release PR, targeting `main`. The PR body lists the changesets being released.
- **Each merge to `main`** triggers a release: `pnpm changeset version` consumes the pending `.changeset/*.md` files, bumps versions, then `pnpm changeset publish` uploads to npm. One merge to `main` → one release per package that has pending changesets.
- `dev` is **deprecated** and will be archived. It is not part of the new flow.
- Hotfixes that must skip the staging queue: branch from `main`, PR directly back to `main` with a Changeset, and tag separately.

### 2. Toolchain

Keep Changesets. The configuration changes, not the tool.

| File                            | Change                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `.changeset/config.json`        | Confirm `access: "public"`, `baseBranch: "main"`, fixed-package mode is unnecessary (single package) |
| `.github/workflows/release.yml` | Rewrite from scratch (see Section 3)                                                                 |
| `packages/errors/package.json`  | Add `scripts.changeset` for `pnpm changeset`, document `private`/`publishConfig`                     |
| New: `.github/workflows/ci.yml` | Add Changesets lint on PRs (see Section 4)                                                           |

### 3. Release workflow

The release workflow is the _only_ place that touches tags and `npm publish`. It runs on two triggers:

1. A PR merged into `main` that carries the `version bump` label — this is the normal release path. The release engineer cherry-picks a batch of commits from `staging`, opens a PR to `main`, applies the `version bump` label, and merges. The workflow then versions and publishes the changesets included in that PR.
2. `workflow_dispatch` — for hotfixes, dry runs, and selective re-publishes.

The `version bump` label is the release engineer's explicit gate. Without it, a merge to `main` is silent. This is the current behaviour and it is **kept deliberately** — it keeps the human in the loop and prevents accidental releases.

```yaml
# .github/workflows/release.yml (new version)
name: Release

on:
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Skip publish and tag push'
        type: boolean
        default: false
      packages:
        description: 'Restrict to a subset of packages (comma-separated). Empty = all.'
        type: string
        default: ''

  pull_request:
    types: [closed]
    branches: [main]

permissions:
  contents: write
  id-token: write # for npm provenance

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    if: |
      github.event_name == 'workflow_dispatch' ||
      (github.event.pull_request.merged == true &&
       github.event.pull_request.base.ref == 'main' &&
       contains(github.event.pull_request.labels.*.name, 'version bump'))

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Detect pending changesets
        id: detect
        run: |
          if git diff --name-only HEAD~1 HEAD | grep -q '^\.changeset/.*\.md$'; then
            echo "has_changesets=true" >> "$GITHUB_OUTPUT"
          else
            echo "has_changesets=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Apply changesets
        if: steps.detect.outputs.has_changesets == 'true'
        run: |
          pnpm changeset version
          git diff --quiet || git commit -m "chore(release): version packages"

      - name: Push version bump commit and tag
        if: steps.detect.outputs.has_changesets == 'true' && inputs.dry_run != true
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git push origin HEAD
          git push --tags

      - name: Build
        if: steps.detect.outputs.has_changesets == 'true' && inputs.dry_run != true
        run: pnpm build

      - name: Test
        if: steps.detect.outputs.has_changesets == 'true' && inputs.dry_run != true
        run: pnpm test

      - name: Publish packages
        if: steps.detect.outputs.has_changesets == 'true' && inputs.dry_run != true
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          if [ -n "${{ inputs.packages }}" ]; then
            pnpm changeset publish --packages=$(echo "${{ inputs.packages }}" | tr ',' ' ')
          else
            pnpm changeset publish
          fi

      - name: Get latest tag
        id: tag
        if: steps.detect.outputs.has_changesets == 'true' && inputs.dry_run != true
        run: echo "version=$(git describe --tags --abbrev=0)" >> "$GITHUB_OUTPUT"

      - name: Create GitHub Release
        if: steps.detect.outputs.has_changesets == 'true' && inputs.dry_run != true
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ steps.tag.outputs.version }}
          body_path: packages/errors/CHANGELOG.md
          draft: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Key changes from the current workflow:

- **Trigger kept hybrid** — `workflow_dispatch` + PR `closed` on `main` with label `version bump`. This is the current behaviour; it is preserved because it gives the release engineer explicit control.
- **Explicit changeset detection** — the job walks the diff of the merge commit and toggles `has_changesets` accordingly. All subsequent steps are gated on this. If a `version bump` PR somehow contains no changesets (or the changesets were dropped during cherry-pick), the workflow becomes a no-op and does not publish.
- **Tag points at the version bump commit** — the `chore(release): version packages` commit is what pushes the tag, not the cherry-pick merge commit. This fixes the `@deessejs/errors@1.1.1` tag drift.
- **`pnpm build` and `pnpm test` after versioning** — kept from the current workflow. They run against the bumped sources, not the pre-bump ones.
- **`body_path` keeps `packages/errors/CHANGELOG.md`** — using the freshly generated changelog rather than GitHub auto-notes, so the GitHub Release body matches what was actually published to npm.
- **`packages` input** added to `workflow_dispatch` so the release engineer can re-publish a single package without affecting others.

### 4. Changeset lint on PRs

Add a lightweight CI that blocks PRs into `staging` missing a changeset. The lint prevents the failure mode where a feature lands on `staging` without a `.changeset/*.md` and then cannot be released later.

```yaml
# .github/workflows/ci.yml (new file)
name: ci
on:
  pull_request:
    branches: [staging]

jobs:
  changeset-check:
    name: Changeset required
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Require changeset
        run: |
          if ! git diff --name-only origin/staging...HEAD | grep -q '^\.changeset/.*\.md$'; then
            echo "::error::This PR must include a changeset file (.changeset/<slug>.md)."
            exit 1
          fi
      - name: Validate changeset format
        run: pnpm changeset status --since=origin/staging
```

**Allowed exemptions** (no changeset required):

- `docs:` only changes
- `chore:` only changes
- CI / workflow changes (paths under `.github/`)
- PRs labeled `no-changeset-required` by a maintainer

**Note on `main`**: the lint does not run on PRs to `main`. Those are cherry-pick PRs from the release engineer; they are either label-gated (`version bump`) or hotfixes, both of which the release engineer handles explicitly. Re-linting them would only cause false positives for rebase commits.

### 5. Documentation updates

| File                                                     | Update                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| `CLAUDE.md`                                              | Rewrite the "Branching Strategy" section to reflect the actual model |
| `docs/internal/releases/README.md`                       | Add a "Release Procedure" runbook linking to this plan               |
| `CONTRIBUTING.md` (if exists)                            | Add a "Pull Requests" section explaining the changeset requirement   |
| New: `docs/internal/engineering/plans/release-system.md` | This document                                                        |

### 6. Release runbook (one-pager)

```
Dev loop (every PR):
  1. Engineer opens PR → staging (feature/fix/chore)
  2. PR includes .changeset/<slug>.md
  3. CI verifies changeset presence and format
  4. PR merged into staging

Release loop (release engineer, in batches):
  1. Identify the batch of commits on staging that are ready to ship
  2. Cherry-pick them into a release/* branch off main
  3. Open a PR release/* → main
  4. PR body lists the changesets being released (auto-generated from the cherry-picked files)
  5. Apply the `version bump` label to the PR
  6. Approve and merge the PR
  7. The release workflow fires on the merge event:
     - Detects pending changesets in the merge commit diff
     - Runs pnpm changeset version (bumps versions, regenerates CHANGELOG.md)
     - Pushes the version bump commit and the tag @deessejs/errors@X.Y.Z
     - Runs pnpm build && pnpm test
     - Runs pnpm changeset publish (uploads to npm)
     - Creates the GitHub Release with the freshly generated CHANGELOG.md
  8. Announce in the team channel

If the PR has no changesets (the cherry-pick dropped them, or the label was applied to a docs-only PR), the workflow is a no-op and nothing is published.

Hotfix (skipping the staging queue):
  1. Branch from main
  2. Make the fix + add .changeset/<slug>.md
  3. Open PR directly to main with the [hotfix] label
  4. Merge → workflow releases the fix automatically
```

## Migration plan

The migration is the critical part. Three risks dominate: stale tags, stale branches, and `CLAUDE.md` users following the old model.

### Phase 0 — Inventory (1 day, before code changes)

- [ ] Tag a snapshot of the current pipeline state in `docs/internal/releases/legacy-pipeline.md`.
- [ ] Audit existing tags: `@deessejs/errors@1.0.0`, `@deessejs/errors@1.1.0`, `@deessejs/errors@1.1.1`. Decide which to keep, which to repoint, which to delete.
- [ ] Read the current `.github/workflows/release.yml` and `.changeset/config.json` from HEAD and compare against Section 3 of this plan. Note every deviation.

### Phase 1 — Reconcile branches (cut-off point, no public release)

- [ ] `@deessejs/errors` is currently at `1.1.1` on `main`. `staging` is at `45d9c4f`, 28 PRs behind. `main` is ahead of `staging` and `staging` will only catch up when devs land their next batch of PRs there — there is no automatic sync.
- [ ] Bring `staging` back to a healthy state by having devs resume normal PR flow into `staging`. The release engineer does not push to `staging`; only devs and feature branches do.
- [ ] Archive `dev`: rename the remote branch to `dev-archived` (kept for archaeology).

### Phase 2 — Cut a clean release (Day 1)

This step _uses_ the legacy pipeline to produce a clean baseline release before the workflow rewrite lands. It ensures we start from a known-good state. The release happens on `main` (the release branch), not on `staging`.

- [ ] Confirm `.changeset/` is empty on `main` (consume any pending changesets via `pnpm changeset version`).
- [ ] Tag the resulting commit as `@deessejs/errors@1.1.2` (patch) on `main`, using the legacy workflow.
- [ ] Verify the tag points at the version bump commit, not at a merge commit. If not, repoint using `git tag -f @deessejs/errors@1.1.2 <commit>` and push with `git push origin :refs/tags/@deessejs/errors@1.1.2 && git push origin @deessejs/errors@1.1.2`.

### Phase 3 — Implement the new workflow (Day 2)

- [ ] Replace `.github/workflows/release.yml` with the version from Section 3.
- [ ] Add `.github/workflows/ci.yml` (changeset lint).
- [ ] Update `.changeset/config.json` if needed.
- [ ] Add a `dry_run` input to the workflow (it is in the sketch).
- [ ] Open a PR titled `ci: overhaul release workflow and add changeset lint`. Do **not** trigger a release from this PR.

### Phase 4 — Validate the new workflow (Day 2–3)

- [ ] Trigger a `dry_run` release against the current `main`. Inspect the generated `CHANGELOG.md` draft and the commit graph.
- [ ] If the dry-run shows a clean diff, trigger a real release. Tag the produced version as `@deessejs/errors@1.1.3` (or higher, depending on pending changesets).
- [ ] Verify npm: `npm view @deessejs/errors dist-tags`, `npm view @deessejs/errors versions`.
- [ ] Verify the GitHub Release was created and references the tag commit.

### Phase 5 — Documentation (Day 3)

- [ ] Update `CLAUDE.md` to describe the actual branching model (Section 1).
- [ ] Update `docs/internal/releases/README.md` with a "Release Procedure" section.
- [ ] Create `CONTRIBUTING.md` if it does not exist, with the changeset requirement.

### Phase 6 — Deprecation cleanup (Day 4+)

- [ ] Remove `dev-archived` branch after one release cycle has elapsed.
- [ ] Remove any orphan local tags (`@deessejs/errors@1.0.0`).
- [ ] Close any issues referring to the old model.

## Risks and mitigations

| Risk                                                                                 | Likelihood | Impact | Mitigation                                                                                         |
| ------------------------------------------------------------------------------------ | ---------- | ------ | -------------------------------------------------------------------------------------------------- |
| Engineer forgets to add a changeset                                                  | High       | Low    | CI lint blocks the PR to `staging` (Phase 4)                                                       |
| Cherry-pick from `staging` to `main` drops a changeset                               | Medium     | High   | Lint also runs on the cherry-pick PR; release engineer reviews the changeset list before merging   |
| `push: branches: [main]` fires for a non-release merge (e.g. admin push, back-merge) | Low        | Medium | Workflow checks for changesets before publishing; if none, it is a no-op                           |
| Tag repointing breaks downstream consumers (badges, npm)                             | Low        | Medium | Avoid repointing; if necessary, document in release notes                                          |
| `npm publish` fails halfway through                                                  | Low        | High   | `pnpm changeset publish` is idempotent; re-run the workflow                                        |
| Conflicts between `pnpm changeset version` and unstaged CI                           | Medium     | Medium | Workflow commits the version bump before pushing tags                                              |
| Release engineer is unavailable                                                      | Medium     | High   | SPOF accepted by the team (see Open questions #3); fallback is to wait, not to bypass the workflow |

## Open questions

All four open questions are resolved:

1. ~~Should `staging` remain long-lived, or be recreated per release as `release/vX.Y.Z`?~~ **Resolved**: keep `staging` long-lived. There is no per-release branch. The `release/v*` branches seen in the history are leftovers from earlier experiments; they are not part of the new flow.

2. ~~Do we want automatic nightlies tagged `nightly`?~~ **Resolved**: no nightlies in this plan. If `apps/web` later needs a preview of staging, that will be a separate plan.

3. ~~Should the release engineer be a single point of failure, or a rotation?~~ **Resolved**: keep a single release engineer. The name is documented in `CONTRIBUTING.md`. The team accepts the SPOF in exchange for simplicity; revisiting the decision is out of scope for this plan and should be raised separately if absence becomes a recurring problem.

4. ~~How do we handle a hotfix that needs a release before the next normal cycle?~~ **Resolved**: hotfix branches are `release/hotfix-<slug>` cut from `main`. PR directly targets `main` with a Changeset and the `[hotfix]` label. The release workflow runs on merge as for any other merge to `main`. Convention is documented in `CONTRIBUTING.md`.

## Definition of done

- [ ] `dev` branch is archived.
- [ ] Devs are landing PRs into `staging` again (the integration branch is alive).
- [ ] New release workflow is in place and has produced at least one release on `main`.
- [ ] Changeset lint runs on every PR to `staging`.
- [ ] `CLAUDE.md` describes the actual branching model.
- [ ] `CONTRIBUTING.md` describes the changeset requirement and the release engineer.
- [ ] At least one release under the new system has been verified on npm and on GitHub.
- [ ] The release runbook (Section 6) is filled in with concrete values (who, when, where).
- [ ] All four open questions are resolved (see Section "Open questions").

## Appendix A — Inventory checklist (Phase 0)

Confirmed at the time of the inventory (commit `569c96d` on `main`):

- [x] `.changeset/config.json` committed on `main`. `baseBranch: "main"`, `access: "public"`, `commit: false`. OK.
- [x] `.github/workflows/release.yml` committed on `main`. Hybrid trigger (`workflow_dispatch` + PR `closed` with label `version bump`). To be rewritten per Section 3.
- [ ] `.github/workflows/ci.yml` does not exist. To be created per Section 4.
- [x] `packages/errors/package.json` has `version: "1.1.1"`. No `publishConfig` block — `access: "public"` is propagated by Changesets instead. OK.
- [x] `packages/errors/CHANGELOG.md` exists and is generated by Changesets (`@changesets/cli/changelog`). Format.
- [x] `secrets.NPM_TOKEN` works (the workflow successfully publishes). Confirmed indirectly.
- [x] `secrets.GITHUB_TOKEN` has both `contents: write` and `id-token: write` declared in the workflow. OK.
- [x] `CONTRIBUTING.md` exists but is **outdated** (says `main <- staging <- dev` and "developers push to main"). To be rewritten.
- [x] `CLAUDE.md` exists but is **outdated** (same branching model as CONTRIBUTING.md). To be rewritten.
- [x] Other workflows present: `build.yml`, `lint.yml`, `tests.yml`, `types.yml`. No changes needed.
- [ ] Tag `@deessejs/errors@1.1.1` is on a merge commit, not on the version bump commit. To be repointed in Phase 2.
- [ ] Root `package.json` script `release` lacks `changeset version`. Minor; either fix or document.

## Appendix B — Decision log

| Date | Decision                                                                                                     | Rationale                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| TBD  | Keep Changesets; do not migrate to `release-please`                                                          | Tool is fine; the issues are configuration and branch drift                                                   |
| TBD  | `staging` is the integration branch; `main` is release-only                                                  | Matches the actual release engineer's workflow                                                                |
| TBD  | `feature/*` → `staging` via PR; `staging` → `main` via cherry-pick PR                                        | Specified by the release engineer; this plan adopts it                                                        |
| TBD  | Release workflow keeps the `version bump` label gate on PRs to `main`                                        | Current behaviour; the release engineer is the explicit gate. Without the label, a merge to `main` is silent. |
| TBD  | Release workflow also accepts `workflow_dispatch` for hotfixes, dry runs, selective re-publishes             | Operational escape hatch                                                                                      |
| TBD  | Each `version bump` PR → one release per package with pending changesets                                     | Specified by the release engineer; multiple changesets become one bump per package                            |
| TBD  | Hotfixes branch from `main` as `release/hotfix-<slug>`, PR directly to `main` with `[hotfix]` label          | Bypass the staging queue for urgent fixes                                                                     |
| TBD  | The release workflow detects changesets in the merge commit diff before publishing                           | A `version bump` PR with no changesets is a no-op                                                             |
| TBD  | The tag points at the version bump commit, not at the cherry-pick merge commit                               | Fixes the `@deessejs/errors@1.1.1` tag drift                                                                  |
| TBD  | Add a CI lint `ci.yml` that requires `.changeset/*.md` on every PR to `staging` (unless exempted)            | Force the contract; reduce release-day surprises                                                              |
| TBD  | The CI lint does NOT run on PRs to `main` (those are cherry-picks or hotfixes)                               | Avoid false positives on rebase commits                                                                       |
| TBD  | Archive `dev`                                                                                                | `dev` is unused in the current flow                                                                           |
| TBD  | Update `CLAUDE.md` and `CONTRIBUTING.md` to describe the actual branching model and the `version bump` label | End the documentation drift                                                                                   |
