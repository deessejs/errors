# Migration Guide: From Native JavaScript Errors

This guide walks you through migrating from native JavaScript error handling to `@deessejs/errors`.

## Before and After Comparison

### Basic Error Classes

**Before (Native JS)**
```typescript
class ValidationError extends Error {
  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Usage
throw new ValidationError('email', 'Invalid format');
```

**After (@deessejs/errors)**
```typescript
import { error, raise } from '@deessejs/errors';

const ValidationError = error({
  name: 'ValidationError',
  fields: {
    field: { type: 'string' },
    message: { type: 'string' },
  },
});

// Usage
raise(ValidationError({ field: 'email', message: 'Invalid format' }));
// or
throw ValidationError({ field: 'email', message: 'Invalid format' });
```

### Error Inheritance

**Before (Native JS)**
```typescript
class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}
```

**After (@deessejs/errors)**
```typescript
import { error, raise } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });

const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
  fields: {
    field: { type: 'string' },
  },
});
```

### Exception Chaining

**Before (Native JS)**
```typescript
try {
  lowLevelOperation();
} catch (err) {
  const newError = new HighLevelError('Failed');
  newError.cause = err;  // Manual
  throw newError;
}
```

**After (@deessejs/errors)**
```typescript
try {
  lowLevelOperation();
} catch (err) {
  throw HighLevelError().from(err);
}
```

### Catching Errors

**Before (Native JS)**
```typescript
try {
  doSomething();
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.field);
  } else if (err instanceof AppError) {
    console.error('App error');
  }
}
```

**After (@deessejs/errors)**
```typescript
import { is, errors } from '@deessejs/errors';
const { isValidationError } = errors;

try {
  doSomething();
} catch (err) {
  // Option 1: Type guard (recommended)
  if (isValidationError(err)) {
    console.error(err.fields.field);
  }

  // Option 2: is() function
  if (is(err, errors.ValidationError)) {
    // Note: TypeScript doesn't narrow here
    console.error(err.fields.field); // Error!
  }
}
```

## Common Patterns Mapping

### Pattern 1: Not Found

**Before**
```typescript
class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
  }
}

throw new NotFoundError('User', userId);
```

**After**
```typescript
import { errors, raise } from '@deessejs/errors';

const NotFoundError = error({
  name: 'NotFoundError',
  fields: {
    resource: { type: 'string' },
    id: { type: 'string' },
  },
  message: '{resource} {id} not found',
  httpStatus: 404,
});

raise(NotFoundError({ resource: 'User', id: userId }));
```

### Pattern 2: Validation

**Before**
```typescript
class ValidationError extends Error {
  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

throw new ValidationError([
  { field: 'email', message: 'Invalid format' },
  { field: 'password', message: 'Too short' },
]);
```

**After**
```typescript
import { errors, raise } from '@deessejs/errors';

const ValidationError = error({
  name: 'ValidationError',
  fields: {
    errors: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
  },
  httpStatus: 400,
});

raise(ValidationError({
  errors: [
    { field: 'email', message: 'Invalid format' },
    { field: 'password', message: 'Too short' },
  ],
}));
```

### Pattern 3: Error with Context

**Before**
```typescript
async function handleRequest(req: Request) {
  try {
    const user = await getUser(req.userId);
    return user;
  } catch (err) {
    err.requestId = req.id;
    err.userId = req.userId;
    throw err;
  }
}
```

**After**
```typescript
import { errors, raise, withContext } from '@deessejs/errors';

async function handleRequest(req: Request) {
  return withContext({ requestId: req.id, userId: req.userId }, async () => {
    const user = await getUser(req.userId);
    return user;
  });
  // Any raised error automatically has context
}
```

### Pattern 4: Third-Party Error Wrapping

**Before**
```typescript
try {
  JSON.parse(input);
} catch (err) {
  const error = new AppError('Failed to parse JSON');
  error.cause = err;
  throw error;
}
```

