# CLAUDE.md

This file provides guidance to Claude (claude.ai) about working within this codebase.

## Project Purpose

This is **`@deessejs/errors`**, a TypeScript library that reimagines error handling in JavaScript/TypeScript — inspired by Python's error system. It provides exception chaining, hierarchical inheritance, and rich error semantics through a function-based API.

**This is NOT the template.** This is an actual package under active development, based on `nesalia-inc/errors`.

### Related Repositories

- **Template**: `nesalia-inc/complete-package-template` — Use this when creating new packages
- **This package**: `nesalia-inc/errors` — Production error handling library

## Communication

- **Always communicate in English.** All explanations, comments, and documentation must be in English.

## Branching Strategy

This project follows the branching model: `main` <- `staging` <- `dev`

- **dev**: Latest work-in-progress changes. Developers work here.
- **staging**: Contains work that has been reviewed and is ready for release testing.
- **main**: Production-ready code. Contains the official release history.

All developers push directly to `main`. The release engineer is responsible for managing the flow from `main` to `staging` and from `staging` to `main` (releases).

## Web Search

When performing web searches, you MUST use the `fresh` CLI tool. Never use other search methods.

### Fresh CLI Usage

```bash
# Search the web
fresh search "your search query"

# Fetch content from a specific URL
fresh fetch <url>
```

### Examples

```bash
# Search for React documentation
fresh search "React documentation 2026"

# Get content from a specific page
fresh fetch https://react.dev/docs
```

Available commands:
- `fresh auth` - Authentication commands
- `fresh search [options]` - Search the web using Exa.ai
- `fresh fetch [options] <url>` - Fetch and extract content from a URL
