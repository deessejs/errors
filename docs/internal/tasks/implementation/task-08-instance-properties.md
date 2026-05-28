# Task 08: ErrorInstance Properties

## Status

🟡 Pending

## Description

Ensure all ErrorInstance properties are always defined (never undefined).

## Requirements

Every error instance must have these properties, all with defined values:

| Property | Type | Default if not specified |
|----------|------|---------------------------|
| name | string | ✓ (required) |
| message | string | ✓ (required) |
| stack | string | ✓ (auto-generated) |
| fields | Record | {} |
| notes | string[] | [] |
| cause | Error \| null | null |
| causes | Error[] | [] |
| context | Record \| null | null |
| httpStatus | number \| null | null |

## Acceptance Criteria

- [ ] All properties exist on every error instance
- [ ] No property is ever undefined
- [ ] Accessing any property never throws
- [ ] Properties are enumerable for JSON serialization

## Dependencies

- Task 01: error() factory

## Related Tasks

- Task 15: Type tests for TypeScript compatibility

## Notes

This is a fundamental guarantee that makes error handling safer. See [error-function.md](../../product/features/error-function.md) for full property list.