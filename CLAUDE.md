# CLAUDE.md

This file provides guidance to Claude (claude.ai) about working within this codebase.

## Project Purpose

This is a **TypeScript package template**. Use this as a starting point when creating new TypeScript packages.

### Working with this Template

There are two ways to work with this project:

1. **Developing the template itself**: You are working directly on this repository to improve or maintain it.

2. **Using the template for a new project**: You have cloned this template to start a new project. If you encounter a bug, have an idea for a new feature, or notice something that should be fixed in the template, **create an issue on the template repository** (https://github.com/nesalia-inc/complete-package-template/issues) so the template can be improved for everyone. Use the issue templates located in `.github/ISSUE_TEMPLATE/` when creating issues.

## Communication

- **Always communicate in English.** All explanations, comments, and documentation must be in English.

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
