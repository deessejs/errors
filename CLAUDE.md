# CLAUDE.md

This file provides guidance to Claude (claude.ai) about working within this codebase.

## Project Purpose

This is a **TypeScript package template**. Use this as a starting point when creating new TypeScript packages.

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
