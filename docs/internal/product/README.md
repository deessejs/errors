# @deessejs/errors — Product Specification

## Overview

The `@deessejs/errors` package is a TypeScript library that reimagines error handling in JavaScript and TypeScript. Inspired by Python's error system (as documented in the [Python errors tutorial](https://docs.python.org/3/tutorial/errors.html)), this package brings exception chaining, hierarchical inheritance, and rich error semantics to the JS/TS ecosystem — all through a **function-based API**.

Errors follow the [Standard Schema](https://standardschema.dev/) specification, making them interoperable with other tools in the TypeScript ecosystem.

## Quick Start

```typescript
import { error, raise, is } from '@deessejs/errors';

// Define an error
const ValidationError = error({
  name: 'ValidationError',
  fields: {
    field: { type: 'string' },
  },
  message: 'Field "{field}" is invalid',
});

// Raise it (or use throw)
raise(ValidationError({ field: 'email' }));

// Check type with type guard
import { errors } from '@deessejs/errors';
const { isValidationError } = errors;

if (isValidationError(err)) {
  console.error(err.fields.field);  // 'email'
}
```

## Documentation Structure

### Guides

| Guide | Description |
|-------|-------------|
| **[Migration Guide](./guides/migration.md)** | Migrate from native JS errors |
| **[Testing Guide](./guides/testing.md)** | Patterns for testing error handling |
| **[Design Philosophy](./design-philosophy.md)** | Core principles and rationale |

### Feature Reference

| Feature | File | Summary |
|---------|------|---------|
| **Error Factory** | [`features/error-function.md`](./features/error-function.md) | Create errors with `error()` |
| **Raise / Throw** | [`features/raise-function.md`](./features/raise-function.md) | Throw errors with `raise()` or `throw` |
| **Chaining** | [`features/chaining.md`](./features/chaining.md) | Chain errors with `.from()` |
| **Chain Traversal** | [`features/chain-traversal.md`](./features/chain-traversal.md) | Navigate causes with `causes()` |
| **Notes** | [`features/notes.md`](./features/notes.md) | Enrich with `.addNote()` |
| **Instance Checking** | [`features/is-function.md`](./features/is-function.md) | Check types with `is()` |
| **Type Guards** | [`features/type-guards.md`](./features/type-guards.md) | Type-safe error narrowing |
| **Context Injection** | [`features/context-injection.md`](./features/context-injection.md) | Inject context with `withContext()` |
| **Message Formatting** | [`features/message-formatting.md`](./features/message-formatting.md) | Template messages |
| **Stack Cleaning** | [`features/stack-cleaning.md`](./features/stack-cleaning.md) | Clean stacks with `stripLibraryFrames()` |
| **Predefined Errors** | [`features/predefined-errors.md`](./features/predefined-errors.md) | Built-in error types |
| **Inheritance** | [`features/inheritance.md`](./features/inheritance.md) | Single and multiple inheritance |
| **Output Formatting** | [`features/output-formatting.md`](./features/output-formatting.md) | Dev vs Prod output |
| **Async Support** | [`features/async-support.md`](./features/async-support.md) | Async patterns |

## API Summary

### Core Functions

| Function | Purpose |
|----------|---------|
| `raise(errorInstance)` | Raise an error |
| `throw errorInstance` | Native throw syntax (also supported) |
| `is(err, ErrorType)` | Check if error is of type |
| `causes(err)` | Get cause chain (most recent first) |

### Methods on Error Instances

| Method | Purpose |
|--------|---------|
| `err.from(cause)` | Chain exceptions |
| `err.addNote(note)` | Add enrichment notes |

### Error Properties

All properties are always defined on every error instance:

| Property | Type | Description |
|----------|------|-------------|
| `err.name` | `string` | Error name |
| `err.message` | `string` | Formatted message |
| `err.stack` | `string` | Stack trace |
| `err.fields` | `Record<string, unknown>` | User-defined fields (empty object if none) |
| `err.notes` | `string[]` | All notes (empty array if none) |
| `err.cause` | `Error \| null` | Direct cause (null if none) |
| `err.causes` | `Error[]` | Full cause chain (most recent first) |
| `err.context` | `Record<string, unknown> \| null` | Injected context (null if none) |

### Utility Functions

| Function | Purpose |
|----------|---------|
| `withContext(ctx, fn)` | Inject context into errors |
| `stripLibraryFrames(err)` | Remove internal frames |
| `formatError(err, options)` | Format error for output |

### Predefined Errors

```typescript
import { errors } from '@deessejs/errors';

// Namespace avoids collision with native TypeError
errors.ValidationError({ field: 'email' });
errors.NotFoundError({ path: '/users/123' });
errors.TimeoutError({ ms: 5000 });

// Destructured type guards
const { isValidationError, isNotFoundError } = errors;
```

## Comparison with Native JS Errors

| Feature | Native JS | @deessejs/errors |
|---------|----------|------------------|
| Custom errors | Class inheritance | `error()` factory |
| Schema validation | Not built-in | Via Standard Schema |
| Inheritance | `extends` chains | `inherits:` option (multiple) |
| Instance checking | `instanceof` | `is(err, ErrorType)` |
| Cause chaining | Manual `err.cause` | First-class `.from()` |
| Chain traversal | Not available | `causes()` / `err.causes` |
| Exception notes | Not supported | `.addNote()` |
| Predefined errors | `new TypeError()` | `errors.TypeError` (namespaced) |
| Type guards | Manual | `isXxxError()` functions |
| Colored output | Console + boilerplate | Built-in |
| JSON serialization | Manual | Automatic |
| Throwing | `throw err` | `raise(err)` or `throw` |
| Type interoperability | None | Standard Schema |

## Comparison with Python

| Feature | Python | @deessejs/errors |
|---------|--------|------------------|
| Error definition | `class X(Exception)` | `error({ name, fields? })` |
| Inheritance | `class X(Y)` | `inherits:` option |
| Multiple inheritance | `class X(Y, Z)` | `inherits: [Y, Z]` |
| Instance checking | `isinstance()` | `is(err, Type)` |
| Raise syntax | `raise X()` | `raise(X())` or `throw X()` |
| Chaining | `raise X from Y` | `raise(X().from(Y))` |
| Exception notes | `add_note()` | `.addNote()` |
| Error groups | `ExceptionGroup` | Async patterns |
| Context | `__context__` | `withContext()` |
| Stack cleaning | Not built-in | `stripLibraryFrames()` |
| JSON serialization | `json.dumps()` | Automatic |
| Schema spec | Not applicable | Standard Schema |

## Goals

1. **Function-based API** — No class hierarchies, no `extends`
2. **Standard Schema compliance** — Interoperable with the TypeScript ecosystem
3. **Preserve debugging context** — Chaining, notes, and context injection
4. **Improve DX** — Native `throw` support, colored output, message formatting
5. **Align with Python ecosystem** — Familiar patterns for developers coming from Python
6. **Production-ready** — JSON serialization, stack cleaning, environment-aware output

## Out of Scope

- Syntax error handling (parser-level, already handled by JS engine)
- `try...except...else` equivalents (JS lacks `else`; no plans to polyfill)
- `with` statement equivalents (context managers in Python)
- ExceptionGroup (v2, if needed)

## References

- [Python Errors Tutorial](https://docs.python.org/3/tutorial/errors.html)
- [Standard Schema](https://standardschema.dev/)
- [PEP 678 — Exception Notes](https://peps.python.org/pep-0678/)

## Status

This document describes the intended behavior of `@deessejs/errors`. Implementation details will be documented in the technical specification.
