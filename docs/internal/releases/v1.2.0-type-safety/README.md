# Release v1.2.0 — Type Safety & Utilities

## Overview

This release provides TypeScript-first type safety with type guards and a library of predefined errors. These utilities reduce boilerplate and make common error patterns instantly accessible.

## Release Date

Target: TBD (after v1.1.0)

## Motivation

While v1.0.0 provides the core API, users need:

1. **Type guards** — TypeScript can't narrow types from functions returning `boolean`
2. **Predefined errors** — Common errors shouldn't require definition
3. **Namespace** — Avoid collisions with native JavaScript `TypeError`

## What's Included

### Type Guards: `isXxxError()` Functions

TypeScript doesn't narrow types when functions return `boolean`. Type guards solve this:

```typescript
import { errors, is } from '@deessejs/errors';

// Without type guard - TypeScript can't narrow
if (is(err, errors.ValidationError)) {
  err.fields; // Error: Property 'fields' does not exist on unknown
}

// With type guard - TypeScript narrows correctly
const { isValidationError } = errors;

if (isValidationError(err)) {
  err.fields.field; // Works!
}
```

### Predefined Errors

```typescript
import { errors, raise } from '@deessejs/errors';

// ValidationError - 400 Bad Request
errors.ValidationError({ field: 'email', message: 'Invalid format' });

// TypeError (namespaced to avoid native collision) - 400 Bad Request
errors.TypeError({ expected: 'string', actual: 'number' });

// NotFoundError - 404 Not Found
errors.NotFoundError({ path: '/users/123' });

// TimeoutError - 504 Gateway Timeout
errors.TimeoutError({ ms: 5000 });

// UnauthorizedError - 401 Unauthorized
errors.UnauthorizedError();

// ForbiddenError - 403 Forbidden
errors.ForbiddenError();
```

### Complete Predefined Error List

| Export                     | Name                | Fields                             | HTTP Status | Description             |
| -------------------------- | ------------------- | ---------------------------------- | ----------- | ----------------------- |
| `errors.ValidationError`   | `ValidationError`   | `field: string, message: string`   | 400         | Validation failure      |
| `errors.TypeError`         | `TypeError`         | `expected: string, actual: string` | 400         | Type mismatch           |
| `errors.NotFoundError`     | `NotFoundError`     | `path: string`                     | 404         | Resource not found      |
| `errors.TimeoutError`      | `TimeoutError`      | `ms: number`                       | 504         | Operation timed out     |
| `errors.UnauthorizedError` | `UnauthorizedError` | —                                  | 401         | Authentication required |
| `errors.ForbiddenError`    | `ForbiddenError`    | —                                  | 403         | Permission denied       |

### Namespace Pattern

```typescript
import { errors } from '@deessejs/errors';

// Access predefined errors
errors.ValidationError;
errors.NotFoundError;
errors.TypeError; // Avoids native TypeError collision

// Access type guards
errors.isValidationError;
errors.isNotFoundError;
errors.isTypeError;

// Destructured type guards (recommended)
const { isValidationError, isNotFoundError } = errors;

if (isValidationError(err)) {
  // TypeScript narrowed
}
```

### Extending Predefined Errors

```typescript
import { errors, error, is } from '@deessejs/errors';

// Create custom error that inherits from ValidationError
const EmailValidationError = error({
  name: 'EmailValidationError',
  inherits: errors.ValidationError,
  fields: {
    value: { type: 'string' },
  },
  message: 'Invalid email: "{value}"',
});

// is() works with parent
if (is(err, errors.ValidationError)) {
  // Handles EmailValidationError and ValidationError
}

// Type guard also works
const { isValidationError } = errors;
if (isValidationError(err)) {
  // TypeScript narrows
}
```

## What's NOT Included

This release intentionally excludes:

- **Output formatting** (dev vs prod modes) — coming in v1.3.0
- **Stack cleaning** (`stripLibraryFrames()`) — coming in v1.3.0
- **Context injection** (`withContext()`) — coming in v2.0.0

## API Changes

### New Exports

```typescript
// errors namespace with predefined errors and type guards
export const errors: {
  // Predefined errors with typed fields
  ValidationError: ErrorFactory<{ field: string; message: string }>;
  TypeError: ErrorFactory<{ expected: string; actual: string }>;
  NotFoundError: ErrorFactory<{ path: string }>;
  TimeoutError: ErrorFactory<{ ms: number }>;
  UnauthorizedError: ErrorFactory<Record<string, unknown>>;
  ForbiddenError: ErrorFactory<Record<string, unknown>>;

  // Type guards - proper type predicates, no second parameter needed
  isValidationError: (err: unknown) => err is ReturnType<typeof errors.ValidationError>;
  isTypeError: (err: unknown) => err is ReturnType<typeof errors.TypeError>;
  isNotFoundError: (err: unknown) => err is ReturnType<typeof errors.NotFoundError>;
  isTimeoutError: (err: unknown) => err is ReturnType<typeof errors.TimeoutError>;
  isUnauthorizedError: (err: unknown) => err is ReturnType<typeof errors.UnauthorizedError>;
  isForbiddenError: (err: unknown) => err is ReturnType<typeof errors.ForbiddenError>;
};

// is() const with ErrorFactory parameter (already in v1.0.0)
export const is: <T extends ErrorFactory>(err: unknown, ErrorType: T) => boolean;
```

## Migration Path

No migration required — this is purely additive. Existing code continues to work.

## Testing Requirements

- [ ] Unit tests for all predefined errors
- [ ] Unit tests for all type guards
- [ ] Unit tests for type guard narrowing with TypeScript
- [ ] Unit tests for extending predefined errors
- [ ] Unit tests for namespace collision avoidance (vs native TypeError)
- [ ] Type tests for TypeScript compatibility

## Changelog Entry

```markdown
## v1.2.0 — Type Safety & Utilities (YYYY-MM-DD)

### Added

- `errors` namespace with predefined error types
- `errors.ValidationError` with `field` and `message` fields
- `errors.TypeError` (namespaced to avoid native collision)
- `errors.NotFoundError` with `path` field
- `errors.TimeoutError` with `ms` field
- `errors.UnauthorizedError`
- `errors.ForbiddenError`
- Type guards: `isValidationError()`, `isTypeError()`, `isNotFoundError()`, etc.
- Inheritance support for predefined errors

### Changed

- Enhanced `is()` function documentation
```

## Related Documents

- [Type Guards Feature](../product/features/type-guards.md)
- [Predefined Errors Feature](../product/features/predefined-errors.md)
- [is() Function Feature](../product/features/is-function.md)
- [Inheritance Feature](../product/features/inheritance.md)
