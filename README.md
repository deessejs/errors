<p align="center">  
  <h1 align="center">@deessejs/errors</h1>  
</p>

<p align="center">  
  <strong>Lightweight, type-safe error handling for TypeScript — Python-style.</strong> Function-based API, exception chaining, hierarchical inheritance, and rich error semantics. ESM-only, designed for first-class interoperability with @deessejs/fp's Result and Try.  
</p>

<p align="center">  
  <a href="https://github.com/deessejs/errors/blob/main/LICENSE">  
 <img src="https://img.shields.io/github/license/deessejs/errors" alt="License">  
  </a>  
  <a href="https://github.com/deessejs/errors/actions/workflows/ci.yml">  
 <img src="https://img.shields.io/github/actions/workflow/status/deessejs/errors/ci.yml?label=CI" alt="CI">  
  </a>  
  <a href="https://github.com/deessejs/errors/stargazers">  
 <img src="https://img.shields.io/github/stars/deessejs/errors?style=social" alt="Stars">  
  </a>  
  <a href="https://www.npmjs.com/package/@deessejs/errors">  
 <img src="https://img.shields.io/npm/v/@deessejs/errors?color=brightgreen" alt="npm">  
  </a>  
</p>

<p align="center">  
  <a href="https://errors.deessejs.com">  
 <img src="https://img.shields.io/badge/docs-errors.deessejs.com-blue" alt="Documentation">  
  </a>  
</p>

