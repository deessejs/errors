# Task 02: Implement raise() Function

## Status

✅ Complete

## Description

Implement `raise()` function that throws errors. Must also support native `throw` syntax for compatibility.

## Requirements

- Accept ErrorInstance and throw it
- Return type must be `never` for type safety
- Support method chaining: `raise(error.from(cause).addNote('...'))`

## API

```typescript
function raise(errorInstance: ErrorInstance): never;
```

## Acceptance Criteria

- [ ] Function throws the error instance
- [ ] Return type is `never`
- [ ] Works with native `throw` syntax
- [ ] Preserves error properties on thrown error
- [ ] Chaining works: `raise(AppError().from(err))`

## Dependencies

- Task 01: error() factory (to create errors to raise)

## Related Tasks

- Task 10: Unit tests for raise()
- Task 05: Implement .from() method

## Notes

See [raise-function.md](../../product/features/raise-function.md) for design rationale.
