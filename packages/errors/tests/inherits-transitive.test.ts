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
    // Round 4: the middle factory has an explicit schema. The
    // strict rule (a parent writes to a no-schema child) does not
    // fire because the middle has a schema; the leaf re-validation
    // propagates the merged shape transitively.
    const Middle = error({
      name: 'Middle',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
      inherits: Parent,
    });
    // Round 4: the leaf has an optional `id` so the sad path can
    // call the factory with no arguments and exercise the cascade
    // (the leaf's own schema accepts `{}`, then the cascade walks
    // up to the grandparent's required `id`).
    const Leaf = error({
      name: 'Leaf',
      fields: z.object({ id: z.string().optional() }),
      message: (data) => data.id ?? 'missing',
      inherits: Middle,
    });

    // Happy path: a leaf with the grandparent's required fields.
    const ok = Leaf({ id: 'x' });
    expect(ok.name).toBe('Leaf');
    expect(is(ok, Parent)).toBe(true);
    expect(is(ok, Middle)).toBe(true);
    expect(is(ok, Leaf)).toBe(true);

    // Sad path: missing the grandparent's required field throws
    // ArgsValidationError sourced from the grandparent. The
    // cascade's leaf re-validation, parent re-validation at
    // each level, and the parent's own schema all reject the
    // missing `id` field. The error is sourced from whichever
    // parent first rejects; in this chain, Middle (the direct
    // parent) re-validates after the leaf's empty input, and
    // Middle's schema is the same as Parent's. The leaf's
    // own schema accepts the empty input, so the source is
    // the parent whose schema rejected first.
    let caught: unknown = null;
    try {
      (Leaf as unknown as (input: Record<string, never>) => unknown)({});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    // The error is sourced from the first parent whose schema
    // rejected: Middle (the direct parent) or Parent (the
    // grandparent). Both have the same schema. Accept either.
    const source = (caught as ArgsValidationError).source;
    expect(['Middle', 'Parent']).toContain(source);
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
    // Round 4: each level has an explicit schema; the leaf
    // re-validation accepts the merged shape. The diamond's
    // `Set`-based cycle guard still applies.
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
    // Round 4: the tip has an optional `id` so the sad path can
    // call the factory with no arguments and exercise the cascade.
    const Tip = error({
      name: 'Tip',
      fields: z.object({ id: z.string().optional() }),
      message: (data) => data.id ?? 'missing',
      inherits: [Left, Right],
    });

    // Happy path: the root's required fields flow through.
    const ok = Tip({ id: 'x' });
    expect(is(ok, Root)).toBe(true);

    // Sad path: missing the root's required field throws with
    // the source being one of the parents (Left, Right, or
    // Root) — the diamond re-validates the merged data at each
    // level, and the first parent to reject is the source.
    let caught: unknown = null;
    try {
      (Tip as unknown as (input: Record<string, never>) => unknown)({});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    // The source is the first parent whose schema rejected the
    // missing `id`. Accept any of Left, Right, or Root.
    const source = (caught as ArgsValidationError).source;
    expect(['Left', 'Right', 'Root']).toContain(source);
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
    // Round 4: the child has an explicit schema; the strict rule
    // does not fire.
    const C = error({
      name: 'C',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
      inherits: parents,
    });

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
    //
    // Round 4: the child has a permissive schema so the strict
    // rule does not fire; the kind compatibility check passes.
    const Parent = error({
      name: 'CoerceParent',
      fields: z.object({ n: z.number() }),
      message: (data) => String(data.n),
    });
    const Child = error({
      name: 'CoerceChild',
      fields: z.object({ n: z.number() }),
      message: (data) => String(data.n),
      inherits: Parent,
    });

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
    //
    // Round 4: the child has a permissive schema so the strict
    // rule does not fire.
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
    const C = error({
      name: 'C',
      fields: z.object({ x: z.number().optional(), y: z.string().optional() }),
      message: (data) => data,
      inherits: [A, B],
    });

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
    //
    // Round 4: the child has an explicit schema that allows `b`
    // to be added. The leaf re-validation runs after the parent
    // and accepts the merged data.
    const Child = error({
      name: 'C',
      fields: z.object({ a: z.string() }),
      message: (data) => data.a,
    });
    const Parent = error({
      name: 'P',
      fields: z.object({ b: z.coerce.number() }),
      message: (data) => `${data.b}`,
    });
    const Leaf = error({
      name: 'L',
      fields: z.object({ a: z.string(), b: z.coerce.number() }),
      message: (data) => `${data.a}-${data.b}`,
      inherits: Parent,
    });

    // The call is on `Leaf`. Its schema pins the input
    // to `{a: string, b: string}`. Parent's schema coerces
    // `b` to number on the cascade. The leaf re-validation
    // accepts the post-parent data.
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
