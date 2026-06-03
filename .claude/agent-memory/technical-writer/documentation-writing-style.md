---
name: documentation-writing-style
description: Writing style analysis from better-auth, Next.js, and Fumadocs
type: reference
---

# Documentation Writing Style Guide

Analyzed from better-auth.com, nextjs.org/docs, and fumadocs.dev

## Recurring Patterns

### Structure
1. **Intro** — 1-2 contextual sentences before diving in
2. **Steps** — Numbered or bulleted sequences
3. **Code blocks** — Always with filename header or context
4. **Callouts** — Tips, warnings, "Good to know"
5. **Navigation** — "On this page" sidebar or related links at bottom
6. **See Also** — Cards at end of page for cross-linking

### Code Blocks
- Include filename in header or comment above
- Show language/format
- Display in tabs when multiple options (npm/pnpm/yarn)
- Use transformers for highlighting (twoslash for types)

### Callouts
- `info` (default) — general info
- `warn`/`warning` — caution
- `error` — danger
- `success` — positive outcome
- `idea` — tip or enhancement

### Prose Style
- Short, action-oriented sentences ("Let's start by...")
- Explain WHY before showing HOW
- Contextual paragraphs between code blocks
- Tables for options/configuration
- Numbered steps for procedures

### Navigation
- "On this page" in-page TOC (Fumadocs auto-generates)
- Cards at bottom for related pages
- Never bullet lists for related links

## Template for New Pages

```mdx
---
title: Page Title
description: One-line SEO description
---

Intro paragraph explaining the concept in 1-2 sentences.

## First Section

Contextual prose...

```ts filename.ts
// code here
```

More explanatory text.

## Second Section

...

## See Also

<Cards>
  <Card title="Related Topic" href="/docs/related">
    Brief description.
  </Card>
</Cards>
```