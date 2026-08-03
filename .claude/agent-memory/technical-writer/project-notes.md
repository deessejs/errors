---
name: project-notes
description: Notes from first documentation PR
type: project
---

# Documentation Project Notes

## PR: First Draft (PR #11)
Branch: `docs/first-draft` → `main`
Status: Ready for review

## Key Learnings

### Code Block Titles
- Syntax: ` ```ts title="filename.ts" ` (NOT ` ```ts filename.ts `)
- The title attribute goes AFTER the language, not as part of it

### Vercel Config
- Root directory: `/` (not `apps/web`)
- Build command: `pnpm --filter web build`
- Output directory: `apps/web/.next`
- Added `vercel.json` at repo root

### Theme
- File: `apps/web/src/app/global.css`
- Change: `fumadocs-ui/css/neutral.css` → `fumadocs-ui/css/black.css`

### Site Config
- File: `apps/web/src/lib/shared.ts`
- `appName`: '@deessejs/errors'
- `gitConfig`: user='nesalia-inc', repo='errors'

## Files Modified
- 13 MDX docs pages in `apps/web/content/docs/`
- `apps/web/content/docs/meta.json`
- `apps/web/src/lib/shared.ts`
- `apps/web/src/app/global.css`
- `vercel.json` (new)