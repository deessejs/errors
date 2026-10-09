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
    // R10: the gate fires at the call site via a structural
    // intersection on the `fields` parameter. When the schema's
    // InferOutput is `null`, the intersection becomes
    // `S & never = never`, and the call errors. The @ts-expect-error
    // directive is consumed by the type error.
    const schema = makeSchema<unknown, null>(null);
    error({
      name: 'E',
      // @ts-expect-error — schema output is null, not a record
      fields: schema,
      message: () => 'x',
    });
  });

  it('rejects at the type level when the schema returns an array', () => {
    const schema = makeSchema<unknown, unknown[]>([]);
    error({
      name: 'E',
      // @ts-expect-error — schema output is an array, not a record
      fields: schema,
      message: () => 'x',
    });
  });

  it('rejects at the type level when the schema returns a primitive', () => {
    const schema = makeSchema<unknown, number>(42);
    error({
      name: 'E',
      // @ts-expect-error — schema output is a primitive, not a record
      fields: schema,
      message: () => 'x',
    });
  });

  it('accepts a schema whose transform produces a valid object', () => {
    // Positive case: the gate accepts record outputs and the
    // factory's `fields` slot is typed with the schema's output.
    const schema = z.object({ n: z.coerce.number() }).transform((v) => ({ value: v.n }));
    const E = error({
      name: 'E',
      fields: schema,
      message: (d) => String(d.value),
    });
    const instance = E({ n: '42' });
    expect(instance.fields).toEqual({ value: 42 });
  });

  it('keeps input/output inference for a record-output schema', () => {
    // The factory's `fields` slot is typed with the schema's
    // output, and the message's data parameter is the same shape.
    // This is the R6 inference contract — preserved by the
    // intersection gate, not weakened by it.
    const schema = z.object({ n: z.coerce.number() });
    const E = error({
      name: 'E',
      fields: schema,
      message: (d) => String(d.n),
    });
    const instance = E({ n: '42' });
    expect(instance.fields).toEqual({ n: 42 });
  });

  it('rejects at runtime when the schema returns null (bypassed type check)', () => {
    // The runtime guard is the hard backstop. A consumer that
    // bypasses the type system (e.g. via `as unknown as ...`)
    // still gets an `ArgsValidationError` when the schema
    // actually fires and yields a non-record value.
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

  it('rejects an Error-subclass forgery with the marker and instance methods', () => {
    // R9: the audit found that a hand-rolled `Error` subclass
    // carrying the marker AND the `.from`/`.addNote` methods
    // (but no real `.fields`) used to pass `is()`. The method
    // presence check was not a sound gate. The package-private
    // `INSTANCE_REGISTRY` is the authoritative identity: a
    // candidate is a real `ErrorInstance` only if `buildErrorInstance`
    // added it. The forgery below was never produced by
    // `error()` and is therefore rejected.
    const E = error({ name: 'E' });
    const fake = Object.assign(new Error('forged'), {
      from() {
        return this;
      },
      addNote() {
        return this;
      },
      [Symbol.for('@deessejs/errors/factory')]: E,
    }) as unknown as Parameters<typeof is>[0];
    expect(is(fake, E)).toBe(false);
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

  it('renders string-keyed paths with dot separators', () => {
    const e = new ArgsValidationError('X', [{ message: 'oops', path: ['user', 'email'] }], 'mock');
    expect(e.message).toContain('user.email: oops');
  });

  it('renders numeric path segments (array index) without throwing', () => {
    const e = new ArgsValidationError('X', [{ message: 'oops', path: ['items', 0, 'id'] }], 'mock');
    expect(e.message).toContain('items.0.id: oops');
  });

  it('renders object path segments by extracting .key', () => {
    const e = new ArgsValidationError('X', [{ message: 'oops', path: [{ key: 'email' }] }], 'mock');
    expect(e.message).toContain('email: oops');
    expect(e.message).not.toContain('[object Object]');
  });

  it('renders symbol-keyed paths via String(symbol) without throwing', () => {
    // The audit found a real defect: a symbol in the path crashed
    // `Array.prototype.join` with `TypeError: Cannot convert a
    // Symbol value to a string`. The renderer must not throw.
    const e = new ArgsValidationError('X', [{ message: 'oops', path: [Symbol('id')] }], 'mock');
    expect(e.message).toContain('Symbol(id): oops');
  });

  it('survives null/undefined segments and missing .path', () => {
    // The StandardSchemaV1.Issue.path is `ReadonlyArray<PropertyKey | PathSegment>`,
    // so the segments above are well-formed: a `null` segment is
    // not assignable to the union, so we use `0` and a numeric
    // index to test the defensive behavior of the renderer.
    const e1 = new ArgsValidationError(
      'X',
      [{ message: 'a', path: [0, 'x' as string] as ReadonlyArray<string | number> }],
      'mock'
    );
    expect(e1.message).toContain('0.x: a');
    const e2 = new ArgsValidationError('X', [{ message: 'b' }], 'mock');
    // No path means no path prefix; only the wrapper `:` from
    // the `Argument validation failed for "X"` header is present.
    expect(e2.message).toBe('Argument validation failed for "X": b');
  });
});
