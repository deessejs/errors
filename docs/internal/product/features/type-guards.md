# Feature: Type Guards with `isXxxError()` Functions

## Summary

Type guards allow TypeScript to narrow error types within conditional blocks, enabling safe access to error fields without casting.

## API

```typescript
// Generated for each error type
function isValidationError(err: unknown): err is ValidationError;
function isNotFoundError(err: unknown): err is NotFoundError;
// ... for all predefined and custom errors
```

## Usage

### Basic Type Guard

```typescript
import { errors, is } from '@deessejs/errors';

try {
  doSomething();
} catch (err) {
  if (errors.isValidationError(err)) {
    // TypeScript knows err is ValidationError here
    console.error(err.fields.field); // Safe access!
  }
}
```

### Without Type Guard

```typescript
import { errors, is } from '@deessejs/errors';

try {
  doSomething();
} catch (err) {
  if (is(err, errors.ValidationError)) {
    // TypeScript doesn't narrow - err is still unknown
    console.error(err.fields.field); // Error! Can't access fields
  }
}
```

### With Custom Errors

```typescript
import { error, is } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });
const ValidationError = error({
  name: 'ValidationError',
  fields: { field: { type: 'string' } },
  inherits: AppError,
});

// Generate type guard
const isAppError = (err: unknown): err is AppError => is(err, AppError);
const isValidationError = (err: unknown): err is ValidationError => is(err, ValidationError);

try {
  validate(data);
} catch (err) {
  if (isValidationError(err)) {
    // TypeScript narrows to ValidationError
    console.error(err.fields.field); // Works!
  }
}
```

### Combining with Inheritance

```typescript
import { error, is } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });
const ValidationError = error({ name: 'ValidationError', inherits: AppError });

// Type guard for parent catches children too
const isAppError = (err: unknown): err is AppError => is(err, AppError);

try {
  doSomething();
} catch (err) {
  if (isAppError(err)) {
    // Catches ValidationError AND AppError
    console.error('App error occurred');
  }
}
```

## Design Rationale

**Why not rely on `is()` returning a narrowed type?**

TypeScript doesn't automatically narrow types when functions return `boolean`. A separate type guard function is needed:

```typescript
// is() returns boolean - TypeScript doesn't narrow
if (is(err, ValidationError)) {
  err.fields; // Error: Property 'fields' does not exist on unknown
}

// Type guard function narrows the type
if (isValidationError(err)) {
  err.fields; // Works!
}
```

**Naming convention**

Type guards follow the pattern `isXxxError` where `Xxx` is the error name:

- `isValidationError` for `ValidationError`
- `isNotFoundError` for `NotFoundError`
- `isNetworkError` for `NetworkError`

**For predefined errors**

```typescript
import { errors } from '@deessejs/errors';

// Predefined type guards
errors.isValidationError(err);
errors.isNotFoundError(err);
errors.isTypeError(err); // Avoids collision with native TypeError
```

## Related Features

- [is-function.md](./is-function.md) — Base type checking function
- [predefined-errors.md](./predefined-errors.md) — Predefined error types
- [inheritance.md](./inheritance.md) — Type guards work with inheritance
