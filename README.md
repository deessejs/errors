# @deessejs/errors

A TypeScript error handling library with exception chaining, hierarchical inheritance, and rich error semantics — inspired by Python's error system.

## Features

- **Exception Chaining** — Preserve the full context of errors with cause chains
- **Hierarchical Inheritance** — Organize errors in meaningful hierarchies
- **Rich Error Semantics** — Attach metadata, codes, and structured data to errors
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

```typescript
import { BaseError, ErrorKind, errorOf, errorWithCause } from '@deessejs/errors';

// Create typed errors
const myError = errorOf(
  'VALIDATION_ERROR',
  'Invalid input provided',
  { field: 'email', value: 'not-an-email' }
);

// Chain errors with context
const wrapped = errorWithCause(
  errorOf('PROCESSING_ERROR', 'Failed to process data'),
  myError
);

// Access the full chain
console.log(wrapped.message);        // "Failed to process data"
console.log(wrapped.cause?.message); // "Invalid input provided"
```

## Documentation

For full documentation, visit [errors.deessejs.com](https://errors.deessejs.com)

## License

MIT