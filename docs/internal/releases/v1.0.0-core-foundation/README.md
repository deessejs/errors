# Release v1.0.0 — Core Foundation

## Overview

This is the minimum viable product for `@deessejs/errors`. It establishes the function-based error API, replaces class hierarchies with composition, and provides exception chaining — all inspired by Python's error system.

## Release Date

Target: TBD

## Motivation

Native JavaScript errors require class inheritance (`class X extends Error`), which creates rigid hierarchies, demands `extends` chains, and doesn't support multiple inheritance. This release provides a function-based alternative that's simpler, more composable, and more powerful.

## What's Included

### Core API: `error()` Function

```typescript
import { error, raise } from '@deessejs/errors';
import { z } from 'zod';

// Define an error type with Standard Schema (Zod, Valibot, etc.)
const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({
    field: z.string(),
  }),
});

// Create and throw instances
raise(ValidationError({ field: 'email' }));
```

> **Note:** The library only supports **Standard Schema** compatible libraries (Zod, Valibot, ArkType, etc.) for field definitions.

### Error Instance Properties

Every error instance has these guaranteed properties:

| Property  | Type                              | Always Exists | Description                                |
| --------- | --------------------------------- | ------------- | ------------------------------------------ |
| `name`    | `string`                          | Yes           | Error name                                 |
| `message` | `string`                          | Yes           | Error message                              |
| `stack`   | `string`                          | Yes           | Stack trace                                |
| `fields`  | `Record<string, unknown>`         | Yes           | User-defined fields (empty object if none) |
| `notes`   | `string[]`                        | Yes           | Notes (empty array if none)                |
| `cause`   | `Error \| null`                   | Yes           | Direct cause (null if none)                |
| `causes`  | `Error[]`                         | Yes           | Full cause chain (may be empty)            |
| `context` | `Record<string, unknown> \| null` | Yes           | Injected context (null if none)            |

### Exception Chaining: `.from()`

```typescript
import { error, raise } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });

try {
  lowLevelOperation();
} catch (err) {
  raise(AppError().from(err));
}
```

### Inheritance: `inherits` Option

#### Single Inheritance

```typescript
const AppError = error({ name: 'AppError' });
const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
});
```

#### Multiple Inheritance

```typescript
const AppError = error({ name: 'AppError' });
const NetworkError = error({ name: 'NetworkError' });

const CombinedError = error({
  name: 'CombinedError',
  inherits: [AppError, NetworkError],
});
```

### Type Checking: `is()`

```typescript
import { error, is } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });
const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
});

if (is(err, ValidationError)) {
  // Handles ValidationError AND AppError (through inheritance)
}
```

### Chain Traversal: `causes()`

```typescript
import { causes } from '@deessejs/errors';

// Returns array from most recent to root cause
const chain = causes(err);
// chain[0] is most recent, chain[chain.length - 1] is root
```

### Message Formatting

```typescript
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({
    field: z.string(),
  }),
  message: 'Field "{field}" is invalid',
});

const err = ValidationError({ field: 'email' });
err.message; // 'Field "email" is invalid'
```

### Throw Syntax Support

Both `raise()` and native `throw` are supported:

```typescript
// Using raise() (recommended for middleware potential)
raise(ValidationError({ field: 'email' }));

// Using native throw (for compatibility)
throw ValidationError({ field: 'email' });
```

### Standard Schema Support

The library supports **Standard Schema** compatible libraries (Zod, Valibot, ArkType, etc.) for field validation:

```typescript
import { error } from '@deessejs/errors';
import { z } from 'zod';
import * as valibot from 'valibot';

// Works with Zod
const ZodError = error({
  name: 'ZodError',
  fields: z.object({
    field: z.string(),
    value: z.number(),
  }),
});

// Works with Valibot
const ValibotError = error({
  name: 'ValibotError',
  fields: valibot.object({
    field: valibot.string(),
  }),
});

// Works with ArkType
import * as ark from 'arktype';
const ArkError = error({
  name: 'ArkError',
  fields: ark.type({ field: 'string' }),
});
```

This makes errors interoperable with the TypeScript ecosystem — no additional dependencies needed.

## What's NOT Included

This release intentionally excludes:

- **Type guards** (`isValidationError()`, etc.) — coming in v1.2.0
- **Predefined errors** (`errors.ValidationError`, etc.) — coming in v1.2.0
- **Output formatting** (dev vs prod modes) — coming in v1.3.0
- **Stack cleaning** (`stripLibraryFrames()`) — coming in v1.3.0
- **Context injection** (`withContext()`) — coming in v2.0.0
- **Async patterns** — coming in v2.0.0

## API Surface

### Exports

```typescript
import type { StandardSchemaV1 } from '@standard-schema/spec';

// Core
export const error: <T extends Record<string, unknown> = Record<string, unknown>>(
  config: ErrorConfig<T>
) => ErrorFactory<T>;
export const raise: (errorInstance: ErrorInstance) => never;
export const is: <T extends ErrorFactory>(err: unknown, ErrorType: T) => boolean;
export const causes: (errorInstance: ErrorInstance) => ErrorInstance[];

// Types
export type ErrorInstance<T extends Record<string, unknown> = Record<string, unknown>> = {
  name: string;
  message: string;
  stack: string;
  fields: T;
  notes: string[];
  cause: Error | null;
  causes: Error[];
  context: Record<string, unknown> | null;
  from: (cause: Error | ErrorInstance) => ErrorInstance<T>;
  addNote: (note: string) => ErrorInstance<T>;
};

export type ErrorFactory<T extends Record<string, unknown> = Record<string, unknown>> = {
  name: string;
  inherits?: ErrorFactory | ErrorFactory[];
  (fields?: Partial<T>): ErrorInstance<T>;
};

// ErrorConfig uses Standard Schema for field definitions
export type ErrorConfig<T extends Record<string, unknown> = Record<string, unknown>> = {
  name: string;
  fields?: StandardSchemaV1; // Standard Schema only
  inherits?: ErrorFactory | ErrorFactory[];
  message?: string;
};
```

## Migration Path

See [Migration Guide](../product/guides/migration.md) for step-by-step instructions on migrating from native JavaScript errors.

## Dependencies

None — this is a standalone library.

## Testing Requirements

- [ ] Unit tests for `error()` factory
- [ ] Unit tests for `raise()` and `throw` compatibility
- [ ] Unit tests for `is()` with single and multiple inheritance
- [ ] Unit tests for `.from()` chaining
- [ ] Unit tests for `causes()` traversal
- [ ] Unit tests for message formatting with placeholders
- [ ] Integration tests for error hierarchy
- [ ] Type tests for TypeScript compatibility

## Changelog Entry

```markdown
## v1.0.0 — Core Foundation (YYYY-MM-DD)

### Added

- `error()` function for defining error types
- `raise()` function for throwing errors
- Native `throw` syntax support
- `is()` function for type checking
- `inherits` option for single and multiple inheritance
- `.from()` method for exception chaining
- `causes()` function for chain traversal
- `err.fields` namespace for user data
- Message templates with `{field}` placeholders
- All error properties always defined (never undefined)
```

## Related Documents

- [Design Philosophy](../product/design-philosophy.md)
- [Error Function](../product/features/error-function.md)
- [Raise Function](../product/features/raise-function.md)
- [Chaining](../product/features/chaining.md)
- [Inheritance](../product/features/inheritance.md)
- [Chain Traversal](../product/features/chain-traversal.md)
- [Message Formatting](../product/features/message-formatting.md)
