# Contributing to @deessejs/errors

Thank you for your interest in contributing to this project!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/errors.git`
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Workflow

1. Make your changes
2. Ensure all tests pass: `pnpm test`
3. Run linting: `pnpm lint`
4. Run type checking: `pnpm turbo type-check`
5. Build the project: `pnpm build`
6. Commit your changes
7. Open a pull request

## Branching Strategy

This project follows `main` <- `staging` <- `dev` branching:

- `main`: Production-ready code (all developers push here)
- `staging`: Release candidate testing
- `dev`: Work-in-progress development

## Commit Messages

Use conventional commits:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: improve code structure`
- `test: add or update tests`
- `chore: maintenance tasks`

## Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons
- Run Prettier before committing: `pnpm format`

## Testing

Run tests before submitting a PR:

```bash
pnpm test          # Run all tests (watch mode)
pnpm test:run      # Run all tests once
pnpm turbo test    # Run tests across all packages
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all CI checks pass
4. Request review from maintainers

## Questions?

Open an issue or reach out to us at **support@nesalia.com**.