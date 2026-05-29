# Task 04: Implement inherits Option

## Status

✅ Complete

## Description

Add inheritance support to error() config. Support both single parent and multiple parents.

## Implementation

Implemented in:
- `src/error/error.ts` - Factory creation with inherits support
- `src/error/types.ts` - ErrorFactory type with inherits property
- `src/is/index.ts` - DFS traversal for inheritance chain checking

## Requirements

- [x] Accept single ErrorFactory as parent
- [x] Accept array of ErrorFactories as parents
- [x] Track inheritance relationships for is() checking
- [x] Support deep inheritance chains

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

- [x] Single parent inheritance works
- [x] Multiple parent inheritance works
- [x] Deep inheritance chains work
- [x] Inheritance metadata is stored on factory
- [x] is() function respects inheritance

## Dependencies

- Task 01: error() factory ✅
- Task 03: is() function ✅

## Related Tasks

- Task 01: error() factory (integrate into) ✅
- Task 11: Unit tests for is() ✅

## Notes

See [inheritance.md](../../product/features/inheritance.md) for design rationale.