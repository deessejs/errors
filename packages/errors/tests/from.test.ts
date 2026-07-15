/**
 * Unit tests for the .from() method.
 */

import { describe, it, expect } from 'vitest';
import { error } from '../src/index.js';

describe('.from() method', () => {
  describe('basic usage', () => {
    it('should set the cause property', () => {
      const AppError = error({ name: 'AppError' });
      const ValidationError = error({ name: 'ValidationError' });

      const cause = AppError();
      const instance = ValidationError();

      const result = instance.from(cause);

      expect(instance.cause).toBe(cause);
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
      expect(instance.cause!.message).toBe('native cause');
    });
  });

  describe('cause chain', () => {
    it('should add cause to causes array', () => {
      const AppError = error({ name: 'AppError' });
      const instance = AppError();

      instance.from(new Error('cause'));

      expect(instance.causes).toHaveLength(1);
      expect(instance.causes[0].message).toBe('cause');
    });

    it('should preserve nested cause chain', () => {
      const AppError = error({ name: 'AppError' });
      const cause1 = AppError();
      const cause2 = AppError();
      cause2.from(cause1);

      const instance = AppError();
      instance.from(cause2);

      expect(instance.causes).toHaveLength(2);
      // Direct cause is cause2, then cause1 (from cause2's chain)
      expect(instance.cause).toBe(cause2);
      expect(instance.causes).toContain(cause1);
      expect(instance.causes).toContain(cause2);
    });

    it('should build complete cause chain', () => {
      const AppError = error({ name: 'AppError' });
      const cause1 = AppError();
      const cause2 = AppError();
      const cause3 = AppError();
      cause3.from(cause2).from(cause1);

      const instance = AppError();
      instance.from(cause3);

      // causes array contains the full chain: newest first
      expect(instance.causes).toHaveLength(3);
      expect(instance.cause).toBe(cause3);
      // Verify all causes are present (order reflects build order)
      expect(instance.causes).toContain(cause3);
      expect(instance.causes).toContain(cause2);
      expect(instance.causes).toContain(cause1);
    });
  });

  describe('method chaining', () => {
    it('should support chaining multiple .from() calls', () => {
      const AppError = error({ name: 'AppError' });
      const instance = AppError();

      const result = instance
        .from(new Error('cause 1'))
        .from(new Error('cause 2'))
        .from(new Error('cause 3'));

      expect(result).toBe(instance);
      expect(instance.causes).toHaveLength(3);
    });

    it('should update cause when chaining', () => {
      const AppError = error({ name: 'AppError' });
      const instance = AppError();
      const cause1 = new Error('cause 1');
      const cause2 = new Error('cause 2');

      instance.from(cause1).from(cause2);

      // The direct cause should be the last one
      expect(instance.cause).toBe(cause2);
      // But causes array should have both
      expect(instance.causes).toContain(cause1);
      expect(instance.causes).toContain(cause2);
    });
  });

  describe('type safety', () => {
    it('should work with typed errors', () => {
      const AppError = error<{ code: string }>({ name: 'AppError' });
      const ValidationError = error<{ field: string }>({ name: 'ValidationError' });

      const cause = AppError({ code: 'ERR001' });
      const instance = ValidationError({ field: 'email' });

      instance.from(cause);

      expect(instance.cause).toBe(cause);
      expect((instance.cause as AppError).fields.code).toBe('ERR001');
    });

    it('should maintain instance fields after .from()', () => {
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
    it('should work with errors without causes property', () => {
      const AppError = error({ name: 'AppError' });
      const instance = AppError();

      // Native errors don't have causes property
      instance.from(new Error('native'));

      expect(instance.cause).toBeInstanceOf(Error);
      expect(instance.causes).toHaveLength(1);
    });

    it('should work with custom errors that have causes', () => {
      const AppError = error({ name: 'AppError' });
      const ValidationError = error({ name: 'ValidationError' });

      const innerError = AppError();
      innerError.from(new Error('inner cause'));

      const outerError = ValidationError();
      outerError.from(innerError);

      expect(outerError.causes).toHaveLength(2);
      // Direct cause is innerError, then nativeError (from innerError's chain)
      expect(outerError.cause).toBe(innerError);
      expect(outerError.causes).toContain(innerError);
      // The native error with 'inner cause' is in the causes chain
      const nativeInCauses = outerError.causes.find((c) => c.message === 'inner cause');
      expect(nativeInCauses).toBeDefined();
    });
  });
});
