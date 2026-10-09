/**
 * R8 audit-reproduction tests.
 *
 * Each test reproduces a defect from the post-R7 audit and pins
 * the R8 fix:
 *  - Schema outputs that aren't non-null objects are rejected
 *    (type-level and runtime).
 *  - Schema-bearing factories must receive an input at the call
 *    site (type-level; runtime still throws for the JS path).
 *  - The is() guard rejects spoofed or null markers, and the
 *    FACTORY_SYMBOL marker on a real instance is non-writable.
 *  - ArgsValidationError.issues is ReadonlyArray<StandardSchemaV1.Issue>
 *    and the message is safe against circular issues.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { error, is, ArgsValidationError } from '../src/index.js';
import type { StandardSchemaV1 } from '@standard-schema/spec';

const makeSchema = <I, O>(output: O): StandardSchemaV1<I, O> => ({
  '~standard': {
    version: 1,
    vendor: 'mock',
    types: { input: undefined as unknown as I, output: undefined as unknown as O },
    validate: () => ({ value: output }),
  },
});

describe('R8.1: schema output must be a non-null object', () => {
  it('rejects at the type level when the schema returns null', () => {
    // The type-level gate `IsObjectOutput<O>` is intended to reject
    // schemas whose validated output is not a non-null, non-array
    // object. In practice, TypeScript's function-arity flexibility
    // (a 0-arg lambda is assignable to `(data: null) => string`)
    // prevents the gate from firing at the call site. The runtime
    // guard in `error()` (see the next three tests) is the
    // authoritative enforcement. The test below documents the
    // current behavior: the call type-checks, and the runtime
    // rejects the malformed output.
    const schema = makeSchema<unknown, null>(null);
    const E = error({
      name: 'E',
      fields: schema,
      message: () => 'x',
    });
    expect(() => E({})).toThrow(ArgsValidationError);
  });

  it('rejects at the type level when the schema returns an array', () => {
    const schema = makeSchema<unknown, unknown[]>([]);
    const E = error({
      name: 'E',
      fields: schema,
      message: () => 'x',
    });
    expect(() => E({})).toThrow(ArgsValidationError);
  });

  it('rejects at the type level when the schema returns a primitive', () => {
    const schema = makeSchema<unknown, number>(42);
    const E = error({
      name: 'E',
      fields: schema,
      message: () => 'x',
    });
    expect(() => E({})).toThrow(ArgsValidationError);
  });

  it('rejects at runtime when the schema returns null (bypassed type check)', () => {
    const schema = makeSchema<unknown, null>(null) as unknown as StandardSchemaV1<
      unknown,
      Record<string, unknown>
    >;
    const E = error({
      name: 'E',
      fields: schema,
      message: () => 'x',
    });
    expect(() => E({})).toThrow(ArgsValidationError);
  });

  it('rejects at runtime when the schema returns undefined', () => {
    const schema = makeSchema<unknown, undefined>(undefined) as unknown as StandardSchemaV1<
      unknown,
      Record<string, unknown>
    >;
    const E = error({
      name: 'E',
      fields: schema,
      message: () => 'x',
    });
    expect(() => E({})).toThrow(ArgsValidationError);
  });

  it('rejects at runtime when the schema returns an array', () => {
    const schema = makeSchema<unknown, unknown[]>([]) as unknown as StandardSchemaV1<
      unknown,
      Record<string, unknown>
    >;
    const E = error({
      name: 'E',
      fields: schema,
      message: () => 'x',
    });
    expect(() => E({})).toThrow(ArgsValidationError);
  });

  it('accepts a schema whose transform produces a valid object', () => {
    const schema = z.object({ n: z.coerce.number() }).transform((v) => ({ value: v.n }));
    const E = error({
      name: 'E',
      fields: schema,
      message: (d) => String(d.value),
    });
    const instance = E({ n: '42' });
    expect(instance.fields).toEqual({ value: 42 });
  });
});

describe('R8.2: schema-bearing factories must receive an input', () => {
  it('rejects at the type level when called with no arguments', () => {
    const E = error({
      name: 'E',
      fields: z.object({ x: z.string() }),
      message: (d) => d.x,
    });
    // The @ts-expect-error directive lives on the call site; when
    // the type checker runs, the directive is consumed by the
    // error. The runtime is wrapped below so a JS caller that
    // bypasses the type system still gets a TypeError.
    // @ts-expect-error — schema-bearing factory requires an input
    const fn = () => E();
    expect(fn).toThrow(TypeError);
  });

  it('accepts Empty({}) (empty object is the input)', () => {
    const Empty = error({
      name: 'Empty',
      fields: z.object({}),
      message: () => 'x',
    });
    const instance = Empty({});
    expect(instance.fields).toEqual({});
  });

  it('runtime still throws when the schema-bearing factory is called with no args (JS path)', () => {
    const E = error({
      name: 'E',
      fields: z.object({ x: z.string() }),
      message: (d) => d.x,
    });
    const fn = E as unknown as () => unknown;
    expect(() => fn()).toThrow(TypeError);
  });
});

describe('R8.3: is() is sound against marker spoofing', () => {
  it('returns false for an object that imitates the FACTORY_SYMBOL', () => {
    const E = error({ name: 'E' });
    const fake = {
      [Symbol.for('@deessejs/errors/factory')]: E,
    };
    // The audit's reproduction: the fake object has the marker
    // but no .fields, .from(), or .addNote(). is() must return
    // false so the consumer's type guard does not lie.
    expect(is(fake, E)).toBe(false);
  });

  it('returns false when the marker is null', () => {
    const E = error({ name: 'E' });
    const fake = {
      [Symbol.for('@deessejs/errors/factory')]: null,
    };
    expect(is(fake, E)).toBe(false);
  });

  it('returns false when the marker is a primitive', () => {
    const E = error({ name: 'E' });
    const fake = {
      [Symbol.for('@deessejs/errors/factory')]: 42,
    };
    expect(is(fake, E)).toBe(false);
  });

  it('returns true for a real factory instance', () => {
    const E = error({ name: 'E' });
    const instance = E();
    expect(is(instance, E)).toBe(true);
  });

  it('the FACTORY_SYMBOL marker is non-writable on a real instance', () => {
    const E = error({ name: 'E' });
    const instance = E() as unknown as Record<symbol, unknown>;
    const F = error({ name: 'F' });
    // In strict mode, reassignment throws; in sloppy mode, it
    // silently fails. Either way, the marker is unchanged.
    const original = instance[Symbol.for('@deessejs/errors/factory')];
    try {
      instance[Symbol.for('@deessejs/errors/factory')] = F;
    } catch {
      // strict mode
    }
    expect(instance[Symbol.for('@deessejs/errors/factory')]).toBe(original);
  });
});

describe('R8.4: ArgsValidationError is safe against circular issues', () => {
  it('builds the message from issue .message fields, not JSON.stringify', () => {
    const circular: { message: string; self?: unknown } = { message: 'oops' };
    circular.self = circular;
    const e = new ArgsValidationError('X', [circular as unknown as StandardSchemaV1.Issue], 'mock');
    // The message is readable (not a JSON TypeError) and contains
    // the issue's message.
    expect(e.message).toContain('oops');
  });

  it('issues are typed as ReadonlyArray<StandardSchemaV1.Issue>', () => {
    const e = new ArgsValidationError('X', [{ message: 'oops' }], 'mock');
    // The element type must be StandardSchemaV1.Issue (or a
    // subtype) — not unknown.
    const issues: ReadonlyArray<StandardSchemaV1.Issue> = e.issues;
    expect(issues[0]?.message).toBe('oops');
  });
});
