# @deessejs/errors

## 2.0.0

### Major Changes

- 1dadb81: # 2.0.0

  This release locks in the public surface of `@deessejs/errors`. The
  two `error()` overloads are the supported entry points; the
  constraints around `inherits`, `from`, `is`, and `causes` are
  pinned in the type system and verified by a runtime probe against
  every example in the docs.

  ## What shipped

  ### Two `error()` overloads

  The function is overloaded on whether a Standard Schema is supplied
  for `fields`. Both overloads share the same call-site shape for
  `name`, `message`, and `inherits`.

  ```ts
  // No-schema form. The factory is callable with no arguments,
  // or with a manual generic that constrains the field shape.
  //
  //   const X = error<{ n: string }>({ name: 'X' });
  //   X({ n: 'value' }).fields.n // string
  //
  // The no-schema form accepts a string `message` (with optional
  // `{field}` placeholders) or a function `message: (data) => string`.
  const E = error({ name: 'E' });
  const instance = E();

  // Schema form. The factory's call signature requires the
  // schema's `InferInput` as the argument; `message` is a function
  // of the schema's `InferOutput`. A string `message` is not
  // accepted alongside a schema.
  const S = error({
    name: 'S',
    fields: z.object({ n: z.number() }),
    message: (data) => String(data.n),
  });
  const s = S({ n: 1 });
  ```

  A factory with a schema always requires its input, even for
  `z.object({})`. A no-schema factory is callable with no arguments
  when `T` defaults to `Record<string, never>`, or with the input
  required by the manual generic.

  ### Inheritance is structural

  `inherits` is a static type-level relationship plus a recognition
  walk for `is()`. The leaf's `InferOutput` (or manual generic `T`)
  must be assignable to every parent's `InferOutput`; the
  constraint is enforced at the `error()` definition site. The
  walk is what makes `is()` match a child against any of its
  ancestors.

  ```ts
  const Parent = error({
    name: 'Parent',
    fields: z.object({ id: z.string() }),
    message: (d) => d.id,
  });
  const Child = error({
    name: 'Child',
    fields: z.object({ id: z.string(), extra: z.string() }),
    message: (d) => `${d.id}-${d.extra}`,
    inherits: Parent,
  }); // ok
  ```

  `Parent.fields.id` is the only requirement the child must
  satisfy. The child may add fields but must not drop or change
  the parent's required ones. The library does not run the
  parent's schema at instantiation; the leaf's own schema is
  the only one that runs.

  ### `.from()` builds chains, one link at a time

  Each `.from()` call sets the direct cause of the receiver. To
  build a chain of length N, attach each layer's cause to the
  previous one — the previous cause carries its own `.cause`.

  ```ts
  const root = new Error('Network timeout');
  const middle = ValidationError().from(root);
  const app = AppError().from(middle);
  const chain = causes(app); // [middle, root]
  ```

  The chain is recoverable because every link carries its own
  `.cause`; replacing the direct cause on a layer drops the
  previous link from the walk. `causes()` returns a fresh array,
  ordered immediate cause first, root cause last, with cycle
  detection.

  ### `is()` narrows and walks

  `is(err, factory)` returns `true` if `err` is an instance of
  the factory, directly or through the inheritance walk. The
  factory overload narrows `err` to that factory's own
  `InferOutput`. The native-constructor overload narrows to
  `InstanceType<typeof NativeErrorClass>`.

  The walk consults a package-private `WeakSet` keyed on
  instance identity, in addition to the factory marker. A
  foreign object that imitates the marker slot is rejected by
  the registry check. See the Caveats for the per-load limit.

  ## Breaking changes from 1.x
  - **Required input argument.** A factory declared with a
    Standard Schema or a non-empty manual generic refuses a
    no-arg call at compile time. Legacy call patterns
    (`error({ name })`, `error({ name, message: 'literal' })`)
    keep the optional argument because their default `TInput`
    is the empty shape.

  - **Schema overload requires a function-form `message`.** A
    string `message` is no longer accepted alongside a schema.
    Consumers that relied on `{ fields: schema }` without a
    function `message` must add one.

  - **Factory call signature takes the full shape, not `Partial<T>`.**
    The 1.x signature accepted `Partial<T>` so any field could
    be omitted. The 2.0 signature accepts `T` (or `TInput` when
    a schema is supplied). Callers must either supply the full
    shape or annotate fields as optional in the schema.

  - **The flat `causes: Error[]` field on `ErrorInstance` is gone.**
    The previous field conflated historical `.from()` calls
    with a true causal chain. `cause: Error | null` is now the
    only direct field. Use the top-level `causes(error)`
    function to walk the chain.

  - **`is()` is split into two overloads.** The factory
    overload narrows to `ErrorInstance<...>`; the
    native-constructor overload narrows to `Error` and
    does not promise `.fields`, `.notes`, `.from()`, or
    `.addNote()`.

  ## Caveats
  - **`strictFunctionTypes` is required.** The contravariance
    witness that enforces inheritance compatibility relies on
    function parameters being checked contravariantly. Without
    `strictFunctionTypes`, the inheritance constraint is
    bypassed. `strictFunctionTypes` is enabled by `strict`,
    which is on in this project's tsconfig.

  - **TypeScript 5.4 or later.** The public `error()` overloads
    use `NoInfer<T>`, which was introduced in TypeScript 5.4.
    Earlier versions compile but lose the `NoInfer` semantics on
    the `T` parameter.

  - **Schema output must be a non-null, non-array object.** A
    schema whose `InferOutput` is `null`, an `unknown[]`, a
    primitive, or `undefined` is rejected at compile time via
    the `fields: S & (IsObjectOutput<InferOutput<S>> extends true
? unknown : never)` intersection, and at runtime via the
    `isObjectFields` guard that throws `ArgsValidationError` if
    the schema's value is malformed.

  - **Schemas must be synchronous.** A schema whose `validate`
    returns a `Promise` is rejected with `ArgsValidationError`.
    The Promise is still attached and a no-op `.catch` is added
    so a late rejection cannot surface as an `unhandledRejection`.

  - **Input is required when a schema is supplied.** A factory
    declared with a Standard Schema refuses a no-arg call at
    compile time. The runtime also throws a localized `TypeError`
    for the schema-bearing path so consumers who bypass the
    type-checker still get a clear message. This applies even
    when the schema accepts the empty shape (`z.object({})`).

  - **`.fields` carries the post-transform output.** For schemas
    that transform (e.g. `z.coerce`, `z.default`, `z.transform`),
    the leaf's `.fields` is the schema's `InferOutput`, not the
    `InferInput`. The factory's `message` function receives the
    post-transform output.

  - **`is()` is per-package-load.** An instance created by a
    second copy of `@deessejs/errors` (a duplicate in
    `node_modules`, a separate bundle, a CommonJS/ESM dual load,
    two copies in a micro-frontend) is registered in _that_
    copy's internal `INSTANCE_REGISTRY` (a `WeakSet`), not ours.
    Holding a direct reference to its factory is not sufficient:
    the marker slot is read and matches, but the registry check
    fails, and `is()` returns false. To recognize cross-load
    instances, the consumer must call `is()` from the same load
    that produced the instance.

  - **The instance marker is non-writable on real instances.**
    Set via `Object.defineProperty` with `writable: false`. A
    foreign object that imitates the marker is rejected by the
    registry check; a hostile object that re-defines the marker
    on a real instance is rejected in strict mode (the
    assignment throws) and silently fails in sloppy mode (the
    marker is unchanged).

  - **The factory's `inherits` slot is a snapshot.** Built once
    at construction, before the closure, and used for both the
    factory's metadata and every produced instance's `inherits`.
    The caller's array is not mutated. Classification is
    preserved across caller-side mutations on the original
    list.

  ## Docs
  - **Public examples in `apps/web/content/docs/*.mdx` are
    type-checked AND runtime-verified against `dist/index.d.ts`.**
    `tests/docs-examples-typecheck.mjs` walks every fenced
    TypeScript code block in the docs, runs `tsc --noEmit`
    against the published types, then executes the block under
    `node --experimental-strip-types` and verifies every
    `console.log(...) // -> <expected>` annotation against the
    captured stdout. A doc that announces the wrong value
    fails the probe. As part of the audit, all MDX examples
    were rewritten to compile, to assert the values the page
    claims, and to build chains layer-by-layer so the
    announced `causes(...).length` matches the walk.

