# Task 03: Implement is() Function

## Status

✅ Complete

## Description

Implement `is(err, ErrorType)` function for type checking. Must work with inheritance hierarchies and native errors.

## Requirements

- Check if error is instance of ErrorType
- Support single inheritance checking
- Support multiple inheritance checking
- Work with native JavaScript errors

## API

```typescript
function is<T extends ErrorFactory>(err: unknown, ErrorType: T): boolean;
```

## Acceptance Criteria

- [ ] Returns `true` for exact match
- [ ] Returns `true` for child error types
- [ ] Returns `true` for errors inheriting from multiple parents
- [ ] Works with native errors (TypeError, SyntaxError, etc.)
- [ ] Returns `false` for non-matching types

## Dependencies

- Task 01: error() factory
- Task 04: inherits option

## Related Tasks

- Task 11: Unit tests for is()
- Task 08: Implement .from() method

## Notes

See [is-function.md](../../product/features/is-function.md) for design rationale.
