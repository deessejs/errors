# @deessejs/errors

## 1.4.0

### Minor Changes

- 93389bd: Add `StandardSchemaV1` runtime validation and message-as-function mode to `error()` (RFC 0001).

  - New API: pass `fields: StandardSchemaV1` (Zod, Valibot, ArkType, etc.) and a function `message: (data) => string`. Args are validated at instantiation; invalid inputs throw `ArgsValidationError`.
  - The function form receives the **parsed** (post-transform) data, so schemas that brand, coerce, or refine work as expected.
  - New export `ArgsValidationError` with `source`, `vendor`, `issues`. Re-exported from `@deessejs/errors` so consumers can `instanceof`-check.
  - `ErrorFactory.schema` has been removed. The duplication between `fields` and `schema` is gone.
  - The legacy string-template form (`message: "Field {field}"`) keeps working in 1.x and emits a single deprecation warning per call site. Set `DEESSEJS_ERRORS_LEGACY_TEMPLATES=1` to silence. The legacy form will be removed in 2.0.0.

  See [RFC 0001](https://github.com/deessejs/errors/blob/main/docs/internal/engineering/rfcs/0001-standard-schema-fields.md) for the full design discussion.

## 1.3.3

### Patch Changes

- 1acfb53: Refresh the README and package.json metadata for the npm listing.

  README:
  - Adopt the shared ecosystem layout (badges block, What is included table, Quick start, Compatibility, Project structure, Publishing, Architecture notes, Contributing, Acknowledgements).
  - Credit `deessejs/package-template` and `deessejs/fp` in the new Acknowledgements section.
  - Surface the `addNote()` (PEP 678), `raise()`, `causes()`, and the `Result`/`Try` interop story in both the root and the package README.

  Package metadata:
  - Replace the placeholder description with a more searchable summary (Python-style, ESM, `@deessejs/fp` interop).
  - Add `bugs.url`, `files`, `sideEffects: false`, `engines.node`, and `funding` (GitHub Sponsors).
  - Refresh `keywords`: drop `npm-package`, add `standard-schema`, `esm`, `monorepo`.

## 1.3.2

### Patch Changes

- 64eb926: Release @deessejs/errors@1.3.1 (post-merge changeset to drive release workflow)

## 1.3.1

### Patch Changes

- 0b9938a: Release @deessejs/errors@1.3.0 (post-merge changeset to drive release workflow)

## 1.3.0

### Minor Changes

- 172e81c: Add `ErrorInstance.addNote(note)` for attaching runtime context to errors (PEP 678, mirrors Python 3.11). Returns the instance for chaining. The `notes: string[]` property was already implemented; the method was missing despite being documented. Closes #29.
- 81a1347: Add CI lint that requires a changeset on every PR to `staging`. Part of the release system plan (Phase 4).

### Patch Changes

- 5a6f11c: Tag the release job with `environment: release` so the run is recorded as a deployment to the `release` GitHub environment. Future hardening (required reviewers, branch restrictions, wait timer) can attach to the same environment without further workflow changes. Provenance and trusted publishing are unaffected.
- 3c0c1d0: Add the missing `repository` field to `packages/errors/package.json`. Trusted publishing with provenance requires `package.json:repository.url` to match the GitHub repo URL from the OIDC token — without it, npm rejects the publish with `E422: Error verifying sigstore provenance bundle: "repository.url" is ""`.
- 46ed266: Add documentation under `docs/internal/engineering/process/` (`implementing-an-issue.md`, `releasing-a-new-version.md`, `pr-authoring.md`) and `docs/learnings/github/stacked-pr/README.md`. No code or workflow changes. The changeset is required by the current `ci.yml` lint; it does not represent a feature bump.
- e5de45f: Update `docs/internal/engineering/plans/release-system.md` to reflect the post-plan additions: `Section 7 — Trusted publishing & environment` documents npm OIDC trusted publishing and the `release` GitHub environment. `Appendix C — Post-plan decision log` captures the new decisions. `Definition of done` adds two new items for OIDC publish and env record. `Status` moves from "Proposed" to "Approved and partially implemented on `staging`".
- f710cdc: Update `CLAUDE.md` and `CONTRIBUTING.md` to reflect the actual branching model: devs land on `staging`, release engineer cherry-picks to `main` with a `version bump` label, hotfixes branch from `main`. The previous `main <- staging <- dev` model was documented but not practiced. Part of the release system plan (Phase 5).
- 30dc048: Fix npm trusted publishing (OIDC) end-to-end. Three changes:

  1. Release workflow bumps Node 22 → 24 (the runner default; matches our other release workflows, and aligns with npm CLI ≥ 11.5.1 + Node ≥ 22.14.0 requirements for trusted publishing).
  2. `Publish packages` step now passes `env: NPM_CONFIG_PROVENANCE: 'true'`, which forces pnpm publish down the OIDC code path instead of falling back to a token.
  3. `packages/errors/package.json` now declares `publishConfig.provenance: true`, so npm always emits a provenance attestation on publish (belt + suspenders alongside the env var).

- 8648722: Fix a bug in the release workflow: `git diff --quiet` (without `--cached`) compared the working tree to the index, which is in sync immediately after `git add -A`. This caused the version bump commit to be skipped, leaving the working tree in a `pnpm changeset publish`-able state but never pushed to `main`. Use `git diff --cached --quiet` so the comparison is against the last commit (HEAD), which is what we actually want.
- 260f046: Rewrite the release workflow to detect pending changesets explicitly and gate all publish steps on detection. Tag is now pushed at the version bump commit (not the merge commit), fixing the `@deessejs/errors@1.1.1` tag drift. Adds `dry_run` and `packages` inputs to `workflow_dispatch`. Part of the release system plan (Phase 3).
- 4380419: Remove the `version bump` label gate from the release workflow. Every PR merged to `main` now produces a release if it contains `.changeset/*.md` files in its diff. The `has_changesets` detection step is the only condition. Simplifies the release engineer's job — no more remembering to label.
- e453eb5: Switch the release workflow to npm trusted publishing (OIDC) instead of `secrets.NPM_TOKEN`. The `id-token: write` permission, already declared on the job, is sufficient for GitHub to mint the OIDC token that npm exchanges for a short-lived publish credential. Provenance is generated automatically on public repos. The `NPM_TOKEN` secret can be revoked once the first OIDC publish succeeds.

## 1.1.1

### Patch Changes

- Release v1.1.1: infrastructure improvements and SEO enhancements

  ### Fixed
  - Add changeset version step and tag push to release workflow
  - Add display flex to all OG image divs for Satori compatibility

  ### Changed
  - Comprehensive SEO optimization for @deessejs/errors website
  - Add banner image for OG social sharing
  - Add homepage URL to package.json for npm SEO
  - Add sitemap, robots.txt, homepage metadata and canonical URLs

## 1.1.0

### Minor Changes

- 65c9327: release v1.1.0: documentation overhaul, SEO improvements, CI enhancements

## 1.0.0

### Major Changes

- 50bf63f: ## v1.0.0 — Core Foundation

  Initial release of `@deessejs/errors`, a function-based error handling library inspired by Python's error system.

  ### Added
  - `error()` function for defining error types with Standard Schema support
  - `raise()` function for throwing errors
  - Native `throw` syntax support
  - `is()` function for type checking with inheritance support
  - `inherits` option for single and multiple inheritance
  - `.from()` method for exception chaining
  - `causes()` function for chain traversal (most recent first)
  - `err.fields` namespace for user-defined data
  - Message templates with `{field}` placeholders
  - All error properties always defined (never undefined)
  - Standard Schema compliance for field definitions (Zod, Valibot, ArkType)

  ### TypeScript Support
  - Generic types: `ErrorFactory<T>`, `ErrorInstance<T>`
  - Full type inference with fields
  - No `any` — only generics and proper types
