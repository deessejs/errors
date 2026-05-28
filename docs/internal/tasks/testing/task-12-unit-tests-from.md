# Task 12: Unit Tests for .from() Method

## Status

🟡 Pending

## Description

Write unit tests for .from() exception chaining method.

## Requirements

Test the following scenarios:

- .from() sets cause property
- .from() works with native errors
- .from() returns instance for chaining
- Multiple .from() calls work
- Chain preserves original cause
- .from() works at any point in chain

## Test Coverage

```typescript
import { error, raise } from '@deessejs/errors';

const LowError = error({ name: 'LowError' });
const HighError = error({ name: 'HighError' });

// Basic chaining
const cause = new Error('original');
const err = HighError().from(cause);
expect(err.cause).toBe(cause);

// Native error
const nativeErr = HighError().from(new TypeError('type error'));
expect(nativeErr.cause).toBeInstanceOf(TypeError);

// Multiple levels
const chain = HighError().from(LowError().from(cause));
expect(chain.cause).toBeInstanceOf(LowError);
expect((chain.cause as any).cause).toBe(cause);

// Chaining returns instance
const result = HighError().from(cause);
expect(result).toBe(HighError);
```

## Dependencies

- Task 05: .from() implementation

## Related Tasks

- Task 05: .from() method
- Task 06: causes() function

## Notes

Use Vitest for testing.