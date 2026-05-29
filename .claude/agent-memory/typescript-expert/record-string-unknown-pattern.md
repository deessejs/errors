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

process(UserType)      // ✅ Works
process(UserInterface) // ❌ Error
```

## Pattern Comparison

| Pattern | Level |
|:---|:---|
| `T extends any` | Junior - no constraint |
| `T extends object` | Intermediate - too broad |
| `T extends Record<string, any>` | Intermediate - unsafe values |
| **`T extends Record<string, unknown>`** | **Senior** - safe + explicit |

## Summary

Signals a developer who:
1. Prioritizes type safety (no `any`)
2. Understands utility types
3. Writes defensive code
