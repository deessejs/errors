---
'@deessejs/errors': patch
---

R8: harden the static and runtime contracts after the post-R7 audit.

- `is()` now rejects foreign objects that imitate the `FACTORY_SYMBOL`
  marker but lack the `ErrorInstance` shape (no `.from` or
  `.addNote`). The marker is still non-writable on real instances
  (via `Object.defineProperty`).
- `error()` runs a runtime guard (`isObjectFields`) on every schema
  output; schemas whose transformation returns `null`, a primitive,
  or an array now throw `ArgsValidationError` instead of silently
  coercing to `{}`. The `isObjectFields` predicate mirrors the
  type-level `IsObjectOutput` gate; the type-level gate remains
  advisory because TypeScript's function-arity flexibility prevents
  it from firing on every malformed schema at the call site.
- `ArgsValidationError.issues` is now typed as
  `ReadonlyArray<StandardSchemaV1.Issue>` (was `unknown[]`). The
  message is rendered from each issue's `.message` and `.path` so
  a circular issue no longer turns the validator failure into a
  `TypeError` from `JSON.stringify`.
- The `inherits` list is now a single frozen snapshot on the
  factory (no longer mutates the caller's array). The classification
  invariant is preserved across the caller's mutations on the
  shared list.
- `warnLegacy` is now scoped to the template form only (a string
  `message` with `{field}` placeholders). A plain string or a
  function-form `message` does not warn. The warning reads
  `process.env` only when `process` is defined, so the package
  remains browser-safe.
- `captureStack`'s V8 `captureStackTrace` exclude parameter is now
  typed `Function` (via the local `AnyFunction` alias) so the cast
  from the implementation signature is no longer needed.
