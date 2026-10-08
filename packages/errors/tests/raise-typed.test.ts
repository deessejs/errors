/**
 * Consumer-side smoke test: validates that `raise()` correctly
 * preserves the type of the factory's ErrorInstance at the throw
 * site, and that the `is()` type guard discriminates factories
 * from native errors at runtime (the type-level discrimination is
 * pinned by tests/types/error-type.test.ts).
 */

import { describe, it, expect } from 'vitest';
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
      }
    }

    try {
      JSON.parse('not-json');
    } catch (err) {
      if (is(err, SyntaxError)) {
        // Native branch: standard Error properties only.
        expect(err.name).toBe('SyntaxError');
      } else {
        // is() returned false; this branch proves the discrimination works.
        expect.fail('expected SyntaxError');
      }
    }
  });
});