### Minor Changes

- 172e81c: Add `ErrorInstance.addNote(note)` for attaching runtime context to errors (PEP 678, mirrors Python 3.11). Returns the instance for chaining. The `notes: string[]` property was already implemented; the method was missing despite being documented. Closes #29.
- 81a1347: Add CI lint that requires a changeset on every PR to `staging`. Part of the release system plan (Phase 4).
- 91ceaf0: Implement Standard Schema type inference in `error()`. The `<const T extends Record<string, unknown>>` placeholder parameter is gone. The field shape is now derived from the `fields: StandardSchemaV1` parameter via a new `InferFields<S>` helper that uses `StandardSchemaV1.InferOutput<S> & Record<string, unknown>` to satisfy the `ErrorFactory<TFields>` constraint while preserving the precise inferred type at the call site.

  Consumers passing a typed Standard Schema-compliant validator (Zod, Valibot, ArkType, etc.) now receive a factory whose return type carries the schema's output shape — no more `error<T>(...)` boilerplate. The trailing cast `return ErrorFactoryInstance as ErrorFactory<T>` is preserved (single cast, single boundary, rule 0008 compliant) but the gap it bridges is now narrower: the cast only widens at the metadata-attachment boundary, not at the type-parameter boundary.

  Closes #83. The package's runtime behavior is unchanged; 85 tests pass (82 → 85, three new inference regression tests). The `ErrorConfig` type in `types.ts` is updated to mirror the new public signature.

