# Feature: Exception Chaining with `.from()`

## Summary

Every error instance has a `.from()` method for exception chaining, inspired by Python's `raise X from Y`. This preserves the full error context through multiple layers of abstraction.

## API

```typescript
interface ErrorInstance {
  from(cause: Error | ErrorInstance | Error): ErrorInstance;
  cause: Error | ErrorInstance | Error | null;
}
```

### Method Signature

| Parameter | Type | Description |
|-----------|------|-------------|
| `cause` | `Error \| ErrorInstance \| Error` | The error that caused this one |

### Returns

The error instance itself (for chaining).

## Usage

### Basic Chaining

```typescript
import { error, raise } from '@deessejs/errors';

const LowLevelError = error({ name: 'LowLevelError' });
const HighLevelError = error({ name: 'HighLevelError' });

try {
  lowLevel();
} catch (err) {
  raise(
    HighLevelError().from(err)
  );
}
```

### Chain Traversal

```typescript
import { error, raise, causes } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });
const MiddleError = error({ name: 'MiddleError' });
const TopError = error({ name: 'TopError' });

try {
  doSomething();
} catch (err) {
  throw TopError().from(
    MiddleError().from(
      AppError().from(err)
    )
  );
}

// Later, traverse the chain (most recent first)
const topErr = catchTheError();
const chain = causes(topErr);
// Chain: [TopError, MiddleError, AppError, originalerr]
```

### With Native Errors

`.from()` works seamlessly with native JavaScript errors:

```typescript
const AppError = error({ name: 'AppError' });

try {
  JSON.parse(invalidJson);
} catch (err) {
  raise(AppError().from(err));  // Works with SyntaxError
}
```

### Multiple Exception Groups

When handling multiple errors, only the first is used as the direct cause:

```typescript
const BatchError = error({
  name: 'BatchError',
  fields: { count: { type: 'number' } },
  httpStatus: 500,
});

const errors = [err1, err2, err3];
const firstError = errors[0];

// The batch error contains info about all failures
// But the cause chain only tracks the first one
raise(
  BatchError({ count: errors.length }).from(firstError)
).addNote(`${errors.length} operations failed`);
```

## Design Rationale

See [Design Philosophy](../design-philosophy.md) for core principles.

**Additional notes for `.from()`:**

**Why not named `cause()` like the property?**

`.from()` emphasizes the *action* of chaining, while `cause` is the *result*:
- `.from(err)` = "set cause to err"
- `err.cause` = "get the cause"

**How is native Error support handled?**

Internally, native errors are wrapped to support standard library features. All wrapping is transparent and preserves the native error's original properties.

## Related Features

- [error-function.md](./error-function.md) — Creating errors
- [raise-function.md](./raise-function.md) — Throwing errors
- [chain-traversal.md](./chain-traversal.md) — Traversing the cause chain
