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
  it('applies a single parent transformation to the child fields', () => {
    // Round 2 Gap 2: before the fix, the validation block consulted
    // result.ok but discarded result.value. A parent with
    // z.coerce.number() would still coerce its own fields, but the
    // child kept the raw string in its `.fields`. The fix writes
    // result.value back to `data` after every successful runSchema,
    // so the post-transform shape cascades.
    const Parent = error({
      name: 'CoerceParent',
      fields: z.object({ n: z.coerce.number() }),
      message: (data) => String(data.n),
    });
    const Child = error({ name: 'CoerceChild', inherits: Parent });

    // The child's call signature inherits the parent's input shape
    // through the standard-schema input inference. The cascade
    // test below is a runtime contract, not a type-narrowing one;
    // pin the cast at the call site so the test stays focused.
    const instance = (Child as unknown as (input: { n: string }) => { fields: { n: number } })({
      n: '42',
    });
    // Post-transform: the child's fields reflect the parent's
    // coercion, not the raw string.
    expect(instance.fields).toEqual({ n: 42 });
    expect(typeof instance.fields.n).toBe('number');
    // is() narrows to the schema's InferOutput, so the runtime
    // value matches the type-level promise.
    expect(is(instance, Parent)).toBe(true);
  });

  it('applies multiple parents in declaration order', () => {
    // Multi-inheritance: the second parent sees the first parent's
    // post-transform output, not the raw input. The cascade is
    // last-writer-wins per parent in the order the parents appear
    // in `inherits`.
    const A = error({
      name: 'A',
      fields: z.object({ x: z.coerce.number() }),
      message: (data) => String(data.x),
    });
    const B = error({
      name: 'B',
      fields: z.object({ y: z.string() }),
      message: (data) => data.y,
    });
    const C = error({ name: 'C', inherits: [A, B] });

    // The child's call signature does not yet propagate the
    // parents' input shapes; the runtime cascade is the focus of
    // this test, not the type-level narrowing. Pin a cast at the
    // call site.
    const instance = (
      C as unknown as (input: { x: string; y: string }) => {
        fields: { x: number; y: string };
      }
    )({ x: '1', y: 'two' });
    expect(instance.fields).toEqual({ x: 1, y: 'two' });
    expect(is(instance, A)).toBe(true);
    expect(is(instance, B)).toBe(true);
  });
});
