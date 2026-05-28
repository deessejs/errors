---
name: api-style-const-types
description: API uses const for functions and type for types, not function declarations or interfaces
type: feedback
---

## Rule

When documenting the API for `@deessejs/errors`:
- **Use `const` for all functions/exports**, not `function` declarations
- **Use `type` for all type definitions**, not `interface`

## Why

This matches the project's design philosophy of "functions over classes" and keeps the API documentation consistent with the function-based approach. The codebase uses this pattern throughout.

## How to apply

### For functions

```typescript
// ❌ Don't use function declarations
export function error(config: ErrorConfig): ErrorFactory

// ✅ Use const with arrow functions or function expressions
export const error: (config: ErrorConfig) => ErrorFactory
```

### For types

```typescript
// ❌ Don't use interface
export interface ErrorInstance {
  name: string;
  from(cause: Error): ErrorInstance;
}

// ✅ Use type
export type ErrorInstance = {
  name: string;
  from: (cause: Error) => ErrorInstance;
}
```

## Locations

All release documentation in `docs/internal/releases/*/README.md` must follow this pattern.