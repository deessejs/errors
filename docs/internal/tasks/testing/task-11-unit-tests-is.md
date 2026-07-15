# Task 11: Unit Tests for is() Function

## Status

✅ Complete

## Description

Write unit tests for is() type checking function.

## Requirements

Test the following scenarios:

- is() returns true for exact match
- is() returns true for single inheritance
- is() returns true for multiple inheritance
- is() returns true for deep inheritance chains
- is() works with native errors
- is() returns false for non-matching types
- is() works with ErrorInstance

## Test Coverage

```typescript
import { error, is } from '@deessejs/errors';

// Single inheritance
const AppError = error({ name: 'AppError' });
const ValidationError = error({ name: 'ValidationError', inherits: AppError });
expect(is(ValidationError(), AppError)).toBe(true);

// Multiple inheritance
const NetworkError = error({ name: 'NetworkError' });
const StorageError = error({ name: 'StorageError' });
const CombinedError = error({
  name: 'CombinedError',
  inherits: [NetworkError, StorageError],
});
expect(is(CombinedError(), NetworkError)).toBe(true);
expect(is(CombinedError(), StorageError)).toBe(true);

// Native errors
expect(is(new TypeError(), TypeError)).toBe(true);

// False case
expect(is(ValidationError(), NetworkError)).toBe(false);
```

## Dependencies

- Task 03: is() implementation
- Task 04: inherits option

## Related Tasks

- Task 03: is() function
- Task 04: inherits option

## Notes

Use Vitest for testing.
