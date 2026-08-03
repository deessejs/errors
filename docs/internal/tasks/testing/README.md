# Testing Tasks

## Overview

This folder contains all testing-related tasks for v1.0.0 Core Foundation.

## Task List

| ID  | Task                           | Status      |
| --- | ------------------------------ | ----------- |
| 09  | Unit tests for error() factory | ✅ Complete |
| 10  | Unit tests for raise()         | ✅ Complete |
| 11  | Unit tests for is()            | ✅ Complete |
| 12  | Unit tests for .from()         | ✅ Complete |
| 13  | Unit tests for causes()        | ✅ Complete |
| 14  | Unit tests for messages        | ✅ Complete |
| 15  | Type tests for TypeScript      | ✅ Complete |
| 18  | Integration tests              | ✅ Complete |

## Test Framework

- **Framework**: Vitest
- **Type Testing**: TypeScript compilation + @tsd

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run type checks
pnpm type-check
```

## Test Structure

```
src/
  __tests__/
    error.test.ts
    raise.test.ts
    is.test.ts
    from.test.ts
    causes.test.ts
    messages.test.ts
    integration.test.ts
  types/
    error.test-d.ts  # Type tests
```
