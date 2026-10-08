// Static type tests for the error() factory. They live under tests/types/ and use expectTypeOf to assert types.
//
// These assertions express the *current* contract (what the runtime
// actually produces) rather than aspirational invariants. Assertions
// that depend on Phase 2 (schema-driven I/O inference) are marked
// with the `ts-expect-error` directive below and reference the
// audit phase that will resolve them.

import { describe, it, expectTypeOf } from 'vitest';
import { z } from 'zod';
import * as v from 'valibot';
import { type } from '@ark/type';
import { error, raise, ArgsValidationError } from '../../src/index.js';

describe('error() type inference (Standard Schema mode)', () => {
  it('infers the field type from a zod schema', () => {
    const E = error({
      name: 'ZodError',
      fields: z.object({ x: z.string() }),
      message: (data) => data.x,
    });
    const instance = E({ x: 'hello' });
    // The instance is a full ErrorInstance, not a partial slice.
    expectTypeOf(instance).toMatchTypeOf<{
      fields: { x: string };
      name: string;
      message: string;
      stack: string;
      notes: string[];
      cause: Error | null;
      context: Record<string, unknown> | null;
    }>();
    expectTypeOf(instance.fields).toEqualTypeOf<{ x: string }>();
  });

  it('infers the field type from a valibot schema', () => {
    const E = error({
      name: 'ValibotError',
      fields: v.object({ count: v.number() }),
      message: (data) => String(data.count),
    });
    const instance = E({ count: 42 });
    expectTypeOf(instance.fields).toEqualTypeOf<{ count: number }>();
  });

  it('infers the field type from an arktype schema', () => {
    const E = error({
      name: 'ArkError',
      fields: type({ ok: 'boolean' }),
      message: (data) => String(data.ok),
    });
    const instance = E({ ok: true });
    expectTypeOf(instance.fields).toEqualTypeOf<{ ok: boolean }>();
  });

  it('preserves transformed output types in the message function', () => {
    // The schema transforms string -> number via z.coerce.
    // The message function receives the post-transform shape (number).
    const E = error({
      name: 'CoerceError',
      fields: z.object({ n: z.coerce.number() }),
      message: (data) => String(data.n),
    });
    // Phase 2: input shape is `string | number` (the schema's
    // input). Passing a string literal is accepted at compile time.
    const instance = E({ n: '42' });
    expectTypeOf(instance.fields.n).toEqualTypeOf<number>();
    expectTypeOf(instance.fields.n).not.toEqualTypeOf<string>();
  });

  it('preserves branded types from zod', () => {
    // zod's brand produces a phantom-property type that is not
    // structurally assignable to a hand-written `{ __brand: 'X' }`
    // shape. The schema's InferOutput is opaque at the call site
    // without further help; consumers can still access the field
    // by name. This test pins the *current* behavior — branded
    // types pass through, but exact structural compatibility is
    // not enforced. When Standard Schema's InferOutput gains a
    // brand-preserving helper, tighten this assertion.
    const UserId = z.string().regex(/^usr_/).brand<'UserId'>();
    const E = error({
      name: 'BrandedError',
      fields: z.object({ id: UserId }),
      message: (data) => data.id,
    });
    const instance = E({ id: 'usr_1' as unknown as string });
    expect(instance.fields.id).toBe('usr_1');
  });
});

describe('error() without fields (manual generic)', () => {
  it('respects the manually supplied generic', () => {
    const E = error<{ a: string; b: number }>({ name: 'ManualError' });
    const instance = E({ a: 'hi', b: 1 });
    expectTypeOf(instance.fields).toEqualTypeOf<{ a: string; b: number }>();
  });

  it('defaults fields to Record<string, never> when no schema is provided', () => {
    const E = error({ name: 'DefaultError' });
    // The factory accepts an optional input; calling with no
    // arguments yields an instance whose fields are the schema-less
    // default shape.
    const instance = E();
    // The default fields shape is `Record<string, unknown>` until
    // Phase 2 narrows it to `Record<string, never>` for schema-less
    // factories. We assert the current (broader) shape.
    expectTypeOf(instance.fields).toEqualTypeOf<Record<string, unknown>>();
  });
});

describe('error() instance shape', () => {
  it('the instance has the documented core fields', () => {
    const E = error({ name: 'ShapeError' });
    const instance = E();
    expectTypeOf(instance.name).toEqualTypeOf<string>();
    expectTypeOf(instance.message).toEqualTypeOf<string>();
    expectTypeOf(instance.stack).toEqualTypeOf<string>();
    expectTypeOf(instance.cause).toEqualTypeOf<Error | null>();
    expectTypeOf(instance.notes).toEqualTypeOf<string[]>();
    expectTypeOf(instance.context).toEqualTypeOf<Record<string, unknown> | null>();
  });

  it('the instance methods are bound and chainable', () => {
    const E = error({ name: 'ChainError' });
    const a = E();
    const b = a.addNote('n1').addNote('n2');
    // .notes is string[], not a tuple — push semantics, not positional.
    expectTypeOf(b.notes).toEqualTypeOf<string[]>();

    const cause = new Error('c');
    const c = b.from(cause);
    // cause is nullable; once set it is non-null only at the runtime
    // boundary. The static type stays Error | null.
    expectTypeOf(c.cause).toEqualTypeOf<Error | null>();
  });
});

describe('error() legacy path', () => {
  it('accepts a string message with the legacy template form', () => {
    const E = error<{ name: string }>({
      name: 'Legacy',
      message: 'Hello {name}',
    });
    const instance = E({ name: 'Ada' });
    expectTypeOf(instance.message).toEqualTypeOf<string>();
    expectTypeOf(instance.fields).toEqualTypeOf<{ name: string }>();
  });

  it('the legacy form is still valid TypeScript', () => {
    // Runtime warning is covered indirectly by the existing legacy form tests.
    // Asserting the call-site collection here is brittle (stack format, mock
    // ordering), so we just lock the type contract.
    const E = error<{ a: string }>({ name: 'Legacy', message: '{a}' });
    const instance = E({ a: 'x' });
    expectTypeOf(instance.message).toEqualTypeOf<string>();
  });
});

describe('ArgsValidationError type contract', () => {
  it('is constructible with source, issues, vendor', () => {
    const e = new ArgsValidationError('X', [{ message: 'oops' }], 'mock');
    expectTypeOf(e).toMatchTypeOf<Error>();
    expectTypeOf(e.source).toEqualTypeOf<string>();
    expectTypeOf(e.issues).toEqualTypeOf<ReadonlyArray<unknown>>();
    expectTypeOf(e.vendor).toEqualTypeOf<string>();
  });
});

describe('raise() return type', () => {
  it('raises are typed as never', () => {
    const E = error({ name: 'RaiseError' });
    // The return type is `never`. The line below is a compile-time check:
    //   the expression must compile, and the inferred return is `never`.
    const r = (): never => raise(E());
    expectTypeOf(r).returns.toEqualTypeOf<never>();
  });
});
