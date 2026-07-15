# Feature: Stack Cleaning with `stripLibraryFrames()`

## Summary

The `stripLibraryFrames()` function removes internal `@deessejs/errors` frames from error stack traces, producing cleaner error reports for debugging and logging.

## API

```typescript
function stripLibraryFrames(errorInstance: ErrorInstance): ErrorInstance;
```

### Parameters

| Parameter       | Type            | Description        |
| --------------- | --------------- | ------------------ |
| `errorInstance` | `ErrorInstance` | The error to clean |

### Returns

The same error instance (with cleaned stack).

## Usage

### Basic Usage

```typescript
import { error, raise, stripLibraryFrames } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });

try {
  doSomething();
} catch (err) {
  raise(stripLibraryFrames(AppError()));
}

// err.stack now excludes internal library frames
```

### Accessing Cleaned Stack

```typescript
import { error, raise, stripLibraryFrames } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });

const err = stripLibraryFrames(AppError());

err.stack; // Stack trace without @deessejs/errors frames
```

### In Defensive Wrappers

```typescript
import { error, raise, stripLibraryFrames } from '@deessejs/errors';

function safeOperation<T>(operation: () => T): T {
  try {
    return operation();
  } catch (err) {
    // Clean stack before re-raising to hide library internals
    raise(stripLibraryFrames(AppError().from(err)));
  }
}
```

### Logging Cleaner Traces

```typescript
import { error, raise, stripLibraryFrames, causes } from '@deessejs/errors';

try {
  doSomething();
} catch (err) {
  // Log each error in chain with clean stacks
  causes(err).forEach((cause, i) => {
    console.error(`[${i + 1}] ${cause.name}: ${cause.message}`);
    console.error(stripLibraryFrames(cause).stack);
  });
  throw err;
}
```

## How It Works

### Before (Raw Stack)

```
Error: AppError
    at doSomething (file:///app/index.ts:15:10)
    at callError (file:///app/node_modules/@deessejs/errors/dist/index.js:142:10)
    at raise (file:///app/node_modules/@deessejs/errors/dist/index.js:88:15)
    at main (file:///app/index.ts:10:5)
    at run (file:///app/node_modules/@deessejs/errors/dist/index.js:201:5)
    at Module._compile (node:internal/modules/cjs/loader:1560:9)
```

### After (Cleaned)

```
Error: AppError
    at doSomething (file:///app/index.ts:15:10)
    at main (file:///app/index.ts:10:5)
    at Module._compile (node:internal/modules/cjs/loader:1560:9)
```

## Design Rationale

**Why needed?**

Stack traces are valuable but often include internal library frames that clutter output:

1. **Clarity** — User code traces are easier to follow
2. **Shorter logs** — Less noise in production logs
3. **Security** — Could hide library internals in some scenarios

**Why filter only library frames, not all dependencies?**

```typescript
// Removes only @deessejs/errors frames
stripLibraryFrames(err);

// Not this
sanitizeStack(err, ['lodash', 'express']); // Too aggressive
```

The library is opt-in; users explicitly choose to clean library frames. Removing all dependency frames would hide potentially useful debugging info.

**Why not always clean?**

- **Development** — Full stacks help library debugging
- **Opt-in** — `stripLibraryFrames()` explicitly marks intent
- **Transparency** — Users choose when to modify their error's stack trace

## Related Features

- [chaining.md](./chaining.md) — Stack is preserved in cause chains
- [output-formatting.md](./output-formatting.md) — Stack in dev vs prod
- [raise-function.md](./raise-function.md) — Combining with raise
