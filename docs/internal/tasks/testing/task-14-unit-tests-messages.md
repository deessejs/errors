# Task 14: Unit Tests for Message Formatting

## Status

✅ Complete

## Description

Write unit tests for message template formatting.

## Requirements

Test the following scenarios:

- Basic {field} substitution
- Multiple fields in message
- :upper modifier
- :lower modifier
- :json modifier
- Escaping with backslash
- Missing field handled gracefully
- No template returns name as message

## Test Coverage

```typescript
import { error } from '@deessejs/errors';
import { z } from 'zod';

const MsgError = error({
  name: 'MsgError',
  fields: z.object({
    field: z.string(),
    count: z.number(),
  }),
  message: 'Field "{field}" has {count} items',
});

// Basic substitution
const err = MsgError({ field: 'email', count: 5 });
expect(err.message).toBe('Field "email" has 5 items');

// :upper modifier
const UpperError = error({
  name: 'UpperError',
  fields: z.object({
    value: z.string(),
  }),
  message: 'Value: {value:upper}',
});
expect(UpperError({ value: 'hello' }).message).toBe('Value: HELLO');

// :json modifier
const JsonError = error({
  name: 'JsonError',
  fields: z.object({
    data: z.record(z.unknown()),
  }),
  message: 'Data: {data:json}',
});
expect(JsonError({ data: { id: 1 } }).message).toBe('Data: {"id":1}');

// Escaping
const EscapeError = error({
  name: 'EscapeError',
  message: 'Enter \{field\} here',
});
expect(EscapeError().message).toBe('Enter {field} here');
```

## Dependencies

- Task 07: message templates

## Related Tasks

- Task 07: message templates

## Notes

Use Vitest for testing.
