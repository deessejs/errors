# Release v1.3.0 — Production Ready

## Overview

This release makes the library production-ready with environment-aware output formatting and stack trace cleaning. It provides the tools needed for production error handling while keeping the developer experience excellent in development.

## Release Date

Target: TBD (after v1.2.0)

## Motivation

For production use, errors need to:

1. Output appropriately for different environments (pretty in dev, compact in prod)
2. Provide clean, actionable stack traces

## What's Included

### Output Formatting: Dev vs Prod

The library automatically adapts output based on `NODE_ENV`:

| Environment | `NODE_ENV`             | Output Style       |
| ----------- | ---------------------- | ------------------ |
| Development | `development` or unset | Pretty, colored    |
| Production  | `production`           | Compact, efficient |

#### Development Mode (Pretty)

```
✗ ValidationError: Field "email" expected email, got "user@"
  └─ field: "email"
  └─ expected: "email"
  └─ actual: "user@"
  └─ notes:
       └─ "Validation in registration flow"
       └─ "User ID: 123"
```

Features:

- Color coding (red for errors, yellow for notes, gray for fields)
- Tree structure for nested data
- Full context visible

#### Production Mode (Compact)

```
ValidationError: Field "email" expected email, got "user@" {"field":"email","notes":["Validation in registration flow"]}
```

Features:

- Single line for log systems
- JSON suffix for fields
- Minimal colors

### formatError() Function

Override output mode for specific errors:

```typescript
import { formatError } from '@deessejs/errors';

const err = AppError({ code: 42 });

formatError(err, { mode: 'development' }); // Pretty string
formatError(err, { mode: 'production' }); // Compact string
formatError(err, { mode: 'json' }); // JSON object
```

### setOutputMode() (Optional Global Configuration)

```typescript
import { setOutputMode } from '@deessejs/errors';

// Change default mode
setOutputMode('development'); // Always pretty
setOutputMode('production'); // Always compact
setOutputMode('auto'); // Follow NODE_ENV (default)
```

**Warning:** `setOutputMode()` modifies global state. Use per-call `formatError()` in tests to avoid pollution.

### Stack Cleaning: `stripLibraryFrames()`

Remove internal `@deessejs/errors` frames from stack traces:

```typescript
import { stripLibraryFrames } from '@deessejs/errors';

const err = AppError();

stripLibraryFrames(err);
// err.stack now excludes library frames
```

#### Before (Raw Stack)

```
Error: AppError
    at doSomething (file:///app/index.ts:15:10)
    at callError (file:///app/node_modules/@deessejs/errors/dist/index.js:142:10)
    at raise (file:///app/node_modules/@deessejs/errors/dist/index.js:88:15)
    at main (file:///app/index.ts:10:5)
    at run (file:///app/node_modules/@deessejs/errors/dist/index.js:201:5)
    at Module._compile (node:internal/modules/cjs/loader:1560:9)
```

#### After (Cleaned)

```
Error: AppError
    at doSomething (file:///app/index.ts:15:10)
    at main (file:///app/index.ts:10:5)
    at Module._compile (node:internal/modules/cjs/loader:1560:9)
```

### JSON Serialization

All errors serialize to JSON automatically:

```typescript
const err = AppError({ code: 42 }).addNote('User action');

JSON.stringify(err);
// {
//   "name": "AppError",
//   "message": "AppError",
//   "fields": { "code": 42 },
//   "notes": ["User action"],
//   "cause": null,
//   "causes": [],
//   "context": null,
//   "stack": "Error: AppError\n    at ..."
// }
```

#### Selective Serialization

```typescript
// Without stack (lighter for logs)
JSON.stringify(err, ['name', 'message', 'fields', 'notes']);

// Pretty printed
JSON.stringify(err, null, 2);

// Custom filter
JSON.stringify(err, (key, value) => {
  if (key === 'stack') return undefined; // Exclude stack
  return value;
});
```

## What's NOT Included

This release intentionally excludes:

- **Context injection** (`withContext()`) — coming in v2.0.0
- **Async patterns** — coming in v2.0.0

## API Changes

### New Exports

```typescript
export const formatError: <T extends Record<string, unknown> = Record<string, unknown>>(
  errorInstance: ErrorInstance<T>,
  options?: { mode?: 'development' | 'production' | 'json' }
) => string | object;

export const setOutputMode: (mode: 'development' | 'production' | 'auto') => void;

export const stripLibraryFrames: <T extends Record<string, unknown>>(
  errorInstance: ErrorInstance<T>
) => ErrorInstance<T>;
```

## Migration Path

No migration required — this is purely additive. Existing code continues to work.

## Testing Requirements

- [ ] Unit tests for development output format
- [ ] Unit tests for production output format
- [ ] Unit tests for formatError() with all modes
- [ ] Unit tests for setOutputMode()
- [ ] Unit tests for stripLibraryFrames()
- [ ] Unit tests for JSON serialization
- [ ] Snapshot tests for output formatting

## Changelog Entry

```markdown
## v1.3.0 — Production Ready (YYYY-MM-DD)

### Added

- Automatic environment detection (dev vs prod)
- Pretty colored output in development mode
- Compact single-line output in production mode
- `formatError()` function for per-call formatting
- `setOutputMode()` for global configuration (optional)
- `stripLibraryFrames()` for cleaning stack traces
- JSON serialization with `JSON.stringify()`

### Changed

- Enhanced output formatting docs
```

## Related Documents

- [Output Formatting Feature](../product/features/output-formatting.md)
- [Stack Cleaning Feature](../product/features/stack-cleaning.md)
