# @deessejs/errors

A TypeScript error handling library with exception chaining, hierarchical inheritance, and rich error semantics — inspired by Python's error system.

## Features

- **Exception Chaining** — Preserve the full context of errors with cause chains via `.from()`
- **Hierarchical Inheritance** — Organize errors in meaningful hierarchies with single or multiple inheritance
- **Rich Error Semantics** — Attach structured data, templates, and notes to errors
- **TypeScript First** — Full type safety with comprehensive type definitions

## Installation

```bash
npm install @deessejs/errors
# or
pnpm add @deessejs/errors
# or
yarn add @deessejs/errors
```

## Quick Start

### Creating Errors

```typescript
import { error } from '@deessejs/errors';

// Simple error
const ValidationError = error({ name: 'ValidationError' });
const err = ValidationError();

// Error with message template
const ValidationError = error({
  name: 'ValidationError',
  message: 'Field "{field}" is invalid: {reason}',
});

const err = ValidationError({ field: 'email', reason: 'invalid format' });
// err.message === 'Field "email" is invalid: invalid format'
```

### Exception Chaining

```typescript
import { error } from '@deessejs/errors';

const ValidationError = error({ name: 'ValidationError' });
const ProcessingError = error({ name: 'ProcessingError' });

const validationErr = ValidationError({ field: 'email' });
const processingErr = ProcessingError();

// Chain errors with .from()
processingErr.from(validationErr);

console.log(processingErr.message);      // "ProcessingError"
console.log(processingErr.cause);         // validationErr
console.log(processingErr.causes);        // [validationErr]
```

### Hierarchical Inheritance

```typescript
import { error } from '@deessejs/errors';

// Single inheritance
const AppError = error({ name: 'AppError' });
const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
});

// Multiple inheritance
const NetworkError = error({ name: 'NetworkError' });
const StorageError = error({ name: 'StorageError' });
const CombinedError = error({
  name: 'CombinedError',
  inherits: [NetworkError, StorageError],
});
```

### Type Checking

```typescript
import { error, is } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });
const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
});

const err = ValidationError();

is(err, ValidationError);  // true
is(err, AppError);          // true (inherits from AppError)
```

### Traverse Cause Chain

```typescript
import { error, causes } from '@deessejs/errors';

const Err1 = error({ name: 'Err1' });
const Err2 = error({ name: 'Err2' });
const Err3 = error({ name: 'Err3' });

const err1 = Err1();
const err2 = Err2().from(err1);
const err3 = Err3().from(err2);

// Iterate through the cause chain
for (const cause of causes(err3)) {
  console.log(cause.name);
}
// Output: Err2, Err1
```

## Documentation

For full documentation, visit [errors.deessejs.com](https://errors.deessejs.com)

## License

MIT