/**
 * Regression tests for Phase 4 of the type-validation audit:
 * factory metadata is immutable after construction.
 *
 * Without this, a consumer could rewrite the classification of an
 * existing instance by mutating `factory.inherits`, breaking the
 * stability invariant for any code that holds a reference to the
 * instance.
 */

import { describe, it, expect } from 'vitest';
import { error, is } from '../src/index.js';

describe('inherits is immutable after factory construction', () => {
  it('throws or silently fails when assigning to factory.inherits', () => {
    const Parent = error({ name: 'Parent' });
    const Other = error({ name: 'Other' });

    // Phase 4: factories are frozen at construction. Assignment to
    // `inherits` either throws (strict mode) or fails silently
    // (sloppy mode); the post-mutation classification must be
    // unchanged.
    try {
      (Parent as { inherits: unknown }).inherits = Other;
    } catch {
      // strict mode: TypeError
    }

    const child = error({ name: 'Child', inherits: Parent });
    const instance = child();

    // The child was classified under Parent at construction;
    // the late assignment must not have rewritten that.
    expect(is(instance, Parent)).toBe(true);
    expect(is(instance, Other)).toBe(false);
  });

  it('factory.name and factory.schema are also immutable', () => {
    const E = error({
      name: 'Original',
      message: 'hello',
    });

    try {
      (E as { name: string }).name = 'Mutated';
    } catch {
      // strict mode: TypeError — the assignment is rejected
    }
    expect(E.name).toBe('Original');

    const instance = E();
    expect(instance.name).toBe('Original');
  });

  it("does not observe later mutations of the caller's array", () => {
    // Phase 4 P2 #6: the factory snapshots the inherits list at
    // definition time. The previous implementation stored the
    // caller's array reference, so an in-place mutation would
    // retroactively flip the classification of every instance.
    const Parent = error({ name: 'Parent' });
    const Other = error({ name: 'Other' });

    const parents = [Parent];
    const C = error({ name: 'C', inherits: parents });
    const instance = C();

    expect(is(instance, Parent)).toBe(true);
    expect(is(instance, Other)).toBe(false);

    // Mutate the caller's array. The factory's snapshot must not
    // observe this mutation.
    parents.splice(0, 1, Other);

    expect(is(instance, Parent)).toBe(true);
    expect(is(instance, Other)).toBe(false);
  });
});
