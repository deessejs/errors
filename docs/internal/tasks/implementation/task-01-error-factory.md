# Task 01: Implement error() Factory Function

## Status

✅ Complete

## Description

Create the `error()` factory function that returns an ErrorFactory. This is the core building block of the library.

## Requirements

- Return a callable factory function
- **Only support Standard Schema** compatible libraries (Zod, Valibot, ArkType, etc.) for field validation
- Support single and multiple inheritance
- Generate proper ErrorInstance instances

## Field Schema Support

The `error()` function accepts **Standard Schema** compatible field definitions only:

```typescript
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({
    field: z.string(),
    reason: z.string(),
  }),
});

// Works with any Standard Schema library (Zod, Valibot, ArkType, etc.)
```

```typescript
import * as valibot from 'valibot';

const ValibotError = error({
  name: 'ValibotError',
  fields: valibot.object({
    field: valibot.string(),
  }),
});
```

```typescript
import * as ark from 'arktype';

const ArkError = error({
  name: 'ArkError',
  fields: ark.type({ field: 'string' }),
});
```

## API

```typescript
import type { StandardSchemaV1 } from '@standard-schema/spec';

function error<T extends Record<string, unknown> = Record<string, unknown>>(
  config: ErrorConfig<T>
): ErrorFactory<T>;

type ErrorConfig<T> = {
  name: string;
  fields?: StandardSchemaV1; // Standard Schema only
  inherits?: ErrorFactory | ErrorFactory[];
  message?: string;
};
```

## Acceptance Criteria

- [ ] Function accepts ErrorConfig and returns ErrorFactory
- [ ] Standard Schema libraries work in fields (Zod, Valibot, etc.)
- [ ] Type inference works for input/output types via Standard Schema
- [ ] `inherits` option works for single parent
- [ ] `inherits` option works for multiple parents
- [ ] `message` template is stored for later formatting
- [ ] Factory has `name` property
- [ ] Factory has `inherits` property if specified

## Dependencies

None

## Related Tasks

- Task 04: Implement inherits option
- Task 07: Implement message templates
- Task 09: Unit tests for error()

## Notes

See [error-function.md](../../product/features/error-function.md) for design rationale.
