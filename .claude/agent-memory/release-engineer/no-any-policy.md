---
name: no-any-policy
description: Never use `any` in the codebase — use generics instead
type: feedback
---

## Rule

Never use `any` in the `@deessejs/errors` codebase or documentation. Always use proper generics or specific types.

## Why

- `any` bypasses TypeScript's type checking, defeating the purpose of using TypeScript
- Generics provide flexibility while maintaining type safety
- This project is about type-safe error handling — `any` undermines that goal

## How to apply

### For type checking with `is()`

```typescript
// ❌ Don't use single parameter
export const is: <T>(err: unknown) => err is T;

// ✅ Use ErrorFactory parameter for type-safe checking
export const is: <T extends ErrorFactory>(err: unknown, ErrorType: T) => boolean;
```

### For type guards

```typescript
// ❌ Don't use concrete types
const isValidationError = (err: unknown): err is ValidationError => ...

// ✅ Use generics for flexibility
const isValidationError = <T>(err: unknown): err is ValidationError<T> => ...
```

### For ErrorInstance with typed fields

```typescript
// ❌ Don't use fixed Record<string, unknown>
type ErrorInstance = {
  fields: Record<string, unknown>;
};

// ✅ Use generics for type-safe fields
type ErrorInstance<T extends Record<string, unknown> = Record<string, unknown>> = {
  fields: T;
  from: <U>(cause: Error | ErrorInstance<U>) => ErrorInstance<T>;
};
```

### For ErrorFactory with typed fields

```typescript
// ❌ Don't use fixed types
type ErrorFactory = {
  (fields?: Record<string, unknown>): ErrorInstance;
};

// ✅ Use generics
type ErrorFactory<T extends Record<string, unknown> = Record<string, unknown>> = {
  (fields?: Partial<T>): ErrorInstance<T>;
};
```

### For functions with generics

```typescript
// ❌ Don't use any
export const withContext: <T>(context: Record<string, unknown>, fn: () => T) => T;

export const formatError: (errorInstance: ErrorInstance) => string;

// ✅ Use proper generics
export const withContext: <T>(context: Record<string, unknown>, fn: () => T) => T;

export const formatError: <T>(errorInstance: ErrorInstance<T>) => string;
```

## Locations

All TypeScript code and API documentation in `docs/internal/releases/*/README.md` must follow this pattern.