# Task 04: Implement inherits Option

## Status

🟡 Pending

## Description

Add inheritance support to error() config. Support both single parent and multiple parents.

## Requirements

- Accept single ErrorFactory as parent
- Accept array of ErrorFactories as parents
- Track inheritance relationships for is() checking
- Support deep inheritance chains

## API

```typescript
// Single inheritance
const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
});

// Multiple inheritance
const CombinedError = error({
  name: 'CombinedError',
  inherits: [NetworkError, StorageError],
});
```

## Acceptance Criteria

- [ ] Single parent inheritance works
- [ ] Multiple parent inheritance works
- [ ] Deep inheritance chains work
- [ ] Inheritance metadata is stored on factory
- [ ] is() function respects inheritance

## Dependencies

- Task 01: error() factory
- Task 03: is() function

## Related Tasks

- Task 01: error() factory (integrate into)
- Task 11: Unit tests for is()

## Notes

See [inheritance.md](../../product/features/inheritance.md) for design rationale.