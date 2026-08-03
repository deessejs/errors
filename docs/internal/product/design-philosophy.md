# Design Philosophy

This document explains the core design principles behind `@deessejs/errors`. Each feature doc links here for rationale, avoiding repetition across the documentation.

## Core Principles

### 1. Functions Over Classes

**The choice:** `error({ name, fields })` instead of `class X extends Error`

**Why:**

- No `extends` chains to trace through code
- Composition over inheritance
- No `new` keyword, no `super()` calls
- Multiple inheritance is trivial: `inherits: [A, B]`
- Errors are data, not objects with behavior

**Tradeoff:**

- Familiarity: JS developers know class syntax
- Resolution: The function API is simple enough that familiarity isn't needed

### 2. Methods Over Separate Functions

**The choice:** `error.from(cause)` instead of `from(error, cause)`

**Why:**

- Method chaining reads in execution order
- IDE autocomplete works naturally
- "Object.action" is idiomatic

**Tradeoff:**

- Some prefer functional pipelines
- Resolution: Methods are for actions on instances, functions are for utilities

### 3. Properties Over Methods for Accessors

**The choice:** `err.name` instead of `err.name()`

**Why:**

- Properties are for data, methods are for actions
- Less verbose: `err.name` vs `err.name()`
- Consistent with native Error: `err.message`, `err.stack`

**Tradeoff:**

- Some data requires computation (not applicable here)

### 4. Single Namespace for User Data

**The choice:** `err.fields` for all user-defined data

**Why:**

- Avoids collisions with built-in properties: `name`, `message`, `stack`, `cause`, `context`
- Clear separation between library properties and user data
- `fields` is always an object (never `undefined`)

**Tradeoff:**

- Double nesting: `err.fields.field` vs `err.field`
- Resolution: Explicit is better than implicit; collisions are prevented

### 5. Context vs Fields

**The choice:** Two separate mechanisms for adding data to errors

**When to use fields:**

- Data is specific to this error type
- Field is meaningful for debugging this error
- Field appears in the message template
- Example: `{ field: 'email', reason: 'invalid format' }`

**When to use context:**

- Data is request-scoped or infrastructure-level
- Same data appears across many different errors
- Data is needed for correlation (requestId, traceId)
- Example: `{ requestId: 'req-123', userId: 'user-456' }`

**Why both?**

- Fields: Error-specific data
- Context: Cross-cutting data
- Separation enables clear logging and analysis

### 6. Factory Functions Over Class Constructors

**The choice:** `error({ name })` returns a factory, not a class

**Why:**

- TypeScript infers types from fields
- No `new` required
- Composition is natural
- Works with `raise()` and `throw`

**Tradeoff:**

- Can't use `instanceof` (use `is()` instead)
- Resolution: `is()` is the replacement

### 7. Error Name as Property

**The choice:** `error.name` is a property, not the return value

**Why:**

- Name is metadata, not instance data
- Consistent with Standard Schema
- Easier to introspect error types without instantiation

### 8. Most Recent First in Chains

**The choice:** `causes(err)` returns `[mostRecent, ..., root]`

**Why:**

- Most recent error is usually the most important for handling
- Natural for finding error codes
- Less common to need root-first ordering

**Contrast with Python:**

- Python's traceback shows root-first
- We chose most-recent-first for practical reasons

## Naming Conventions

### Errors

- PascalCase: `ValidationError`, `NotFoundError`
- Suffix `Error` for error types
- Prefix with category: `NetworkError`, `DatabaseError`

### Methods

- camelCase: `.from()`, `.addNote()`
- Verb for actions: `from`, `addNote`
- No prefix for properties

### Properties

- camelCase: `err.fields`, `err.context`
- Single word for simple values: `name`, `message`
- Namespace for collections: `fields`, `notes`, `causes`

### Functions

- camelCase: `is()`, `causes()`, `raise()`
- Verb for actions: `is`, `raise`, `stripLibraryFrames`
- Noun for utilities: `formatError`

## Why Not X?

### Why not `class X extends Error`?

Classes require inheritance chains that are hard to trace. Composition via `inherits:` is simpler.

### Why not `instanceof`?

`instanceof` only works within a single runtime context. `is()` works across module boundaries and with serialized errors.

### Why not string-based error codes?

Error codes are often legacy patterns. Error names provide sufficient identification.

### Why not ExceptionGroup?

JavaScript lacks Python's `except*` syntax. `Promise.allSettled` handles the common case.

### Why not `$` prefix for metadata?

Removed after DX review. Direct properties (`err.name`) are more familiar.

## Design Influences

### Python

- Exception chaining: `raise X from Y` → `raise X().from(Y)`
- Exception notes: `add_note()` → `.addNote()`
- Error hierarchy: `class X(Y)` → `inherits: Y`

### Standard Schema

- Field definitions: type + validation
- Interoperability: errors can work with other schema libraries

### Go

- Error wrapping: `fmt.Errorf("doing X: %w", err)` → `.from()`
- No exceptions: but we use errors for when exceptions make sense

### Rust

- No inheritance: composition over inheritance
- Explicit error types: but we keep it more dynamic

## Evolution of the API

### v0 Ideas (Not Implemented)

- `err.$('field')` for field access → Changed to `err.fields.field`
- `raise()` only, no `throw` → Added `throw` support for compatibility
- Root-first cause chain → Changed to most-recent-first

### v1 Design Decisions

- Functions over classes
- Methods over separate functions
- Properties over getters
- Namespaced errors to avoid collisions
- Type guards for TypeScript safety

## Related Features

- [error-function.md](./features/error-function.md) — Error factory
- [raise-function.md](./features/raise-function.md) — Throwing
- [chaining.md](./features/chaining.md) — Exception chaining
- [type-guards.md](./features/type-guards.md) — Type safety
- [context-injection.md](./features/context-injection.md) — Context
