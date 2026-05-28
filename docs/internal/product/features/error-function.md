# Feature: `error()` — Error Factory

## Summary

The `error()` function creates error factory functions that define error types following the Standard Schema specification. Instead of class definitions and `extends` chains, errors are defined via a simple configuration object.

## API

```typescript
function error(config: {
  name: string;
  fields?: Record<string, FieldDefinition>;
  inherits?: ErrorFactory | ErrorFactory[];
  message?: string;
  httpStatus?: number;
}): ErrorFactory
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Error name identifier |
| `fields` | `Record<string, FieldDefinition>` | No | Schema fields for error data |
| `inherits` | `ErrorFactory \| ErrorFactory[]` | No | Parent error factory to inherit from |
| `message` | `string` | No | Message template with `{field}` placeholders |
| `httpStatus` | `number` | No | HTTP status code for web frameworks |

### Returns

An `ErrorFactory` — a callable function that creates error instances.

## Usage

### Basic Error

```typescript
import { error, raise } from '@deessejs/errors';

const NotFoundError = error({
  name: 'NotFoundError',
  httpStatus: 404,
});

raise(NotFoundError());
```

### With Fields

```typescript
const ValidationError = error({
  name: 'ValidationError',
  fields: {
    field: { type: 'string' },
    reason: { type: 'string' },
  },
  httpStatus: 400,
});

const err = ValidationError({ field: 'email', reason: 'invalid format' });
err.fields.field;    // 'email'
err.fields.reason;   // 'invalid format'
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
  httpStatus: 400,
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
const RequiredFieldError = error({
  name: 'RequiredFieldError',
  fields: {
    field: { type: 'string' },
  },
  message: 'Field "{field}" is required',
});

const err = RequiredFieldError({ field: 'email' });
err.message;  // 'Field "email" is required'
```

### With HTTP Status

```typescript
const NotFoundError = error({
  name: 'NotFoundError',
  fields: {
    path: { type: 'string' },
  },
  httpStatus: 404,
});

const err = NotFoundError({ path: '/users/123' });
err.httpStatus;  // 404
```

## ErrorFactory

The returned `ErrorFactory` is:

1. **Callable** — `ErrorFactory(fields?)` creates an error instance
2. **Typed** — TypeScript infers input/output types from fields
3. **Namespaced** — The error name is available via `ErrorFactory.name`

```typescript
const ValidationError = error({
  name: 'ValidationError',
  fields: {
    field: { type: 'string' },
  },
});

ValidationError.name;   // 'ValidationError'

// TypeScript types:
type Input = { field: string };
type Output = ValidationError & { field: string };
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
| `httpStatus` | `number \| null` | Yes | HTTP status (null if not defined) |

### Field Access

Fields are always accessed via `err.fields`:

```typescript
const err = ValidationError({ field: 'email', reason: 'invalid format' });

// Correct
err.fields.field;   // 'email'
err.fields.reason;  // 'invalid format'

// Why not err.field directly?
// Because field names could collide with built-in properties like:
// err.name, err.message, err.stack, err.cause, err.context
```

**Important:** `err.fields` is always an object (never `undefined` or `null`). If no fields were defined, it's an empty object `{}`.

## Field Definitions

Fields follow the Standard Schema specification:

```typescript
const FieldDefinition = {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'error' | 'unknown';
  required?: boolean;
  items?: FieldDefinition;  // for arrays
};
```

### Supported Field Types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text values | `'hello'` |
| `number` | Numeric values | `42`, `3.14` |
| `boolean` | True/false | `true` |
| `array` | Arrays with optional item type | `['a', 'b']` |
| `object` | Nested objects | `{ nested: true }` |
| `error` | Nested errors (for error groups) | `<ErrorInstance>` |
| `unknown` | Any value | anything |

### Error Fields (for nesting)

Errors can contain other errors as field values:

```typescript
const BatchError = error({
  name: 'BatchError',
  fields: {
    errors: { type: 'array', items: { type: 'error' } },
  },
});

const err = BatchError({ errors: [innerError1, innerError2] });
err.fields.errors;  // Array of ErrorInstance

// Access nested error properties
err.fields.errors[0].name;    // Name of first error
err.fields.errors[0].message; // Message of first error
```

### Serialization

Errors serialize to JSON with all properties:

```typescript
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
//   "httpStatus": null,
//   "stack": "Error: ValidationError\n    at ..."
// }
```

**Note:** Inheritance relationships are not serialized. When deserializing:
- `is(err, ParentError)` will return `false` for re-parsed JSON
- This is a known limitation; use error chaining for portable cause tracking

## Design Rationale

See [Design Philosophy](../design-philosophy.md) for core principles.

**Additional notes for `error()`:**

**Why `inherits` takes a factory function, not a string?**
- Type-safe — TypeScript validates the inheritance
- No circular dependency issues
- IDE autocomplete works

**Why httpStatus as a property?**
- HTTP status is inherent to the error type, not instance-specific
- Enables framework integration without extra mapping
- Consistent with how HTTP frameworks handle errors

## Related Features

- [raise-function.md](./raise-function.md) — How to throw errors
- [chaining.md](./chaining.md) — Exception chaining with `.from()`
- [inheritance.md](./inheritance.md) — Deep dive on inheritance
- [message-formatting.md](./message-formatting.md) — Message templates
- [http-status.md](./http-status.md) — HTTP status mapping
