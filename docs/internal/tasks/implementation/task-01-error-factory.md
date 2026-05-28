# Task 01: Implement error() Factory Function

## Status

🟡 Pending

## Description

Create the `error()` factory function that returns an ErrorFactory. This is the core building block of the library.

## Requirements

- Accept config object with: `name`, `fields?`, `inherits?`, `message?`, `httpStatus?`
- Return a callable factory function
- Support type inference for fields
- Handle single and multiple inheritance
- Generate proper ErrorInstance instances

## API

```typescript
function error<T extends Record<string, unknown> = Record<string, unknown>>(
  config: ErrorConfig<T>
): ErrorFactory<T>
```

## Acceptance Criteria

- [ ] Function accepts ErrorConfig and returns ErrorFactory
- [ ] Factory is callable with optional fields
- [ ] Type inference works for input/output types
- [ ] `inherits` option works for single parent
- [ ] `inherits` option works for multiple parents
- [ ] `message` template is stored for later formatting
- [ ] `httpStatus` is stored if provided
- [ ] Factory has `name` property
- [ ] Factory has `inherits` property if specified

## Dependencies

None

## Related Tasks

- Task 04: Implement inherits option
- Task 07: Implement message templates
- Task 09: Unit tests for error()

## Notes

See [error-function.md](../../product/features/error-function.md) for design rationale.