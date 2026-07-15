# Task 13: Unit Tests for causes() Function

## Status

✅ Complete

## Description

Write unit tests for causes() chain traversal function.

## Requirements

Test the following scenarios:

- Returns array ordered most recent first
- Returns empty array for error with no cause
- Works through multiple chaining levels
- Handles native errors in chain
- err.causes property matches causes() function

## Test Coverage

```typescript
import { error, causes } from '@deessejs/errors';

const Error1 = error({ name: 'Error1' });
const Error2 = error({ name: 'Error2' });
const Error3 = error({ name: 'Error3' });

// Single error - empty causes
const single = Error1();
expect(causes(single)).toEqual([]);

// Chain
const root = new Error('root');
const chain = Error3().from(Error2().from(Error1().from(root)));
const result = causes(chain);

// Most recent first
expect(result[0].name).toBe('Error3');
expect(result[1].name).toBe('Error2');
expect(result[2].name).toBe('Error1');
expect(result[3]).toBe(root);

// Property matches function
expect(chain.causes).toEqual(causes(chain));
```

## Dependencies

- Task 06: causes() implementation

## Related Tasks

- Task 06: causes() function
- Task 05: .from() method

## Notes

Use Vitest for testing.
