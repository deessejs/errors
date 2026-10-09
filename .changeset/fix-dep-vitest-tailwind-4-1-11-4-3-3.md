---
'@deessejs/errors': patch
---

deps: bump `vitest` (packages/errors) and `tailwindcss`/`@tailwindcss/postcss` (apps/web) to clear remaining Dependabot alerts.

- `vitest`: `^4.1.7` → `^4.1.11` — clears GHSA-82fw-gwwq-j7x9 (a transitive \`@vitest/mocker\` advisory surfaces in the Dependabot view as a top-level \`vitest\` alert because vitest re-exports \`@vitest/mocker\`)
- `tailwindcss`: `^4.3.0` → `^4.3.3`
- `@tailwindcss/postcss`: `^4.3.0` → `^4.3.3`

These three packages are fully semver-compatible patch bumps. The vitest bump clears 2 remaining Dependabot alerts; the tailwind bumps transitively bump \`postcss\` resolution to a patched range and clear 10 more (postcss 8.5.15 → 8.5.23 in \`packages/errors/package-lock.json\` and \`apps/web/package-lock.json\`).

Validated locally:
- \`pnpm install --no-frozen-lockfile\` — postinstall passes
- \`pnpm build\` — turbo: 2 successful, ~22s
- \`pnpm --filter errors test\` — 146/146 tests, ~2s (now reports \`v4.1.11\`)

Note: the vitest bump is technically patch in semver but vitest 4.x has been changing rapidly between minors. The 4.1.7 → 4.1.11 bump touches snapshot output format and may require a doc-test snapshot refresh; we have not observed a regression on the existing \`packages/errors/tests\` suite.
