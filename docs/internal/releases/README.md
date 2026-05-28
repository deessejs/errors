# Release Planning Overview

This document summarizes the release strategy for `@deessejs/errors` and provides a high-level view of the roadmap.

## Version Timeline

| Version | Focus | Features | Target |
|---------|-------|----------|--------|
| **v1.0.0** | Core Foundation | error(), raise(), is(), inherits, .from(), causes, message formatting | MVP |
| **v1.1.0** | Enhanced DX | .addNote(), context property documentation | After v1.0.0 |
| **v1.2.0** | Type Safety | Type guards, predefined errors, errors namespace | After v1.1.0 |
| **v1.3.0** | Production Ready | HTTP status, formatError(), stripLibraryFrames(), dev/prod output | After v1.2.0 |
| **v2.0.0** | Advanced Context | withContext(), async patterns, AsyncLocalStorage | After v1.3.0 |

## Feature Coverage by Version

### v1.0.0 — Core Foundation
- [x] `error()` function for defining error types
- [x] `raise()` function for throwing errors
- [x] Native `throw` syntax support
- [x] `is()` function for type checking
- [x] `inherits` option for single and multiple inheritance
- [x] `.from()` method for exception chaining
- [x] `causes()` function for chain traversal
- [x] `err.fields` namespace for user data
- [x] Message templates with `{field}` placeholders

### v1.1.0 — Enhanced Developer Experience
- [x] `.addNote()` method for enriching errors with notes
- [x] Multiple notes support with order preservation
- [x] Notes display in development and production output

### v1.2.0 — Type Safety & Utilities
- [x] `errors` namespace with predefined error types
- [x] ValidationError, TypeError, NotFoundError, TimeoutError, UnauthorizedError, ForbiddenError
- [x] Type guards: `isValidationError()`, `isTypeError()`, etc.

### v1.3.0 — Production Ready
- [x] HTTP status mapping via `httpStatus` property
- [x] `formatError()` function for per-call formatting
- [x] `setOutputMode()` for global configuration
- [x] `stripLibraryFrames()` for cleaning stack traces
- [x] Environment-aware output (dev vs prod)
- [x] JSON serialization

### v2.0.0 — Advanced Context
- [x] `withContext()` for AsyncLocalStorage-based context injection
- [x] Nested context support with automatic merging
- [x] `errors.supportsContext()` for compatibility detection

## Dependency Graph

```
v1.0.0 (Foundation)
    │
    ├── v1.1.0 (Enhancement) ── depends on v1.0.0
    │       │
    │       └── v1.2.0 (Utilities) ── depends on v1.1.0
    │               │
    │               └── v1.3.0 (Production) ── depends on v1.2.0
    │
    └── v2.0.0 (Advanced) ── depends on v1.3.0
```

## Release Criteria

### For Each Release

1. **Tests pass** — All unit and integration tests green
2. **Types compile** — No TypeScript errors
3. **Docs updated** — README and feature docs reflect new features
4. **Changelog updated** — Entry added for the release
5. **Migration guide updated** — If breaking changes

### For v1.0.0 (MVP)

Additional requirements:
- [ ] Core API is stable (no planned breaking changes)
- [ ] Basic migration path from native JS errors documented
- [ ] Common patterns covered

### For v2.0.0 (Major)

Additional requirements:
- [ ] Migration guide for breaking changes
- [ ] Compatibility matrix documented
- [ ] Graceful degradation tested

## Release Process

1. Create release branch: `release/v1.x.x`
2. Update version in `package.json`
3. Run full test suite
4. Update changelog
5. Merge to `main`
6. Create git tag
7. Publish to npm

## Versioning Policy

- **MAJOR** (v2.0.0): Breaking changes
- **MINOR** (v1.2.0): New features, backward compatible
- **PATCH** (v1.0.1): Bug fixes, backward compatible

## Type Safety Guidelines

### No `any` Policy

Never use `any` in the codebase or documentation. Always use proper generics or specific types.

```typescript
// ❌ Don't use any
export const is: (error: any, ErrorType: ErrorType) => boolean;

// ✅ Use unknown
export const is: (error: unknown, ErrorType: ErrorType) => boolean;

// ❌ Don't use any for generic callbacks
type Callback = (err: any) => void;

// ✅ Use specific types or generics
type Callback<T> = (err: T) => void;
```

### Why No `any`?

- `any` bypasses TypeScript's type checking
- Generics provide flexibility while maintaining type safety
- This project is about type-safe error handling — `any` undermines that goal

## Related Documents

- [v1.0.0 Core Foundation](./v1.0.0-core-foundation/README.md)
- [v1.1.0 Enhanced DX](./v1.1.0-enhanced-dx/README.md)
- [v1.2.0 Type Safety](./v1.2.0-type-safety/README.md)
- [v1.3.0 Production Ready](./v1.3.0-production-ready/README.md)
- [v2.0.0 Advanced Context](./v2.0.0-advanced-context/README.md)
- [Design Philosophy](../product/design-philosophy.md)
- [Product README](../product/README.md)