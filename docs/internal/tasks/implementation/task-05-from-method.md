# Task 05: Implement .from() Method

## Status

🟡 Pending

## Description

Add .from(cause) method to ErrorInstance for exception chaining.

## Requirements

- Accept Error, ErrorInstance, or native error
- Set the cause on the error instance
- Return the error instance for chaining
- Preserve original cause chain

## API

```typescript
interface ErrorInstance {
  from(cause: Error | ErrorInstance): ErrorInstance;
}
```

## Acceptance Criteria

- [ ] Method sets err.cause property
- [ ] Works with native JS errors
- [ ] Returns instance for chaining
- [ ] Chainability: `err.from(a).from(b)` works
- [ ] Original cause chain is preserved

## Dependencies

- Task 01: error() factory (add method to instance)

## Related Tasks

- Task 10: Unit tests for raise()
- Task 12: Unit tests for .from()
- Task 06: causes() function

## Notes

See [chaining.md](../../product/features/chaining.md) for design rationale.