# Feature: Exception Notes with `.addNote()`

## Summary

Python 3.11 added `add_note()` to enrich exceptions after catching. This package mirrors that with `.addNote()` — a method on every error instance that adds context information to errors.

## API

```typescript
interface ErrorInstance {
  addNote(note: string): ErrorInstance;
  notes: string[];
}
```

### Method Signature

| Parameter | Type     | Description     |
| --------- | -------- | --------------- |
| `note`    | `string` | The note to add |

### Returns

The error instance itself (for chaining).

## Usage

### Basic Usage

```typescript
import { error, raise } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });

try {
  processData(input);
} catch (err) {
  raise(AppError().addNote('Processing failed'));
}
```

### Multiple Notes

Multiple notes are supported and appended in the order they are added:

```typescript
const AppError = error({ name: 'AppError' });

try {
  doSomething();
} catch (err) {
  raise(AppError().addNote('Attempt 1 failed').addNote('Retrying...').addNote('Attempt 2 failed'));
}

// err.notes === ['Attempt 1 failed', 'Retrying...', 'Attempt 2 failed']
```

### With Chaining

Notes are preserved through cause chains:

```typescript
const AppError = error({ name: 'AppError' });
const HighLevelError = error({ name: 'HighLevelError' });

try {
  doSomething();
} catch (err) {
  err.addNote('First catch');
  throw AppError().from(err).addNote('Second level');
}

// Error message will include both notes
```

### Contextual Notes

```typescript
const AppError = error({ name: 'AppError' });

try {
  doSomething();
} catch (err) {
  raise(AppError().addNote(`User: ${err.context?.userId}`));
}
```

### Async with Notes

```typescript
const AppError = error({ name: 'AppError' });

async function fetchUser(id: string) {
  try {
    return await getUser(id);
  } catch (err) {
    raise(AppError().from(err).addNote(`Failed to fetch user ${id}`));
  }
}
```

## Notes Display

### Development Mode

```
✗ AppError
  └─ notes:
       └─ "Attempt 1 failed"
       └─ "Retrying..."
       └─ "Attempt 2 failed"
```

### Production Mode

Notes are included in the compact log format:

```
AppError {"notes":["Attempt 1 failed","Retrying...","Attempt 2 failed"]}
```

## Design Rationale

**Why a method instead of a factory option?**

```typescript
// Method approach (chaining)
raise(AppError().addNote('note'));

// Factory approach (more verbose)
const AppError = error({ name: 'AppError', notes: ['note'] });
```

1. **Deferred enrichment** — Notes are often added _after_ catching, not at creation
2. **Dynamic content** — Notes often depend on runtime context
3. **Chainability** — `err.addNote('a').addNote('b')` reads naturally

**Why not push to an array directly?**

Direct mutation (`err.notes.push(...)`) is less expressive than a method that returns the instance. Method chaining better fits the library's design philosophy.

## Related Features

- [chaining.md](./chaining.md) — Notes are preserved through cause chains
- [context-injection.md](./context-injection.md) — Combining notes with context
- [output-formatting.md](./output-formatting.md) — How notes appear in dev vs prod
