---
name: fumadocs-components
description: Complete list of Fumadocs UI components with usage examples
type: reference
---

# Fumadocs UI Components Reference

## MDX Components (default, included)

### Cards
```mdx
<Cards>
  <Card title="Title" href="/path">Description</Card>
  <Card icon={<Icon />} title="With Icon" href="/">Desc</Card>
  <Card title="href is optional">Content here</Card>
</Cards>
```

### Callouts
```mdx
<Callout>Default info</Callout>
<Callout title="Warning" type="warn">Content</Callout>
<Callout title="Error" type="error">Content</Callout>
<Callout title="Success" type="success">Content</Callout>
<Callout title="Idea" type="idea">Content</Callout>
```

### Steps (remark plugin)
```mdx
import { Step, Steps } from 'fumadocs-ui/components/steps';

<Steps>
  <Step>### Installation</Step>
  <Step>### Configuration</Step>
  <Step>### Deploy</Step>
</Steps>
```
Or via markdown: `### Installation [step]`

## Additional Components (install with CLI)

### Tabs
```mdx
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

<Tabs items={['npm', 'pnpm', 'yarn']}>
  <Tab value="npm">npm install</Tab>
  <Tab value="pnpm">pnpm add</Tab>
  <Tab value="yarn">yarn add</Tab>
</Tabs>

// Shared value across pages
<Tabs groupId="pkg-manager" items={['npm', 'pnpm']} persist>
  <Tab value="npm">npm install</Tab>
  <Tab value="pnpm">pnpm add</Tab>
</Tabs>
```

### Accordion
```mdx
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';

<Accordions type="single">
  <Accordion title="Question 1">Answer 1</Accordion>
  <Accordion title="Question 2">Answer 2</Accordion>
</Accordions>
```

### Files (file tree)
```mdx
import { File, Folder, Files } from 'fumadocs-ui/components/files';

<Files>
  <Folder name="src" defaultOpen>
    <File name="index.ts" />
    <File name="app.ts" />
  </Folder>
  <File name="package.json" />
</Files>
```

### TypeTable
```mdx
import { TypeTable } from 'fumadocs-ui/components/type-table';

<TypeTable
  type={{
    fieldName: {
      description: 'What this field does',
      type: 'string',
      default: 'value',
    },
  }}
/>
```

### ImageZoom
```tsx
// In components/mdx.tsx
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';

return {
  ...defaultComponents,
  img: (props) => <ImageZoom {...(props as any)} />,
};
```

### Banner (root layout)
```tsx
import { Banner } from 'fumadocs-ui/components/banner';

<Banner>Announcement here</Banner>
<Banner variant="rainbow">Colorful banner</Banner>
<Banner id="dismissable">Dismissible banner</Banner>
```

## Code Blocks Features

### Line Numbers
````md
```ts lineNumbers
const a = 'Hello';
console.log(a);
```
````

### Shiki Transformers
````md
```tsx
// [!code highlight]  - highlight line
// [!code word:word] - highlight word
// [!code --]        - red (removal)
// [!code ++]        - green (addition)
// [!code focus]     - focus line
```

```ts twoslash  - TypeScript type hover
```
````

### Tab Groups (built-in)
````md
```ts tab="npm"
npm install package
```

```ts tab="pnpm"
pnpm add package
```
````

## Twoslash Setup

```bash
npm install fumadocs-twoslash twoslash
```

```ts
// next.config.mjs
{
  serverExternalPackages: ['typescript', 'twoslash'],
}

// source.config.ts
import { transformerTwoslash } from 'fumadocs-twoslash';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      langs: ['js', 'jsx', 'ts', 'tsx'],
      transformers: [...rehypeCodeDefaultOptions.transformers, transformerTwoslash()],
    },
  },
});

// Tailwind v4
@import 'fumadocs-twoslash/twoslash.css';

// components/mdx.tsx
import * as Twoslash from 'fumadocs-twoslash/ui';
return { ...defaultComponents, ...Twoslash };
```

### Twoslash Annotations
- `// ^?` - hover type
- `// @ts-err` - expected error
- comments show inline

## Frontmatter

```yaml
---
title: Page Title
description: SEO description
icon: HomeIcon  # Lucide icon name
---
```

## MDX Features

- Auto links (internal/external)
- Anchor headings
- Include other files: `<include src="./snippet.md" />`
- NPM commands: ` ```npm install ``` `
- Mermaid diagrams (via plugin)