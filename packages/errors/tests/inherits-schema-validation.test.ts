/**
 * Regression tests for the R5 inheritance contract.
 *
 * The R1-R4 cascade applied the parent's schema to the child's data
 * at instantiation. The R5 rework drops the cascade: each factory
 * runs its own schema, and `inherits` declares a static type-level
 * relationship for `is()` recognition only.
 *
 * The runtime contract is now: the leaf's own schema is the only
 * oracle. A parent with a schema does not run its schema on the
 * child's data. A child that wants the parent's validation must
 * compose the schemas itself (e.g. `parentSchema.extend({...})`).
 *
 * These tests pin what is preserved:
 *  - The leaf's own schema is the source of truth for `instance.fields`.
 *  - `is(instance, Parent)` returns true for instances whose
 *    `inherits` declares the parent.
 *  - Validation errors are sourced from the leaf, not the parent.
 *  - Multiple-inheritance classification still works.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { error, is, ArgsValidationError } from '../src/index.js';

describe('R5: leaf schema is the only runtime oracle', () => {
  it("accepts the child when its fields satisfy the child's own schema", () => {
    // The child carries the parent's required field plus its own
    // additional field. The child schema is what validates.
    const Parent = error({
      name: 'Parent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Child = error({
      name: 'Child',
      fields: z.object({ id: z.string(), extra: z.string() }),
      message: (data) => `${data.id}-${data.extra}`,
      inherits: Parent,
    });

    const instance = Child({ id: 'x', extra: 'y' });
    expect(instance.name).toBe('Child');
    expect(instance.fields.id).toBe('x');
    expect(is(instance, Parent)).toBe(true);
    expect(is(instance, Child)).toBe(true);
  });

  it("throws ArgsValidationError when the input fails the child's own schema", () => {
    // The leaf's schema (id: z.string()) rejects a number. The
    // parent is irrelevant to this rejection: the source is the
    // child, not the parent. (Under R1-R4, the source was the
    // parent because the parent schema ran first; under R5, the
    // leaf is the only runner.)
    const Parent = error({
      name: 'MyParent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const Child = error({
      name: 'MyChild',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
      inherits: Parent,
    });

    let caught: unknown = null;
    try {
      (Child as unknown as (input: { id: number }) => unknown)({ id: 1 });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    // R5: source is the child (the leaf is the only schema that runs).
    expect((caught as ArgsValidationError).source).toBe('MyChild');
  });

  it('accepts a child with no schema and no parents', () => {
    // The legacy path remains unchanged: no schema, no cascade.
    const Standalone = error({ name: 'Standalone', message: 'fallback' });
    expect(() => Standalone()).not.toThrow();
    expect(is(Standalone(), Standalone)).toBe(true);
  });

  it('accepts a no-schema child with a no-schema parent', () => {
    // The all-no-schema path remains permissive. `is()` still walks
    // the chain. The cascade no longer runs anything.
    const Parent = error({ name: 'Parent' });
    const Child = error({ name: 'Child', inherits: Parent });

    expect(() => Child()).not.toThrow();
    expect(is(Child(), Parent)).toBe(true);
  });

  it('classifies via multiple-inheritance chain when no schema is involved', () => {
    const SchemaParent = error({
      name: 'SchemaParent',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    const PlainParent = error({ name: 'PlainParent' });
    // The child carries the schema-bearing parent's required field.
    // R5: the child composes its own schema; the SchemaParent is
    // recognized via `is()` but its schema does not run.
    const Child = error({
      name: 'Child',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
      inherits: [SchemaParent, PlainParent],
    });

    const instance = Child({ id: 'x' });
    expect(is(instance, SchemaParent)).toBe(true);
    expect(is(instance, PlainParent)).toBe(true);
    expect(is(instance, Child)).toBe(true);
  });
});
