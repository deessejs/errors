# Feature: Predefined Errors

## Summary

The package exports common error types through a namespaced `errors` object, avoiding naming collisions with native JavaScript errors.

## API

```typescript
import { errors } from '@deessejs/errors';

// Use predefined errors
errors.ValidationError({ field: 'email' });
errors.NotFoundError({ path: '/users/123' });

// Type guards (destructured for convenience)
const { isValidationError, isNotFoundError, isTypeError } = errors;

isValidationError(err);  // Type guard
```

## Available Errors

### Core Errors

| Export | Name | Fields | HTTP Status | Description |
|--------|------|--------|-------------|-------------|
| `errors.ValidationError` | `ValidationError` | `field: string, message: string` | 400 | Validation failure |
| `errors.TypeError` | `TypeError` | `expected: string, actual: string` | 400 | Type mismatch |
| `errors.NotFoundError` | `NotFoundError` | `path: string` | 404 | Resource not found |
| `errors.TimeoutError` | `TimeoutError` | `ms: number` | 504 | Operation timed out |
| `errors.UnauthorizedError` | `UnauthorizedError` | — | 401 | Authentication required |
| `errors.ForbiddenError` | `ForbiddenError` | — | 403 | Permission denied |

### Usage Examples

```typescript
import { errors, raise } from '@deessejs/errors';

// Validation
if (!isValidEmail(data.email)) {
  raise(errors.ValidationError({ field: 'email', message: 'Invalid format' }));
}

// Not Found
if (!user) {
  raise(errors.NotFoundError({ path: `/users/${id}` }));
}

// Timeout
if (Date.now() - start > timeout) {
  raise(errors.TimeoutError({ ms: timeout }));
}
```

### Why Namespace?

Native JavaScript already has `TypeError`:

```typescript
// Native - different from library's TypeError
throw new TypeError('expected string');

// Library - namespaced to avoid collision
raise(errors.TypeError({ expected: 'string', actual: 'number' }));
```

The namespace ensures you always get the library's error, not the native one.

### Type Guards

Type guards are provided for type-safe narrowing:

```typescript
import { errors, is } from '@deessejs/errors';

// Option 1: Via is() function (verbose)
if (is(err, errors.ValidationError)) {
  // err.fields is accessible
  console.error(err.fields.field);
}

// Option 2: Destructured type guards (recommended)
const { isValidationError, isNotFoundError, isTypeError } = errors;

if (isValidationError(err)) {
  // TypeScript narrows to ValidationError
  console.error(err.fields.field);
}

if (isNotFoundError(err)) {
  console.error(err.fields.path);
}
```

### With Inheritance

Predefined errors are just regular errors — you can inherit from them:

```typescript
import { errors, error, is } from '@deessejs/errors';

// Create a custom error that inherits from ValidationError
const EmailValidationError = error({
  name: 'EmailValidationError',
  inherits: errors.ValidationError,  // Pass the factory function
  fields: {
    value: { type: 'string' },
  },
  message: 'Invalid email: "{value}"',
});

// Now is() works with the parent
if (is(err, errors.ValidationError)) {
  // Handles EmailValidationError and ValidationError
  console.error('Validation failed');
}

// Type guard also works
const { isValidationError } = errors;
if (isValidationError(err)) {
  // err.fields is narrowed
}
```

### With Context Injection

```typescript
import { errors, raise, withContext } from '@deessejs/errors';

withContext({ requestId: 'req-123' }, () => {
  raise(errors.NotFoundError({ path: '/users/456' }));
});
// Error includes requestId in context
```

### With Notes

```typescript
import { errors, raise } from '@deessejs/errors';

try {
  fetchData(url);
} catch (err) {
  raise(
    errors.TimeoutError({ ms: 5000 })
      .from(err)
      .addNote('Failed to fetch user data')
  );
}
```

## Creating Custom Errors

### Extend the Namespace Pattern

Create a custom errors module:

```typescript
// errors/index.ts
import { errors, error } from '@deessejs/errors';

// Config errors
export const ConfigError = error({
  name: 'ConfigError',
  fields: {
    key: { type: 'string' },
    path: { type: 'string' },
  },
  message: 'Config key "{key}" not found in {path}',
  httpStatus: 500,
});

// Rate limit errors
export const RateLimitError = error({
  name: 'RateLimitError',
  fields: {
    retryAfter: { type: 'number' },
  },
  message: 'Rate limited. Retry after {retryAfter}ms',
  httpStatus: 429,
});

// Type guards
export const isConfigError = (err: unknown): err is ConfigError =>
  is(err, ConfigError);
export const isRateLimitError = (err: unknown): err is RateLimitError =>
  is(err, RateLimitError);
```

### Usage

```typescript
import { ConfigError, RateLimitError, isConfigError, isRateLimitError } from './errors';

raise(ConfigError({ key: 'db.url', path: 'config.json' }));

if (isConfigError(err)) {
  console.error(`Missing config: ${err.fields.key}`);
}
```

## Design Rationale

**Why namespaced?**

1. **Avoid collisions** — `TypeError` vs native `TypeError`
2. **Explicit intent** — `errors.TypeError` clearly means library error
3. **Discoverability** — All errors under one object

**Why destructured type guards?**

```typescript
// Verbose
errors.isValidationError(err);

// Cleaner (destructured)
isValidationError(err);
```

Both work; destructuring is preferred for cleaner code.

**Why not prefix (`DeesseTypeError`)?**

Prefixes are verbose and harder to read. Namespace is cleaner:
- `errors.TypeError` vs `DeesseTypeError`
- Same collision protection, better ergonomics

**Why fields vary by error?**

| Error | Fields | HTTP Status | Rationale |
|-------|--------|-------------|-----------|
| `NotFoundError` | `path` | 404 | The missing resource is key info |
| `TimeoutError` | `ms` | 504 | How long we waited is useful |
| `UnauthorizedError` | none | 401 | Why often varies by auth strategy |

Error-specific fields capture the most useful information for that error type.

## Related Features

- [error-function.md](./error-function.md) — Error definition
- [inheritance.md](./inheritance.md) — Extending predefined errors
- [is-function.md](./is-function.md) — Base type checking
- [type-guards.md](./type-guards.md) — Type-safe narrowing
- [http-status.md](./http-status.md) — HTTP status mapping
