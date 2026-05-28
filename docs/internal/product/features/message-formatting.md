# Feature: Message Formatting

## Summary

When defining an error with `error()`, you can provide a `message` template that gets formatted automatically using the error's field values. This creates user-friendly error messages without manual string concatenation.

## API

### Error Definition

```typescript
import { z } from 'zod';

const MyError = error({
  name: 'MyError',
  fields: z.object({
    field1: z.string(),
    field2: z.number(),
  }),
  message: 'Template with {field1} and {field2}',
});

// Message is automatically formatted
const err = MyError({ field1: 'email', field2: 42 });
err.message;  // 'Template with email and 42'
```

### Access

```typescript
err.message;  // Formatted message string
```

### Placeholder Syntax

Placeholders use `{fieldName}` syntax:

| Placeholder | Output |
|-------------|--------|
| `{fieldName}` | Inserts the field value |
| `{fieldName:upper}` | Uppercase the value |
| `{fieldName:lower}` | Lowercase the value |
| `{fieldName:json}` | JSON stringify the value |

### Escaping

Prepend `\` to escape:

```typescript
message: 'Enter \{fieldName\} here'
// Output: 'Enter {fieldName} here'
```

## Usage

### String Interpolation

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

### Multiple Fields

```typescript
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({
    field: z.string(),
    expected: z.string(),
    actual: z.string(),
  }),
  message: 'Field "{field}" expected {expected}, got {actual}',
});

const err = ValidationError({
  field: 'age',
  expected: 'number',
  actual: 'string',
});

err.message;  // 'Field "age" expected number, got string'
```

### Nested Fields

```typescript
import { z } from 'zod';

const ConfigError = error({
  name: 'ConfigError',
  fields: z.object({
    key: z.string(),
    path: z.string(),
  }),
  message: 'Config key "{key}" not found in {path}',
});

const err = ConfigError({
  key: 'database.url',
  path: 'config.json',
});

err.message;  // 'Config key "database.url" not found in config.json'
```

### Modifiers

```typescript
import { z } from 'zod';

const AppError = error({
  name: 'AppError',
  fields: z.object({
    userId: z.string(),
  }),
  message: 'User ID: {userId:upper}',
});

const err = AppError({ userId: 'abc123' });
err.message;  // 'User ID: ABC123'
```

### JSON Modifier

```typescript
import { z } from 'zod';

const DataError = error({
  name: 'DataError',
  fields: z.object({
    data: z.record(z.unknown()),
  }),
  message: 'Invalid data: {data:json}',
});

const err = DataError({ data: { id: 1, name: 'test' } });
err.message;  // 'Invalid data: {"id":1,"name":"test"}'
```

## Error Display

The formatted message is used in:

### Console Output (Dev)

```
✗ ValidationError: Field "email" expected email, got "user@..."
  └─ field: "email"
  └─ expected: "email"
  └─ actual: "user@..."
```

### Production Logs

```
ValidationError: Field "email" expected email, got "user@..." {"field":"email"}
```

## Design Rationale

**Why not pass message at creation?**

```typescript
// Message at creation (verbose)
raise(ValidationError({ message: 'Field is required' }));

// Template in definition (cleaner for repeated errors)
raise(ValidationError({ field: 'email' }));
```

1. **DRY** — Define the template once, not at every call site
2. **Type-safe** — Fields are validated by Standard Schema
3. **Consistent messages** — All errors use the same format

**Why placeholder syntax `{field}` not template literals?**

Template literals in JavaScript are `` `hello ${world}` ``. The `{field}` syntax:
- Matches Python's str.format()
- Is explicit about which fields are in the message
- Allows modifiers like `:upper`

**Limitations**

The template system is intentionally simple:
- No conditionals (`{if cond}error{/if}`)
- No loops
- No custom formatters beyond `:upper`, `:lower`, `:json`

For complex message formatting, consider building the message in code:

```typescript
import { z } from 'zod';

const err = AppError({
  field: 'email',
  message: computeMessage('email', context),  // Custom logic
});
```

## Related Features

- [error-function.md](./error-function.md) — Error definition with Standard Schema
- [chaining.md](./chaining.md) — Chaining adds context to errors