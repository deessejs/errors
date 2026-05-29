---
name: record-string-unknown-pattern
description: TypeScript patterns from Senior to Principal/Staff level
type: reference
---

# TypeScript Patterns: Senior to Principal/Staff Level

## Senior Pattern: `T extends Record<string, unknown>`

Use for generic functions accepting dictionary-like objects.

### Why This Pattern

| Pattern | Level | Why |
|:---|:---|:---|
| `T extends any` | Junior | No constraint |
| `T extends object` | Intermediate | Too broad |
| `T extends Record<string, any>` | Intermediate | Unsafe values |
| **`T extends Record<string, unknown>`** | **Senior** | Safe + explicit |

### Key Points

1. **`unknown` vs `any`**: Forces type narrowing before use
2. **`Record` vs `object`**: Explicitly dictionary-like (not arrays/functions)
3. **Interface Gotcha**: Interfaces lack implicit index signatures

```typescript
interface UserInterface { name: string }
type UserType = { name: string }

process<T extends Record<string, unknown>>(obj: T) {}
process(UserType)      // ✅ Works
process(UserInterface) // ❌ Error
```

---

## Principal/Staff Pattern: Template Literal Types

Extract keys from template string at compile-time for type-safe data.

```typescript
type ExtractKeys<S extends string> =
  S extends `${string}{${infer Key}}${infer Rest}`
    ? (Key extends `${infer RealKey}:${string}` ? RealKey : Key) | ExtractKeys<Rest>
    : never;

const formatTemplate = <S extends string>(
  template: S,
  data: Record<ExtractKeys<S>, unknown>
): string => { ... }

// Usage:
formatTemplate("Hello {name}", { name: "Alice" }); // ✅ Works
formatTemplate("Hello {name}", { age: 30 });      // ❌ Error: missing 'name'
```

### Why This Matters

- **Compile-time validation**: Missing keys are caught at compile time
- **No runtime surprises**: API forces correct usage
- **Self-documenting**: Template string defines required keys

---

## Senior-Level Regex State Management

Global regex with `/g` flag is stateful. Always reset `lastIndex`:

```typescript
const REGEX = /\{(\w+)(?::(\w+))?\}/g;

const hasTemplatePlaceholders = (message: string): boolean => {
  REGEX.lastIndex = 0; // Reset before each use
  return REGEX.test(message);
};
```

**Without reset**: Second call might return `false` even when pattern exists.

---

## Summary of Levels

| Level | Technique | Benefit |
|:---|:---|:---|
| Junior | `any`, no constraints | Works, but unsafe |
| Intermediate | `object`, `Record<string, any>` | Shape correct |
| Senior | `Record<string, unknown>` | Type-safe |
| Principal/Staff | Template Literal Types | Compile-time key validation |
