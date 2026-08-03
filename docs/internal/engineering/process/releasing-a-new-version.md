# Releasing a New Version of `@deessejs/errors`

**What:** Step-by-step runbook for the release engineer to ship a new version of `@deessejs/errors`, end-to-end, on top of the established release system.

**Why it matters:** Releases use OIDC trusted publishing (no NPM token), Changesets for version bumping, and a GitHub `release` environment for auditability. The system works but is **not auto-recovering** — failures require human action. This document is the recovery playbook.

## Roles

There is one **release engineer**. There is no rotation. If the release engineer is unavailable, the team waits; bypassing the workflow is not a recommended escape hatch.

## Branching model

```
feature/* ──┐
            ├── PR → staging   (devs land their work here with a .changeset/*.md)
fix/*    ──┘

staging  ── cherry-pick PR → main   (release engineer)
                                      │
                                      ▼
                          pnpm changeset version
                          pnpm changeset publish   ← npm trusted publishing (OIDC)
                          git tag @deessejs/errors@X.Y.Z
```

- Devs open PRs on `staging`. CI lint (`ci.yml`) blocks PRs that do not include a `.changeset/*.md` file.
- The release engineer cherry-picks a curated batch of commits from `staging` into a `release/*` branch, opens a release PR targeting `main`, and merges.
- Every merge to `main` triggers the release workflow. No label is required.

## Prerequisites

Before you (the release engineer) start cutting a release, confirm:

