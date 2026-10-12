/**
 * Regression tests for the R5 transitive-classification contract.
 *
 * The R1 transitive walk ran every reachable ancestor's schema on
 * the child's data. R5 drops that walk: each factory runs its own
 * schema, and `is()` walks the chain for classification only.
 *
 * These tests pin the post-R5 invariants:
 *  - `is()` walks transitive and diamond chains.
 *  - Cycle guards prevent infinite loops in the `is()` walk.
 *  - The factory's `inherits` array is frozen at construction
 *    (Phase 4 invariant, preserved across rounds).
 *  - The leaf's own schema is the only runtime oracle; the
 *    `is()` walk does not validate.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { error, is, ArgsValidationError } from '../src/index.js';
import type { AnyErrorFactory } from '../src/error/types.js';

describe('R5: is() walks transitive chains without cascade', () => {
  it('classifies a leaf against a grandparent via is() (no schema run)', () => {
    // R1 walked the chain and ran the grandparent's schema. R5
    // walks the chain only for is() classification. The leaf's
    // own schema is what validates.
    const Parent = error({
      name: 'Parent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Middle = error({
      name: 'Middle',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
      inherits: Parent,
    });
    const Leaf = error({
      name: 'Leaf',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
      inherits: Middle,
    });

    const ok = Leaf({ id: 'x' });
    expect(ok.name).toBe('Leaf');
    expect(is(ok, Parent)).toBe(true);
    expect(is(ok, Middle)).toBe(true);
    expect(is(ok, Leaf)).toBe(true);
  });

  it('cycles in the inheritance chain do not infinite-loop', () => {
    // The cycle guard in `is()` is unchanged. Build a cycle
    // through a fresh factory whose inherits array references
    // an existing factory and another fresh factory whose
    // inherits references back.
    const A = error({ name: 'A' });
    const B = error({ name: 'B', inherits: A });
    const C = error({ name: 'C', inherits: [A, B] });

    const instance = C();
    expect(instance.name).toBe('C');
    expect(is(instance, A)).toBe(true);
    expect(is(instance, B)).toBe(true);
    expect(is(instance, C)).toBe(true);
  });

  it('diamond inheritance classifies against the root', () => {
    // The root has a schema; the leaves inherit through two
    // paths. R5: the leaf's own schema is the only runtime
    // oracle; is() walks the diamond via Set-based dedup.
    const Root = error({
      name: 'Root',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Left = error({
      name: 'Left',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
      inherits: Root,
    });
    const Right = error({
      name: 'Right',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
      inherits: Root,
    });
    const Tip = error({
      name: 'Tip',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
      inherits: [Left, Right],
    });

    const ok = Tip({ id: 'x' });
    expect(is(ok, Root)).toBe(true);
    expect(is(ok, Tip)).toBe(true);
  });

  it("preserves classification across caller's inherits array mutations", () => {
    // R8: the factory snapshots the inherits list at construction
    // time. The caller's array is no longer frozen in place — that
    // side effect was surprising consumers who passed a shared
    // list. The classification is preserved because `is()` walks
    // the factory's own (frozen) copy.
    const Parent = error({
      name: 'Parent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Other = error({ name: 'Other' });

    const parents: AnyErrorFactory[] = [Parent];
    const C = error({
      name: 'C',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
      inherits: parents,
    });

    const instance = C({ id: 'x' });
    expect(is(instance, Parent)).toBe(true);
    expect(is(instance, Other)).toBe(false);

    // Mutations on the caller's array are now allowed and have no
    // effect on the existing classification.
    parents.length = 0;
    expect(is(instance, Parent)).toBe(true);
    expect(is(instance, Other)).toBe(false);

    parents.splice(0, 0, Other);
    expect(is(instance, Parent)).toBe(true);
    expect(is(instance, Other)).toBe(false);

    parents.push(Other);
    expect(is(instance, Parent)).toBe(true);
    expect(is(instance, Other)).toBe(false);
  });

  it('instance.inherits is the same frozen snapshot as the factory metadata', () => {
    // R9: the audit's repro showed that the factory's `.inherits`
    // was the frozen snapshot but the instance's `.inherits` was
    // the caller's original array. After R9, both reference the
    // same frozen snapshot built once before the closure. A
    // caller-side mutation on the shared list has no effect on
    // either side.
    const Parent = error({ name: 'Parent' });
    const parents: AnyErrorFactory[] = [Parent];
    const Child = error({ name: 'Child', inherits: parents });

    expect(Child.inherits).not.toBe(parents);
    expect(Array.isArray(Child.inherits)).toBe(true);
    expect((Child.inherits as readonly AnyErrorFactory[]).length).toBe(1);

    parents.length = 0;
    expect((Child.inherits as readonly AnyErrorFactory[]).length).toBe(1);
    expect(Child()).toHaveProperty('inherits');
    expect((Child().inherits as readonly AnyErrorFactory[]).length).toBe(1);
  });

  it('throws ArgsValidationError sourced from the leaf, not the parent', () => {
    // R5: when the leaf's own schema rejects, the source is the
    // leaf. The parent is not in the rejection path.
    const Parent = error({
      name: 'Parent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Leaf = error({
      name: 'Leaf',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
      inherits: Parent,
    });

    let caught: unknown = null;
    try {
      (Leaf as unknown as (input: { id: number }) => unknown)({ id: 1 });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    expect((caught as ArgsValidationError).source).toBe('Leaf');
  });
});
