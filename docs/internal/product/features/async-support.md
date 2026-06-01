# Feature: Async Support

## Summary

The package works seamlessly with async operations and provides patterns for handling errors in concurrent workflows. While there's no built-in `ExceptionGroup`, the library provides patterns for aggregating and propagating async errors.

## API

There are no new async-specific exports — the standard features work in async contexts:

- `.from()` chains errors in `try/catch`
- `.addNote()` enriches async errors
- `withContext()` works with async functions
- `causes()` traverses async error chains
- Catching errors in `Promise.allSettled()` patterns

## Usage

### Basic Async Try/Catch

```typescript
import { error, raise } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });

async function fetchUser(id: string) {
  try {
    const user = await getUser(id);
    return user;
  } catch (err) {
    raise(
      AppError().from(err).addNote(`Failed to fetch user ${id}`)
    );
  }
}
```

### Promise.allSettled Pattern

When multiple operations run concurrently, handle failures gracefully:

```typescript
import { errors, raise } from '@deessejs/errors';

async function processAll(items: Item[]) {
  const results = await Promise.allSettled(
    items.map(item => processItem(item))
  );

  const failures = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);

  if (failures.length > 0) {
    raise(
      errors.ValidationError({
        field: 'batch',
        message: `${failures.length}/${items.length} items failed`,
      }).from(failures[0])
    );
  }

  // Return successful results
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}
```

### Async Context Injection

```typescript
import { errors, raise, withContext } from '@deessejs/errors';

async function handleRequest(req: Request) {
  return withContext(
    { requestId: req.id, userId: req.userId },
    async () => {
      const user = await fetchUser(req.userId);
      return processUser(user);
    }
  );
  // Any error raised here has request context
}
```

### Async Chain Traversal

```typescript
import { errors, raise, causes } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });

async function operation() {
  try {
    await step1();
  } catch (err) {
    throw AppError().from(err).addNote('Step 1 failed');
  }
}

async function workflow() {
  try {
    await operation();
  } catch (err) {
    // Log the full chain
    console.error('Error chain:');
    causes(err).forEach(cause => {
      console.error(`  - ${cause.name}: ${cause.message}`);
      cause.notes.forEach(note => console.error(`    Note: ${note}`));
    });
    throw err;
  }
}
```

### Sequential Operations with Accumulation

```typescript
import { errors, error, raise, is } from '@deessejs/errors';

const AppError = errors.ValidationError;
const RequiredFieldError = error({
  name: 'RequiredFieldError',
  inherits: AppError,
  fields: { field: { type: 'string' } },
});

async function validateAndProcess(item: Item) {
  const validationErrors: RequiredFieldError[] = [];

  for (const validator of validators) {
    try {
      await validator(item);
    } catch (err) {
      if (is(err, AppError)) {
        validationErrors.push(err as RequiredFieldError);
      } else {
        throw err;  // Re-throw non-validation errors
      }
    }
  }

  if (validationErrors.length > 0) {
    const first = validationErrors[0];
    throw AppError({
      field: 'batch',
      message: `${validationErrors.length} validation errors`,
    })
      .from(first)
      .addNote(`${validationErrors.length} items failed validation`);
  }

  return processSuccess(item);
}
```

## Error Boundary Pattern

For robust async error handling:

```typescript
import { errors, raise, is } from '@deessejs/errors';

type ErrorHandler = (err: Error) => void;

// Generic async wrapper with error handling
async function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError: ErrorHandler = () => {}
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    onError(err);
    throw err;
  }
}

// Usage
await withErrorHandling(
  () => fetchData(url),
  (err) => {
    if (is(err, errors.TimeoutError)) {
      logger.warn('Request timed out', { url });
    } else {
      logger.error('Request failed', err);
    }
  }
);
```

## Design Rationale

**Why no ExceptionGroup?**

Python's `ExceptionGroup` bundles multiple errors for `except*` handling. In JS:
1. **No `except*`** — JS lacks Python's `except*` syntax
2. **Promise.allSettled** — Handles the common case well
3. **Simplicity for v1** — One error at a time is simpler

For v1, we provide patterns that work with `Promise.allSettled` rather than adding complex group semantics.

**Async vs Sync API**

All features work the same in sync and async contexts:
- `.from()` chains regardless of how error was thrown
- `.addNote()` enriches regardless of sync/async
- `withContext()` works with async functions
- `causes()` traverses async chains

All chaining is temporal (one error caused another), not parallel.

## Related Features

- [chaining.md](./chaining.md) — How cause chains work
- [context-injection.md](./context-injection.md) — Async context
- [notes.md](./notes.md) — Async error enrichment
- [output-formatting.md](./output-formatting.md) — Async error logging
