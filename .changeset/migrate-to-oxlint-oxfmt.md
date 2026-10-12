---
"@deessejs/errors": minor
---

chore: migrate lint and format from ESLint and Prettier to oxlint and oxfmt

Replaces the ESLint flat configs in `packages/errors/eslint.config.js` and `apps/web/eslint.config.mjs` and the root `.prettierrc` with a single oxlint + oxfmt setup.

- Adds `oxlint@^1.87` and `oxfmt@^0.72` as root dev dependencies.
- Removes `eslint`, `@eslint/js`, `typescript-eslint`, and `eslint-config-next`.
- New root configs: `.oxlintrc.json` and `.oxfmtrc.json` (migrated from `.prettierrc`).
- Per-workspace configs at `packages/errors/.oxlintrc.json` and `apps/web/.oxlintrc.json`. A local override at `apps/web/tests/seo/fixtures/.oxlintrc.json` disables `eslint/no-await-in-loop` for the test fixture (the sequential awaits are intentional).
- Scripts: root `format` and `format:check` now use `oxfmt`; per-workspace `lint` and `lint:fix` use `oxlint`. `lint-staged` now invokes `oxfmt` and `oxlint --fix`.
- Husky pre-commit now runs `pnpm exec lint-staged && pnpm format:check && pnpm turbo type-check` so format drift is caught on commit, not in CI.

This is a developer-tooling change only. The published `@deessejs/errors` artifact, the public API, and the runtime behavior are unchanged.

Oxfmt reformatted the existing source files to match its style. The diff is large but mechanical: line endings and trailing commas are the main visible changes. Four source fixes were required by the migration:

- `packages/errors/tests/edge-cases.test.ts`: replaced an inline `import('@standard-schema/spec').StandardSchemaV1` annotation with a proper type import (oxlint `typescript/consistent-type-imports`).
- `apps/web/src/app/sitemap.ts`: merged two duplicate imports from `@/lib/source` (oxlint `import/no-duplicates`).
- `apps/web/proxy.ts`: split `NextRequest` (type) from `NextResponse` (value) to mark the type-only import (oxlint `typescript/consistent-type-imports`).
- `apps/web/tests/seo/fixtures/stubs/fumadocs.ts`: left as-is; the `await in loop` is intentional and the rule is disabled in the local override.

Validated locally:
- `pnpm lint` — 0 errors, 4 warnings (non-blocking)
- `pnpm format:check` — clean
- `pnpm type-check` — clean, both packages
- `pnpm test` — all tests pass
- `pnpm build` — clean, both packages
