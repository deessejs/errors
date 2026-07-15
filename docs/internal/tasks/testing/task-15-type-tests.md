# Task 15: Type Tests for TypeScript Compatibility

## Status

✅ Complete

## Description

Write TypeScript type tests to verify type inference and compatibility.

## Requirements

Test the following type scenarios:

- error() type inference for input/output
- ErrorFactory callable types
- ErrorInstance properties types
- is() type narrowing
- Inheritance types
- Generic constraints

## Test Coverage

```typescript
import { error, is } from '@deessejs/errors';

// Type inference for fields
const FieldError = error({
  name: 'FieldError',
  fields: { field: { type: 'string' }, count: { type: 'number' } },
});

// Input type should be Partial<{field: string, count: number}>
const err = FieldError({ field: 'test' }); // count is optional

// Output type should include fields
err.fields.field; // string
err.fields.count; // number

// Inheritance types
const Parent = error({ name: 'Parent' });
const Child = error({ name: 'Child', inherits: Parent });

// is() narrowing
if (is(err, Child)) {
  err.fields; // Should be typed correctly
}

// All properties exist
const basic = Parent();
basic.name; // string
basic.message; // string
basic.stack; // string
basic.fields; // Record<string, unknown>
basic.notes; // string[]
basic.cause; // Error | null
basic.causes; // Error[]
basic.context; // Record | null
```

## Dependencies

- All implementation tasks (01-08)

## Related Tasks

- Task 08: ErrorInstance properties

## Notes

Use Vitest with `@tsd` or plain TypeScript compilation tests.
