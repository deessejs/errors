---
"@deessejs/errors": major
---

chore: tighten type, validation, and runtime contracts (audit Phases 1–6)

Addresses the type-side and runtime-side findings of the self-audit.

**Type contracts (Phases 1, 2, 6)**

- Activates typecheck on the test files. A new `tsconfig.test.json`
  extends the base config and includes `src` and `tests`. A new
  `type-check:test` npm script runs it.
- Separates `ErrorFactory` into `<TInput, TOutput>` so the input
  contract (what the caller passes) and the output contract (what
  `.fields` carries after validation) can differ when a schema
  transforms. Adds `InferStandardSchemaInput<S>` alongside the
  existing `InferStandardSchemaOutput<S>`.
- Adds `AnyErrorFactory = ErrorFactory<any, any>` for variance-
  tolerant lists. The `inherits` field, the `is()` discriminator,
  and the config unions all switch to this alias. Concrete
  factories with different `T`/`O` generics now compose
  correctly.
- Splits `is()` into two overloads. The factory overload returns
  `ErrorInstance<ExtractFactoryFields<T>>`; the native-constructor
  overload returns `Error`. The previous single signature falsely
  promised `.fields`, `.notes`, `.from()`, and `.addNote()` on
  native error instances.

**Validation (Phase 3)**

- The standard-schema branch now runs whenever a schema is supplied,
  regardless of whether the message is a function or a string.
  Before this change, a config like `{ fields: schema, message: 'literal' }`
  silently skipped validation. The factory name is used as the
  fallback error message; a function message still wins when present.
- `ArgsValidationError.source` now contains the factory's `name`
  instead of the long-form 'Async schemas are not supported…' text.
  The explanatory detail moves to `ArgsValidationError.issues`.
- The async-rejection path now attaches a no-op `.catch` to the
  validator's pending Promise so a late rejection cannot surface
  as an unhandledRejection.

**Runtime stability (Phase 4)**

- The factory object is now `Object.freeze`d at construction. The
  `name`, `inherits`, and `schema` fields cannot be reassigned
  after `error()` returns. This is the runtime enforcement for the
  audit's observation that `is(child, Parent)` and `is(child, Other)`
  must not flip just because someone mutated `Child.inherits`.

**Consumer smoke tests (Phase 5)**

- New `tests/consumer-from-dist.mjs` imports the published entry
  point (`dist/index.js`) and exercises the public API surface
  (error, raise, is, causes, ArgsValidationError). Run via
  `pnpm test:consumer` (which builds first). Catches regressions
  where source changes were not reflected in the build output.
- New `tests/inherits-immutable.test.ts` proves the Phase 4
  guarantee: late mutation of `factory.inherits` does not flip
  the classification of instances created before the mutation.
- New `tests/raise-typed.test.ts` pins the public contract of
  `raise()` and the `is()` discrimination.

**Cause semantics (Phase 4b) — breaking**

- The flat `causes: Error[]` field on `ErrorInstance` has been
  removed. The previous field conflated historical `.from()` calls
  with a true causal chain.
- `cause: Error | null` is now the only direct field. Each
  `.from()` call replaces the previous cause; the chain of
  previous causes is reachable through their own `.cause` links.
- `causes(error)` now walks the chain by following each cause's
  own `.cause` link, with cycle detection. The returned array
  is a new copy on each call.

**Validation (Phase 3) — breaking**

- A Standard Schema without a function-form `message` is no
  longer accepted by the public signature. The schema overload
  requires `message: (data) => string`. Consumers that relied
  on `{ fields: schema }` without `message` (where the legacy
  string-template form was used) must add a function message
  or a string message without a schema.

**Factory call signature — breaking**

- The previous `error<T>()` factory accepted `Partial<T>` so any
  field could be omitted at the call site. The new signature
  accepts `T` (or `TInput` when a schema is supplied). Callers
  that relied on `Partial<T>` must now either supply the full
  shape or annotate the field as optional in the schema.

**V8 stack capture (Phase 11)**

- `Error.captureStackTrace(target, exclude)` is now used on V8
  engines. The factory passes the closure as the exclude
  argument, so the captured trace contains only the call site
  of the factory invocation, not the factory's own frames.
  Non-V8 engines fall back to the previous string-based filter.

The schema-driven input-shape inference (Phase 2's second half)
remains to be addressed in a follow-up PR. The current public
signature requires a function-form `message` when a schema is
supplied; the type tests carry `@ts-expect-error` markers
pointing at the missing input inference.

