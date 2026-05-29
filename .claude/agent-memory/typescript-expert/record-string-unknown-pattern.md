---
name: record-string-unknown-pattern
description: Senior TypeScript pattern for generic type constraints - T extends Record<string, unknown>
type: reference
---

# TypeScript Pattern: `T extends Record<string, unknown>`

## When to Use

Use `T extends Record<string, unknown>` for generic functions that accept dictionary-like objects. This is the preferred pattern for:
- Message formatting with field interpolation
- Data transformation utilities
- Any function accepting dynamic key-value objects

## Why This Pattern (Senior Level)

### 1. Safety: `unknown` vs `any`

- `any`: Compiler turns off, allows any property access
- `unknown`: Forces type narrowing before use

### 2. Explicitness: `Record` vs `object`

- `object`: Too broad - includes arrays, functions
- `Record<string, unknown>`: Explicitly dictionary-like

### 3. Interface Gotcha

Interfaces don't have implicit index signatures:

```typescript
interface UserInterface { name: string }
type UserType = { name: string }

process<T extends Record<string, unknown>>(obj: T) {}

process(UserType)      // Works
process(UserInterface) // Error: Index signature missing
```

## Pattern Comparison

| Pattern | Level |
|:---|:---|
| `T extends any` | Junior - no constraint |
| `T extends object` | Intermediate - too broad |
| `T extends Record<string, any>` | Intermediate - unsafe values |
| **`T extends Record<string, unknown>`** | **Senior** - safe + explicit |

## Defensive Programming with `unknown`

When using `unknown`, always handle edge cases defensively:

```typescript
const formatTemplate = <T extends Record<string, unknown>>(
  template: string,
  data: T
): string => {
  return template.replace(/\{(\w+)(?::(\w+))?\}/g, ( fullMatch, fieldName, modifier ) => {
    const value = data[fieldName];
    if ( value === undefined ) {
      return fullMatch; // Leave placeholder if field not found
    }

    // Always coerce to String for safety
    if ( modifier === 'upper' ) {
      return String( value ).toUpperCase();
    }
    // ...
  });
};
```

## Regex State Safety (Critical Senior Pattern)

Global regexes (`/g`) have state. Stored as constants, they remember `lastIndex`.

```typescript
// BUG: Without reset
const REGEX = /\{(\w+)\}/g;
const hasTemplatePlaceholders = ( message: string ): boolean => {
  return REGEX.test( message ); // May fail on second call
};

// SENIOR FIX: Reset lastIndex
const REGEX = /\{(\w+)\}/g;
const hasTemplatePlaceholders = ( message: string ): boolean => {
  REGEX.lastIndex = 0; // Reset before each use
  return REGEX.test( message );
};
```

### Why This Matters

- JavaScript regex with `/g` flag is **stateful**
- After `.test()`, the regex remembers where it stopped
- Next call starts from middle → random `false` results
- Senior developers know this and reset `lastIndex`

## API Surface Management

Use `@internal` JSDoc to mark functions as internal:

```typescript
/**
 * Formats a message template by replacing {field} placeholders with values.
 *
 * @internal
 */
const formatTemplate = (...) => { ... };
```

This signals these functions are for internal use only, not part of public API.

## Summary

Signals a developer who:
1. Prioritizes type safety (no `any`)
2. Understands utility types
3. Writes defensive code
4. Knows JavaScript gotchas (regex state)
5. Manages API surface intentionally
