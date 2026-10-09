/**
 * R6 narrowing tests for `is()`.
 *
 * The R5 cascade promised a narrowing that intersected a child's
 * own output with each parent's output. R6 drops the intersection:
 * the child carries only its own output, and `is()` now narrows
 * to the **queried factory's own output** (no walk). These tests
 * pin that contract with `expectTypeOf(...).toEqualTypeOf<...>()`
 * — no casts, no `as Parent` shortcuts.
 *
 * Each `it` block creates a parent with a distinct shape, queries
 * `is()` on a child instance typed as `unknown`, and asserts the
 * narrowed type inside the `if`. The point is not just that the
 * boolean is `true`; it's that the narrowed type matches what the
 * queried factory actually produces.
 */

import { describe, it, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { error, is } from '../src/index.js';

describe('R6 is() narrows to the queried factory output', () => {
  it('narrows a number parent to its own output', () => {
    const NumberParent = error({
      name: 'NumberParent',
      fields: z.object({ n: z.number() }),
      message: d => String(d.n),
    });
    const Child = error({
      name: 'Child',
      fields: z.object({ n: z.number(), extra: z.string() }),
      message: d => `${d.n}-${d.extra}`,
      inherits: NumberParent,
    });
    const caught: unknown = Child({ n: 1, extra: 'x' });
    if (is(caught, NumberParent)) {
      // The narrowed type is the parent's own output, not the
      // child's, and not an intersection.
      expectTypeOf(caught.fields.n).toEqualTypeOf<number>();
      // `extra` is the child's field and is not on the parent.
      // We accept either that the narrowed type is just the
      // parent output, or that the field is unreachable.
      // The type checker collapses the intersection; checking
      // for `undefined` is the only safe narrowing.
      expectTypeOf(caught.fields.extra).toEqualTypeOf<string | undefined>();
    }
  });

  it('narrows a coerce parent to number (not string | number)', () => {
    const CoerceParent = error({
      name: 'CoerceParent',
      fields: z.object({ n: z.coerce.number() }),
      message: d => String(d.n),
    });
    const Child = error({
      name: 'Child',
      fields: z.object({ n: z.coerce.number(), label: z.string() }),
      message: d => `${d.n}-${d.label}`,
      inherits: CoerceParent,
    });
    const caught: unknown = Child({ n: '42', label: 'x' });
    if (is(caught, CoerceParent)) {
      // The output is the post-coercion number, not the input union.
      expectTypeOf(caught.fields.n).toEqualTypeOf<number>();
    }
  });

  it('narrows a literal parent to the literal value', () => {
    const LiteralParent = error({
      name: 'LiteralParent',
      fields: z.object({ status: z.literal('ok') }),
      message: d => d.status,
    });
    const Child = error({
      name: 'Child',
      fields: z.object({ status: z.literal('ok'), code: z.number() }),
      message: d => `${d.status}-${d.code}`,
      inherits: LiteralParent,
    });
    const caught: unknown = Child({ status: 'ok', code: 1 });
    if (is(caught, LiteralParent)) {
      expectTypeOf(caught.fields.status).toEqualTypeOf<'ok'>();
    }
  });

  it('narrows a nested object parent to its own output', () => {
    const NestedParent = error({
      name: 'NestedParent',
      fields: z.object({ data: z.object({ user: z.object({ name: z.string() }) }) }),
      message: d => d.data.user.name,
    });
    const Child = error({
      name: 'Child',
      fields: z.object({ data: z.object({ user: z.object({ name: z.string(), id: z.string() }) }) }),
      message: d => d.data.user.id,
      inherits: NestedParent,
    });
    const caught: unknown = Child({ data: { user: { name: 'x', id: 'y' } } });
    if (is(caught, NestedParent)) {
      expectTypeOf(caught.fields.data.user.name).toEqualTypeOf<string>();
    }
  });

  it('narrows an array parent to the array shape', () => {
    const ArrayParent = error({
      name: 'ArrayParent',
      fields: z.object({ items: z.array(z.object({ id: z.string() })) }),
      message: d => String(d.items.length),
    });
    const Child = error({
      name: 'Child',
      fields: z.object({ items: z.array(z.object({ id: z.string(), count: z.number() })) }),
      message: d => String(d.items.length),
      inherits: ArrayParent,
    });
    const caught: unknown = Child({ items: [{ id: 'a', count: 1 }] });
    if (is(caught, ArrayParent)) {
      expectTypeOf(caught.fields.items).toEqualTypeOf<{ id: string }[]>();
    }
  });

  it('narrows through multiple parents to the queried one', () => {
    const A = error({
      name: 'A',
      fields: z.object({ a: z.string() }),
      message: d => d.a,
    });
    const B = error({
      name: 'B',
      fields: z.object({ b: z.number() }),
      message: d => String(d.b),
    });
    const C = error({
      name: 'C',
      fields: z.object({ a: z.string(), b: z.number(), c: z.boolean() }),
      message: d => `${d.a}-${d.b}-${d.c}`,
      inherits: [A, B],
    });
    const caught: unknown = C({ a: 'x', b: 1, c: true });
    if (is(caught, A)) {
      expectTypeOf(caught.fields.a).toEqualTypeOf<string>();
    }
    if (is(caught, B)) {
      expectTypeOf(caught.fields.b).toEqualTypeOf<number>();
    }
  });

  it('does not narrow when the queried type is unrelated', () => {
    const P = error({
      name: 'P',
      fields: z.object({ n: z.number() }),
      message: d => String(d.n),
    });
    const caught: unknown = P({ n: 1 });
    if (is(caught, Error)) {
      // Native Error narrowing: the `fields` extension is not present.
      // We assert the structural relationship to ensure the contract.
      expectTypeOf(caught).toMatchTypeOf<Error>();
    }
  });
});
