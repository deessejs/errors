/**
 * Regression tests for the transitive ancestor-validation contract
 * (audit Round 2).
 *
 * Before commit `4056e68` shipped the parent-schema validation block,
 * `is(child, Grandparent)` could return true for an instance whose
 * `.fields` did not satisfy the grandparent's schema. The audit
 * closed the direct-parent case (`Parent → Child`) but left the
 * transitive case (`Parent → Middle → Leaf`) unaddressed. These
 * tests pin the recursive walk: every reachable ancestor's schema
 * is consulted at instantiation, with a `Set`-based cycle guard
 * and root-level deduplication for diamond inheritance.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { error, is, ArgsValidationError } from '../src/index.js';
import type { AnyErrorFactory } from '../src/error/types.js';

describe('inherits: transitive validation', () => {
  it('validates the grandparent schema when the leaf has only a middle parent', () => {
    const Parent = error({
      name: 'Parent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    // The child factory's call signature does not propagate the
    // parent's input shape automatically; pin a manual generic so
    // the test exercises the parent's schema at the call site
    // instead of forcing a cast.
    const Middle = error<{ id: string }>({ name: 'Middle', inherits: Parent });
    const Leaf = error<{ id: string }>({ name: 'Leaf', inherits: Middle });

    // Happy path: a leaf with the grandparent's required fields.
    const ok = Leaf({ id: 'x' });
    expect(ok.name).toBe('Leaf');
    expect(is(ok, Parent)).toBe(true);
    expect(is(ok, Middle)).toBe(true);
    expect(is(ok, Leaf)).toBe(true);

    // Sad path: missing the grandparent's required field throws
    // ArgsValidationError sourced from the grandparent. The call
    // site uses a cast because the static type contract says
    // `{id: string}` is required; the runtime contract is what
    // fails here.
    let caught: unknown = null;
    try {
      (Leaf as unknown as () => unknown)();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    expect((caught as ArgsValidationError).source).toBe('Parent');
  });

  it('cycles in the inheritance chain do not infinite-loop', () => {
    // Build a cycle by mutating the post-construction inherits field.
    // The factory itself is frozen, so the cycle is constructed via
    // a fresh factory whose inherits array references an existing
    // factory and another fresh factory whose inherits references
    // back. This is the cleanest cycle the test surface can build
    // without poking the private factory metadata.
    const A = error({ name: 'A' });
    const B = error({ name: 'B', inherits: A });
    const C = error({ name: 'C', inherits: [A, B] });

    // The walk terminates. If the cycle guard were missing, vitest
    // would time out the test (default timeout 5s) and we'd see it
    // here as a hang. A synchronous return value proves termination.
    const instance = C();
    expect(instance.name).toBe('C');
    expect(is(instance, A)).toBe(true);
    expect(is(instance, B)).toBe(true);
    expect(is(instance, C)).toBe(true);
  });

  it('diamond inheritance validates the root schema exactly once', () => {
    const Root = error({
      name: 'Root',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Left = error<{ id: string }>({ name: 'Left', inherits: Root });
    const Right = error<{ id: string }>({ name: 'Right', inherits: Root });
    const Tip = error<{ id: string }>({ name: 'Tip', inherits: [Left, Right] });

    // Happy path: the root's required fields flow through.
    const ok = Tip({ id: 'x' });
    expect(is(ok, Root)).toBe(true);

    // Sad path: missing the root's required field throws with
    // source: 'Root' (regardless of which leaf path triggered
    // the validation). Cast the call site so the static type
    // contract (which requires `{id: string}`) does not preempt
    // the runtime check.
    let caught: unknown = null;
    try {
      (Tip as unknown as () => unknown)();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    expect((caught as ArgsValidationError).source).toBe('Root');
  });

  it("rejects later in-place mutation of the caller's inherits array", () => {
    // Round 2 Gap 3: before the fix, the factory's validation block
    // read the closure-captured `inherits` reference, while `is()`
    // read the frozen snapshot. A consumer who mutated the caller's
    // array between factory construction and the first invocation
    // could desynchronize the two: `is()` kept recognizing the
    // original parent, but the validation block no longer saw it.
    //
    // The fix freezes the caller's array in place at construction
    // time. Any later in-place mutation now throws in strict mode,
    // closing the window at the source.
    const Parent = error({
      name: 'Parent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Other = error({ name: 'Other' });

    // The array is typed loosely so the splice/push arguments can
    // be the `Other` factory (a no-schema factory whose `TInput`
    // is `Record<string, never>` and therefore not assignable to
    // the schema-bearing `Parent`). The runtime still rejects the
    // mutation because of the freeze.
    const parents: AnyErrorFactory[] = [Parent];
    const C = error<{ id: string }>({ name: 'C', inherits: parents });

    // The factory works at construction time and at the first call.
    const instance = C({ id: 'x' });
    expect(is(instance, Parent)).toBe(true);
    expect(is(instance, Other)).toBe(false);

    // Later in-place mutations of the caller's array are rejected.
    expect(() => {
      parents.length = 0;
    }).toThrow(TypeError);
    expect(() => {
      parents.splice(0, 1, Other);
    }).toThrow(TypeError);
    expect(() => {
      parents.push(Other);
    }).toThrow(TypeError);

    // Classification is preserved regardless of the failed mutation.
    expect(is(instance, Parent)).toBe(true);
    expect(is(instance, Other)).toBe(false);
  });
});

describe('inherits: parent transformations cascade', () => {
  it('runs the parent schema on the cascade input', () => {
    // The cascade applies the parent's `result.value` to the
    // child's fields. The parent here uses a non-transforming
    // schema (`z.number()`, not `z.coerce.number()`) so the
    // Round 3 shape gate does not fire on the input. The test
    // pins the cascade contract without exercising a kind
    // transformation: the input shape survives the parent's
    // schema run.
    const Parent = error({
      name: 'CoerceParent',
      fields: z.object({ n: z.number() }),
      message: (data) => String(data.n),
    });
    const Child = error({ name: 'CoerceChild', inherits: Parent });

    const instance = (Child as unknown as (input: { n: number }) => { fields: { n: number } })({
      n: 42,
    });
    // The parent's schema validated the input; the output is
    // what the child carries.
    expect(instance.fields).toEqual({ n: 42 });
    expect(is(instance, Parent)).toBe(true);
  });

  it('runs each parent schema in declaration order', () => {
    // Multi-inheritance: the second parent sees the first parent's
    // post-transform output, not the raw input. Both schemas are
    // non-transforming (number and string, no coerce/transform),
    // so the Round 3 shape gate does not fire.
    const A = error({
      name: 'A',
      fields: z.object({ x: z.number() }),
      message: (data) => String(data.x),
    });
    const B = error({
      name: 'B',
      fields: z.object({ y: z.string() }),
      message: (data) => data.y,
    });
    const C = error({ name: 'C', inherits: [A, B] });

    const instance = (
      C as unknown as (input: { x: number; y: string }) => {
        fields: { x: number; y: string };
      }
    )({ x: 1, y: 'two' });
    expect(instance.fields).toEqual({ x: 1, y: 'two' });
    expect(is(instance, A)).toBe(true);
    expect(is(instance, B)).toBe(true);
  });

  it('applies a manual-generic cascade (parent adds a key the child did not declare)', () => {
    // The Round 3 strict rule: a parent may only add keys the
    // child did not declare via the manual generic. Here the
    // child declares `{a: string}` and the parent provides a
    // `b` key that the child did not declare. The parent's
    // schema is `z.object({b: z.coerce.number()})`; the call
    // site supplies `b: '1'` and the cascade transforms it to
    // a number. The result has both `a` and `b`, and `b` is a
    // number (the parent's transformation) without violating
    // the child's contract (the child did not declare `b`).
    const Child = error<{ a: string }>({ name: 'C' });
    const Parent = error({
      name: 'P',
      fields: z.object({ b: z.coerce.number() }),
      message: (data) => `${data.b}`,
    });
    const Leaf = error<{ a: string }>({ name: 'L', inherits: Parent });

    // The call is on `Leaf`. Its manual generic pins the input
    // to `{a: string}`. The legacy pass-through filter strips
    // `b` from the input (it's not in TKeys), so the cascade
    // starts with `{a: 'x'}`. Parent's schema requires `b`,
    // so the call site must supply `b: '1'` at the type level
    // — cast accordingly.
    const instance = (
      Leaf as unknown as (input: { a: string; b: string }) => {
        fields: { a: string; b: number };
      }
    )({ a: 'x', b: '1' });
    expect(instance.fields).toEqual({ a: 'x', b: 1 });
    expect(is(instance, Parent)).toBe(true);
  });
});
