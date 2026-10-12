---
'@deessejs/errors': patch
---

deps(apps/web): bump direct `postcss` from `^8.5.15` to `^8.5.23` to clear the remaining 10 postcss Dependabot alerts.

## Mechanism

The caret range `^8.5.15` was not the binding constraint. Caret semver already permits any `8.5.x >= 8.5.15`, including the patched `8.5.29`; no peer dependency was forcing the resolution to a vulnerable version. The actual reason `pnpm-lock.yaml` still pinned vulnerable postcss versions was that the lockfile was a stale snapshot from the original commit, and pnpm re-uses locked versions until the lockfile is regenerated.

`pnpm install --no-frozen-lockfile` in this PR re-resolved the graph and pnpm picked the highest version satisfying every constraint — `8.5.29`. The lockfile regen alone would have closed the alerts. This PR additionally raises the direct range to `^8.5.23` so the manifest is explicit about the floor we want, and to keep the lockfile in step if a future contributor runs `pnpm install --frozen-lockfile`.

## Advisories cleared (4 distinct GHSAs, 10 alerts)

- GHSA-6g55-p6wh-862q (patched in 8.5.12)
- GHSA-fxqj-rqcc-2cmp (patched in 8.5.23)
- GHSA-qx2v-qp2m-jg93 (patched in 8.5.10)
- GHSA-r28c-9q8g-f849 (patched in 8.5.18)

The transitive `postcss@8.4.31` hoisted by `next@16.x.x` is below 8.5.10 and not in the Dependabot view; it is not reported as an alert.

## Scope

This PR touches `pnpm-lock.yaml` and `apps/web/package.json` only. The companion cleanup of the vestigial `apps/web/package-lock.json` (an npm lockfile that no CI step reads, and which is a permanent source of duplicate Dependabot noise) lives in PR #110; that removal prevents the same class of drift from recurring in future cleanup rounds.

## Validation

- `pnpm install --no-frozen-lockfile` (postinstall passes)
- `pnpm build` (turbo: 2 successful)
- `pnpm --filter errors test` (146/146)
