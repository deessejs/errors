# Feature: Instance Checking with `is()`

## Summary

The `is()` function checks if an error is an instance of a specific error type (or any of its children in the inheritance hierarchy). This enables type-safe error handling without relying on `instanceof`.

## API

```typescript
function is<T extends ErrorFactory>(error: unknown, ErrorType: T): boolean;
```

### Parameters

| Parameter   | Type        | Description                     |
| ----------- | ----------- | ------------------------------- |
| `error`     | `unknown`   | The error to check              |
| `ErrorType` | `ErrorType` | The error type to check against |

### Returns

`boolean` — `true` if the error is the specified type or inherits from it.

## Usage

### Basic Usage

```typescript
import { error, raise, is } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });
const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
});

try {
  validate(data);
} catch (err) {
  if (is(err, ValidationError)) {
    // Handle validation errors
  } else if (is(err, AppError)) {
    // Handle other app errors
  }
}
```

### With Native Errors

`is()` works with native JavaScript errors:

```typescript
if (is(err, SyntaxError)) {
  // Handle JSON parse errors
} else if (is(err, TypeError)) {
  // Handle type errors
}
```

### Checking Inheritance Chains

```typescript
const AppError = error({ name: 'AppError' });
const NetworkError = error({ name: 'NetworkError', inherits: AppError });
const DatabaseError = error({ name: 'DatabaseError', inherits: AppError });

const OperationError = error({
  name: 'OperationError',
  inherits: [NetworkError, DatabaseError],
});

const err = OperationError();

is(err, NetworkError); // true
is(err, DatabaseError); // true
is(err, OperationError); // true
is(err, AppError); // true (through any parent)
```

### Multiple Type Check

```typescript
if (is(err, NetworkError) || is(err, DatabaseError)) {
  // Handle storage failures
}
```

## Design Rationale

**Why not `instanceof`?**

```typescript
// instanceof (native JS)
if (err instanceof ValidationError) { ... }

// is() (library approach)
if (is(err, ValidationError)) { ... }
```

1. **Consistency** — All library operations are functions, not class methods
2. **Works with all error types** — `instanceof` only works for native class hierarchies
3. **Works with native errors** — `is(err, SyntaxError)` checks native errors too
4. **Hierarchy awareness** — `instanceof` doesn't check inheritance chains

**Why not a method on the error?**

```typescript
// Method approach
if (err.is(ValidationError)) { ... }

// Function approach
if (is(err, ValidationError)) { ... }
```

The function approach is more explicit about the two operands and reads naturally: "if err is ValidationError".

## Comparison Table

| Method             | Native Errors | Custom Errors | Hierarchy | Syntax                |
| ------------------ | ------------- | ------------- | --------- | --------------------- |
| `instanceof`       | ✓             | ✓             | ✓         | `err instanceof X`    |
| `is()`             | ✓             | ✓             | ✓         | `is(err, X)`          |
| `err.name === 'X'` | ✓             | ✓             | ✗         | Manual string compare |

## Related Features

- [error-function.md](./error-function.md) — Error inheritance
- [inheritance.md](./inheritance.md) — Deep dive on inheritance
- [type-guards.md](./type-guards.md) — Type-safe narrowing with type guards
- [predefined-errors.md](./predefined-errors.md) — Built-in error types
