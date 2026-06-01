# Testing Guide: @deessejs/errors

This guide covers patterns for testing error handling with `@deessejs/errors`.

## Setting Up

### Install

```bash
npm install -D @deessejs/errors
```

### Import Your Errors

```typescript
// errors/index.ts
import { error } from '@deessejs/errors';


export const ValidationError = error({
  name: 'ValidationError',
  fields: { field: { type: 'string' } },
});
```

## Basic Assertions

### Testing that Errors are Thrown

```typescript
import { describe, it, expect } from 'vitest';
import { ValidationError, raise } from './errors';

describe('validateEmail', () => {
  it('throws ValidationError for invalid email', () => {
    expect(() => {
      raise(ValidationError({ field: 'email' }));
    }).toThrow();

    // Or with the error type
    expect(() => {
      raise(ValidationError({ field: 'email' }));
    }).toThrow(ValidationError);
  });

  it('throws with throw syntax', () => {
    expect(() => {
      throw ValidationError({ field: 'email' });
    }).toThrow();
  });
});
```

### Testing Error Properties

```typescript
import { describe, it, expect } from 'vitest';
import { ValidationError, raise } from './errors';

describe('validateEmail', () => {
  it('throws ValidationError with correct field', () => {
    try {
      validateEmail('invalid');
    } catch (err) {
      expect(err.name).toBe('ValidationError');
      expect(err.fields.field).toBe('email');
    }
  });

  it('error has correct message', () => {
    try {
      validateEmail('invalid');
    } catch (err) {
      expect(err.message).toContain('email');
    }
  });
});
```

### Using Type Guards in Tests

```typescript
import { describe, it, expect } from 'vitest';
import { ValidationError, raise, errors } from './errors';
const { isValidationError } = errors;

describe('validateEmail', () => {
  it('throws ValidationError with correct field', () => {
    let caughtError: unknown;

    try {
      validateEmail('invalid');
    } catch (err) {
      caughtError = err;
    }

    // Type guard narrows the type
    expect(caughtError).toBeDefined();
    if (isValidationError(caughtError)) {
      expect(caughtError.fields.field).toBe('email');
    }
  });
});
```

## Jest Patterns

### toThrow with Custom Matchers

```typescript
// errors.matchers.ts
import 'jest';
import { is, errors } from '@deessejs/errors';

declare module 'jest' {
  interface Matchers<R> {
    toBeValidationError(): R;
    toHaveErrorField(field: string): R;
  }
}

expect.extend({
  toBeValidationError(error: unknown) {
    if (is(error, errors.ValidationError)) {
      return {
        pass: true,
        message: () => 'Expected not to be ValidationError',
      };
    }
    return {
      pass: false,
      message: () => `Expected ${error?.name} to be ValidationError`,
    };
  },

  toHaveErrorField(error: unknown, expectedField: string) {
    if (is(error, errors.ValidationError)) {
      if (error.fields.field === expectedField) {
        return {
          pass: true,
          message: () => '',
        };
      }
      return {
        pass: false,
        message: () => `Expected field "${expectedField}", got "${error.fields.field}"`,
      };
    }
    return {
      pass: false,
      message: () => 'Error is not a ValidationError',
    };
  },
});

// Usage
expect(err).toBeValidationError();
expect(err).toHaveErrorField('email');
```

### Testing with toThrow

```typescript
import { ValidationError } from './errors';

describe('validateEmail', () => {
  it('throws ValidationError', () => {
    expect(() => validateEmail('invalid')).toThrow(ValidationError);
  });

  it('error instance matches', () => {
    expect(() => validateEmail('invalid')).toThrow((err: Error) => {
      return err.name === 'ValidationError';
    });
  });
});
```

## Vitest Patterns

### Custom Matchers

```typescript
// tests/matchers.ts
import { is, errors } from '@deessejs/errors';

declare module 'vitest' {
  interface Assertion<T> {
    toBeValidationError(): T;
    toHaveField(name: string, value: unknown): T;
    toHaveHttpStatus(status: number): T;
  }
}

export const errorMatchers = {
  toBeValidationError(this: any): any {
    const err = this.obj;
    if (is(err, errors.ValidationError)) {
      return this;
    }
    throw new Error(`Expected ValidationError, got ${err.name}`);
  },

  toHaveField(this: any, name: string, value: unknown): any {
    const err = this.obj;
    if (err.fields[name] === value) {
      return this;
    }
    throw new Error(`Expected field ${name} to be ${value}, got ${err.fields[name]}`);
  },

  toHaveHttpStatus(this: any, status: number): any {
    const err = this.obj;
      return this;
    }
  },
};

// tests/setup.ts
import { errorMatchers } from './matchers';

expect.extend(errorMatchers);
```

### Usage

```typescript
import { describe, it, expect } from 'vitest';
import { validateEmail } from './validation';
import { errors } from '@deessejs/errors';
const { isValidationError } = errors;

describe('validateEmail', () => {
  it('throws ValidationError for invalid email', () => {
    expect(() => validateEmail('invalid')).toThrow(ValidationError);
  });

  it('has correct field', () => {
    let caughtError;

    try {
      validateEmail('invalid');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeValidationError();
    expect(caughtError).toHaveField('field', 'email');
    expect(caughtError).toHaveHttpStatus(400);
  });
});
```

## Async Error Testing

