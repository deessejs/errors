# Task 07: Implement Message Templates

## Status

🟡 Pending

## Description

Implement message template parsing with {field} placeholders and modifiers.

## Requirements

- Parse {field} placeholders in message
- Replace with field values from error instance
- Support modifiers: :upper, :lower, :json
- Support escaping with backslash

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

- [ ] Basic {field} substitution works
- [ ] :upper modifier works
- [ ] :lower modifier works
- [ ] :json modifier works
- [ ] Escaping with \ works
- [ ] Missing fields handled gracefully

## Dependencies

- Task 01: error() factory (integrate into)

## Related Tasks

- Task 14: Unit tests for message formatting

## Notes

See [message-formatting.md](../../product/features/message-formatting.md) for design rationale.