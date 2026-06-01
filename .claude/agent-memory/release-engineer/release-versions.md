---
name: release-versions
description: 5-version release plan for @deessejs/errors
type: project
---

# Release Versions — @deessejs/errors

## Release Plan

5 versions from v1.0.0 (MVP) to v2.0.0 (Advanced Context).

| Version | Focus | Key Features |
|---------|-------|--------------|
| v1.0.0 | Core Foundation | error(), raise(), is(), .from(), inherits, causes, message templates |
| v1.1.0 | Enhanced DX | .addNote(), type guards, predefined errors |
| v1.2.0 | Type Safety | Strict type inference, better generic constraints |
| v1.3.0 | Production Ready | formatError(), setOutputMode(), stripLibraryFrames() |
| v2.0.0 | Advanced Context | withContext(), async patterns |

## Current Status (2026-06-01)

- **Changesets**: Initialized
- **Initial Changeset**: v1-0-0-core-foundation.md created
- **CHANGELOG.md**: Format Keep a Changelog, [Unreleased] section ready

## v1.0.0 Scope

### Core API
- `error()` function with Standard Schema support
- `raise()` function + native throw
- `is()` function for type checking

### Inheritance
- Single inheritance via `inherits: ParentError`
- Multiple inheritance via `inherits: [A, B]`

### Chaining
- `.from()` method for exception chaining
- `causes()` function for chain traversal (most recent first)

### Properties
- All properties always defined: name, message, stack, fields, notes, cause, causes, context

### Message Formatting
- Template strings with `{field}` placeholders
- Standard Schema (Zod, Valibot, ArkType) for field definitions

## v1.1.0 Scope (Enhanced DX)

- Predefined errors: `errors.ValidationError`, `errors.NotFoundError`, etc.
- Type guards: `isValidationError()`, `isNotFoundError()`
- `.addNote()` method for error enrichment

## v1.2.0 Scope (Type Safety)

- Strict type inference for field access
- Better generic constraints
- Type narrowing improvements

## v1.3.0 Scope (Production Ready)

- `formatError()` for dev vs prod output
- `setOutputMode()` global configuration
- `stripLibraryFrames()` for clean stacks

## v2.0.0 Scope (Advanced Context)

- `withContext()` for request-scoped context injection
- Async patterns and error handling

## Changelog Format

Used during release:
```markdown
## [Version] — YYYY-MM-DD

### Added
- New features

### Changed
- Modifications

### Removed
- Deletions
```

Changesets auto-generates this from `.changeset/*.md` files during `npx changeset version`.