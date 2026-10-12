/**
 * Static type-level tests for the R7 inheritance contract.
 *
 * After R7, the `error()` overloads reject `inherits` from factories
 * whose `InferOutput` is not a supertype of the leaf's `InferOutput`.
 * The constraint is enforced by the `[acceptsFields]` compatibility
 * witness declared on every `ErrorFactory`. A parent factory whose
 * output is `OutputParent` is only assignable to a leaf whose
 * output is `LeafOutput` if `[LeafOutput] extends [OutputParent]`
 * — contravariance, via `strictFunctionTypes`, on the function-typed
 * property.
 *
 * Each negative test below uses `@ts-expect-error` on the line
 * immediately before the `inherits:` line that emits the diagnostic.
 * TypeScript walks the comment back from the error site, so a
 * directive on the line above is the right placement. The companion
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

describe('R7 inherits type-level constraint', () => {
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
    // { n: number } — the parent requires a number. The
    // [acceptsFields] witness on Parent accepts { n: number };
    // the leaf's manual generic is { n: string }, so contravariance
    // rejects.
    error<{ n: string }>({
      name: 'Child',
      // @ts-expect-error — manual generic { n: string } is not assignable to Parent's { n: number }
      inherits: Parent,
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
      // @ts-expect-error — payload shape mismatch (count vs id)
      inherits: Parent,
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
      // @ts-expect-error — literal "ok" is not assignable to "bad"
      inherits: Parent,
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
      // @ts-expect-error — array element shape mismatch (count vs id)
      inherits: Parent,
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
      // @ts-expect-error — nested structural mismatch (name vs id)
      inherits: Parent,
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
      // @ts-expect-error — manual generic { n: string } is not assignable to Parent's { n: number }
      inherits: Parent,
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
      // @ts-expect-error — child is missing b for B
      inherits: [A, B],
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
    // The R7 contravariance witness checks each element of the
    // tuple list against the leaf's output, so the second element's
    // mismatch is caught here.
    error({
      name: 'C',
      fields: z.object({ a: z.string() }),
      message: (d) => d.a,
      // @ts-expect-error — second parent B requires b which the leaf does not declare
      inherits: [A, B],
    });
  });

  it('does not narrow-check a list typed as AnyErrorFactory[] (type-erased)', () => {
    // R7 documented limitation: the contravariance witness lives on
    // the *concrete* factory type. A list whose element type is
    // `AnyErrorFactory` has its witness parameter typed as `any`
    // (the type-erasure of `AnyErrorFactory`), so a single
    // incompatible element cannot be detected. This is a known
    // trade-off — a consumer who wants the per-element check must
    // type the list as a tuple `[A, B]` (covered by the previous
    // test). The runtime walk in `is()` will still surface the
    // mismatch at the right place.
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
    const parents: AnyErrorFactory[] = [A, B];
    // This call is intentionally accepted by the static checker:
    // the list is type-erased, so the witness cannot fire. The
    // runtime walk and `is()` are the consumer's catch here.
    error({
      name: 'C',
      fields: z.object({ a: z.string() }),
      message: (d) => d.a,
      inherits: parents,
    });
    expectTypeOf(parents).toEqualTypeOf<AnyErrorFactory[]>();
  });

  it('rejects a child whose output is a union with an incompatible branch', () => {
    // The leaf's `fields` is a discriminated union. The
    // [acceptsFields] witness sees the whole union, not branch by
    // branch: a parent requiring { kind: 'a'; n: number } is not
    // satisfied by a union containing { kind: 'b'; s: string }.
    const P = error({
      name: 'P',
      fields: z.object({ kind: z.literal('a'), n: z.number() }),
      message: (d) => String(d.n),
    });
    error({
      name: 'C',
      fields: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), n: z.number() }),
        z.object({ kind: z.literal('b'), s: z.string() }),
      ]),
      message: (d) => d.kind,
      // @ts-expect-error — discriminated union contains an incompatible branch
      inherits: P,
    });
  });
});
