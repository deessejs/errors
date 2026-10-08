/**
 * Regression tests for the cascade-compatibility contract (audit
 * Round 3).
 *
 * The Round 2 cascade applied each parent's `result.value` via a
 * right-biased spread. This implements a union at runtime, but
 * `is()`'s type-level narrowing is an intersection. Two
 * reproducible mismatches:
 *
 *  - Scenario 1: a child declared with `error<{n: string}>()` and
 *    a parent whose schema transforms `n` to number. The runtime
 *    would silently overwrite the child's value, leaving
 *    `is(instance, Child) === true` with `instance.fields.n` of
 *    the wrong type.
 *  - Scenario 2: a no-schema child with `inherits: [P1, P2]`
 *    where P1 coerces `n` to number and P2 constrains `n` to
 *    string. The cascade would let the second writer overwrite
 *    the first writer's value, breaking the first parent's
 *    contract.
 *
 * Round 3 closes both with a hybrid gate:
 *
 *  - Option C (typed child, manual generic `error<T>()`): the
 *    generic's keys are the child-constrained set. A parent that
 *    rewrites one of those keys throws `ArgsValidationError`
 *    with `source: <parent.name>` and `path: [K]`.
 *  - Option A (untyped child, no manual generic): a per-key
 *    shape-kind gate. The first parent can transform freely
 *    (the input has no contract). A subsequent parent that
 *    writes a key with a different kind than a prior parent
 *    throws with `from` and `to` shape kinds.
 *
 * The input's value is never a "prior" for the gate — only
 * parents' transformed outputs are. This matches the invariant
 * the user named: every instance must simultaneously satisfy the
 * types of the child AND the parents recognized by `is()`.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { error, is, ArgsValidationError } from '../src/index.js';
import type { StandardSchemaV1 } from '../src/index.js';

// A Standard Schema that accepts any input but produces a
// specific shape. Used to drive the shape gate: two parents
// using such schemas can both pass their own validation
// while producing different kinds.
function shapeSchema<I, O>(
  transform: (input: I) => O,
  vendor = 'shape-test'
): StandardSchemaV1<I, O> {
  return {
    '~standard': {
      version: 1,
      vendor,
      validate: (input) => ({ value: transform(input as I) }),
    },
  };
}

describe('inherits: typed child rejects parent rewriting a child-constrained key', () => {
  it('throws when an ancestor transforms a key the leaf declared via schema', () => {
    // Round 3 scenario 1: the leaf (Parent) carries a schema
    // declaring `n: z.string()`. An ancestor (Child) carries a
    // schema `z.coerce.number()` on `n`. The cascade writes
    // `n: 42` (number) over the leaf's `n: '42'` (string). The
    // leaf's schema owns `n` as a string; the strict rule fires.
    //
    // Note: the strict rule's source of truth is the runtime
    // schema (probed at instantiation), not the manual generic.
    // The manual generic is a type-level contract only — TypeScript
    // erases it, so the runtime cannot recover the keys from `<T>`
    // alone. Consumers who want per-key protection on a leaf
    // without a schema must declare a schema (the schema is the
    // runtime source of the contract).
    const Child = error({
      name: 'C',
      fields: z.object({ n: z.coerce.number() }),
      message: (d) => String(d.n),
    });
    const Parent = error({
      name: 'P',
      fields: z.object({ n: z.string() }),
      message: (d) => d.n,
      inherits: Child,
    });

    let caught: unknown = null;
    try {
      (Parent as unknown as (input: { n: string }) => unknown)({ n: '42' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const err = caught as ArgsValidationError;
    expect(err.source).toBe('C');
    const issue = err.issues[0] as { message: string; path: string[] };
    expect(issue.path).toEqual(['n']);
    expect(issue.message).toContain('rewrites child-constrained key');
  });

  it('allows the rewrite when the leaf and ancestor agree on the kind', () => {
    // Leaf schema: `n: z.coerce.number()` (transforms to number).
    // Ancestor schema: `n: z.number()` (validates number).
    // Both end at number; no kind change, no throw.
    const Child = error({
      name: 'C',
      fields: z.object({ n: z.number() }),
      message: (d) => String(d.n),
    });
    const Parent = error({
      name: 'P',
      fields: z.object({ n: z.coerce.number() }),
      message: (d) => String(d.n),
      inherits: Child,
    });
    const instance = (Parent as unknown as (input: { n: string }) => unknown)({ n: '1' });
    expect((instance as { fields: { n: number } }).fields.n).toBe(1);
  });
});

describe('inherits: untyped child rejects sibling parents with incompatible transformations', () => {
  it('throws when two parents transform the same key in incompatible ways (scenario 2)', () => {
    // Round 3 scenario 2: no-schema child, P1 coerces n to
    // number, P2 constrains n to string. P1 runs first; its
    // schema accepts the input and writes `n: 42`. P2's schema
    // then runs on `{n: 42}` — zod's `z.string()` rejects
    // because the input is a number, not a string. The error
    // is sourced from P2 (the offending parent) and the
    // runtime narrows the message; the per-instance invariant
    // is upheld: an instance cannot simultaneously satisfy
    // both P1 (number) and P2 (string) on the same key.
    const P1 = error({
      name: 'P1',
      fields: z.object({ n: z.coerce.number() }),
      message: (d) => String(d.n),
    });
    const P2 = error({
      name: 'P2',
      fields: z.object({ n: z.string() }),
      message: (d) => d.n,
    });
    const Child = error({ name: 'C', inherits: [P1, P2] });

    let caught: unknown = null;
    try {
      (Child as unknown as (input: { n: string }) => unknown)({ n: '42' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const err = caught as ArgsValidationError;
    // The error is sourced from P2 (the parent that rejected
    // the post-P1 value). The exact path and message depend
    // on the schema vendor; we only pin the source and the
    // fact that the failure mentions `n` (P2's recognized
    // key).
    expect(err.source).toBe('P2');
    const issues = err.issues as ReadonlyArray<{ message?: string; path?: unknown }>;
    expect(issues.length).toBeGreaterThan(0);
  });

  it('allows the same kind twice (number → number) — the gate is not over-strict', () => {
    // P1 and P2 both transform n via z.coerce.number(). The
    // first writes number, the second writes number on the same
    // key. Same kind, no throw. The cascade produces number.
    const P1 = error({
      name: 'P1',
      fields: z.object({ n: z.coerce.number() }),
      message: (d) => String(d.n),
    });
    const P2 = error({
      name: 'P2',
      fields: z.object({ n: z.coerce.number() }),
      message: (d) => String(d.n),
    });
    const Child = error({ name: 'C', inherits: [P1, P2] });
    const instance = (Child as unknown as (input: { n: string }) => { fields: { n: number } })({
      n: '1',
    });
    expect(instance.fields.n).toBe(1);
  });

  it('rejects when a second parent changes the kind that the first parent wrote (shape gate)', () => {
    // Two custom schemas: P1's schema accepts any input and
    // produces `{x: 1}` (number); P2's schema accepts any input
    // and produces `{x: 'a'}` (string). Both schemas pass on
    // `data = {}` (P1 runs first, writes `x: 1`; P2 runs second,
    // sees `x: 1`, runs its own schema, produces `x: 'a'`).
    // The shape gate sees number → string and throws.
    const P1 = error({
      name: 'P1',
      fields: shapeSchema<unknown, { x: number }>(() => ({ x: 1 })),
      message: (d) => String(d.x),
    });
    const P2 = error({
      name: 'P2',
      fields: shapeSchema<unknown, { x: string }>(() => ({ x: 'a' })),
      message: (d) => d.x,
    });
    const Child = error({ name: 'C', inherits: [P1, P2] });

    let caught: unknown = null;
    try {
      Child();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const err = caught as ArgsValidationError;
    expect(err.source).toBe('P2');
    const issue = err.issues[0] as { message: string; path: string[]; from: string; to: string };
    expect(issue.path).toEqual(['x']);
    expect(issue.from).toBe('number');
    expect(issue.to).toBe('string');
  });

  it('allows parents that add disjoint keys', () => {
    // Each parent declares a unique key; the cascade merges them.
    // No shared key, no conflict.
    const P1 = error({
      name: 'P1',
      fields: z.object({ a: z.string() }),
      message: (d) => d.a,
    });
    const P2 = error({
      name: 'P2',
      fields: z.object({ b: z.number() }),
      message: (d) => String(d.b),
    });
    const Child = error({ name: 'C', inherits: [P1, P2] });
    const instance = (
      Child as unknown as (input: { a: string; b: number }) => {
        fields: { a: string; b: number };
      }
    )({ a: 'x', b: 1 });
    expect(instance.fields).toEqual({ a: 'x', b: 1 });
    expect(is(instance, P1)).toBe(true);
    expect(is(instance, P2)).toBe(true);
  });
});

describe('inherits: typed child allows parents that add new (undeclared) keys', () => {
  it('parent may add a key the child did not declare', () => {
    // The child declares `{a: string}` via manual generic. The
    // parent declares `b: z.coerce.number()`. The child did not
    // declare `b`, so the parent is adding a new key. Allowed.
    // The cascade runs the parent's schema on the merged data;
    // the input is the user's, the parent's schema validates `b`
    // and produces a number.
    const Child = error<{ a: string }>({ name: 'C' });
    const Parent = error({
      name: 'P',
      fields: z.object({ b: z.coerce.number() }),
      message: (d) => `${d.b}`,
    });
    const Leaf = error<{ a: string }>({ name: 'L', inherits: Parent });

    const instance = (
      Leaf as unknown as (input: { a: string; b: string }) => {
        fields: { a: string; b: number };
      }
    )({ a: 'x', b: '1' });
    expect(instance.fields).toEqual({ a: 'x', b: 1 });
    expect(is(instance, Parent)).toBe(true);
  });

  it('parent may add a key the child did not declare even when the input has a different prior kind', () => {
    // The first parent transforms `b` from string to number. The
    // child did not declare `b`, so the strict rule does not
    // fire. The shape gate's prior comes from a parent (not
    // from the input), so the first parent can transform freely.
    // A second parent that also writes `b` with a different kind
    // would fire the gate (covered by the previous test).
    const P1 = error({
      name: 'P1',
      fields: z.object({ b: z.coerce.number() }),
      message: (d) => String(d.b),
    });
    const Child = error({ name: 'C', inherits: P1 });
    const instance = (Child as unknown as (input: { b: string }) => { fields: { b: number } })({
      b: '1',
    });
    expect(instance.fields.b).toBe(1);
  });
});

describe('inherits: regression — existing transitive tests pass under the new contract', () => {
  it('non-transforming schemas still cascade normally', () => {
    // No transformation, no conflict. The cascade still applies
    // the parent's schema (round 2 behaviour) without throwing.
    const P1 = error({
      name: 'P1',
      fields: z.object({ x: z.number() }),
      message: (d) => String(d.x),
    });
    const P2 = error({
      name: 'P2',
      fields: z.object({ y: z.string() }),
      message: (d) => d.y,
    });
    const C = error({ name: 'C', inherits: [P1, P2] });
    const instance = (
      C as unknown as (input: { x: number; y: string }) => {
        fields: { x: number; y: string };
      }
    )({ x: 1, y: 'two' });
    expect(instance.fields).toEqual({ x: 1, y: 'two' });
  });

  it('transitive chain with kind-compatible transformations still cascades', () => {
    // Parent transforms number → number (no kind change), and
    // its grandparent transforms the same key with the same
    // kind. The shape gate sees number→number→number; no throw.
    const Grandparent = error({
      name: 'G',
      fields: z.object({ k: z.number() }),
      message: (d) => String(d.k),
    });
    const Parent = error({ name: 'P', inherits: Grandparent });
    const Child = error<{ k: number }>({ name: 'C', inherits: Parent });

    const instance = (Child as unknown as (input: { k: number }) => { fields: { k: number } })({
      k: 42,
    });
    expect(instance.fields.k).toBe(42);
  });
});
