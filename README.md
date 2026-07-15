# @deessejs/errors

[![npm](https://img.shields.io/npm/v/@deessejs/errors)](https://www.npmjs.com/package/@deessejs/errors)
[![TypeScript](https://img.shields.io/badge/typescript-%E2%9A%99%EF%B8%8F-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

console.log(processingErr.message); // "ProcessingError"
console.log(processingErr.cause); // validationErr
console.log(processingErr.causes); // [validationErr]
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

is(err, ValidationError); // true
is(err, AppError); // true (inherits from AppError)
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

## Why @deessejs/errors?

Built-in JavaScript errors are limited. `@deessejs/errors` brings Python-style error handling to TypeScript.

| Feature                  | Built-in `Error` | @deessejs/errors |
| ------------------------ | ---------------- | ---------------- |
| Exception chaining       | ❌               | ✅               |
| Hierarchical inheritance | ❌               | ✅               |
| Message templates        | ❌               | ✅               |
| Type-safe fields         | ❌               | ✅               |
| Standard Schema support  | ❌               | ✅               |

```typescript
// Traditional approach — limited context
throw new Error('Validation failed'); // ❌ Generic, no structure

// @deessejs/errors — rich, maintainable errors
const err = ValidationError({ field: 'email', reason: 'invalid format' });
err.from(originalError); // ✅ Chain exceptions, preserve context
```

## FAQ

### How do I create a custom error type?

```typescript
import { error } from '@deessejs/errors';

const ValidationError = error({ name: 'ValidationError' });
const err = ValidationError({ field: 'email' });
```

### How do I chain exceptions?

```typescript
import { error } from '@deessejs/errors';

const validationErr = ValidationError({ field: 'email' });
const processingErr = ProcessingError().from(validationErr);

console.log(processingErr.cause); // validationErr
```

### How do I check if an error is of a specific type?

```typescript
import { error, is } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });
const ValidationError = error({ name: 'ValidationError', inherits: AppError });

is(err, AppError); // true if err is ValidationError or any descendant
```

## Documentation

For full documentation, visit [errors.deessejs.com](https://errors.deessejs.com)

## License

MIT
