# @deessejs/errors

[![npm](https://img.shields.io/npm/v/@deessejs/errors)](https://www.npmjs.com/package/@deessejs/errors)
[![TypeScript](https://img.shields.io/badge/typescript-%E2%9A%99%EF%B8%8F-blue)](https://www.typescriptlang.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/deessejs/errors/ci.yml?label=CI)](https://github.com/deessejs/errors/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Lightweight, type-safe error handling for TypeScript — Python-style. Function-based API, exception chaining, hierarchical inheritance, and rich error semantics. ESM-only, designed for first-class interoperability with [`@deessejs/fp`](https://github.com/deessejs/fp)'s Result and Try.

> **Sibling projects:** [`@deessejs/fp`](https://github.com/deessejs/fp) provides `Result` and `Try` types that integrate natively with [`@deessejs/errors`](https://github.com/deessejs/errors) error factories. Install them together to get a complete error-handling story without glue code.

---

## What is included

| Layer                                                        | What you get                                                                  | Why it matters                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **`error()`**                                                | Define error factories with name, message templates, fields, and inheritance. | Python-style error definitions without classes.                           |
| **`.from()` chaining**                                       | Cause chain via `.from()` + `causes()` traversal.                             | Link errors together while preserving the full chain context.             |
| **Single or multiple inheritance**                           | `inherits:` accepts a factory or an array.                                    | Organize error hierarchies that match your domain.                        |
| **`is()` type checking**                                     | Runtime and type-safe classifier with inheritance support.                    | Discriminate errors without brittle `instanceof`.                         |
| **`.addNote()`**                                             | Attach runtime context to error instances.                                    | Python 3.11-style notes (PEP 678) for trail-of-breadcrumbs debugging.     |
| **Message templates**                                        | `{field}` placeholders with `:upper`, `:lower`, `:json` modifiers.            | Readable messages composed from structured fields at construction time.   |
| **Standard Schema fields**                                   | Accepts Zod / Valibot / ArkType schemas.                                      | Validated structured data on every error instance, no hand-rolled guards. |
| **`raise()`**                                                | Idiomatic throw helper.                                                       | Type-narrowed (`never`) `raise(err)` for control-flow readability.        |
| [`@deessejs/fp`](https://github.com/deessejs/fp) integration | `Result`/`Try` accept `ErrorInstance` directly.                               | Type-safe error pipelines end-to-end, no string-error footguns.           |

## Install

```bash
npm install @deessejs/errors
```

[`@deessejs/fp`](https://github.com/deessejs/fp) is optional - install it if you want to compose `Result`/`Try` types around `ErrorInstance`.

## Usage

```typescript
import { error, raise, is, causes } from '@deessejs/errors';

// Define an error factory with a templated message
const ValidationError = error({
  name: 'ValidationError',
  message: 'Field "{field}" is invalid: {reason}',
});

// Construct a typed error
const err = ValidationError({ field: 'email', reason: 'invalid format' });
// err.message === 'Field "email" is invalid: invalid format'

// Chain a cause
const cause = error({ name: 'NetworkError' })();
err.from(cause);

// Throw it
raise(err);

// Later, type-check and walk the chain
is(err, ValidationError); // true
causes(err); // [cause]
```

## Why this library

- **Simple by default.** No class hierarchies, no decorators under reflection.
- **ESM-only.** Modern packaging, no CJS shim, no `module`/`main` duplication.
- **Minimal runtime.** The only runtime dependency is `@standard-schema/spec`.
- **TypeScript first-class.** Strict types, no `any` leakages, full inference. JSDoc on every public symbol.
- **Real testing.** Vitest with type-level and runtime tests, including cause-chain traversal.

## Engine compatibility

| Runtime    | Required             |
| ---------- | -------------------- |
| Node.js    | `>=22.14.0`          |
| pnpm       | `10` for development |
| TypeScript | `5.x`                |

ESM-only. Consumers using a CJS resolver need to use dynamic `import()` or migrate to ESM.

## Available commands

| Command           | What it does                                 |
| ----------------- | -------------------------------------------- |
| `pnpm build`      | Build `dist/` (`tsc -p tsconfig.build.json`) |
| `pnpm test`       | Run vitest in watch mode                     |
| `pnpm test:run`   | Run vitest once                              |
| `pnpm type-check` | `tsc --noEmit`                               |
| `pnpm lint`       | Run ESLint                                   |

## Contributing

Open an issue to discuss larger changes. For typos, broken links, and small fixes, PRs are welcome.

Before submitting a PR:

1. Run `pnpm test:run` and `pnpm lint`.
2. Add a `.changeset/<topic>.md` if the change is user-facing (patch / minor / major).
3. Update `docs/internal/product/README.md` if the API surface changes.

## License

[MIT](./LICENSE). See the LICENSE file for details.

## Acknowledgements

The README layout is based on the [deessejs/package-template](https://github.com/deessejs/package-template) and borrows its structure from the [deessejs/fp README](https://github.com/deessejs/fp), adapted for the `@deessejs/errors` API surface.
