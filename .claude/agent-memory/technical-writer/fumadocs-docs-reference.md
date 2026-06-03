---
name: fumadocs-docs-reference
description: Fumadocs v16 documentation at fumadocs.dev - use fresh to fetch
type: reference
---

# Fumadocs Documentation Reference

**URL:** https://www.fumadocs.dev/

**Access:** Use `fresh fetch <url>` to retrieve content

## Key areas to explore

When documenting @deessejs/errors with Fumadocs:

1. **MDX Collections** — `source.config.ts` uses `defineDocs` and `pageSchema`
   - Frontmatter schema: title, description
   - Post-processing options

2. **Layout Components** — How `DocsLayout`, `DocsPage` work
   - `getMDXComponents()` for custom MDX components
   - Relative linking between docs

3. **UI Components** — Available MDX components
   - `<Cards>`, `<Card>` — Navigation
   - `<Tabs>`, `<Tab>` — Code examples
   - `<Steps>` — Tutorials

4. **Configuration** — `defineConfig` options
   - MDX options
   - Source plugins (lucide-icons shown in source.ts)

## Relevant for

- Creating documentation structure in `content/docs/`
- Custom MDX component development
- Navigation/tree configuration