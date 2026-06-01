# Task 18: Integration Tests for Error Hierarchy

## Status

✅ Complete

## Description

Write integration tests for complex error hierarchies and full workflows.

## Requirements

Test complete workflows:

- Create complex multi-level hierarchies
- Test is() across multiple inheritance levels
- Test cause chains through complex hierarchies
- Verify all properties accessible throughout chain
- Test real-world error handling patterns

## Test Coverage

```typescript
import { error, raise, is, causes } from '@deessejs/errors';

// Real-world hierarchy
const AppError = error({ name: 'AppError' });
const DomainError = error({ name: 'DomainError', inherits: AppError });
const ValidationError = error({
  name: 'ValidationError',
  inherits: DomainError,
  fields: { field: { type: 'string' } },
});
const RequiredFieldError = error({
  name: 'RequiredFieldError',
  inherits: ValidationError,
  fields: { field: { type: 'string' } },
});

// Deep inheritance checking
const err = RequiredFieldError({ field: 'email' });
expect(is(err, AppError)).toBe(true);
expect(is(err, DomainError)).toBe(true);
expect(is(err, ValidationError)).toBe(true);
expect(is(err, RequiredFieldError)).toBe(true);

// Real-world error handling
try {
  try {
    throw new Error('DB connection failed');
  } catch (inner) {
    raise(DomainError().from(inner).addNote('Failed at data layer'));
  }
} catch (outer) {
  const chain = causes(outer);
  expect(chain.length).toBe(2);
  expect(chain[0].name).toBe('DomainError');
  expect(chain[0].notes).toContain('Failed at data layer');
  expect(chain[1]).toBeInstanceOf(Error);
}
```

## Dependencies

- All implementation tasks
- All unit test tasks (09-14)

## Related Tasks

- Task 09-14: Unit tests

## Notes

Use Vitest for testing.