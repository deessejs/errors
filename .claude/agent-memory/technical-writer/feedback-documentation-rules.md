---
name: documentation-rules
description: Rules for writing documentation in @deessejs/errors
type: feedback
---

# Documentation Writing Rules

## Rule 1: No h1 in MDX content
**Why:** The page title is set via frontmatter `title` property, not in content.
**How to apply:** Start content with h2 (`##`) or higher. Never use `#` headings.

## Rule 2: No description in content
**Why:** Description for SEO is set via frontmatter `description` property.
**How to apply:** Don't repeat the description in the content body.

## Rule 3: No code in titles
**Why:** Titles should be readable and descriptive without code.
**How to apply:** Write titles as concepts, not API names. Exception: if the concept IS the code (e.g., "The `error()` function"), but avoid raw code in titles.

## Rule 4: No code-only blocks
**Why:** Documentation should be educational guides, not reference dumps.
**How to apply:** Every code block must be preceded by explanatory paragraphs. Tell WHY, not just WHAT.

## Rule 5: Explain, don't just show
**Why:** Readers need context to understand when and why to use a feature.
**How to apply:**
- Lead with prose explaining the concept
- Include paragraphs between code blocks
- Explain the output/what happens
- Add "why would you use this?" context

## Rule 6: Every file needs a meaningful filename
**Why:** URLs should be descriptive and SEO-friendly.
**How to apply:** Use kebab-case descriptive names like `error-factory.mdx`, not `api.mdx` or `guide1.mdx`.

## Rule 7: See Also section uses Cards, not lists
**Why:** Cards are the Fumadocs standard for cross-linking related pages.
**How to apply:**
```mdx
<Cards>
  <Card title="Related Topic" href="/docs/related-topic">
    Brief description of why this is related.
  </Card>
</Cards>
```
Never use markdown bullet lists for related links.