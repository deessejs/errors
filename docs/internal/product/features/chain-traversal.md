# Feature: Chain Traversal with `causes()`

## Summary

The `causes()` function returns an array of all errors in the cause chain, from the most recent error to the original (root) cause. This enables deep debugging and error analysis.

## API

```typescript
function causes(errorInstance: ErrorInstance): ErrorInstance[];
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `errorInstance` | `ErrorInstance` | The error to traverse |

### Returns

An array of errors, ordered from most recent to root cause.

## Usage

### Basic Usage

```typescript
import { error, raise, causes } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });
const NetworkError = error({ name: 'NetworkError' });
const DatabaseError = error({ name: 'DatabaseError' });

try {
  doSomething();
} catch (err) {
  throw DatabaseError().from(
    NetworkError().from(
      AppError().from(err)
    )
  );
}

// Later
const err = catchTheError();
const chain = causes(err);
// Chain: [DatabaseError, NetworkError, AppError, originalerr]
```

### Most Recent First

The causes are listed from most recent to original:

```
[DatabaseError] → [NetworkError] → [AppError] → [OriginalError]
      ↑                ↑            ↑              ↑
   current           ...         ...            root
```

This makes sense because the most recent error is usually the most important for understanding what happened.

### Logging the Full Chain

```typescript
import { error, raise, causes } from '@deessejs/errors';

try {
  processRequest();
} catch (err) {
  console.error('Error chain:');
  causes(err).forEach((cause, i) => {
    console.error(`  ${i + 1}. [${cause.name}] ${cause.message}`);
  });
  throw err;
}
```

### Finding Specific Error Types

```typescript
import { error, raise, causes, is } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });
const TimeoutError = error({ name: 'TimeoutError' });

try {
  doSomething();
} catch (err) {
  // Check if any error in the chain is a TimeoutError
  const hasTimeout = causes(err).some(e => is(e, TimeoutError));

  if (hasTimeout) {
    // Handle timeout specially
  }
}
```

### Finding HTTP Status in Chain

```typescript
import { causes } from '@deessejs/errors';

const status = causes(err).find(e => e.httpStatus)?.httpStatus ?? 500;
```

## Property Access

The `causes` property on any error provides direct access:

```typescript
err.causes;
// Same as causes(err), but shorter
```

## Design Rationale

See [Design Philosophy](../design-philosophy.md) for core principles.

**Additional notes for `causes()`:**

**Why most-recent-first ordering?**

Most code needs to find the most relevant (most recent) error first:
- Find HTTP status: `err.causes.find(e => e.httpStatus)?.httpStatus`
- Type checking: `err.causes.some(e => is(e, TimeoutError))`

**Why different from `err.cause.cause.cause`?**

- `causes(err)` makes intent explicit
- Works reliably across refactoring
- Can be passed around as a value

## Related Features

- [chaining.md](./chaining.md) — Setting cause with `.from()`
- [is-function.md](./is-function.md) — Type checking
- [notes.md](./notes.md) — Notes are preserved through chains