- ce629c4: Resync staging with main after #91 was merged ahead of the 1.4.0 release. The class-based internals refactor (`ErrorInstanceImpl` private class) was superseded by 1.4.0's function-based implementation with RFC 0001 Standard Schema validation, `ArgsValidationError`, and `message-as-function` mode. The structural improvement (instance instanceof Error, real class methods) is preserved in spirit through RFC 0001's type-level guarantees. Closes #88.

### Patch Changes

- 5a6f11c: Tag the release job with `environment: release` so the run is recorded as a deployment to the `release` GitHub environment. Future hardening (required reviewers, branch restrictions, wait timer) can attach to the same environment without further workflow changes. Provenance and trusted publishing are unaffected.
- 3c0c1d0: Add the missing `repository` field to `packages/errors/package.json`. Trusted publishing with provenance requires `package.json:repository.url` to match the GitHub repo URL from the OIDC token — without it, npm rejects the publish with `E422: Error verifying sigstore provenance bundle: "repository.url" is ""`.
- 46ed266: Add documentation under `docs/internal/engineering/process/` (`implementing-an-issue.md`, `releasing-a-new-version.md`, `pr-authoring.md`) and `docs/learnings/github/stacked-pr/README.md`. No code or workflow changes. The changeset is required by the current `ci.yml` lint; it does not represent a feature bump.
- e5de45f: Update `docs/internal/engineering/plans/release-system.md` to reflect the post-plan additions: `Section 7 — Trusted publishing & environment` documents npm OIDC trusted publishing and the `release` GitHub environment. `Appendix C — Post-plan decision log` captures the new decisions. `Definition of done` adds two new items for OIDC publish and env record. `Status` moves from "Proposed" to "Approved and partially implemented on `staging`".
- 5016fa3: Resolve twelve internal inconsistencies across the architecture rules in `docs/engineering/architecture/rules/` (rules 0001-0016, INDEX.md, README.md). Each fix is a clarification that aligns the text with the doctrine already expressed elsewhere in the ruleset; no new doctrine is introduced and no existing constraint is weakened. Includes: INDEX title and 0015 summary refresh, README length policy softening, threshold disambiguation across 0001/0002/0003/0005, 0016 self-contradiction on `run`/`execute`, 0013/0012/0014 reconciliation, and the 0010/0015 carve-out for environment values. The published runtime is unchanged.
- f710cdc: Update `CLAUDE.md` and `CONTRIBUTING.md` to reflect the actual branching model: devs land on `staging`, release engineer cherry-picks to `main` with a `version bump` label, hotfixes branch from `main`. The previous `main <- staging <- dev` model was documented but not practiced. Part of the release system plan (Phase 5).
- 204b267: Replace the chained type assertion `(instance as unknown as Record<typeof FACTORY_SYMBOL, () => unknown>)[FACTORY_SYMBOL]` in `error.ts` with a single property assignment on the declared `ErrorInstance<T>` type. The `FACTORY_SYMBOL` is now declared on `ErrorInstance<T>` in `types.ts`; the marker assignment is type-checked, and the `as unknown` cast is gone. Closes #71. The package's public API is unchanged; all 83 tests pass.
- 8a268a7: Replace the cast in `causes/index.ts` (`error as ErrorInstance`) with a structural guard (`'causes' in error && Array.isArray(error.causes)`). The function no longer imports `ErrorInstance` and the input is honest about its `unknown` shape. The first example in the JSDoc was broken (a template literal cut mid-sentence); it is now a complete try/catch example. A regression test verifies that an object carrying `causes: 'not an array'`, `causes: null`, or an array-like (non-`Array`) value returns `[]`. Public API unchanged; 83 tests pass (82 → 83). Closes #74.
- 30dc048: Fix npm trusted publishing (OIDC) end-to-end. Three changes:

  1. Release workflow bumps Node 22 → 24 (the runner default; matches our other release workflows, and aligns with npm CLI ≥ 11.5.1 + Node ≥ 22.14.0 requirements for trusted publishing).
  2. `Publish packages` step now passes `env: NPM_CONFIG_PROVENANCE: 'true'`, which forces pnpm publish down the OIDC code path instead of falling back to a token.
  3. `packages/errors/package.json` now declares `publishConfig.provenance: true`, so npm always emits a provenance attestation on publish (belt + suspenders alongside the env var).

