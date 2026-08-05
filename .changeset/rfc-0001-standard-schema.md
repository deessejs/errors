---
'@deessejs/errors': minor
---

Add `StandardSchemaV1` runtime validation and message-as-function mode to `error()` (RFC 0001).

- New API: pass `fields: StandardSchemaV1` (Zod, Valibot, ArkType, etc.) and a function `message: (data) => string`. Args are validated at instantiation; invalid inputs throw `ArgsValidationError`.
- The function form receives the **parsed** (post-transform) data, so schemas that brand, coerce, or refine work as expected.
- New export `ArgsValidationError` with `source`, `vendor`, `issues`. Re-exported from `@deessejs/errors` so consumers can `instanceof`-check.
- `ErrorFactory.schema` has been removed. The duplication between `fields` and `schema` is gone.
- The legacy string-template form (`message: "Field {field}"`) keeps working in 1.x and emits a single deprecation warning per call site. Set `DEESSEJS_ERRORS_LEGACY_TEMPLATES=1` to silence. The legacy form will be removed in 2.0.0.

See [RFC 0001](https://github.com/deessejs/errors/blob/main/docs/internal/engineering/rfcs/0001-standard-schema-fields.md) for the full design discussion.
