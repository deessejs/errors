# Task 10: Unit Tests for raise() and throw

## Status

✅ Complete

## Description

Write unit tests for raise() function and native throw compatibility.

## Requirements

Test the following scenarios:

- raise() throws the error instance
- raise() return type is never
- raise() works with method chaining
- native throw works with error factories
- Error properties are preserved on throw
- Chaining raise() with .from() and .addNote()

## Test Coverage

```typescript
import { error, raise, is } from '@deessejs/errors';

// raise() throws
const TestError = error({ name: 'TestError' });
expect(() => raise(TestError())).toThrow(TestError);

// raise() with chaining
expect(() => raise(TestError().from(new Error('cause')))).toThrow();

// native throw works
expect(() => throw TestError()).toThrow(TestError);

// Error properties preserved
const err = TestError({ custom: 'data' });
expect(() => raise(err)).toThrow();
```

## Dependencies

- Task 02: raise() implementation
- Task 05: .from() implementation

## Related Tasks

- Task 02: raise() function
- Task 05: .from() method

## Notes

Use Vitest for testing.