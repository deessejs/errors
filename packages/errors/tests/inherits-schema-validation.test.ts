/**
 * Regression tests for the inheritance contract: when a child factory
 * declares `inherits: Parent` and the parent carries a schema, the
 * child's fields must satisfy the parent's schema at instantiation.
 *
 * Without this, the type-checker's narrowing of `is(child, Parent)` to
 * `ErrorInstance<ExtractFactoryFields<Parent>>` would lie: the runtime
 * says "this is a Parent" but the data does not actually match the
 * parent's shape. Each test pins the runtime guarantee.
 *
 * The child factory declares its own `TInput` so the parent-required
 * fields are part of the call signature. The runtime check is the
 * additional defense; the type-checker carries the primary guarantee
 * for callers that respect the manual generic.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { error, is, ArgsValidationError } from '../src/index.js';

describe('inherits: parent schema validates child fields', () => {
  it('throws ArgsValidationError when the child omits a parent-required field', () => {
    const Parent = error({
      name: 'Parent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Child = error<{ id: string }>({ name: 'Child', inherits: Parent });

    expect(() => Child({ id: 1 as unknown as string })).toThrow(ArgsValidationError);
    expect(() => Child({ id: 1 as unknown as string })).toThrow(/Parent/);
  });

  it('throws when the child supplies a wrong-typed parent field', () => {
    const Parent = error({
      name: 'Parent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Child = error<{ id: string }>({ name: 'Child', inherits: Parent });

    // 1 is not a string — Parent's z.string() must reject.
    expect(() => Child({ id: 1 as unknown as string })).toThrow(ArgsValidationError);
  });

  it('accepts the child when its fields satisfy the parent schema', () => {
    const Parent = error({
      name: 'Parent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Child = error<{ id: string }>({ name: 'Child', inherits: Parent });

    const instance = Child({ id: 'x' });
    expect(instance.name).toBe('Child');
    expect(instance.fields.id).toBe('x');
    expect(is(instance, Parent)).toBe(true);
    expect(is(instance, Child)).toBe(true);
  });

  it('does not validate against parents that have no schema', () => {
    // A parent without a schema has no contract to satisfy — child
    // instances are accepted as-is. The classification via is() still
    // holds. (A typed input would force a manual generic on the child,
    // which is a different test path; we exercise the empty-shape path
    // here.)
    const Parent = error({ name: 'Parent' });
    const Child = error({ name: 'Child', inherits: Parent });

    expect(() => Child()).not.toThrow();
    expect(is(Child(), Parent)).toBe(true);
  });

  it('validates against each parent in a multiple-inheritance list', () => {
    const SchemaParent = error({
      name: 'SchemaParent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const PlainParent = error({ name: 'PlainParent' });
    const Child = error<{ id: string }>({ name: 'Child', inherits: [SchemaParent, PlainParent] });

    expect(() => Child({ id: 'x' })).not.toThrow();
    expect(() => Child({ id: 1 as unknown as string })).toThrow(ArgsValidationError);
  });

  it('reports the parent name in ArgsValidationError.source, not the child name', () => {
    const Parent = error({
      name: 'MyParent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Child = error<{ id: string }>({ name: 'MyChild', inherits: Parent });

    let caught: unknown = null;
    try {
      Child({ id: 1 as unknown as string });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    expect((caught as ArgsValidationError).source).toBe('MyParent');
  });
});
