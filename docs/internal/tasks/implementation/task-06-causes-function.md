# Task 06: Implement causes() Function

## Status

🟡 Pending

## Description

Implement causes(err) function that returns array of all errors in the cause chain.

## Requirements

- Return array from most recent to root cause
- Handle errors with no cause
- Handle native errors in chain
- Provide both function and property access

## API

```typescript
function causes(errorInstance: ErrorInstance): ErrorInstance[];

// Also available as property
err.causes; // ErrorInstance[]
```

## Acceptance Criteria

- [ ] Returns array ordered most recent first
- [ ] Returns empty array for error with no cause
- [ ] Works through multiple chaining levels
- [ ] Handles native errors in chain
- [ ] `err.causes` property works same as causes(err)

## Dependencies

- Task 01: error() factory
- Task 05: .from() method

## Related Tasks

- Task 13: Unit tests for causes()
- Task 05: .from() method

## Notes

See [chain-traversal.md](../../product/features/chain-traversal.md) for design rationale.