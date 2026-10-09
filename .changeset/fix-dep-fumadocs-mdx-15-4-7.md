---
'@deessejs/errors': patch
---

deps(apps/web): bump fumadocs-core, fumadocs-mdx, and fumadocs-ui to clear transitive `vite`/`esbuild`/`source-map-js`/`baseline-browser-mapping` vulnerabilities tracked by Dependabot.

- `fumadocs-core`: `16.9.1` → `16.17.1`
- `fumadocs-mdx`: `15.0.9` → `15.4.7`
- `fumadocs-ui`: `16.9.1` → `16.17.1`

`fumadocs-mdx@15.4.7` declares `fumadocs-core ^16.17.0` as a peer dependency, so the three are bumped together.

Note: this PR only affects the documentation site (`apps/web`). No code in `@deessejs/errors` changes. The patch bump on `@deessejs/errors` is required by the CI lint that enforces every PR to `staging` to include a Changeset entry; nothing new is published for the library itself.
