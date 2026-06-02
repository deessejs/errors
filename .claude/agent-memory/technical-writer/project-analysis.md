# @deessejs/errors Project Analysis

## Project Overview

**@deessejs/errors** is a TypeScript error handling library inspired by Python's exception system. It provides exception chaining, hierarchical inheritance, and rich error semantics through a function-based API.

## Repository Structure

```
@deessejs/errors/ (pnpm monorepo)
├── packages/
│   └── errors/                    # Core library package
│       ├── src/
│       │   ├── index.ts            # Public API exports
│       │   ├── causes/             # Cause chain traversal
│       │   ├── error/             # Error factory (capture.ts, error.ts, format.ts, types.ts)
│       │   ├── is/                # Error type checking
│       │   └── raise/             # Error raising utilities
│       ├── tests/                 # Vitest test suite
│       ├── examples/              # Usage examples
│       ├── internal/              # Internal documentation
│       └── learnings/             # Learning notes
├── apps/
│   └── web/                       # Documentation website
│       ├── content/docs/          # MDX documentation files (index.mdx, test.mdx)
│       ├── src/app/               # Next.js 16 app router
│       ├── src/components/        # React components
│       └── src/lib/               # Utilities
├── docs/                          # Worktree directory (technical-writer agent)
└── temp/                          # Temporary files
```

## Key Technologies

| Component | Technology |
|-----------|------------|
| Core lib | TypeScript, Vitest, ESLint |
| Package manager | pnpm 10.30.3 |
| Build | Turbo |
| Versioning | Changesets |
| Docs site | Next.js 16, Fumadocs, Tailwind CSS, React 19 |

## Core Library API (public exports)

From `src/index.ts`:
- `error()` — Error factory function
- `raise` — Error raising function
- `is()` — Error type checking
- `causes()` — Cause chain traversal
- Types: `ErrorFactory`, `ErrorInstance`, `ErrorInstanceCore`

## Documentation Status

**Current state:** Minimal/starter documentation
- Only 2 placeholder MDX files in `apps/web/content/docs/`
- No real documentation content yet
- This worktree is dedicated to creating documentation

## Branching Strategy

- `main` ← `staging` ← `dev`
- All developers push directly to `main`
- Release engineer manages main → staging → main flow

## Notes

- CLAUDE.md states: "Always communicate in English" even though user communicates in French
- Uses `fresh` CLI for web searches (not standard search)
- Based on `nesalia-inc/errors` (production version)