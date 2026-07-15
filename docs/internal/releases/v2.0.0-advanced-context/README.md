# Release v2.0.0 — Advanced Context

## Overview

This major release adds context injection via `AsyncLocalStorage` and advanced async patterns. These features enable request-scoped error context propagation without explicit parameter passing.

## Release Date

Target: TBD (after v1.3.0)

## Motivation

In production applications, errors need to carry request-specific metadata (user ID, request ID, trace ID) without modifying every function signature. `withContext()` provides automatic propagation through the call stack using `AsyncLocalStorage`.

## Breaking Changes

This is a **major version** release with potential breaking changes:

1. `ErrorInstance.context` is now guaranteed to be populated in supported environments
2. Error instances may behave differently in environments without `AsyncLocalStorage`

## What's Included

### Context Injection: `withContext()`

```typescript
import { withContext, raise } from '@deessejs/errors';

async function handleRequest(req: Request) {
  return withContext({ requestId: req.id, userId: req.userId }, async () => {
    const user = await fetchUser(req.userId);
    return processUser(user);
  });
  // Any error raised here automatically has context
}
```

#### How It Works

1. `withContext()` stores context in `AsyncLocalStorage`
2. When an error is raised, the library checks for active context
3. If found, context is attached to `err.context`

#### Nested Contexts

```typescript
withContext({ userId: '123' }, () => {
  withContext({ requestId: 'req-456' }, () => {
    withContext({ traceId: 'trace-789' }, () => {
      raise(AppError());
    });
  });
});

// err.context === { userId: '123', requestId: 'req-456', traceId: 'trace-789' }
```

#### Error Fields Override Context

If an error explicitly sets a field, that value takes precedence:

```typescript
withContext({ userId: '123' }, () => {
  raise(AppError({ userId: 'different-user' }));
  // err.fields.userId === 'different-user'
  // err.context.userId === '123'
});
```

### Compatibility Detection

Check if `withContext()` will work in your environment:

```typescript
import { errors } from '@deessejs/errors';

if (errors.supportsContext()) {
  // withContext() will work
} else {
  // Fall back to manual context passing
  raise(AppError({ context: getContext() }));
}
```

### Runtime Compatibility

| Environment        | Support  | Notes                                      |
| ------------------ | -------- | ------------------------------------------ |
| Node.js 16+        | Full     | Native AsyncLocalStorage                   |
| Node.js 12-14      | Polyfill | Requires manual AsyncLocalStorage polyfill |
| Deno               | Full     | AsyncLocalStorage available                |
| Bun                | Full     | AsyncLocalStorage available                |
| Browsers           | Partial  | Works in modern browsers, not IE11         |
| Next.js            | Full     | Server-side rendering supported            |
| Express/Koa        | Full     | Works in request handlers                  |
| Cloudflare Workers | Limited  | No AsyncLocalStorage                       |
| AWS Lambda         | Varies   | Depends on runtime                         |
| Vercel Edge        | Limited  | No AsyncLocalStorage                       |

### Error Handling Best Practices

See [Async Support Feature](../product/features/async-support.md) for detailed patterns.

### Graceful Degradation

In unsupported environments:

1. `withContext()` runs the function normally
2. No error is thrown
3. `err.context` will be `null`

This allows code to work in both supported and unsupported environments.

## What's NOT Included

This release does not include:

- **ExceptionGroup** — JavaScript lacks Python's `except*` syntax
- **try...except...else** — JS lacks the `else` clause

## API Changes

### New Exports

```typescript
export const withContext: <T>(context: Record<string, unknown>, fn: () => T) => T;

export const errors: {
  // ... from v1.x ...

  supportsContext: () => boolean;
};

export type ErrorInstance<T extends Record<string, unknown> = Record<string, unknown>> = {
  // ... from v1.x ...
  context: Record<string, unknown> | null; // Now populated by withContext()
};
```

### ErrorInstance Behavior Change

```typescript
// In v1.x, context is always null unless manually set
err.context === null; // Always in v1.x

// In v2.0, context is populated when raised within withContext()
err.context; // Record<string, unknown> | null
```

## Migration Path

### From v1.x

1. Update import if using `withContext()`:

   ```typescript
   // No import changes needed
   import { withContext } from '@deessejs/errors';
   ```

2. Check for compatibility if critical:

   ```typescript
   import { errors } from '@deessejs/errors';

   if (!errors.supportsContext()) {
     console.warn('withContext() not supported in this environment');
   }
   ```

3. Existing errors without context continue to work:
   ```typescript
   // These continue to work
   raise(AppError());
   raise(AppError().from(err));
   ```

### Breaking Changes Summary

| Change                                             | Type       | Mitigation                     |
| -------------------------------------------------- | ---------- | ------------------------------ |
| `context` may now be populated                     | Behavioral | Check `err.context ?? {}`      |
| `withContext()` silently fails in unsupported envs | Behavioral | Use `errors.supportsContext()` |

## Testing Requirements

- [ ] Unit tests for withContext() basic usage
- [ ] Unit tests for nested contexts
- [ ] Unit tests for context merging
- [ ] Unit tests for error fields overriding context
- [ ] Unit tests for async functions with withContext()
- [ ] Unit tests for errors.supportsContext()
- [ ] Unit tests for graceful degradation in unsupported environments
- [ ] Integration tests with Express/Koa middleware
- [ ] Type tests for TypeScript compatibility

## Changelog Entry

```markdown
## v2.0.0 — Advanced Context (YYYY-MM-DD)

### Added

- `withContext()` for AsyncLocalStorage-based context injection
- Nested context support with automatic merging
- `errors.supportsContext()` for compatibility detection
- Context propagation through async call stacks

### Changed

- ErrorInstance.context is now populated in supported environments
- Error fields override context values (breaking)

### Breaking Changes

- Context behavior may differ in unsupported environments
- See migration guide for details

### Removed

- (None)
```

## Related Documents

- [Context Injection Feature](../product/features/context-injection.md)
- [Async Support Feature](../product/features/async-support.md)
- [Testing Guide](../product/guides/testing.md) (updated for async patterns)
