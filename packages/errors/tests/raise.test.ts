/**
 * Unit tests for the raise() function.
 */

import { describe, it, expect } from 'vitest';
import { error } from '../src/error/error.js';
import { raise } from '../src/raise/index.js';
import type { ErrorInstance } from '../src/error/types.js';

describe('raise() function', () => {
  describe('basic usage', () => {
    it('should throw the error instance', () => {
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      expect(() => raise(instance)).toThrow(instance);
    });

    it('should have never return type (compile-time verification)', () => {
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      // TypeScript should infer that this function never returns
      // The variable assignment itself should fail at compile time if return type is wrong
      const throwFn: () => never = () => raise(instance);

      // If we get here, TypeScript accepted the never return type
      expect(typeof throwFn).toBe('function');
    });

    it('should preserve error properties on thrown error', () => {
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      try {
        raise(instance);
      } catch (err) {
        const caught = err as ErrorInstance;
        expect(caught.name).toBe('TestError');
        expect(caught.message).toBe('TestError');
        expect(caught.stack).toBeDefined();
      }
    });
  });

  describe('with native throw', () => {
    it('should work with native throw syntax', () => {
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      expect(() => {
        throw instance;
      }).toThrow(instance);
    });
  });

  describe('with fields', () => {
    it('should throw error with fields', () => {
      const ValidationError = error<{ field: string }>({
        name: 'ValidationError',
        message: 'Field "{field}" is invalid',
      });
      const instance = ValidationError({ field: 'email' });

      try {
        raise(instance);
      } catch (err) {
        const caught = err as ErrorInstance<{ field: string }>;
        expect(caught.name).toBe('ValidationError');
        expect(caught.message).toBe('Field "email" is invalid');
        expect(caught.fields.field).toBe('email');
      }
    });
  });

  describe('chaining support', () => {
    it('should work when chained from error factory', () => {
      const TestError = error({ name: 'TestError' });

      expect(() => raise(TestError())).toThrow();
    });

    it('should throw after .from() is implemented', () => {
      // Note: .from() will be implemented in Task 05
      // For now, this test verifies raise() accepts ErrorInstance
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      expect(() => raise(instance)).toThrow();
    });
  });

  describe('module export', () => {
    it('should be exported from the module', () => {
      expect(typeof raise).toBe('function');
    });

    it('should have correct function signature', () => {
      const TestError = error({ name: 'TestError' });
      const instance = TestError();

      // Type check: raise should accept ErrorInstance and return never
      const fn: (error: ErrorInstance) => never = raise;
      expect(fn).toBe(raise);
    });
  });
});
