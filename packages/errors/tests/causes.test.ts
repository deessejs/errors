/**
 * Tests for the `causes()` function. After Phase 4b, the package
 * no longer maintains a flat `causes: Error[]` field on each
 * instance. The chain is reconstructed on demand by walking
 * `.cause` and detecting cycles.
 */

import { describe, it, expect } from 'vitest';
import { error, causes } from '../src/index.js';

describe('causes() function', () => {
  describe('basic usage', () => {
    it('returns the immediate cause for a single .from() call', () => {
      const A = error({ name: 'A' });
      const B = error({ name: 'B' });
      const cause = A();
      const instance = B().from(cause);
      expect(causes(instance)).toEqual([cause]);
    });

    it('returns an empty array when no cause is set', () => {
      const A = error({ name: 'A' });
      expect(causes(A())).toEqual([]);
    });

    it('returns an empty array for null and undefined', () => {
      expect(causes(null)).toEqual([]);
      expect(causes(undefined)).toEqual([]);
    });

    it('returns an empty array for non-error values', () => {
      expect(causes(42)).toEqual([]);
      expect(causes('oops')).toEqual([]);
      expect(causes({ cause: 'not an error' })).toEqual([]);
    });
  });

  describe('chaining', () => {
    it('returns the chain in immediate-to-root order', () => {
      const A = error({ name: 'A' });
      const root = A();
      const middle = A().from(root);
      const top = A().from(middle);
      expect(causes(top)).toEqual([middle, root]);
    });

    it('supports native errors in the chain', () => {
      const A = error({ name: 'A' });
      const native = new TypeError('boom');
      const instance = A().from(native);
      expect(causes(instance)).toEqual([native]);
    });

    it('supports deeply nested native causes', () => {
      const A = error({ name: 'A' });
      const root = new Error('root');
      const middle = new Error('middle', { cause: root });
      const instance = A().from(middle);
      expect(causes(instance)).toEqual([middle, root]);
    });
  });

  describe('cycle detection', () => {
    it('terminates on a self-referencing cause', () => {
      // The native Error constructor does not allow `cause` to be
      // itself, but the package accepts arbitrary inputs. Build a
      // cycle by hand and confirm causes() does not loop.
      const cycle: Error = new Error('cycle');
      (cycle as { cause?: Error }).cause = cycle;
      expect(causes(cycle)).toEqual([cycle]);
    });

    it('terminates on a two-step cycle', () => {
      const a: Error = new Error('a');
      const b: Error = new Error('b');
      a.cause = b;
      b.cause = a;
      // a → b → a is the cycle. The walk visits b, then a, then
      // returns to b which is already in the seen set. The cycle
      // terminates with [b, a] in walk order.
      expect(causes(a)).toEqual([b, a]);
      expect(causes(b)).toEqual([a, b]);
    });
  });

  describe('returns a new array', () => {
    it('mutating the result does not affect the underlying error', () => {
      const A = error({ name: 'A' });
      const cause = A();
      const instance = A().from(cause);
      const result = causes(instance);
      result.pop();
      // The cause is still recorded; the second call returns
      // the same chain.
      expect(causes(instance)).toEqual([cause]);
    });
  });
});
