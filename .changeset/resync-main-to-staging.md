---
'@deessejs/errors': major
---

chore: resync `main` into `staging` (resolves the conflicts in #108)

This changeset exists to satisfy the CI lint (`pnpm changeset status --since=origin/staging`). The resync merge from `main` brings the following into `staging`:

- 18 changesets from main (already published in `@deessejs/errors@2.0.0` on the npm registry)
- `packages/errors/package.json` `scripts` section (main added `type-check:test`, `test:consumer`, `test:docs`; staging has migrated `lint` to `oxlint`; this resync combines both sets)
- 5 `apps/web/content/docs/*.mdx` files (api-reference, causes-function, error-factory, fields-schema, message-templates) — main version, which is the post-audit-refactor canonical version from PR #99
- `.github/workflows/ci.yml` (consolidation from PR #92)
- `.gitignore` (additional ignores)
- `.claude/agents/` and `.claude/agent-memory/` removals (from PR #98)
- `vercel.json` fix (from PR #100 — sets `outputDirectory: ".next"` since Vercel's Root Directory is `apps/web`)
- New tests in `packages/errors/tests/` from the WIP audit response (PR #99)
- `packages/errors/CHANGELOG.md` (new release entries)
- Documentation files in `apps/web/content/docs/`

The `version` field in `packages/errors/package.json` is bumped from `1.4.0` to `2.0.0` because main had already published 2.0.0 with the audit response changes; staging was behind. The `major` bump on this changeset reflects that fact for `pnpm changeset status --since=origin/staging` to validate the version change.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
