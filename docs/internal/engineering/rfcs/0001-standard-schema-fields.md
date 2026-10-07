# RFC 0001 — Promote `StandardSchemaV1` to runtime validation + message-as-function

- **Status:** Draft
- **Author:** martyy-code (via Claude session)
- **Created:** 2026-08-05
- **Supersedes / relates to:** Issue #32
- **Target version:** `@deessejs/errors@1.4.0` (first minor that contains the new API), removal of legacy in `2.0.0`
- **Depends on:** nothing blocking; unblocks [issue #33](../..) (typed `ErrorGroup`)

## Summary

Promote the existing type-level `StandardSchemaV1` field to runtime validation, and replace the implicit `{placeholder}` template with an explicit `(args) => string` function. The output schema is the source of truth for both types and runtime checks. The legacy template form is kept for one minor release, then removed.

This RFC is the design discussion that precedes any code change. Decisions taken here are inputs to the implementation PR.

## 1. Motivation

The current `error({...})` factory accepts an implicit, type-free argument object whose shape is conveyed only by placeholders inside a template string. The package already declares `StandardSchemaV1` on both `ErrorFactory.schema` and `ErrorConfig.fields`, but the runtime **never validates** against it. The field exists in the type system and is silently ignored at runtime. Anyone calling `MyError()` with an empty object gets a string of literal `{name}`, with no error raised.

Issue #32 describes the end state and the migration path. The job of this RFC is to **lock the design decisions** before any code lands, because each decision changes the public surface in ways that are not undoable inside a minor release.

### 1.1 Goals

- Inputs to the factory are validated at instantiation against a user-supplied `StandardSchemaV1`.
- The TypeScript signature infers the args type from the schema, with no manual generic argument.
- The legacy `message: string` template form keeps working for one minor release with a deprecation warning.
- The package remains vendor-neutral — zod, valibot, arktype, and any future Standard Schema implementation work without changes to `@deessejs/errors` itself.
- The codemod that migrates legacy templates is published **separately from** the main npm package.

### 1.2 Non-goals

- No change to the `.from(cause)`, `.addNote()`, `raise()`, `is()`, or `causes()` APIs.
- No change to the `inherits` model.
- No new `ErrorGroup` API in this release — it lands in a follow-up issue (#33) that depends on this RFC being merged and the new API being shipped.

## 2. Current state (1.3.3 baseline)

The relevant code lives in `packages/errors/src/error/`:

- `types.ts` declares:

  ```ts
  fields?: StandardSchemaV1;
  schema?: StandardSchemaV1;
  ```

  Both exist. Neither has a documented role. The duplicate declaration predates the v1.0 release and was never resolved.

- `error.ts` (the `error()` factory):

  ```ts
  export const error = <const T extends Record<string, unknown>>(config: { ... }): ErrorFactory<T> => {
    const ErrorFactoryInstance = (input?: Partial<T>): ErrorInstance<T> => {
      const fieldsData = (input || {}) as T;
      let errorMessage = name;
      if (message && hasTemplatePlaceholders(message)) {
        errorMessage = formatTemplate(message, fieldsData);
      } else if (message) {
        errorMessage = message;
      }
      ...
    };
  };
  ```

  No call to `~standard-schema/validate`. The `input` is cast to `T` without runtime checks. The template engine is invoked only when `message` is a string and contains `{...}` placeholders.

- `format.ts` contains `formatTemplate` and `hasTemplatePlaceholders`. Both are string-only utilities.

- Tests in `packages/errors/tests/error.test.ts` exercise the template path heavily and the schema path not at all.

### 2.1 What is actually working

- The legacy template form is reliable, tested, and documented.
- The `@standard-schema/spec` package is already a runtime dependency in `packages/errors/package.json`.
- `StandardSchemaV1` is exposed in public exports from `packages/errors/src/index.ts`.

### 2.2 What is not working

- `StandardSchemaV1` is declared but never invoked.
- `ErrorConfig.fields?` and `ErrorFactory.schema?` are duplicates with no documented distinction.
- The error message is a string interpolation, which makes i18n, pluralization, and conditional formatting land at the call site.
- A consumer cannot import a type for `err.fields`; there is nothing to import.

## 3. Open design decisions

The following decisions must be locked before any code lands.

### Decision A — Where to declare the schema

Two choices, both currently in the source:

| Option                       | Surface                                                                                                            | Pros                                                                                                                          | Cons                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `fields` (in `ErrorConfig`)  | Already exported. Single source of truth: the schema lives where it is _declared_, alongside `name` and `message`. | The schema is part of the error _definition_. Consumers can read it back via `MyError.schema` to build UIs, serializers, etc. | Increases coupling between `ErrorConfig` and the validator type.                                       |
| `schema` (in `ErrorFactory`) | Already exported. Stored on the _factory_ post-construction.                                                       | Easier to add later (e.g. via a separate `withSchema(s)` builder).                                                            | Splits the schema declaration from the rest of the config. Two fields doing the same job is confusing. |

**Recommendation: keep `fields` on `ErrorConfig`. Remove `schema` on `ErrorFactory`.** This is the breaking change, but the `fields` location matches the natural reading: `error({ name, fields, message })`. `schema` was added speculatively and has no consumer.

### Decision B — `message: string` vs `message: (args) => string`

The proposal in #32 is to **require** the function form and deprecate the string form. Two refinements to that proposal are needed:

1. The function must receive the **parsed** (post-transform) args, not the raw input, so it can rely on `.brand()`, `.refine()`, `.transform()` behaviour.
2. The function must receive the **Standard Schema result** directly so users that want raw input can pass it through unmodified. Concretely:
   ```ts
   message: (data) => string;
   ```
   where `data` is the schema output type. No `{placeholder}` interpolation occurs when `message` is a function.

**Recommendation: function form only on the new API.** Reject `message: string` when `fields` is supplied. The legacy string-only path (without `fields`) keeps working.

### Decision C — Generic signature of `error()`

Three options:

| Option              | Signature                                                             | Notes                                                                                                              |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| C1. Manually typed  | `<const T extends Record<string, unknown>>(...)` (current)            | Loses inference from the schema. Requires the user to repeat types.                                                |
| C2. Schema-inferred | `<S extends StandardSchemaV1<unknown, Record<string, unknown>>>(...)` | Infers `Output` from the schema. Requires `S` to satisfy the constraint, which valibot / arktype variants may not. |
| C3. Overloaded      | One overload for schema mode, one for manual mode                     | Maximum flexibility; double the test surface; harder to document.                                                  |

**Recommendation: C2.** The constraint is small enough to express correctly, and the inference win is real. If a validator does not satisfy the constraint, the consumer can fall back to C1 in the same release.

### Decision D — Runtime failure shape

`StandardSchemaV1.result.issues` is the standard way to surface a validation failure. The library can either:

- **Re-throw** the validator's raw failure object (simplest, not library-branded)
- **Wrap** in a new `ArgsValidationError` class that includes the issues

**Recommendation: wrap in `ArgsValidationError`.** It carries a `.issues` getter for the raw data and is itself a valid `ErrorFactory` output. Consistent with the rest of the API. Allows consumers to catch the failure with `try/catch` and a single type guard.

### Decision E — Deprecation window

The legacy string-template path needs a deprecation marker. Two strategies:

- **Runtime warning** printed once when `fields` is missing and `message` is a string. Cheap to add, intrusive.
- **Compile-time hint** via a `@deprecated` JSDoc tag. Quieter, no runtime cost. Only catches consumers reading the docs.

**Recommendation: both.** Add `@deprecated` to the relevant type branches and a `console.warn` printed at most once per call site via a `WeakSet`. Disable both via `process.env.DEESSEJS_ERRORS_LEGACY_TEMPLATES=1` if the user wants a clean run.

### Decision F — Codemod placement

The proposal places the codemod at `packages/errors/codemods/`. This is wrong:

- It would publish the codemod's `package.json` and entry point with the main npm package, polluting the consumer surface and the bundle.
- A codemod is a **tool**, not a library. Consumers do not `import` it; they `npx` it.

**Recommendation: separate sub-package at `packages/errors-codemods/`** with its own `package.json`, its own version cadence, and a single `bin` entry. Document the codemod in this RFC's migration plan but do not implement it inside this RFC. Implementation is a follow-up.

## 4. Proposed API

The final shape that every consumer will write in this release cycle:

```ts
import { z } from 'zod';
import { error } from '@deessejs/errors';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({
    field: z.string(),
    reason: z.string(),
    code: z.enum(['invalid', 'missing', 'too_long']),
  }),
  message: (args) => `Field "${args.field}" is invalid (${args.code}): ${args.reason}`,
});
```

Same builder, different validator:

```ts
import * as v from 'valibot';

const ValidationError = error({
  name: 'ValidationError',
  fields: v.object({
    field: v.string(),
    reason: v.string(),
    code: v.picklist(['invalid', 'missing', 'too_long']),
  }),
  message: (args) => `Field "${args.field}" is invalid (${args.code}): ${args.reason}`,
});
```

The legacy form keeps working but emits a deprecation warning:

```ts
const LegacyValidationError = error({
  name: 'ValidationError',
  message: 'Field "{field}" is invalid: {reason}',
});

// still works in 1.4.x, removed in 2.0.0
```

Public type changes:

- `ErrorConfig<TIn, TOut>` (renamed; old `ErrorConfig` shape deprecated)
- `ErrorFactory<TIn, TOut>`
- `ErrorInstance<TIn, TOut>`
- New `ArgsValidationError` factory exported
- `StandardSchemaV1` already exported
- `error<Schema extends StandardSchemaV1<unknown, StandardSchemaV1['~standard']['vendor']['output']>>` overload

## 5. Implementation plan

Five work items, ordered. Each is its own PR where it makes sense.

### PR 1 — RFC

This document. Reviewer: maintainer only. Merge directly to `main`.

### PR 2 — New API surface (1.4.0-beta)

- Add the new `error()` overload that accepts `fields: StandardSchemaV1` and `message: (data) => string`.
- Add `ArgsValidationError` factory.
- Keep the old template path as a fallback when `fields` is not supplied.
- Add deprecation warnings on the old path.
- Tests across zod, valibot, arktype.

### PR 3 — Deprecation documentation and migration guide

- README: side-by-side zod / valibot / arktype examples.
- `releasing-a-new-version.md` and this RFC's appendices: migration cookbook.
- `CHANGELOG` via changeset (`minor` because of new API).

### PR 4 — Built-in error tree migration (optional)

Apply the new API to the package's own error factories (if any — currently the package does not ship built-in error factories). Document this PR as a "we migrated our own code" reference implementation.

### PR 5 — Removal in 2.0.0

Major version bump. Delete the legacy template path and the deprecation warning. Remove `process.env.DEESSEJS_ERRORS_LEGACY_TEMPLATES` from docs.

> The previously planned PR 4 (codemod) was removed during review by decision Q3. The migration is now manual via the guide added in PR 3. If a future release shows that the manual migration is too friction-laden, a codemod PR can be reintroduced.

## 6. Risks revisited

The original issue lists six risks. The ones this RFC explicitly **increases**:

- **Inference complexity.** Decision C2 (`StandardSchemaV1` constrained input) is known to occasionally blow up `tsc` on highly generic schemas. Mitigation: a `tests/types/` directory with `expectTypeOf` from vitest, run in CI. Block the release if inference exceeds 5s on a representative consumer example.
- **Validator behaviour divergence.** Different validators return different `Output` for the same `Input`. Mitigation: trust the standard. Document in the RFC that consumers using raw validator output should consult their validator's docs.
- **Silent changes in `err.fields`.** Old code returned `(input || {}) as T`. New code returns `result.value` from Standard Schema. Mitigation: `PackageMigration.test.ts` snapshot-diff the existing test suite, flag breaking changes, update tests.

The ones the issue already handles correctly:

- **Breaking change.** Handled by the deprecation window (manual migration; no codemod by decision Q3).
- **Standard Schema version drift.** Handled by the `^1.0.0` pin in `package.json`.
- **New validation behavior surface.** Handled by the deprecation window and the documented `ArgsValidationError`.

## 7. Out of scope

Everything the issue lists as `Out of scope` stays out:

- Inheritance model changes.
- New `.addNote()` work (already shipped in 1.3.0).
- `.from(cause)` changes.
- Typed `ErrorGroup` (issue #33, depends on this).

## 8. Decisions locked by this RFC

| #   | Decision                                                                    | Choice                   |
| --- | --------------------------------------------------------------------------- | ------------------------ |
| A   | Schema declared in `ErrorConfig.fields`, removed from `ErrorFactory.schema` | `fields` only            |
| B   | `message` accepts function; template stays as legacy fallback               | both, function preferred |
| C   | `error()` generic parameter inferred from `StandardSchemaV1`                | C2                       |
| D   | Validation failure wrapped in `ArgsValidationError`                         | yes                      |
| E   | Deprecation marker is both JSDoc + runtime warning                          | both                     |
| F   | No codemod for this release (per Q3); migration is manual via the guide     | none                     |

These are the inputs to any PR against the source. If a reviewer disagrees with one of them, that decision is unlocked here, not in code review.

## 9. Decisions locked by review

The following Q&A happened during review of this RFC. They are now part of the contract.

### Q1 — Alias de dépréciation pour `ErrorFactory.schema`

**Tranchée :** Cassure unique en 1.4.0.

`ErrorFactory.schema` est supprimé dans la 1.4.0 sans alias `@deprecated` ni période de grâce. Aucun consumer connu dans le repo, dans la doc, ou dans le CHANGELOG. Préserver le doublon pendant deux versions minerait l'intention du refactor. Le search-and-replace `MyError.schema → MyError.fields` est trivial et documenté dans la migration guide.

### Q2 — Emplacement de `ArgsValidationError`

**Tranchée :** Top-level depuis `@deessejs/errors`.

`import { ArgsValidationError } from '@deessejs/errors'`. Cohérent avec l'organisation actuelle où `error`, `raise`, `is`, `causes`, et `StandardSchemaV1` sont déjà exportés depuis `src/index.ts`. Le sub-path `@deessejs/errors/validation` reste une migration future possible sans casser les imports top-level existants.

### Q3 — Codemod de migration

**Tranchée :** Aucun codemod pour cette release.

Le paquet `@deessejs/errors` n'a pas de consumer users-spécifiques connu. La migration vers la nouvelle API se fait par guide dans le CHANGELOG et la doc — search-and-replace manuel, validation Standard Schema à choisir librement par le consumer. Si la friction s'avère trop forte sur des cas réels, un codemod pourra être ajouté dans une release ultérieure, soit per-package (`@deessejs/errors-codemods`) soit org-wide (`@deessejs/codemods`) selon les besoins du moment.

Conséquence : PR 4 (codemod) de la section 5 est supprimé du plan d'implémentation.

### Q4 — Quand supprimer `ErrorFactory.schema` ?

**Tranchée :** En 1.4.0, en même temps que la nouvelle API.

Cohérent avec Q1. Étaler la cassure sur deux minors multiplierait les cycles de release sans bénéfice — le champ `schema` n'est de toute façon utilisé par personne. Étape unique : supprimer `schema` lors du même commit qui introduit la nouvelle API.

## 10. References

- [Issue #32](https://github.com/deessejs/errors/issues/32) — original proposal
- [Issue #33](https://github.com/deessejs/errors/issues/33) — `ErrorGroup`, depends on this RFC
- [Standard Schema spec](https://github.com/standard-schema/standard-schema)
- `packages/errors/src/error/types.ts` — current public types
- `packages/errors/src/error/error.ts` — current factory
- `packages/errors/tests/error.test.ts` — current test surface (template path only)
- `DESIGN.md` (root) — current design notes

## Changelog

| Date       | Author                           | Change                                |
| ---------- | -------------------------------- | ------------------------------------- |
| 2026-08-05 | martyy-code (via Claude session) | Initial draft, derived from issue #32 |