**After**
```typescript
import { errors, raise } from '@deessejs/errors';

try {
  JSON.parse(input);
} catch (err) {
  throw errors.ValidationError({
    field: 'input',
    message: 'Invalid JSON',
  }).from(err);
}
```

## Step-by-Step Migration

### Step 1: Install and Configure

```bash
npm install @deessejs/errors
```

### Step 2: Define Your Error Hierarchy

```typescript
// errors/index.ts
import { error, errors } from '@deessejs/errors';

// Base errors
export const AppError = error({
  name: 'AppError',
  httpStatus: 500,
});

// Domain errors
export const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
  httpStatus: 400,
});

export const NotFoundError = error({
  name: 'NotFoundError',
  inherits: AppError,
  httpStatus: 404,
});

// Re-export predefined errors
export { errors };
```

### Step 3: Replace Error Classes

**Before**
```typescript
// src/errors.ts
export class ValidationError extends Error {
  constructor(public field: string, public message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

**After**
```typescript
// src/errors.ts
import { error } from '@deessejs/errors';

export const ValidationError = error({
  name: 'ValidationError',
  fields: {
    field: { type: 'string' },
    message: { type: 'string' },
  },
});
```

### Step 4: Update Imports

**Before**
```typescript
import { ValidationError } from './errors';

throw new ValidationError('email', 'Invalid');
```

**After**
```typescript
import { ValidationError, raise } from './errors';

raise(ValidationError({ field: 'email', message: 'Invalid' }));
// or
throw ValidationError({ field: 'email', message: 'Invalid' });
```

### Step 5: Update Catch Blocks

**Before**
```typescript
try {
  doSomething();
} catch (err) {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message, field: err.field });
  } else if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
  }
}
```

**After**
```typescript
import { is, errors, causes } from '@deessejs/errors';
const { isValidationError } = errors;

try {
  doSomething();
} catch (err) {
  // Get HTTP status from error or cause chain
  const status = err.httpStatus ?? causes(err).find(e => e.httpStatus)?.httpStatus ?? 500;

  if (isValidationError(err)) {
    res.status(status).json({
      error: err.fields.message,
      field: err.fields.field,
    });
  } else {
    res.status(status).json({ error: err.message });
  }
}
```

## Handling Legacy Code

### Wrapping Native Errors

```typescript
import { errors, raise } from '@deessejs/errors';

// When catching errors from dependencies
try {
  await db.query(sql);
} catch (err) {
  throw errors.DatabaseError({
    message: 'Query failed',
  }).from(err);
}
```

### instanceof Checks

```typescript
// Before: instanceof works
if (err instanceof ValidationError) { ... }

// After: use is()
import { is } from '@deessejs/errors';

if (is(err, ValidationError)) { ... }

// Or use type guards
const { isValidationError } = errors;
if (isValidationError(err)) { ... }
```

### Custom Error Properties

**Before**
```typescript
class CustomError extends Error {
  customProp: string;
  constructor() {
    super();
    this.customProp = 'value';
  }
}

err.customProp; // TypeScript knows this exists
```

**After**
```typescript
const CustomError = error({
  name: 'CustomError',
  fields: {
    customProp: { type: 'string' },
  },
});

err.fields.customProp; // Access via fields
```

## Bundling Multiple Changes

For large codebases, migrate incrementally:

1. **Phase 1**: Install and define error hierarchy (no usage changes)
2. **Phase 2**: Add new errors using `@deessejs/errors`, keep old ones
3. **Phase 3**: Migrate catch blocks to use `is()` and type guards
4. **Phase 4**: Migrate throw sites one module at a time

## Related Features

- [error-function.md](../features/error-function.md) — Error factory
- [is-function.md](../features/is-function.md) — Type checking
- [type-guards.md](../features/type-guards.md) — Type-safe narrowing
- [inheritance.md](../features/inheritance.md) — Error hierarchy
- [http-status.md](../features/http-status.md) — HTTP status mapping
