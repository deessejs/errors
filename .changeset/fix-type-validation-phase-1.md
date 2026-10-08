---
"@deessejs/errors": minor
---

chore: tighten type contracts (audit Phase 1 + parts of 2/4/6)

Addresses the type-side findings of the self-audit:

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
- Adds a `tests/raise-typed.test.ts` consumer-side smoke test
  that pins the public contract of `raise()` (throws preserve
  factory field types) and the `is()` discrimination.

The package's runtime behavior, public API surface, and
documentation are unchanged. Phase 2 (schema-driven I/O inference
on the public `error()` signature), Phase 3 (validation decoupled
from message form, async rejection), and Phase 4 (cause semantics
and immutable parents) remain to be addressed in follow-up PRs
and are tracked by `@ts-expect-error` markers in the type tests.
