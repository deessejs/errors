# Complete Package Template

A TypeScript monorepo template using pnpm workspaces and Turborepo.

## Structure

```
├── apps/
│   └── web/          # Next.js documentation site
├── packages/
│   └── example/      # Example TypeScript package
├── turbo.json        # Turborepo pipeline configuration
├── pnpm-workspace.yaml
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+

### Installation

```bash
pnpm install
```

## Available Scripts

### Workspace (root)

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |

### Package: example

```bash
pnpm --filter example build         # Build the package
pnpm --filter example test          # Run tests (watch mode)
pnpm --filter example test:run      # Run tests (single run)
pnpm --filter example type-check    # TypeScript type checking
pnpm --filter example lint           # Run ESLint
```

### App: web

```bash
pnpm --filter web dev      # Start development server
pnpm --filter web build   # Build for production
pnpm --filter web lint     # Run ESLint
```

## CI/CD

Each package has its own GitHub Actions workflows in `.github/workflows/`:

| Workflow | Description |
|----------|-------------|
| Lint | Runs ESLint |
| Type Check | Runs TypeScript type checking |
| Tests | Runs Vitest |
| Build | Builds the package/app |

## Tech Stack

- **Package Manager**: pnpm
- **Build Tool**: Turborepo
- **Language**: TypeScript
- **Testing**: Vitest
- **Linting**: ESLint
- **App Framework**: Next.js (React)