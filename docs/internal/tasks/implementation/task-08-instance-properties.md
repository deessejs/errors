# Task 08: ErrorInstance Properties

## Status

✅ Complete

## Description

Ensure all ErrorInstance properties are always defined (never undefined).

## Implementation

Implemented in `src/error/error.ts` - all properties are initialized with default values during error factory invocation.

## Requirements

Every error instance has these properties, all with defined values:

| Property | Type | Default if not specified | Status |
|----------|------|---------------------------|--------|
| name | string | ✓ (required) | ✅ |
| message | string | ✓ (required) | ✅ |
| stack | string | ✓ (auto-generated) | ✅ |
| fields | Record | {} | ✅ |
| notes | string[] | [] | ✅ |
| cause | Error \| null | null | ✅ |
| causes | Error[] | [] | ✅ |
| context | Record \| null | null | ✅ |
| inherits | ErrorFactory \| ErrorFactory[] \| undefined | undefined | ✅ |
| from() | method | ✓ | ✅ |

**Note:** `httpStatus` was intentionally removed per design decision. HTTP status mapping should be handled at application layer.

## Acceptance Criteria

- [x] All properties exist on every error instance
- [x] No property is ever undefined (returns null/[]/{} instead)
- [x] Accessing any property never throws
- [x] Properties are enumerable for JSON serialization

## Dependencies

- Task 01: error() factory ✅

## Related Tasks

- Task 15: Type tests for TypeScript compatibility ✅

## Notes

See [error-function.md](../../product/features/error-function.md) for full property list.