# Release v1.1.0 — Enhanced Developer Experience

## Overview

This release enriches the error system with exception notes (inspired by Python's `add_note()`) and context awareness. These features make errors more expressive and provide better debugging information without changing the core API.

## Release Date

Target: TBD (after v1.0.0)

## Motivation

v1.0.0 provides the foundation, but errors often need additional context that's discovered at runtime or added after catching. This release adds the tools for that enrichment.

## What's Included

### Exception Notes: `.addNote()`

Python 3.11 introduced `add_note()` for enriching exceptions. This release mirrors that functionality:

```typescript
import { error, raise } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });

try {
  processData(input);
} catch (err) {
  raise(AppError().addNote('Processing failed at line 42'));
}

// Multiple notes supported
raise(AppError().addNote('Attempt 1 failed').addNote('Retrying...').addNote('Attempt 2 failed'));

// Notes are preserved through chaining
raise(AppError().from(err).addNote('Wrapped with context'));
```

### Notes in Output

#### Development Mode (Pretty)

```
✗ AppError: Processing failed
  └─ notes:
       └─ "Attempt 1 failed"
       └─ "Retrying..."
       └─ "Attempt 2 failed"
```

#### Production Mode (Compact)

```
AppError: Processing failed {"notes":["Attempt 1 failed","Retrying...","Attempt 2 failed"]}
```

### Error Context Property

Every error instance now has a `context` property:

```typescript
err.context; // Record<string, unknown> | null
```

The `context` property exists on all errors, initially as `null`. It's populated via `withContext()` (v2.0.0) or can be set directly:

```typescript
const err = AppError();
err.context = { requestId: 'req-123', userId: 'user-456' };
```

## What's Changed

### Error Instance Type Update

The `ErrorInstance` type uses generics for type-safe fields:

```typescript
export type ErrorInstance<T extends Record<string, unknown> = Record<string, unknown>> = {
  context: Record<string, unknown> | null;
  addNote: (note: string) => ErrorInstance<T>;
};
```

## What's NOT Included

This release intentionally excludes:

- **Type guards** (`isValidationError()`, etc.) — coming in v1.2.0
- **Predefined errors** (`errors.ValidationError`, etc.) — coming in v1.2.0
- **Output formatting** (dev vs prod modes) — coming in v1.3.0
- **Stack cleaning** (`stripLibraryFrames()`) — coming in v1.3.0
- **Context injection** (`withContext()`) — coming in v2.0.0

## API Changes

### New Exports

```typescript
// No new exports in v1.1.0
// .addNote() is a method on ErrorInstance
// context property is already part of ErrorInstance
```

### Enhanced Exports

```typescript
export type ErrorInstance<T extends Record<string, unknown> = Record<string, unknown>> = {
  context: Record<string, unknown> | null;
  addNote: (note: string) => ErrorInstance<T>;
};
```

## Migration Path

No migration required — this is purely additive. Existing code continues to work.

## Testing Requirements

- [ ] Unit tests for `.addNote()` method
- [ ] Unit tests for multiple notes
- [ ] Unit tests for notes preservation through `.from()` chaining
- [ ] Unit tests for `notes` property on error instances
- [ ] Type tests for `.addNote()` chaining

## Changelog Entry

```markdown
## v1.1.0 — Enhanced Developer Experience (YYYY-MM-DD)

### Added

- `.addNote()` method for enriching errors with notes
- Multiple notes support with order preservation
- Notes display in development and production output
- Enhanced documentation for `context` property

### Changed

- ErrorInstance type documentation improved
```

## Related Documents

- [Notes Feature](../product/features/notes.md)
- [Chaining Feature](../product/features/chaining.md)
- [Context Injection Feature](../product/features/context-injection.md)
- [Output Formatting Feature](../product/features/output-formatting.md)
