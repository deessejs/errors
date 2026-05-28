# Testing Tasks

## Overview

This folder contains all testing-related tasks for v1.0.0 Core Foundation.

## Task List

| ID | Task | Status |
|----|------|--------|
| 09 | Unit tests for error() factory | 🟡 Pending |
| 10 | Unit tests for raise() | 🟡 Pending |
| 11 | Unit tests for is() | 🟡 Pending |
| 12 | Unit tests for .from() | 🟡 Pending |
| 13 | Unit tests for causes() | 🟡 Pending |
| 14 | Unit tests for messages | 🟡 Pending |
| 15 | Type tests for TypeScript | 🟡 Pending |
| 18 | Integration tests | 🟡 Pending |

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