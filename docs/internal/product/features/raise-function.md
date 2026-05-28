# Feature: `raise()` — Throwing Errors

## Summary

The `raise()` function is the primary mechanism for throwing errors in `@deessejs/errors`. The library also supports native `throw` syntax for compatibility.

## API

```typescript
function raise(errorInstance: ErrorInstance): never
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `errorInstance` | `ErrorInstance` | Yes | An error created by an error factory |

### Returns

`never` — `raise()` always throws, so TypeScript knows control flow stops.

## Usage

### Using `raise()`

```typescript
import { error, raise } from '@deessejs/errors';
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({
    field: z.string(),
  }),
});

raise(ValidationError({ field: 'email' }));
```

### Using Native `throw`

Native `throw` is also supported:

```typescript
import { error, raise } from '@deessejs/errors';
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({
    field: z.string(),
  }),
});

// Both work identically:
raise(ValidationError({ field: 'email' }));
throw ValidationError({ field: 'email' });
```

### Chaining Before Raising

```typescript
import { error, raise } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });

try {
  lowLevelOperation();
} catch (err) {
  raise(AppError().from(err));
  // or
  throw AppError().from(err);
}
```

## Why Support Both?

### Benefits of `raise()`

1. **Middleware potential** — Can be intercepted, wrapped, or logged
2. **Method chaining** — `raise(error.from(cause))` reads naturally
3. **Consistent API** — All library errors go through the same function

### Benefits of `throw`

1. **Familiarity** — Native JS syntax, no new patterns to learn
2. **IDE support** — Works with all existing tools
3. **Third-party interop** — Mix with non-library code seamlessly

### Recommendation

Use `raise()` in library code and internal application code for consistency. Use `throw` when mixing with third-party libraries or for quick scripts.

## Comparison

| Aspect | `raise()` | `throw` |
|--------|-----------|---------|
| Syntax | `raise(Error())` | `throw Error()` |
| Middleware | Supported | Not supported |
| Ecosystem | Library-specific | Universal |
| IDE support | Good | Excellent |

## Comparison with Native JS

| Aspect | Native JS | @deessejs/errors |
|--------|----------|------------------|
| Syntax | `throw new Error('msg')` | `raise(ErrorFactory())` or `throw ErrorFactory()` |
| Custom errors | `class X extends Error` | `error({ name: 'X', fields: z.object(...) })` |
| Chaining | `err.cause = cause` | `.from(cause)` |
| Consistency | Mix of `throw` + built-ins | Both supported |

## Design Rationale

See [Design Philosophy](../design-philosophy.md) for core principles.

**Why support both `raise()` and `throw`?**

Not forcing a paradigm shift reduces adoption friction:
- Start with familiar `throw` syntax
- Migrate to `raise()` when you need middleware support
- Mix both based on context

## Related Features

- [error-function.md](./error-function.md) — How to create errors
- [chaining.md](./chaining.md) — Exception chaining with `.from()`