### Testing Async Functions

```typescript
import { describe, it, expect } from 'vitest';
import { fetchUser } from './users';

describe('fetchUser', () => {
  it('throws NotFoundError when user not found', async () => {
    await expect(fetchUser('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('error has correct path', async () => {
    try {
      await fetchUser('nonexistent');
    } catch (err) {
      expect(err.name).toBe('NotFoundError');
      expect(err.fields.path).toBe('/users/nonexistent');
    }
  });

  it('has correct HTTP status', async () => {
    try {
      await fetchUser('nonexistent');
    } catch (err) {
    }
  });
});
```

### Promise Rejection Patterns

```typescript
import { describe, it, expect } from 'vitest';
import { errors } from '@deessejs/errors';
const { isNotFoundError } = errors;

describe('fetchUser', () => {
  it('rejects with NotFoundError', async () => {
    await expect(fetchUser('nonexistent')).rejects.toMatchObject({
      name: 'NotFoundError',
    });
  });

  it('rejects with path field', async () => {
    await expect(fetchUser('123'))
      .rejects
      .toMatchObject({
        name: 'NotFoundError',
        fields: { path: '/users/123' },
      });
  });
});
```

## Error Cause Chain Testing

```typescript
import { describe, it, expect } from 'vitest';
import { causes } from '@deessejs/errors';

describe('error chain', () => {
  it('has correct cause chain', async () => {
    let caughtError;

    try {
      await performOperation();
    } catch (err) {
      caughtError = err;
    }

    // Check chain
    const chain = causes(caughtError);
    expect(chain).toHaveLength(3);
    expect(chain[0].name).toBe('HighLevelError');      // Most recent
    expect(chain[1].name).toBe('MidLevelError');
    expect(chain[2].name).toBe('LowLevelError');     // Original
  });

  it('first cause is most recent', () => {
    const chain = causes(caughtError);
    expect(chain[0]).toBe(caughtError);  // First is the caught error
  });
});
```

## Snapshot Testing

### Error Output Snapshots

```typescript
import { describe, it, expect } from 'vitest';
import { formatError } from '@deessejs/errors';

describe('error formatting', () => {
  it('produces consistent output', () => {
    const err = ValidationError({ field: 'email' })
      .addNote('Test note');

    const formatted = formatError(err, { mode: 'production' });

    expect(formatted).toMatchSnapshot();
  });

  it('includes all fields in production', () => {
    const err = ValidationError({
      field: 'email',
      message: 'Invalid format',
    });

    const formatted = formatError(err, { mode: 'production' });

    expect(formatted).toContain('ValidationError');
    expect(formatted).toContain('email');
  });
});
```

## Mocking withContext

### Testing Context Injection

```typescript
import { describe, it, expect } from 'vitest';
import { withContext } from '@deessejs/errors';

describe('withContext', () => {
  it('injects context into errors', () => {
    let caughtError;

    try {
      withContext({ requestId: 'test-123' }, () => {
        throw new Error('Test');
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError.context).toEqual({ requestId: 'test-123' });
  });

  it('merges nested contexts', () => {
    let caughtError;

    try {
      withContext({ userId: 'user-1' }, () => {
        withContext({ requestId: 'req-1' }, () => {
          throw new Error('Test');
        });
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError.context).toEqual({
      userId: 'user-1',
      requestId: 'req-1',
    });
  });
});
```

## Integration Testing

### Testing Error Handling Middleware

```typescript
import { describe, it, expect } from 'vitest';
import { createRequestHandler } from './middleware';

describe('error handling middleware', () => {
  it('returns correct HTTP status for ValidationError', async () => {
    const response = await makeRequest({
      body: { email: 'invalid' },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      name: 'ValidationError',
      field: 'email',
    });
  });

  it('returns correct HTTP status for NotFoundError', async () => {
    const response = await makeRequest({
      path: '/nonexistent',
    });

    expect(response.status).toBe(404);
    expect(response.body.name).toBe('NotFoundError');
  });

  it('returns 500 for unknown errors', async () => {
    const response = await makeRequest({
      simulate: 'unknown_error',
    });

    expect(response.status).toBe(500);
    expect(response.body.name).not.toBe('ValidationError');
  });
});
```

## Best Practices

### 1. Test the Error Type, Not the Message

```typescript
// ❌ Fragile - message might change
expect(err.message).toBe('Field "email" is invalid');

// ✅ Robust - type is stable
expect(isValidationError(err)).toBe(true);
expect(err.fields.field).toBe('email');
```

### 2. Test HTTP Status with Error Type

```typescript
// ✅ Complete
expect(isValidationError(err)).toBe(true);
```

### 3. Test Cause Chains When Relevant

```typescript
// ✅ Test that cause is preserved
expect(caughtError.cause).toBe(originalError);
```

### 4. Use Type Guards for TypeScript Projects

```typescript
// ✅ Type-safe
const { isValidationError } = errors;
if (isValidationError(err)) {
  expect(err.fields.field).toBe('email');
}
```

## Related Features

- [error-function.md](../features/error-function.md) — Error factory
- [type-guards.md](../features/type-guards.md) — Type-safe narrowing
- [chain-traversal.md](../features/chain-traversal.md) — Cause chains
- [context-injection.md](../features/context-injection.md) — Context
- [output-formatting.md](../features/output-formatting.md) — Formatting
