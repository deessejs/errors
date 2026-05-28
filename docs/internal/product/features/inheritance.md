# Feature: Inheritance System

## Summary

Errors can inherit from one or more parent errors, enabling hierarchical error type checking. This replaces traditional class hierarchies with a function-based composition model.

## API

```typescript
const MyError = error({
  name: 'MyError',
  inherits: ParentError,              // Single parent
  // or
  inherits: [ParentError1, ParentError2],  // Multiple parents
});
```

## Usage

### Single Inheritance

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
  if (is(err, AppError)) {
    // Handles ValidationError AND AppError
    console.error('App error occurred');
  }
}
```

### Multiple Inheritance

```typescript
import { error, raise, is } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });
const NetworkError = error({ name: 'NetworkError' });
const StorageError = error({ name: 'StorageError' });

const CombinedError = error({
  name: 'CombinedError',
  inherits: [AppError, NetworkError, StorageError],
});

// Now CombinedError is ALL of them
const err = CombinedError();

is(err, AppError);       // true
is(err, NetworkError);   // true
is(err, StorageError);   // true
```

### Deep inheritance

```typescript
import { error, raise, is } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });

const DomainError = error({
  name: 'DomainError',
  inherits: AppError,
});

const ValidationError = error({
  name: 'ValidationError',
  inherits: DomainError,
});

const RequiredFieldError = error({
  name: 'RequiredFieldError',
  inherits: ValidationError,
  fields: {
    field: { type: 'string' },
  },
});

// AppError hierarchy:
// AppError
//   └── DomainError
//       └── ValidationError
//           └── RequiredFieldError

is(err, RequiredFieldError);  // true
is(err, ValidationError);     // true
is(err, DomainError);         // true
is(err, AppError);            // true
```

### Control Flow with Inheritance

```typescript
import { error, raise, is } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });
const ValidationError = error({ name: 'ValidationError', inherits: AppError });
const NetworkError = error({ name: 'NetworkError', inherits: AppError });

try {
  doSomething();
} catch (err) {
  if (is(err, ValidationError)) {
    // Validation-specific handling
  } else if (is(err, NetworkError)) {
    // Network-specific handling
  } else if (is(err, AppError)) {
    // Generic app error handling
  } else {
    throw err;  // Re-throw unknown errors
  }
}
```

## Inheritance vs Composition

### Inheritance (This Package)

```typescript
const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
});
```

### Class Inheritance (Native JS)

```typescript
class ValidationError extends AppError {
  constructor() {
    super();
    this.name = 'ValidationError';
  }
}
```

**Advantages of inheritance approach:**
- No class syntax needed
- Inherit from multiple parents
- Errors are just data, not classes
- Composable at runtime

## Design Rationale

**Why not use standard class `extends`?**

```typescript
// Class approach
class MyError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'MyError';
  }
}

// Function approach
const MyError = error({ name: 'MyError' });
```

1. **Uniformity** — All errors use the same API, even inherited ones
2. **Multiple inheritance** — JS classes don't support multiple `extends`
3. **No `new`** — `error()` factories don't require `new`
4. **Serialization** — Inherited errors serialize the same way

**Why the `inherits` property?**

Runtime inheritance metadata enables:
- `is()` to traverse the hierarchy
- JSON serialization to preserve type info
- IDE/type support for code completion

**How does multiple inheritance work?**

The `inherits` property is a reference to the parent error factory:

```typescript
const ChildError = error({
  name: 'ChildError',
  inherits: [ParentA, ParentB],
});

// Internally, the library tracks:
// ChildError.inherits = [ParentA, ParentB]
// is(err, ParentA) checks ChildError's ancestors
```

## Related Features

- [error-function.md](./error-function.md) — Error definition
- [is-function.md](./is-function.md) — Type checking with inheritance
- [type-guards.md](./type-guards.md) — Type-safe narrowing
- [predefined-errors.md](./predefined-errors.md) — Extending predefined errors
