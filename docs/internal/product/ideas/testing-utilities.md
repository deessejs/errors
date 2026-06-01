# Idea: @deessejs/errors/testing — Enhanced Error Testing Utilities

## Summary

Create a dedicated testing module for `@deessejs/errors` that provides powerful assertions, matchers, and helpers for testing error handling in Vitest/Jest.

## Motivation

Testing error handling in TypeScript is verbose and error-prone:

```typescript
// Current approach (verbose)
try {
  doSomething();
} catch (err) {
  if (err.name !== 'ValidationError') throw err;
  if (err.fields?.field !== 'email') throw err;
}

// What we want
expect(err).toBeValidationError();
expect(err).toHaveField('field', 'email');
expect(err).toHaveHttpStatus(400);
```

Existing testing utilities are generic. This module is purpose-built for `@deessejs/errors` with full type safety and error-specific assertions.

## Proposed API

### Installation

```typescript
// vitest.setup.ts
import '@deessejs/errors/testing';
```

### Custom Matchers

```typescript
// === expect().toBeError() ===
expect(err).toBeError();
// Aliases
expect(err).toBeValidationError();
expect(err).toBeNotFoundError();
expect(err).toBeTimeoutError();

// === expect().toHaveField(field, value) ===
expect(err).toHaveField('email', 'user@example.com');
expect(err).toHaveField('path', '/users/123');

// === expect().toHaveHttpStatus(status) ===
expect(err).toHaveHttpStatus(400);
expect(err).toHaveHttpStatus(404);

// === expect().toHaveNote(note) ===
expect(err).toHaveNote('Added in retry');
expect(err).toHaveNotes(['First note', 'Second note']);

// === expect().toHaveCause(name) ===
expect(err).toHaveCause('DatabaseError');

// === expect().toHaveCauseChain(names) ===
expect(err).toHaveCauseChain(['HighError', 'MidError', 'LowError']);
```

### Snapshot Testing

```typescript
import { errorSnapshot } from '@deessejs/errors/testing';

test('error formats correctly', () => {
  const err = ValidationError({ field: 'email' })
    .addNote('Test note')
    .from(NetworkError());

  // Returns a formatted string suitable for snapshots
  expect(errorSnapshot(err)).toMatchSnapshot();
});
```

Output:
```
ValidationError: Field "email" is invalid
  field: "email"
  notes: ["Test note"]
  cause: NetworkError
---
```

### Chain Assertions

```typescript
import { assertCauseChain } from '@deessejs/errors/testing';

// Verify cause chain structure
assertCauseChain(err, {
  length: 3,
  last: { name: 'RootError' },
  contains: ['MidError'],
});

// Works with chai-like syntax too
expect(err.causes).toHaveChain(['HighError', 'MidError', 'LowError']);
```

### Mock Context Injection

```typescript
import { withMockContext } from '@deessejs/errors/testing';

test('errors capture context', () => {
  const error = withMockContext({ userId: '123', requestId: 'req-456' }, () => {
    return ValidationError({ field: 'email' });
  });

  expect(error.context).toEqual({ userId: '123', requestId: 'req-456' });
});
```

### Async Error Assertions

```typescript
import { assertAllSettled } from '@deessejs/errors/testing';

test('aggregates failures correctly', async () => {
  const results = await Promise.allSettled(tasks);

  const errors = assertAllSettled(results);

  // Returns typed errors array
  errors[0].name;           // 'ValidationError'
  errors[0].fields.field;   // 'email'

  // Can filter by type
  const validationErrors = errors.ofType(ValidationError);
  expect(validationErrors).toHaveLength(2);
});

test('async errors have correct http status', async () => {
  const results = await Promise.allSettled(tasks);

  assertAllSettled(results).each((err) => {
    expect(err).toHaveHttpStatus(400);
  });
});
```

### Error Factory Testing

```typescript
import { testErrorFactory } from '@deessejs/errors/testing';

// Test that an error factory has the expected shape
testErrorFactory(ValidationError, {
  name: 'ValidationError',
  fields: ['field', 'message'],
  inherits: AppError,
  hasTemplate: true,
  template: 'Field "{field}" is {message}',
});
```

