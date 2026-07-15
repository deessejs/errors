# Feature: Context Injection with `withContext()`

## Summary

The `withContext()` function injects contextual information into errors that are raised within its scope. This is useful for adding request-specific metadata (user ID, request ID, etc.) without modifying every error definition.

## API

```typescript
function withContext<T>(context: Record<string, unknown>, fn: () => T): T;
```

### Parameters

| Parameter | Type                      | Description                         |
| --------- | ------------------------- | ----------------------------------- |
| `context` | `Record<string, unknown>` | Context key-value pairs to inject   |
| `fn`      | `() => T`                 | Function to run within this context |

### Returns

The return value of `fn`.

## Usage

### Basic Usage

```typescript
import { error, raise, withContext } from '@deessejs/errors';

const AppError = error({
  name: 'AppError',
  fields: {
    userId: { type: 'string' },
    requestId: { type: 'string' },
  },
});

withContext({ userId: '123', requestId: 'req-456' }, () => {
  riskyOperation();
});

// Any error raised here automatically gets context
```

### Context Access

```typescript
try {
  withContext({ userId: '123', requestId: 'req-456' }, () => {
    raise(AppError());
  });
} catch (err) {
  err.fields.userId; // '123'
  err.fields.requestId; // 'req-456'
  err.context; // { userId: '123', requestId: 'req-456' }

  err.message; // Formatted message with context
}
```

### Nested Contexts

```typescript
withContext({ userId: '123' }, () => {
  withContext({ requestId: 'req-456' }, () => {
    withContext({ traceId: 'trace-789' }, () => {
      raise(AppError());
    });
  });
});

// Context is merged:
err.context; // { userId: '123', requestId: 'req-456', traceId: 'trace-789' }
```

### With Async

```typescript
const result = await withContext({ userId: '123' }, async () => {
  return await fetchUserData();
});
```

### Context in Logging

```typescript
import { error, raise, withContext, causes } from '@deessejs/errors';

try {
  withContext({ userId: '123', requestId: 'req-456' }, () => {
    doSomething();
  });
} catch (err) {
  causes(err).forEach((cause) => {
    console.error({
      error: cause.name,
      context: cause.context,
      message: cause.message,
    });
  });
  throw err;
}
```

## Runtime Compatibility

Context injection relies on `AsyncLocalStorage` (Node.js) or equivalent mechanisms.

### Environment Support

| Environment        | Support     | Notes                                      |
| ------------------ | ----------- | ------------------------------------------ |
| Node.js 16+        | ✅ Full     | Native AsyncLocalStorage                   |
| Node.js 12-14      | ⚠️ Polyfill | Requires manual AsyncLocalStorage polyfill |
| Deno               | ✅ Full     | AsyncLocalStorage available                |
| Bun                | ✅ Full     | AsyncLocalStorage available                |
| Browsers           | ⚠️ Partial  | Works in modern browsers, not IE11         |
| Next.js            | ✅ Full     | Server-side rendering supported            |
| Express/Koa        | ✅ Full     | Works in request handlers                  |
| Cloudflare Workers | ❌ Limited  | No AsyncLocalStorage                       |
| AWS Lambda         | ⚠️ Varies   | Depends on runtime (Node.js vs custom)     |
| Vercel Edge        | ❌ Limited  | No AsyncLocalStorage                       |
| Web Workers        | ⚠️ Partial  | Works in dedicated workers, not shared     |

### What Happens in Unsupported Environments?

If `withContext()` is called in an environment without `AsyncLocalStorage`:

1. The function runs normally
2. No error is thrown
3. `err.context` will be `null` on any raised errors

### Explicit Compatibility Check

```typescript
import { errors } from '@deessejs/errors';

if (errors.supportsContext()) {
  // withContext() will work
} else {
  // Fall back to manual context passing
  raise(AppError({ context: getContext() }));
}
```

## Design Rationale

**Why not add context as fields?**

```typescript
// Fields approach (verbose, must add to every error)
raise(AppError({ userId: '123', requestId: 'req-456' }));

// Context approach (automatic, injected)
withContext({ userId: '123', requestId: 'req-456' }, () => {
  raise(AppError());
});
```

1. **Reduces boilerplate** — Don't add `userId` to every error definition
2. **Automatic propagation** — Context flows to any error raised in scope
3. **Composable** — Nest contexts for middleware layers (HTTP → auth → handler)

**How is context implemented?**

Context is stored using `AsyncLocalStorage`. When an error is raised:

1. The library checks for active context via the storage API
2. If found, the context is attached to the error
3. The error instance gets `context` property set

**What if error already has the field?**

Error fields override context. If the error explicitly sets a field, that value is used instead of the context value:

```typescript
withContext({ userId: '123' }, () => {
  // userId is 'different-user' in the error, not '123'
  raise(AppError({ userId: 'different-user' }));
});
```

**Why not throw an error in unsupported environments?**

Silent failure allows the code to work in supported and unsupported environments:

- In supported environments: full context injection
- In unsupported environments: code still runs, just without context

This is a pragmatic trade-off between safety and compatibility.

## Related Features

- [notes.md](./notes.md) — Notes combine well with context
- [chaining.md](./chaining.md) — Context is preserved in cause chains
- [output-formatting.md](./output-formatting.md) — Context in output
