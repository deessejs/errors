# Task 09: Unit Tests for error() Factory

## Status

🟡 Pending

## Description

Write unit tests for the error() factory function.

## Requirements

Test the following scenarios:

- Basic error creation with name only
- Error with Standard Schema fields (Zod)
- Error with custom message
- Error with inherits (single parent)
- Error with inherits (multiple parents)
- Calling factory with fields
- Calling factory without fields
- Type inference verification

## Test Coverage

```typescript
import { error, is } from '@deessejs/errors';
import { z } from 'zod';

// Basic creation
const BasicError = error({ name: 'BasicError' });
expect(BasicError()).toBeDefined();
expect(BasicError().name).toBe('BasicError');

// With Standard Schema fields (Zod)
const FieldError = error({
  name: 'FieldError',
  fields: z.object({
    field: z.string(),
  }),
});
const err = FieldError({ field: 'value' });
expect(err.fields.field).toBe('value');

// With inheritance
const ParentError = error({ name: 'ParentError' });
const ChildError = error({ name: 'ChildError', inherits: ParentError });
expect(is(ChildError(), ParentError)).toBe(true);

// With message
const MsgError = error({
  name: 'MsgError',
  fields: z.object({
    value: z.string(),
  }),
  message: 'Value: {value}',
});
const msgErr = MsgError({ value: 'test' });
expect(msgErr.message).toBe('Value: test');
```

## Dependencies

- Task 01: error() factory implementation
- Task 04: inherits option

## Related Tasks

- Task 01: error() factory

## Notes

Use Vitest for testing. See project test setup in `vitest.config.ts`.