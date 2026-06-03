---
name: project-tech-stack
description: Tech stack of apps/web
type: reference
---

## apps/web Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.2.6 |
| UI Library | React 19.2.6 |
| Styling | Tailwind CSS v4.3.0 |
| CSS Processor | @tailwindcss/postcss 4.3.0 |
| Documentation | FumaDocs 16.9.1 (fumadocs-core, fumadocs-mdx, fumadocs-ui) |
| Icons | lucide-react 1.16.0 |
| Utility | tailwind-merge 3.6.0 |

## Key Files

- `src/app/global.css` — Global styles + Tailwind imports
- `src/app/layout.tsx` — Root layout with Inter font + RootProvider
- `src/lib/source.ts` — FumaDocs content loader
- `src/lib/shared.ts` — App config (name, routes, GitHub)
- `src/components/mdx.tsx` — MDX component factory

## Package Manager

pnpm (workspace monorepo)