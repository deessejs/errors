---
name: principal-level-error-system
description: Principal Level patterns for error factory - type inference, runtime validation, polymorphism, branding
type: reference
---

# Principal Level: Error Factory System

## 1. Automatic Type Inference from Schema

Automatically extract output type from Standard Schema.

```typescript
export const error = <
  const TSchema extends StandardSchemaV1 | undefined = undefined,
  TData = TSchema extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<TSchema>
    : Record<string, never>
>(config: {
  name: string;
  fields?: TSchema;
  inherits?: ErrorFactory | ErrorFactory[];
  message?: string;
}): ErrorFactory<TData> => { ... }

// Usage - types inferred automatically
const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({ field: z.string() }),
});

// err.fields.field is automatically typed as string
```

### Why This Matters

- No manual generic needed
- Schema drives the entire type system
- Compile-time validation of required fields

---

## 2. Runtime Contract Enforcement

Always validate input against schema before creating instance.

```typescript
const ErrorFactoryInstance = (input?: Partial<TData>): ErrorInstance<TData> => {
  if (fields) {
    const result = fields['~standard'].validate(input ?? {});

    if (result instanceof Promise) {
      // Note: async validation not supported in sync factory
    }

    if (result.issues) {
      // Throw if provided fields don't match schema
      // Ensures ErrorInstance never contains invalid data
    }
  }
  // ... rest
};
```

### Why This Matters

- `ErrorInstance` is always valid
- Catch errors early
- Schema is a true contract

---

## 3. Polymorphism: The `is` Utility

Check inheritance relationships across the chain.

```typescript
export const is = (err: unknown, factory: ErrorFactory): boolean => {
  if (!err || typeof err !== 'object' || !('_factory' in err)) {
    return false;
  }

  let current: ErrorFactory | ErrorFactory[] | undefined =
    (err as ErrorInstance)._factory;

  const check = (f: ErrorFactory): boolean => {
    if (f === factory) return true;
    if (Array.isArray(f.inherits)) return f.inherits.some(check);
    if (f.inherits) return check(f.inherits);
    return false;
  };

  return check(current as ErrorFactory);
};

// Usage
const AppError = error({ name: 'AppError' });
const ValidationError = error({ name: 'ValidationError', inherits: AppError });

const err = createValidationError();
is(err, AppError);          // ✅ true
is(err, ValidationError);   // ✅ true
is(err, NetworkError);      // ✅ false
```

### Why This Matters

- `instanceof` doesn't work with plain objects
- Inheritance is functional, not just metadata
- Type-safe error checking

---

## 4. Nominal Typing via Branding

Prevent structural type collisions.

```typescript
export type ErrorInstance<
  TFields extends Record<string, unknown>,
  Name extends string
> = {
  readonly __brand: Name;
  name: Name;
  fields: TFields;
  // ... other properties
};

// Usage - errors are nominally typed
const ValidationError = error({ name: 'ValidationError' });
const NetworkError = error({ name: 'NetworkError' });

// These are different types even with same shape
declare function processValidation(err: ErrorInstance<{}, 'ValidationError'>);
declare function processNetwork(err: ErrorInstance<{}, 'NetworkError'>);

processValidation(NetworkError()); // ❌ Type error
```

### Why This Matters

- TypeScript uses structural typing by default
- Branding creates nominal typing
- Prevents passing wrong error type to functions

---

## Summary Table

| Level | Focus | Key Feature |
|:---|:---|:---|
| Senior | Clean utilities | Regex, JSDoc, constants |
| Staff | Abstraction | StandardSchemaV1, inherits |
| Principal | Integrity | Auto-inference, runtime validation, is(), branding |
