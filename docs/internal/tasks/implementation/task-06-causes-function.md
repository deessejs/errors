# Task 06: Implement causes() Function

## Status

✅ Complete

## Description

Implement causes(err) function that returns array of all errors in the cause chain.

## Implementation

Implemented in:
- `src/causes/index.ts` - causes() function
- `src/index.ts` - exported for public API

## Requirements

- [x] Return array from most recent to root cause
- [x] Handle errors with no cause
- [x] Handle native errors in chain
- [x] Provide both function and property access

## API

```typescript
function causes(errorInstance: ErrorInstance): ErrorInstance[];

// Also available as property
err.causes; // ErrorInstance[]
```

## Acceptance Criteria

- [x] Returns array ordered most recent first
- [x] Returns empty array for error with no cause
- [x] Works through multiple chaining levels
- [x] Handles native errors in chain
- [x] `err.causes` property works same as causes(err)

## Dependencies

- Task 01: error() factory ✅
- Task 05: .from() method ✅

## Related Tasks

- Task 13: Unit tests for causes() ✅
- Task 05: .from() method ✅

## Notes

See [chain-traversal.md](../../product/features/chain-traversal.md) for design rationale.