- 8648722: Fix a bug in the release workflow: `git diff --quiet` (without `--cached`) compared the working tree to the index, which is in sync immediately after `git add -A`. This caused the version bump commit to be skipped, leaving the working tree in a `pnpm changeset publish`-able state but never pushed to `main`. Use `git diff --cached --quiet` so the comparison is against the last commit (HEAD), which is what we actually want.
- 260f046: Rewrite the release workflow to detect pending changesets explicitly and gate all publish steps on detection. Tag is now pushed at the version bump commit (not the merge commit), fixing the `@deessejs/errors@1.1.1` tag drift. Adds `dry_run` and `packages` inputs to `workflow_dispatch`. Part of the release system plan (Phase 3).
- 4380419: Remove the `version bump` label gate from the release workflow. Every PR merged to `main` now produces a release if it contains `.changeset/*.md` files in its diff. The `has_changesets` detection step is the only condition. Simplifies the release engineer's job — no more remembering to label.
- 191ca85: Add a Vitest harness in `apps/web/` that locks in the SEO surface the v1.4.1 cleanup batch protects (`apps/web/tests/seo/`). The suite runs in CI on every PR to `staging`; it does not change any published runtime. The `apps/web` workspace does not publish, so the changeset is included solely to satisfy the `Require changeset` lint in `.github/workflows/ci.yml` for PRs that touch files outside `apps/web/` itself.
- e453eb5: Switch the release workflow to npm trusted publishing (OIDC) instead of `secrets.NPM_TOKEN`. The `id-token: write` permission, already declared on the job, is sufficient for GitHub to mint the OIDC token that npm exchanges for a short-lived publish credential. Provenance is generated automatically on public repos. The `NPM_TOKEN` secret can be revoked once the first OIDC publish succeeds.

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
