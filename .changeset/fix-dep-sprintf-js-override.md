---
'@deessejs/errors': patch
---

deps(pnpm): pin `sprintf-js` via a workspace-level override to make the unpatchable Dependabot alert explicit.

The single remaining open Dependabot alert after PRs #101–#103 is **GHSA-hp3w-g68c-fv3c** (`sprintf-js`, severity MODERATE). The advisory covers the entire `<= 1.1.3` range and **no patched version exists** (the `sprintf-js` package is in maintenance-only mode upstream; the listed `firstPatchedVersion` is empty in the GitHub Advisory Database).

Path of the transitive:

```
js-yaml@3.14.2
└── read-yaml-file@1.1.0
    └── @manypkg/get-packages@1.1.3
        └── @changesets/{cli,apply-release-plan,...}
            └── complete-package-template (devDependencies)
```

`@changesets/cli` is a workspace devDependency used by the release tooling. It is **never loaded by `@deessejs/errors`'s published runtime code**, only by the local release process. No production code path is exposed.

This PR:

1. Adds an explicit `overrides: { sprintf-js: "^1.1.3" }` block to `pnpm-workspace.yaml` (using pnpm 10's modern location, not the deprecated `pnpm.overrides` in `package.json`). The override makes the resolution explicit so future audits immediately see that the version is intentional, not accidental.
2. Companion step (out of band, manual): a maintainer with the GitHub `triage` permission should dismiss alert GHSA-hp3w-g68c-fv3c with reason **"Won't fix — no patched version; package is in maintenance-only mode and only used as a devDependency through @changesets/cli (release tooling, not in @deessejs/errors' published code path)"**. The override here makes that dismissal decision explicit and reviewable.

Validated locally:

```
pnpm install --no-frozen-lockfile   # postinstall passes
pnpm build                          # turbo: 2 successful, ~36s
pnpm --filter errors test           # 146/146 tests pass
pnpm why sprintf-js                 # resolves to 1.1.3
```