> **Sibling projects:** [@deessejs/fp](https://github.com/deessejs/fp) provides `Result` and `Try` types that integrate natively with [@deessejs/errors](https://github.com/deessejs/errors) error factories. Install them together to get a complete error-handling story without glue code.

---

## What is included

| Layer | What you get | Why it matters |
| **`error()`** | Define error factories with name, message templates, fields, and inheritance. ||Python-style error definitions without classes. |
| **`.from()` chaining** | Cause chain via `.from()` + `causes()` traversal. ||Link errors together while preserving the full chain context. |
| **Single or multiple inheritance** | `inherits:` accepts a factory or an array. ||Organize error hierarchies that match your domain. |
| **`is()` type checking** | Runtime and type-safe classifier with inheritance support. ||Discriminate errors without brittle `instanceof`. |
| **`.addNote()`** | Attach runtime context to error instances. ||Python 3.11-style notes (PEP 678) for trail-of-breadcrumbs debugging. |
| **Message templates** | `{field}` placeholders with `:upper`, `:lower`, `:json` modifiers. ||Readable messages composed from structured fields at construction time. |
| **Standard Schema fields** | Accepts Zod / Valibot / ArkType schemas. ||Validated structured data on every error instance, no hand-rolled guards. |
| **`raise()`** | Idiomatic throw helper. ||Type-narrowed (`never`) `raise(err)` for control-flow readability. |
| **[@deessejs/fp](https://github.com/deessejs/fp) integration** | `Result`/`Try` accept `ErrorInstance` directly. ||Type-safe error pipelines end-to-end, no string-error footguns. |

## Why this library

- **Simple by default.** No class hierarchies to manage, no decorators under reflection. Just factory functions and chained calls.
- **ESM-only.** Modern packaging, no CJS shim, no `module`/`main` duplication.
- **Minimal runtime.** The only runtime dependency is `@standard-schema/spec`.
- **TypeScript first-class.** Strict types, no `any` leakages, full inference. JSDoc on every public symbol.
- **Real testing.** Vitest with type-level and runtime tests, including cause-chain traversal.

## Quick start

### Prerequisites

- Node.js 22.x for consumers (the package emits ESM)
- pnpm 10+ for development (`corepack enable` if not installed)
- TypeScript 5.x for consumers (`dist/*.d.ts` is published)

### Install

```bash
npm install @deessejs/errors
```

[@deessejs/fp](https://github.com/deessejs/fp) is optional - install it if you want to compose `Result`/`Try` types around `ErrorInstance`.

### Usage

```{type=typescript}

The example below uses several typed errors chained together.

### Engine compatibility

| Runtime | Minimum version |
|---|
| Node.js | 22.0.0 |
| pnpm | 10 (for development) |
| TypeScript | 5.x |

ESM-only. Consumers using a CJS resolver need to use dynamic `import()` or migrate to ESM.

## Available commands

### Package: `@deessejs/errors`

| Command | What it does |
|---|
| `pnpm --filter @deessejs/errors build` | Build `dist/` (`tsc -p tsconfig.build.json`) |
| `pnpm --filter @deessejs/errors test` | Run vitest in watch mode |
| `pnpm --filter @deessejs/errors test:run` | Run vitest once |
| `pnpm --filter @deessejs/errors type-check` | `tsc --noEmit` |
| `pnpm --filter @deessejs/errors lint` | Run ESLint |

### Root (monorepo)

| Command | What it does |
|---|
| `pnpm build` | Build via Turborepo |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint every workspace |
| `pnpm type-check` | Type-check every workspace |
| `pnpm format` | Format with Prettier |

### App: `web` (documentation site)

| Command | What it does |
|---|
| `pnpm --filter web dev` | Start the docs site in dev mode |
| `pnpm --filter web build` | Build the docs site for production |

## Compatibility

### Runtime dependency

| Package | Required | Notes |
|---|
| `@standard-schema/spec` | Yes, `>=1.0.0` | The interface used by `fields`. Schema implementations (Zod, Valibot, ArkType) are passed by the caller. |

### Peer dependencies

| Package | Required | Notes |
|---|
| [@deessejs/fp](https://github.com/deessejs/fp) | Optional, peer `>=1.0.0` | Recommended if you want `Result`/`Try` types around `ErrorInstance`. Not required for using `@deessejs/errors` alone. |

### Engines

| Field | Value |
|---|
| `engines.node` | `>=22.14.0` |
| `packageManager` | `pnpm@10.34.5` |

## Project structure

```

.
+-- packages/
+-- apps/
+-- docs/
+-- pnpm-workspace.yaml
+-- turbo.json# Turborepo pipelines
+-- .changeset/# Changesets for versioning
+-- README.md

```

## Publishing

Releases are fully automated via Changesets + npm Trusted Publishing (OIDC). No long-lived `NPM_TOKEN` is required.

| What | How |
|---|
| Bump version | Add a `.changeset/<topic>.md` file with semver and description on a PR to `staging` |
| Open the release PR | Cherry-pick selected commits from `staging` into `release/vX.Y.Z` and PR to `main` |
| Publish | Merge to `main` - `release.yml` detects changesets and publishes via Trusted Publishing to npm with provenance attestation |
| Hotfix | Branch from `main` as `release/hotfix-<slug>`, open PR directly to `main` with `[hotfix]` label. Same workflow fires. |
| Rollback | Use `pnpm changeset version` then revert the merge. npm deprecations: `pnpm npm deprecate @deessejs/errors` <rev>` <msg>` |

For the full release runbook, see [`docs/internal/engineering/process/releasing-a-new-version.md`](docs/internal/engineering/process/releasing-a-new-version.md).

## Architecture notes

- **ESM-only.** The package exports ES modules. Consumers using legacy CJS resolvers must use dynamic `import()`.
- **Strict types.** `error()` returns a typed factory; `is()` narrows. No `any` leakages.
- **Composition over inheritance.** All error primitives compose via instance methods (`.from()`, `.addNote()`, `inherits`). No class hierarchy on the consumer side.
- **Zero decorators.** Pure factory functions. The library is straightforward to read in DevTools and `node --prof`.
- **Smoke-tested before publish.** The release workflow imports the built artifact and verifies key exports are present. A broken build fails the publish step before reaching npm.
- **Symmetric interop with [@deessejs/fp](https://github.com/deessejs/fp).** `Result` constructors accept `ErrorInstance` so you never have to coerce a typed error to a string.

## Contributing

Open an issue to discuss larger changes. For typos, broken links, and small fixes, PRs are welcome.

Before submitting a PR:

1. Run `pnpm --filter @deessejs/errors test:run` and `pnpm --filter @deessejs/errors lint`.
2. Add a `.changeset/<topic>.md` if the change is user-facing (patch / minor / major).
3. Update `docs/internal/product/README.md` if the API surface changes.


## Acknowledgements

The README layout and monorepo tooling for this project are based on the [deessejs/package-template](https://github.com/deessejs/package-template). The shipped README borrows its structure from the [deessejs/fp README](https://github.com/deessejs/fp), adapted for the @deessejs/errors API surface.


## License

[MIT](./LICENSE). See the LICENSE file for details.

## Support

- Issues: [github.com/deessejs/errors/issues](https://github.com/deessejs/errors/issues)
- Discussions: [github.com/deessejs/errors/discussions](https://github.com/deessejs/errors/discussions)
- Email: [support@deessejs.com](mailto:support@deessejs.com)
- Documentation: [errors.deessejs.com](https://errors.deessejs.com)
```
