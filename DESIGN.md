# Design System — @deessejs/errors Documentation

## Overview

Design system and visual guidelines for the `@deessejs/errors` documentation website. Inspired by [Flue Framework](https://flueframework.com) — minimal, developer-focused, blueprint aesthetic.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework |
| Tailwind CSS | v4 | Styling |
| Geist | (Vercel) | Typography (future) |
| shadcn/ui | TBD | Component library |
| FumaDocs | 16.x | Documentation framework |
| lucide-react | 1.x | Icons |

## Typography

**Font**: Geist (via `next/font/geist` or Vercel CDN)

```typescript
import { Geist } from 'next/font/google';

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
});
```

**Scale**:
- Headings: `font-bold tracking-tight`
- Body: `text-lg` for main content, `text-base` for details
- Code: JetBrains Mono (monospace)
- Labels: `font-medium text-gray-500 uppercase tracking-wider`

## Color Palette

Using Tailwind's default palette with these semantic usages:

| Token | Usage |
|-------|-------|
| `gray-950` | Primary text (`#030304`) |
| `gray-500` | Secondary text / muted |
| `gray-300` | Borders |
| `gray-200` | Dividers, subtle backgrounds |
| `white` | Cards, elevated surfaces |
| `#f8f9fb` | Off-white body background |
| `blue-500` / `blue-600` | Accent color (links, highlights) |

### Dark Mode

Support both light and dark modes using Tailwind's `dark:` variants.

## Visual Language

### Border Radius

**No rounded corners** — `rounded-none` throughout.

Exception: `<pre>` code blocks use `rounded-none` with sharp corners.

### Blueprint Grid Background

SVG-based grid pattern for hero sections:

```html
<svg viewBox="0 0 400 500" fill="none">
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#dddddd" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)"/>
</svg>
```

### Cards

```html
<!-- Standard card -->
<div class="border border-gray-300 bg-white">
  <!-- Content -->
</div>

<!-- Feature card with hover state -->
<a class="border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50">
  <!-- Content -->
</a>
```

### Buttons

**Primary** (dark):
```html
<button class="bg-gray-950 hover:bg-gray-800 text-white">
  Action
</button>
```

**Secondary** (outlined):
```html
<button class="border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50">
  Action
</button>
```

### Floating Squares (Hero Decoration)

Blueprint-style floating squares for visual interest:

```tsx
const floatingSquares = [
  { x: 300, y: 120, opacity: 1.0, delay: 0.7, duration: 4 },
  { x: 220, y: 60,  opacity: 0.8, delay: 0.3, duration: 4 },
  { x: 160, y: 160, opacity: 0.5, delay: 0.0, duration: 4 },
];
```

### Code Blocks

Sharp corners, syntax highlighting, filename tabs:

```html
<div class="border border-gray-300 rounded-none overflow-hidden shadow-lg bg-white/70 backdrop-blur-sm">
  <div class="border-b border-gray-200 bg-gray-50/60 px-4 py-2.5">
    <span class="font-mono text-[13px] text-gray-600">filename.ts</span>
  </div>
  <pre class="p-6 text-sm leading-relaxed overflow-x-auto">...</pre>
</div>
```

### Navigation

```html
<nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
  <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
    <!-- Logo + Links -->
    <!-- Social icons -->
  </div>
</nav>
```

## Layout Structure

```
apps/web/src/
├── app/
│   ├── layout.tsx              # Root layout (Geist font, RootProvider)
│   ├── global.css              # Tailwind imports + custom styles
│   ├── page.tsx                # Homepage
│   └── docs/
│       ├── layout.tsx          # DocsLayout with sidebar
│       └── [[...slug]]/         # Dynamic doc pages
├── components/
│   ├── mdx.tsx                 # MDX component factory
│   └── ui/                     # shadcn/ui components (future)
└── lib/
    ├── source.ts              # FumaDocs content loader
    └── shared.ts              # App config
```

### Max Width

- Content: `max-w-6xl mx-auto px-6` (1152px)
- Hero: `max-w-6xl mx-auto px-6`
- Docs: handled by FumaDocs layouts

### Spacing Scale

Use Tailwind's 4px incremental scale consistently:
- `pt-20 lg:pt-28` for hero sections
- `py-24` for section padding
- `gap-12 lg:gap-20` for large grids

## Responsive Breakpoints

| Breakpoint | Target |
|------------|--------|
| `sm` (640px) | Mobile landscape |
| `md` (768px) | Tablets |
| `lg` (1024px) | Laptops |
| `xl` (1280px) | Desktops |

## shadcn/ui Integration

```bash
npx shadcn@latest init
```

### Core Components to Implement

| Component | Purpose | Status |
|-----------|---------|--------|
| Button | Primary/secondary actions | TBD |
| Card | Feature highlights, deployment options | TBD |
| Callout | Notes, warnings, tips, errors | TBD |
| Code | Syntax highlighted code blocks | TBD |
| Tabs | API reference navigation | TBD |
| Table | Parameter documentation | TBD |
| Badge | Labels, version tags | TBD |

### shadcn/ui Configuration

Update `components.json` to match our design tokens:

```json
{
  "rounded": "none",
  "cssVariables": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/global.css"
  }
}
```

## Design Principles

1. **Developer-First**: Clarity over decoration. Code examples are the hero.
2. **Minimal**: Ample whitespace, clean layouts, `rounded-none` everywhere.
3. **Blueprint Aesthetic**: Subtle grid backgrounds, floating squares, schematic vibes.
4. **Dark Mode Ready**: All components work in both light and dark.
5. **Consistent Spacing**: 4px increments via Tailwind scale.

## Future Enhancements

- [ ] Integrate shadcn/ui with `rounded-none`
- [ ] Implement Geist font
- [ ] Add blueprint grid SVG components
- [ ] Create floating squares animation
- [ ] Custom callout components for error types
- [ ] Deploy section with platform cards
- [ ] Architecture diagram component

---

**Last updated**: 2026-06-02
**Inspiration**: [Flue Framework](https://flueframework.com)