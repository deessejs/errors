/**
 * Unit tests for the .from() method. Phase 4b: only `.cause` is
 * mutated. The chain is reconstructed on demand by `causes(instance)`.
 */

import { describe, it, expect } from 'vitest';
import { error, causes } from '../src/index.js';

describe('.from() method', () => {
  describe('basic usage', () => {
    it('should set the cause property', () => {
      const AppError = error({ name: 'AppError' });
      const ValidationError = error({ name: 'ValidationError' });

      const cause = AppError();
      const instance = ValidationError();

      const result = instance.from(cause);

      expect(instance.cause).toBe(cause);
      expect(result).toBe(instance);
    });

    it('should return the instance for chaining', () => {
      const AppError = error({ name: 'AppError' });
      const instance = AppError();

      const result = instance.from(new Error('cause'));

      expect(result).toBe(instance);
    });

    it('should work with native errors', () => {
      const AppError = error({ name: 'AppError' });
      const instance = AppError();

      instance.from(new TypeError('native cause'));

      expect(instance.cause).toBeInstanceOf(TypeError);
      expect((instance.cause as Error).message).toBe('native cause');
    });
  });

  describe('chained .from() calls', () => {
    it('overrides the previous cause (single direct cause semantics)', () => {
      const A = error({ name: 'A' });
      const cause1 = new Error('c1');
      const cause2 = new Error('c2');

      const instance = A().from(cause1).from(cause2);

      // Phase 4b: only the most recent cause is the direct one.
      // The full causal chain is reachable via `causes(instance)`.
      expect(instance.cause).toBe(cause2);
    });
  });

  describe('cause chain traversal via causes()', () => {
    it('walks the chain when nested errors carry their own cause', () => {
      const A = error({ name: 'A' });
      const root = A();
      const middle = A().from(root);
      const top = A().from(middle);

      // top → middle → root
      expect(causes(top)).toEqual([middle, root]);
    });

    it('includes native errors in the chain', () => {
      const A = error({ name: 'A' });
      const inner = new Error('inner');
      const middle = A().from(inner);
      const top = A().from(middle);

      // top → middle → inner (native)
      expect(causes(top)).toEqual([middle, inner]);
    });
  });

  describe('type safety', () => {
    it('preserves the cause factory type for downstream access', () => {
      const AppError = error<{ code: string }>({ name: 'AppError' });
      const ValidationError = error<{ field: string }>({ name: 'ValidationError' });

      const cause = AppError({ code: 'ERR001' });
      const instance = ValidationError({ field: 'email' });

      instance.from(cause);

      expect(instance.cause).toBe(cause);
      expect((instance.cause as ReturnType<typeof AppError>).fields.code).toBe('ERR001');
    });

    it('maintains instance fields after .from()', () => {
      const ValidationError = error<{ field: string }>({
        name: 'ValidationError',
        message: 'Field "{field}" is invalid',
      });

      const instance = ValidationError({ field: 'email' });
      instance.from(new Error('network error'));

      expect(instance.fields.field).toBe('email');
      expect(instance.message).toBe('Field "email" is invalid');
    });
  });

  describe('edge cases', () => {
    it('replaces the previous cause on each call', () => {
      const A = error({ name: 'A' });
      const instance = A();

      instance.from(new Error('first'));
      instance.from(new Error('second'));

      expect(instance.cause).toBeInstanceOf(Error);
      expect((instance.cause as Error).message).toBe('second');
    });

    it('handles native errors with their own .cause chain', () => {
      const A = error({ name: 'A' });
      const root = new Error('root');
      const middle = new Error('middle', { cause: root });
      const instance = A().from(middle);

      // instance.cause is middle; causes(instance) walks to root.
      expect(instance.cause).toBe(middle);
      expect(causes(instance)).toEqual([middle, root]);
    });
  });
});
