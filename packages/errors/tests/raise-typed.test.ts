/**
 * Consumer-side smoke test: validates that `raise()` correctly
 * preserves the type of the factory's ErrorInstance at the throw
 * site, and that the `is()` type guard discriminates factories
 * from native errors at runtime.
 *
 * The type-level assertions below are checked at compile time
 * (this file is included in tsconfig.test.json). If `is()` ever
 * regresses to returning `never` for the factory branch, the
 * type checks here will fail to compile.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import { error, raise, is } from '../src/index.js';

describe('raise() with typed factories', () => {
  it('throws an instance of a no-fields factory', () => {
    const NotFoundError = error({ name: 'NotFoundError' });

    let caught: unknown = null;
    try {
      raise(NotFoundError());
    } catch (err) {
      caught = err;
    }
    expect(caught).not.toBeNull();
    expect((caught as Error).name).toBe('NotFoundError');
    expect(is(caught, NotFoundError)).toBe(true);
  });

  it('throws an instance of a typed factory with fields preserved', () => {
    const ValidationError = error<{ field: string; reason: string }>({
      name: 'ValidationError',
    });

    try {
      raise(ValidationError({ field: 'email', reason: 'invalid format' }));
    } catch (err) {
      expect(is(err, ValidationError)).toBe(true);
      if (is(err, ValidationError)) {
        // Field types flow through the throw site.
        expect(err.fields.field).toBe('email');
        expect(err.fields.reason).toBe('invalid format');
      }
    }
  });

  it('is() discriminates a factory from a native error', () => {
    const AppError = error({ name: 'AppError' });

    try {
      raise(AppError());
    } catch (err) {
      if (is(err, AppError)) {
        // Factory branch: has structured fields.
        expect(err.name).toBe('AppError');
        // Type-level assertion: the factory's output type flows
        // through the is() narrowing. For a factory with no manual
        // generic and no inherits, the narrowed shape is structurally
        // assignable to `Record<string, unknown>`. If is() regresses
        // to returning `never`, the assignment below fails to compile.
        const _fieldsAssignable: Record<string, unknown> = err.fields;
        expect(_fieldsAssignable).toBeDefined();
      }
    }

    try {
      JSON.parse('not-json');
    } catch (err) {
      if (is(err, SyntaxError)) {
        // Native branch: standard Error properties only.
        expect(err.name).toBe('SyntaxError');
        // Type-level: is() narrows to the native Error subclass's
        // *instance type*. The constructor type `typeof SyntaxError`
        // is unwrapped via `InstanceType`.
        expectTypeOf(err).toEqualTypeOf<SyntaxError>();
      } else {
        // is() returned false; this branch proves the discrimination works.
        expect.fail('expected SyntaxError');
      }
    }
  });
});