### Type Testing Helpers

```typescript
import { testTypeGuards } from '@deessejs/errors/testing';

// Ensure type guards work correctly
testTypeGuards({
  'ValidationError': {
    instance: ValidationError({ field: 'email' }),
    shouldMatch: [EmailValidationError({ value: 'x' })],
    shouldNotMatch: [NetworkError(), NotFoundError({ path: '/' })],
  },
  'NotFoundError': {
    instance: NotFoundError({ path: '/users' }),
    shouldMatch: [UserNotFoundError({ userId: '123' })],
    shouldNotMatch: [ValidationError({ field: 'x' })],
  },
});
```

## File Structure

```
errors/testing/
├── index.ts                    // Main export
├── matchers.ts                 // expect().toBeError() etc.
├── snapshots.ts                // errorSnapshot()
├── assertions.ts              // assertCauseChain()
├── mocks.ts                   // withMockContext()
├── async.ts                  // assertAllSettled()
├── factory.ts                // testErrorFactory()
├── types.ts                  // Type definitions
└── integration/
    ├── vitest.ts             // Vitest matcher registration
    └── jest.ts               // Jest matcher registration
```

## Implementation Notes

### Matcher Registration

```typescript
// vitest.ts
import { defineMatcher } from '@deessejs/errors/testing';

declare module 'vitest' {
  interface Chai {
    toBeError(): Chai.ChaiAssertion;
    toHaveField(field: string, value: unknown): Chai.ChaiAssertion;
    toHaveHttpStatus(status: number): Chai.ChaiAssertion;
    toHaveNote(note: string): Chai.ChaiAssertion;
    toHaveCause(name: string): Chai.ChaiAssertion;
    toHaveCauseChain(names: string[]): Chai.ChaiAssertion;
  }
}
```

### Snapshot Format

```typescript
// snapshots.ts
export function errorSnapshot(err: ErrorInstance): string {
  const lines = [
    `${err.name}: ${err.message}`,
  ];

  if (Object.keys(err.fields).length > 0) {
    lines.push(`  fields: ${JSON.stringify(err.fields)}`);
  }

  if (err.notes.length > 0) {
    lines.push(`  notes: ${JSON.stringify(err.notes)}`);
  }

  }

  if (err.cause) {
    lines.push(`  cause: ${err.cause.name}`);
  }

  return lines.join('\n');
}
```

### Async Assertion

```typescript
// async.ts
export function assertAllSettled<T>(
  results: PromiseSettledResult<T>[]
): ErrorInstance[] {
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason as ErrorInstance);

  if (errors.length === 0) {
    throw new Error('No errors found in settled results');
  }

  return errors;
}

// Extend with type filtering
export function filterByType<T extends ErrorInstance>(
  errors: ErrorInstance[],
  type: T
): T[] {
  return errors.filter(err => is(err, type)) as T[];
}
```

## Comparison with Alternatives

| Feature | Vitest Built-in | @deessejs/errors/testing |
|---------|-----------------|--------------------------|
| toThrow | ✓ | ✓ (with full type narrowing) |
| toHaveHttpStatus | ✗ | ✓ |
| toHaveField | ✗ | ✓ |
| toHaveCauseChain | ✗ | ✓ |
| toHaveNote | ✗ | ✓ |
| Context mocking | ✗ | ✓ |
| Async aggregation | ✗ | ✓ |
| Type guard testing | ✗ | ✓ |

## Related Features

- [testing.md](../guides/testing.md) — Manual testing patterns
- [type-guards.md](../features/type-guards.md) — Type-safe narrowing
- [chain-traversal.md](../features/chain-traversal.md) — Cause chains

## Status

- [ ] Draft
- [x] Approved for development
- [ ] Implemented

## Notes

- Consider whether to ship this as part of the main package or as `@deessejs/errors/testing`
- Needs compatibility with both Jest and Vitest
- Consider adding `expect().toThrowLike(ErrorFactory)` for more flexible matching