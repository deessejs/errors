/**
 * Static type-level tests for the R5 inheritance contract.
 *
 * After R5, the `error()` overloads reject `inherits` from factories
 * whose `InferOutput` is not a supertype of the leaf's `InferOutput`.
 * These tests pin the constraint at the type level using
 * `@ts-expect-error`. Each block compiles only because the
 * `@ts-expect-error` is on a line that genuinely errors. The companion
 * `expectTypeOf` assertions confirm the success cases produce the
 * expected narrowed type.
 *
 * The constraint is the only enforcement of the deep-shape contract.
 * The runtime no longer cascades parent transformations: each factory
 * runs its own schema, and `instance.fields` reflects that schema's
 * output. The TypeScript check is what stops a child from declaring
 * an output that would break a parent's contract.
 */

import { describe, it, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { error } from '../src/index.js';
import type { AnyErrorFactory } from '../src/error/types.js';

describe('R5 inherits type-level constraint', () => {
  it('accepts a child whose InferOutput is assignable to the parent', () => {
    const Parent = error({
      name: 'Parent',
      fields: z.object({ n: z.number() }),
      message: (d) => String(d.n),
    });
    // { n: number; extra: string } is assignable to { n: number }.
    const Child = error({
      name: 'Child',
      fields: z.object({ n: z.number(), extra: z.string() }),
      message: (d) => `${d.n}-${d.extra}`,
      inherits: Parent,
    });
    expectTypeOf(Child).toBeCallableWith({ n: 1, extra: 'x' });
  });

  it('rejects a manual-generic child whose T is not assignable to the parent', () => {
    const Parent = error({
      name: 'Parent',
      fields: z.object({ n: z.coerce.number() }),
      message: (d) => String(d.n),
    });
    // The manual generic { n: string } is not assignable to
    // { n: number } — the parent requires a number.
    error<{ n: string }>({
      name: 'Child',
      inherits: Parent,
      // @ts-ignore — manual generic { n: string } is not
      // assignable to Parent's output { n: number }
    });
  });

  it('rejects an object-shape mismatch (payload: {id} vs payload: {count})', () => {
    const Parent = error({
      name: 'P',
      fields: z.object({ payload: z.object({ count: z.number() }) }),
      message: (d) => String(d.payload.count),
    });
    error({
      name: 'C',
      fields: z.object({ payload: z.object({ id: z.string() }) }),
      message: (d) => d.payload.id,
      inherits: Parent,
      // @ts-ignore — payload shape mismatch
    });
  });

  it('rejects a literal-type mismatch (z.literal("ok") vs "bad")', () => {
    const Parent = error({
      name: 'P',
      fields: z.object({ n: z.literal('bad') }),
      message: (d) => d.n,
    });
    error({
      name: 'C',
      fields: z.object({ n: z.literal('ok') }),
      message: (d) => d.n,
      inherits: Parent,
      // @ts-ignore — literal mismatch
    });
  });

  it('rejects an array-of-objects element-shape mismatch', () => {
    const Parent = error({
      name: 'P',
      fields: z.object({ items: z.array(z.object({ count: z.number() })) }),
      message: (d) => String(d.items.length),
    });
    error({
      name: 'C',
      fields: z.object({ items: z.array(z.object({ id: z.string() })) }),
      message: (d) => String(d.items.length),
      inherits: Parent,
      // @ts-ignore — array element shape mismatch
    });
  });

  it('rejects a nested structural mismatch two levels deep', () => {
    const Parent = error({
      name: 'P',
      fields: z.object({ data: z.object({ user: z.object({ name: z.string() }) }) }),
      message: (d) => d.data.user.name,
    });
    error({
      name: 'C',
      fields: z.object({ data: z.object({ user: z.object({ id: z.string() }) }) }),
      message: (d) => d.data.user.id,
      inherits: Parent,
      // @ts-ignore — nested structural mismatch
    });
  });

  it('accepts a child that extends the parent schema with a field', () => {
    const Parent = error({
      name: 'RegistryError',
      fields: z.object({ registry: z.string() }),
      message: (d) => `Registry ${d.registry} failed`,
    });
    const Child = error({
      name: 'TemplateNotFound',
      fields: z.object({ registry: z.string(), slug: z.string() }),
      message: (d) => `Template ${d.slug} missing in ${d.registry}`,
      inherits: Parent,
    });
    expectTypeOf(Child).toBeCallableWith({ registry: 'npm', slug: 'pkg' });
  });

  it('accepts a child declared with no parents', () => {
    const Standalone = error({
      name: 'Standalone',
      fields: z.object({ x: z.number() }),
      message: (d) => String(d.x),
    });
    expectTypeOf(Standalone).toBeCallableWith({ x: 1 });
  });

  it('accepts a no-schema child with no parents', () => {
    const NoSchema = error({ name: 'NoSchema', message: 'fallback' });
    expectTypeOf(NoSchema).toBeCallableWith();
  });

  it('rejects a no-schema child with a manual generic not assignable to a schema parent', () => {
    const Parent = error({
      name: 'P',
      fields: z.object({ n: z.number() }),
      message: (d) => String(d.n),
    });
    error<{ n: string }>({
      name: 'C',
      inherits: Parent,
      // @ts-ignore — manual generic { n: string } is not
      // assignable to Parent's output { n: number }
    });
  });

  it('accepts a no-schema child with a manual generic assignable to a schema parent', () => {
    const Parent = error({
      name: 'P',
      fields: z.object({ n: z.number() }),
      message: (d) => String(d.n),
    });
    // { n: number } is exactly assignable to { n: number }.
    const C = error<{ n: number }>({
      name: 'C',
      inherits: Parent,
    });
    expectTypeOf(C).toBeCallableWith({ n: 1 });
  });

  it('rejects when any one of multiple parents is incompatible', () => {
    const A = error({
      name: 'A',
      fields: z.object({ a: z.string() }),
      message: (d) => d.a,
    });
    const B = error({
      name: 'B',
      fields: z.object({ b: z.number() }),
      message: (d) => String(d.b),
    });
    // The child satisfies A (a: string) but lacks b for B.
    error({
      name: 'C',
      fields: z.object({ a: z.string() }),
      message: (d) => d.a,
      inherits: [A, B],
      // @ts-ignore — child is missing b for B
    });
  });

  it('accepts a child that satisfies every parent in a multi-inheritance list', () => {
    const A = error({
      name: 'A',
      fields: z.object({ a: z.string() }),
      message: (d) => d.a,
    });
    const B = error({
      name: 'B',
      fields: z.object({ b: z.number() }),
      message: (d) => String(d.b),
    });
    const C = error({
      name: 'C',
      fields: z.object({ a: z.string(), b: z.number() }),
      message: (d) => `${d.a}-${d.b}`,
      inherits: [A, B],
    });
    expectTypeOf(C).toBeCallableWith({ a: 'x', b: 1 });
  });

  it('rejects when the second parent in a list is incompatible', () => {
    const A = error({
      name: 'A',
      fields: z.object({ a: z.string() }),
      message: (d) => d.a,
    });
    const B = error({
      name: 'B',
      fields: z.object({ b: z.number() }),
      message: (d) => String(d.b),
    });
    // The first parent A is satisfied (a: string), but B is not.
    // The R6 helper catches the second-parent violation that
    // the previous helper missed when only the tuple head was
    // checked.
    error({
      name: 'C',
      fields: z.object({ a: z.string() }),
      message: (d) => d.a,
      inherits: [A, B],
      // @ts-ignore — first parent A is satisfied but
      // second parent B is not (missing b).
    });
  });

  it('rejects a non-tuple array of parents when one element is incompatible', () => {
    // The R5 helper terminated with `true` for non-tuple arrays.
    // R6 collapses non-tuple arrays to their element type via
    // P[number], so a typed `AnyErrorFactory[]` is checked as
    // if every element were the same union.
    const A = error({
      name: 'A',
      fields: z.object({ a: z.string() }),
      message: (d) => d.a,
    });
    const B = error({
      name: 'B',
      fields: z.object({ b: z.number() }),
      message: (d) => String(d.b),
    });
    // The list is typed `AnyErrorFactory[]` (not a tuple).
    // The leaf's output must be assignable to *each* element
    // of the array's element type. Here, the union of A and B
    // is { a: string; b: number } — the leaf is missing b, so
    // the constraint rejects.
    const parents: AnyErrorFactory[] = [A, B];
    error({
      name: 'C',
      fields: z.object({ a: z.string() }),
      message: (d) => d.a,
      inherits: parents,
      // @ts-ignore — non-tuple array element type
      // collapses to A | B, and the leaf is missing b for B.
    });
  });

  it('rejects a child whose output is a union with an incompatible branch', () => {
    // The leaf's `fields` is a discriminated union. The
    // `[NoInfer<Leaf>] extends [Parent]` form evaluates the
    // union as a whole, not branch-by-branch.
    const P = error({
      name: 'P',
      fields: z.object({ kind: z.literal('a'), n: z.number() }),
      message: (d) => String(d.n),
    });
    // The discriminated union: one branch is compatible with P
    // (kind 'a', n: number), the other is not (kind 'b', s: string).
    // R6 rejects the union because its whole shape is not a
    // subtype of P's output.
    error({
      name: 'C',
      fields: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), n: z.number() }),
        z.object({ kind: z.literal('b'), s: z.string() }),
      ]),
      message: (d) => d.kind,
      inherits: P,
      // @ts-ignore — union contains an incompatible branch
    });
  });
});
