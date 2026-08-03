# Task 07: Implement Message Templates

## Status

✅ Complete

## Description

Implement message template parsing with {field} placeholders and modifiers.

## Implementation

Implemented in:

- `src/error/format.ts` - formatTemplate and hasTemplatePlaceholders functions
- Integrated into `src/error/error.ts` during error factory invocation

## Requirements

- [x] Parse {field} placeholders in message
- [x] Replace with field values from error instance
- [x] Support modifiers: :upper, :lower, :json
- [x] Support escaping with backslash
- [x] Missing fields handled gracefully

## API

```typescript
const ValidationError = error({
  name: 'ValidationError',
  fields: { field: { type: 'string' } },
  message: 'Field "{field}" is invalid',
});

const err = ValidationError({ field: 'email' });
err.message; // 'Field "email" is invalid'
```

## Acceptance Criteria

- [x] Basic {field} substitution works
- [x] :upper modifier works
- [x] :lower modifier works
- [x] :json modifier works
- [x] Escaping with \ works
- [x] Missing fields handled gracefully

## Dependencies

- Task 01: error() factory ✅

## Related Tasks

- Task 14: Unit tests for message formatting ✅

## Notes

See [message-formatting.md](../../product/features/message-formatting.md) for design rationale.
