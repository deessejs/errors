# Feature: HTTP Status Mapping

## Summary

Errors can optionally define an HTTP status code, enabling seamless integration with web frameworks and API responses.

## API

```typescript
const NotFoundError = error({
  name: 'NotFoundError',
  fields: {
    path: { type: 'string' },
  },
  httpStatus: 404,
});
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `httpStatus` | `number` | HTTP status code |

### Access

```typescript
const err = NotFoundError({ path: '/users/123' });
err.httpStatus;  // 404
```

## Predefined Error HTTP Statuses

| Error | HTTP Status |
|-------|-------------|
| `ValidationError` | 400 (Bad Request) |
| `TypeError` | 400 (Bad Request) |
| `NotFoundError` | 404 (Not Found) |
| `UnauthorizedError` | 401 (Unauthorized) |
| `ForbiddenError` | 403 (Forbidden) |
| `TimeoutError` | 504 (Gateway Timeout) |

## Usage

### Creating Errors with HTTP Status

```typescript
import { error, raise } from '@deessejs/errors';

const ValidationError = error({
  name: 'ValidationError',
  fields: {
    field: { type: 'string' },
    message: { type: 'string' },
  },
  httpStatus: 400,
});

const NotFoundError = error({
  name: 'NotFoundError',
  fields: {
    path: { type: 'string' },
  },
  httpStatus: 404,
});
```

### Using in HTTP Handlers

```typescript
import { errors, causes, is } from '@deessejs/errors';

function handleError(err: unknown) {
  // Get HTTP status from error or cause chain
  const status = err.httpStatus ?? err.causes.find(c => c.httpStatus)?.httpStatus ?? 500;

  return {
    status,
    body: {
      name: err.name,
      message: err.message,
      notes: err.notes,
      // ... other fields
    },
  };
}
```

### Express/Next.js Integration

```typescript
// app/api/users/route.ts
import { errors, causes } from '@deessejs/errors';

export async function GET(request: Request) {
  try {
    const user = await getUser(id);
    if (!user) {
      throw errors.NotFoundError({ path: `/users/${id}` });
    }
    return Response.json(user);
  } catch (err) {
    const status = err.httpStatus ?? 500;
    const body = {
      name: err.name,
      message: err.message,
      notes: err.notes,
    };

    return Response.json(body, { status });
  }
}
```

### NestJS Integration

```typescript
// exceptions.filter.ts
import { errors, causes } from '@deessejs/errors';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception.httpStatus ?? 500;
    const body = {
      name: exception.name,
      message: exception.message,
      notes: exception.notes,
    };

    response.status(status).json(body);
  }
}
```

## Design Rationale

**Why not separate error classes from HTTP status?**

Mapping HTTP status to error types is extremely common:

```typescript
// Without HTTP status (verbose)
try {
  validate(data);
} catch (err) {
  throw { ...err, status: 400 };
}

// With HTTP status (clean)
throw ValidationError({ field: 'email' });  // Already has 400
```

**Why not use a separate HTTP error package?**

1. **Co-location** — Error and status belong together
2. **Consistency** — All errors have consistent structure
3. **Chain traversal** — Can search cause chain for status

**What about custom status codes?**

```typescript
const CustomError = error({
  name: 'CustomError',
  fields: { reason: { type: 'string' } },
  httpStatus: 422,  // Unprocessable Entity
});
```

## Related Features

- [predefined-errors.md](./predefined-errors.md) — Predefined errors with statuses
- [chain-traversal.md](./chain-traversal.md) — Finding status in cause chain
- [output-formatting.md](./output-formatting.md) — Status in output
