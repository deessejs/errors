# Feature: `error()` — Error Factory

## Summary

The `error()` function creates error factory functions that define error types following the Standard Schema specification. Instead of class definitions and `extends` chains, errors are defined via a simple configuration object.

## API

```typescript
import type { StandardSchemaV1 } from '@standard-schema/spec';

function error(config: {
  name: string;
  fields?: StandardSchemaV1;
  inherits?: ErrorFactory | ErrorFactory[];
  message?: string;
}): ErrorFactory
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Error name identifier |
| `fields` | `StandardSchemaV1` | No | Schema fields (Zod, Valibot, ArkType, etc.) |
| `inherits` | `ErrorFactory \| ErrorFactory[]` | No | Parent error factory to inherit from |
| `message` | `string` | No | Message template with `{field}` placeholders |

### Returns

An `ErrorFactory` — a callable function that creates error instances.

## Usage

### Basic Error

```typescript
import { error, raise } from '@deessejs/errors';

const NotFoundError = error({
  name: 'NotFoundError',
});

raise(NotFoundError());
```

### With Fields (Standard Schema)

Errors use Standard Schema for field definitions. Use any compatible library:

```typescript
import { error, raise } from '@deessejs/errors';
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({
    field: z.string(),
    reason: z.string(),
  }),
});

const err = ValidationError({ field: 'email', reason: 'invalid format' });
err.fields.field;    // 'email'
err.fields.reason;   // 'invalid format'
```

### With Valibot

```typescript
import * as valibot from 'valibot';

const ValibotError = error({
  name: 'ValibotError',
  fields: valibot.object({
    field: valibot.string(),
  }),
});
```

### With ArkType

```typescript
import * as ark from 'arktype';

const ArkError = error({
  name: 'ArkError',
  fields: ark.type({ field: 'string' }),
});
```

### Without Fields (Omit Entirely)

```typescript
const InternalError = error({
  name: 'InternalError',
});

raise(InternalError());
```

### Single Inheritance

```typescript
const AppError = error({ name: 'AppError' });

const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,  // Pass the factory function
});

is(err, AppError);           // true if err is ValidationError
is(err, ValidationError);    // true
```

### Multiple Inheritance

```typescript
const AppError = error({ name: 'AppError' });
const NetworkError = error({ name: 'NetworkError' });

const CombinedError = error({
  name: 'CombinedError',
  inherits: [AppError, NetworkError],  // Array of factories
});

is(err, AppError);        // true if err is CombinedError
is(err, NetworkError);     // true if err is CombinedError
```

### With Message Template

```typescript
import { z } from 'zod';

const RequiredFieldError = error({
  name: 'RequiredFieldError',
  fields: z.object({
    field: z.string(),
  }),
  message: 'Field "{field}" is required',
});

const err = RequiredFieldError({ field: 'email' });
err.message;  // 'Field "email" is required'
```

### With HTTP Status

```typescript
import { z } from 'zod';

const NotFoundError = error({
  name: 'NotFoundError',
  fields: z.object({
    path: z.string(),
  }),
});

const err = NotFoundError({ path: '/users/123' });
```

## ErrorFactory

The returned `ErrorFactory` is:

1. **Callable** — `ErrorFactory(fields?)` creates an error instance
2. **Typed** — TypeScript infers input/output types from Standard Schema
3. **Namespaced** — The error name is available via `ErrorFactory.name`

```typescript
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({
    field: z.string(),
  }),
});

ValidationError.name;   // 'ValidationError'
// TypeScript infers types from the Zod schema
```

## Error Instance Properties

All errors have these guaranteed properties:

| Property | Type | Always Exists | Description |
|----------|------|---------------|-------------|
| `name` | `string` | Yes | Error name |
| `message` | `string` | Yes | Formatted message |
| `stack` | `string` | Yes | Stack trace |
| `fields` | `Record<string, unknown>` | Yes | User-defined fields (empty object if none) |
| `notes` | `string[]` | Yes | Notes (empty array if none) |
| `cause` | `Error \| null` | Yes | Direct cause (null if none) |
| `causes` | `Error[]` | Yes | Full cause chain (may be empty) |
| `context` | `Record<string, unknown> \| null` | Yes | Injected context (null if none) |

### Field Access

Fields are always accessed via `err.fields`:

```typescript
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({
    field: z.string(),
    reason: z.string(),
  }),
});

const err = ValidationError({ field: 'email', reason: 'invalid format' });

// Correct
err.fields.field;   // 'email'
err.fields.reason;  // 'invalid format'

// Why not err.field directly?
// Because field names could collide with built-in properties like:
// err.name, err.message, err.stack, err.cause, err.context
```

**Important:** `err.fields` is always an object (never `undefined` or `null`). If no fields were defined, it's an empty object `{}`.

## Serialization

Errors serialize to JSON with all properties:

```typescript
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({ field: z.string() }),
});

const err = ValidationError({ field: 'email' })
  .addNote('Added at runtime');

JSON.stringify(err);
// {
//   "name": "ValidationError",
//   "message": "ValidationError",
//   "fields": { "field": "email" },
//   "notes": ["Added at runtime"],
//   "cause": null,
//   "causes": [],
//   "context": null,
//   "stack": "Error: ValidationError\n    at ..."
// }
```

**Note:** Inheritance relationships are not serialized. When deserializing:
- `is(err, ParentError)` will return `false` for re-parsed JSON
- This is a known limitation; use error chaining for portable cause tracking

## Design Rationale

See [Design Philosophy](../design-philosophy.md) for core principles.

**Why Standard Schema?**

Standard Schema allows the library to integrate with any validation library:
- **Zod**, **Valibot**, **ArkType**, and many others implement this interface
- No additional runtime dependencies beyond your choice of validator
- Integrate once, validate anywhere
- Type inference works seamlessly

```typescript
// Your app uses Zod for everything
import { z } from 'zod';
const UserSchema = z.object({ id: z.string(), email: z.string() });

// Use it directly in error definitions
const UserError = error({
  name: 'UserError',
  fields: UserSchema,
});
```

**Why `inherits` takes a factory function, not a string?**
- Type-safe — TypeScript validates the inheritance
- No circular dependency issues
- IDE autocomplete works


## Related Features

- [raise-function.md](./raise-function.md) — How to throw errors
- [chaining.md](./chaining.md) — Exception chaining with `.from()`
- [inheritance.md](./inheritance.md) — Deep dive on inheritance
- [message-formatting.md](./message-formatting.md) — Message templates