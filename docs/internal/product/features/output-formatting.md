# Feature: Dev vs Prod Output Formatting

## Summary

The package automatically adapts error output based on the environment. Development mode prioritizes readability; production mode prioritizes efficiency and log compatibility.

## Environment Detection

The library detects the environment via `NODE_ENV`:

| Environment | `NODE_ENV` | Output Style |
|-------------|------------|--------------|
| Development | `development` or unset | Pretty, colored |
| Production | `production` | Compact, efficient |

## Development Mode

Rich, colored output with tree structures:

```
✗ ValidationError: Field "email" expected email, got "user@"
  └─ field: "email"
  └─ expected: "email"
  └─ actual: "user@"
  └─ notes:
       └─ "Validation in registration flow"
       └─ "User ID: 123"
```

### Features

- **Color coding**:
  - Red: Error name and message
  - Yellow: Notes
  - Gray: Fields and metadata
- **Tree structure**: Indented hierarchy for nested data
- **Full context**: Includes fields, notes, context
- **Stack trace**: Visible but collapsible in most terminals

## Production Mode

Compact, machine-readable output optimized for logs:

```
ValidationError: Field "email" expected email, got "user@" {"field":"email","expected":"email","actual":"user@"}{"notes":["Validation in registration flow"]}
```

### Features

- **Single line**: Everything on one line for log systems
- **JSON suffix**: Fields condensed to JSON
- **Minimal colors**: Optional ANSI codes for log processors
- **Efficient**: Less string allocation

## Error Properties

All these properties are available on any error instance:

```typescript
err.name;       // Error name
err.message;    // Formatted message
err.fields;    // User-defined fields
err.notes;     // Array of notes
err.cause;     // Direct cause
err.causes;    // Full cause chain
err.context;   // Injected context
err.stack;     // Stack trace
err.httpStatus;// HTTP status code (if defined)
```

## JSON Serialization

Both environments support `JSON.stringify()`:

```typescript
import { error } from '@deessejs/errors';

const AppError = error({
  name: 'AppError',
  fields: {
    code: { type: 'number' },
  },
  httpStatus: 500,
});

const err = AppError({ code: 42 })
  .addNote('User action')
  .addNote('Retry attempt 3');

JSON.stringify(err);
// {
//   "name": "AppError",
//   "message": "AppError",
//   "fields": { "code": 42 },
//   "httpStatus": 500,
//   "notes": ["User action", "Retry attempt 3"],
//   "cause": null,
//   "causes": [],
//   "context": null,
//   "stack": "Error: AppError\n    at ..."
// }
```

### Serialization Options

```typescript
// Full serialization (default)
JSON.stringify(err);

// Without stack (lighter for logs)
JSON.stringify(err, ['name', 'message', 'fields', 'notes']);

// Pretty printed
JSON.stringify(err, null, 2);

// Selective fields
JSON.stringify(err, (key, value) => {
  if (key === 'stack') return undefined;  // Exclude stack
  return value;
});
```

## Formatting API

### Per-Call Formatting

Override output mode for specific errors:

```typescript
import { error, formatError } from '@deessejs/errors';

const err = AppError({ code: 42 });

// Get formatted string in specific mode
formatError(err, { mode: 'development' });  // Pretty
formatError(err, { mode: 'production' });   // Compact
formatError(err, { mode: 'json' });         // JSON object
```

### Global Configuration (Optional)

```typescript
import { setOutputMode } from '@deessejs/errors';

// Change default mode
setOutputMode('development');  // Always pretty
setOutputMode('production');   // Always compact
setOutputMode('auto');         // Follow NODE_ENV (default)
```

**Warning:** `setOutputMode()` modifies global state. Be aware of:
- Test pollution: mode set in one test may affect another
- Serverless cold starts: mode persists across invocations
- Async: no thread safety concerns in Node.js

**Recommendation:** Use per-call `formatError()` in tests to avoid global state pollution:

```typescript
// In tests - use per-call formatting
test('error handling', () => {
  expect(formatError(err, { mode: 'development' })).toContain('field');
});

// Or reset in test teardown
afterEach(() => setOutputMode('auto'));
```

## Custom Log Formats

### Simple Object Logging

```typescript
const err = catchError();

console.log({
  level: 'error',
  name: err.name,
  message: err.message,
  fields: err.fields,
  context: err.context,
  httpStatus: err.httpStatus,
});
```

### Structured Logging (Winston, Pino, etc.)

```typescript
import pino from 'pino';

const logger = pino();

const err = catchError();

logger.error({
  err: {
    name: err.name,
    message: err.message,
    stack: err.stack,
    fields: err.fields,
    notes: err.notes,
    cause: err.cause ? { name: err.cause.name, message: err.cause.message } : null,
  },
  userId: err.context?.userId,
  requestId: err.context?.requestId,
}, err.message);
```

### Error Aggregation Services

```typescript
// Sentry
import * as Sentry from '@sentry/node';

Sentry.captureException(err, {
  extra: {
    fields: err.fields,
    notes: err.notes,
    context: err.context,
    httpStatus: err.httpStatus,
  },
});

// Datadog
import { datadogLogger } from 'dd-logger';

datadogLogger.error(err.message, {
  'error.name': err.name,
  'error.fields': JSON.stringify(err.fields),
  'error.context': JSON.stringify(err.context),
  'error.http_status': err.httpStatus ?? undefined,
});
```

## Design Rationale

**Why auto-detect?**

Defaulting to development mode in development and production mode in production:
1. **Zero config** — Works out of the box
2. **Correct defaults** — Pretty for dev, efficient for prod
3. **Forgettable** — You don't think about it until needed

**Why per-call formatting?**

Per-call `formatError(err, { mode })` is preferred over global `setOutputMode()` because:
- No test pollution
- Works in serverless environments
- Explicit intent in code

**Why support both?**

Global configuration is convenient for applications; per-call is safer for libraries and tests.

## Related Features

- [notes.md](./notes.md) — Notes in output
- [context-injection.md](./context-injection.md) — Context in output
- [stack-cleaning.md](./stack-cleaning.md) — Stack in output
- [http-status.md](./http-status.md) — HTTP status in output