- [ ] `staging` has been brought up to date with `main`. The release branch must contain everything you want to publish, plus the desired changesets.
- [ ] npmjs.com Trusted Publisher for `@deessejs/errors` is configured: provider = GitHub Actions, repository = `deessejs/errors`, workflow filename = `release.yml`, allowed action = `npm publish`, **environment name left blank**.
- [ ] GitHub repository secrets: `NPM_TOKEN` is present but **not used by the workflow anymore** (post-PR #47). Treat it as residual. After release validation, revoke it.
- [ ] You are signed in to `gh` and have push access to `origin/main`.

## Procedure

### 1. Build the release branch

```bash
git fetch origin main staging
git checkout origin/main
git checkout -b release/vX.Y.Z
```

### 2. Cherry-pick the chosen batch from staging

```bash
git log --oneline origin/main..origin/staging --no-merges
```

Pull only what you intend to ship. Skip plan-only commits (e.g. `docs/internal/engineering/plans/...`) unless the batch explicitly updates release docs.

```bash
git cherry-pick <sha1> <sha2> ...
```

Resolve any conflicts. Past conflicts observed:

- `.github/workflows/ci.yml` — keep the post-`fix: ci.yml to fetch origin/staging` version (the version on `HEAD` of the release branch is typically correct because main was already up-to-date with the fix).

### 3. Confirm the changeset count

```bash
git diff origin/main --name-only | grep '^.changeset/.*\.md$'
```

If the list is empty, do NOT merge the PR. The release workflow will see `has_changesets=false` and become a no-op (no publish, no tag, no GitHub Release). To produce a publishable release, the batch must include at least one changeset.

The release workflow's default bump is the **highest semantic level** in the changesets present:

- 1 `major` → `X+1.0.0`
- 1 `minor` + rest `patch` → `X.Y+1.0`
- All `patch` → `X.Y.Z+1`

### 4. Push and open the PR

```bash
git push -u origin release/vX.Y.Z
gh pr create --base main --head release/vX.Y.Z \
  --title "chore(release): cherry-pick release system stack from staging"
```

Title and body templates live in past PR #44 (`docs/engineering/reports/release-history.md` to be added if not present yet).

### 5. Wait for CI

The expected checks are:

- `Lint`
- `Build`
- `Tests`
- `Type Check`

`Changeset required` does **not** run on PRs to `main`. It only fires on PRs to `staging`. That is intentional — release PRs are reviewable even if the cherry-pick dropped a changeset.

### 6. Merge

```bash
gh pr merge --merge
```

(or use the GitHub UI)

The merge fires the release workflow. You can monitor it:

```bash
gh run list --workflow=Release --limit 1
gh run watch <run-id>
```

### 7. Watch the workflow

The expected ordering and what to check:

1. **Detect pending changesets** — sets `has_changesets=true` if at least one `.changeset/*.md` is in the merge diff. If false, the rest of the steps are skipped. Expected: `true`.
2. **Create versions from changesets** — runs `pnpm changeset version`. Output should mention how many packages were bumped.
3. **Commit version changes and push** — runs the `git add -A` + `git diff --cached --quiet` (post-PR #45 fix) + commit + push. Expected: a new `chore(release): version packages` commit appears on `main`.
4. **Build** — `pnpm build`. Expected: green.
5. **Test** — `pnpm test`. Expected: green.
6. **Publish packages** — `pnpm changeset publish` with `env: NPM_CONFIG_PROVENANCE: 'true'`. Expected: a successful `Publishing "@deessejs/errors" at "X.Y.Z"` line, then `New tag: @deessejs/errors@X.Y.Z`.
7. **Get latest tag** — extracts the just-created tag name.
8. **Create GitHub Release** — uses `softprops/action-gh-release@v2`. Expected: a GitHub Release is created on the tag, body pulled from `packages/errors/CHANGELOG.md`.

### 8. Verify the artifacts

```bash
git ls-remote --tags origin | grep '@deessejs/errors'
gh release view '@deessejs/errors@X.Y.Z' --repo deessejs/errors
```

Confirm:

- The tag points at the `chore(release): version packages` commit, **not** at the merge commit. (Pre-existing tag drift had `@deessejs/errors@1.1.1` pointing at a merge commit. That is now fixed since PR #45.)
- The `packages/errors/package.json` `version` field matches the tag.
- The `packages/errors/CHANGELOG.md` has a new entry under the published version.
- A GitHub Release exists for the tag, with the package version in the title and `provenance: true` attestation visible on npmjs.com.

### 9. Announce

- The npm package is updated; downstream consumers pick it up on their next install.
- Optional: post in #releases (no current automated channel — manual for now).

## Failure modes and recoveries

### `ENEEDAUTH` on publish

Symptom in the run log:

```
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in to https://registry.npmjs.org
```

Possible causes, in order of likelihood:

1. **npmjs.com Trusted Publisher** is misconfigured. Check the package's Settings → Trusted publishing. Required fields:
   - Repository: `deessejs/errors`
   - Workflow filename: `release.yml` (filename only, no path)
   - Environment name: **must be blank**. If you set it to `release` (matching the workflow's `environment:`), the OIDC token will be filtered to jobs that explicitly target it, which is fine in principle but historically fragile; left blank is safest.
   - Allowed actions: `npm publish`
2. **pnpm version** does not support OIDC trust publishing. We observed this with **pnpm 10**. The fix in PR #46 was to set `env: NPM_CONFIG_PROVENANCE: 'true'` on the publish step and add `publishConfig.provenance: true` to `packages/errors/package.json`. With Node 24 and these flags in place, pnpm 10 publishes via OIDC.
3. **The `repository` field is missing from `packages/errors/package.json`** — produces an `E422` (not `ENEEDAUTH`) — see next failure mode.

### `E422` on publish with "repository.url is empty"

Symptom:

```
npm error code E422
npm error Failed to validate repository information:
npm error package.json: "repository.url" is "",
npm error expected to match "https://github.com/deessejs/errors" from provenance
```

Cause: npm matches `package.json:repository.url` against the URL embedded in the OIDC provenance attestation. Empty or missing → rejection.

Fix: ensure `packages/errors/package.json` has:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/deessejs/errors.git"
}
```

This was the cause of PR #46 → PR #47 transition.

### Version bump skipped — no commit on `main`

Symptom: `pnpm changeset version` ran and modified files locally, but the `chore(release): version packages` commit was **never created**, so `git push origin HEAD` had nothing to push. The next step (`Publish`) tries to publish anyway and fails (or succeeds locally without ever appearing on the registry).

Pre-PR #45 cause: `git diff --quiet || git commit -m ...`. After `git add -A`, the working tree and index are identical, so `git diff --quiet` exits 0 and the commit is skipped.

PR #45 fix: `git diff --cached --quiet || git commit -m ...`. `--cached` compares against `HEAD`, which is the right comparison after staging.

If you see this symptom re-emerge: confirm the workflow file still has `git diff --cached --quiet` and not `git diff --quiet`.

### Wrong tag drift — tag on merge commit, not version bump commit

Symptom: `git show @deessejs/errors@X.Y.Z --no-patch` shows the merge commit instead of `chore(release): version packages`.

Cause: pre-PR #42, the workflow pushed the tag at the merge commit. PR #42 rewrote the order so the tag is pushed **after** the version-bump commit is created and pushed.

If you see this happen after the fix is in: the `git diff --cached --quiet` test came back "no diff" (no commit happened, no tag pushed), and the `git push --tags` from a later step pushed whatever stale tag was already on origin. Fix is to chase down why no version-bump commit was created in the first place.

### The `staging` PRs broke before they reached `staging`

If a PR was merged directly to `main` instead of `staging`, the CI lint on `staging` did not run for it, and the changeset requirement might have been bypassed. Recover by opening a follow-up PR that adds the missing changeset, and `git revert` if the bad state already shipped.

## Hardening to apply after the first successful OIDC release

Once `@deessejs/errors@X.Y.Z` is published via OIDC and verified:

1. On npmjs.com → `@deessejs/errors` → Settings → Publishing access → enable **"Require two-factor authentication and disallow tokens"**. This revokes all token-based publish paths; the OIDC trusted publisher is unaffected.
2. On GitHub → repository Settings → Secrets → delete `NPM_TOKEN`.
3. Confirm the trusted publisher on npmjs.com has Allowed actions = `npm publish` and nothing else (unless you want `npm stage publish` too).
4. Optional: archive the `dev` branch. It is not part of the current flow.

## Workflow contract recap

Reading the workflow file at `.github/workflows/release.yml`, the contract is:

- Trigger: `pull_request: types: [closed]` on `main` OR `workflow_dispatch`.
- Job-level permissions: `contents: write`, `id-token: write`.
- Job-level guard: `if:` requires `merged == true && base.ref == 'main'` for the PR trigger.
- Step-level guards: every step after `Detect pending changesets` is gated on `has_changesets == 'true' && (workflow_dispatch || dry_run != true)`.
- Outcomes:
  - No changeset in the merge diff → job runs only the detection step, no publish.
  - Workflow dispatch with `dry_run=true` → runs versioning but skips publish and tag push.
  - Workflow dispatch with `dry_run=false` (or unset) and no changesets → no-op.

## References

- [Release system plan](../plans/release-system.md)
- [GitHub Actions OIDC documentation](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)
- [npm trusted publishing for GitHub Actions](https://docs.npmjs.com/trusted-publishers/)
- Existing releases: `@deessejs/errors@1.0.0` (legacy), `@deessejs/errors@1.1.0`, `@deessejs/errors@1.1.1`, `@deessejs/errors@1.2.2` (first OIDC release).
