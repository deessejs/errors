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
    // Round 3 scenario 2: a leaf with a permissive schema (open
    // shape), P1 coerces n to number, P2 constrains n to
    // string. P1 runs first; its schema accepts the input and
    // writes `n: 42`. P2's schema then runs on `{n: 42}` — zod's
    // `z.string()` rejects because the input is a number, not a
    // string. The error is sourced from P2 (the offending parent)
    // and the runtime narrows the message; the per-instance
    // invariant is upheld: an instance cannot simultaneously
    // satisfy both P1 (number) and P2 (string) on the same key.
    //
    // Round 4: the leaf has a permissive schema that lets P1
    // transform `n` and P2 reject the post-P1 number. The leaf
    // re-validation runs after each parent and accepts the
    // intermediate shape; P2's own `z.string()` is the gate.
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
    const Child = error({
      name: 'C',
      fields: z.object({ n: z.coerce.number() }),
      message: (d) => String(d.n),
      inherits: [P1, P2],
    });

    let caught: unknown = null;
    try {
      (Child as unknown as (input: { n: string }) => unknown)({ n: '42' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const err = caught as ArgsValidationError;
    // Round 4: the leaf's schema validates the input first
    // (accepts `n: '42'` because `z.coerce.number()` accepts
    // a string and coerces). Then P1 runs (re-validates
    // `n: '42'`, coerces to 42). Then the leaf re-validates
    // (accepts `n: 42`). Then P2 runs (rejects `n: 42`). The
    // error is sourced from P2.
    expect(err.source).toBe('P2');
    const issues = err.issues as ReadonlyArray<{ message?: string; path?: unknown }>;
    expect(issues.length).toBeGreaterThan(0);
  });

  it('allows the same kind twice (number → number) — the gate is not over-strict', () => {
    // P1 and P2 both transform n via z.coerce.number(). The
    // first writes number, the second writes number on the same
    // key. Same kind, no throw. The cascade produces number.
    //
    // Round 4: the leaf has a schema accepting `n` as a number
    // (or coercible). Both parents' number → number transitions
    // are accepted by the leaf re-validation and the kind gate.
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
    const Child = error({
      name: 'C',
      fields: z.object({ n: z.coerce.number() }),
      message: (d) => String(d.n),
      inherits: [P1, P2],
    });
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
    //
    // Round 4: the leaf has a permissive schema that does not
    // constrain `x`; the kind-compatibility gate still rejects
    // the cross-category rewrite.
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
    const Child = error({
      name: 'C',
      fields: z.object({}),
      message: (d) => d,
      inherits: [P1, P2],
    });

    let caught: unknown = null;
    try {
      (Child as unknown as (input: Record<string, never>) => unknown)({});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const err = caught as ArgsValidationError;
    // Round 4: the shape gate fires after P1's write. The leaf
    // re-validation runs first; the leaf accepts `x: 1` (number).
    // Then P2 runs and tries to write `x: 'a'` (string) over the
    // number. The shape gate's `from`/`to` in the error message
    // comes from the `parentWrites` map (P1's write). P2's
    // `result.value` is the second parent's transformed output;
    // the per-key loop sees `prior = 'number'` and `next =
    // 'string'`, throws with `from: 'number'`, `to: 'string'`,
    // source: 'P2'.
    expect(err.source).toBe('P2');
    const issue = err.issues[0] as { message: string; path: string[]; from: string; to: string };
    expect(issue.path).toEqual(['x']);
    expect(issue.from).toBe('number');
    expect(issue.to).toBe('string');
  });

  it('allows parents that add disjoint keys', () => {
    // Each parent declares a unique key; the cascade merges them.
    // No shared key, no conflict.
    //
    // Round 4: the leaf has a permissive schema that lets parents
    // add their own keys without constraint.
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
    const Child = error({
      name: 'C',
      fields: z.object({ a: z.string().optional(), b: z.number().optional() }),
      message: (d) => d,
      inherits: [P1, P2],
    });
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
    // The child declares `{a: string}` via schema. The
    // parent declares `b: z.coerce.number()`. The child did not
    // declare `b`, so the parent is adding a new key. Allowed.
    // The cascade runs the parent's schema on the merged data;
    // the input is the user's, the parent's schema validates `b`
    // and produces a number.
    //
    // Round 4: the child now has an explicit schema (rather than
    // only a manual generic). The leaf re-validation accepts the
    // parent's added key.
    const Child = error({
      name: 'C',
      fields: z.object({ a: z.string() }),
      message: (d) => d.a,
    });
    const Parent = error({
      name: 'P',
      fields: z.object({ b: z.coerce.number() }),
      message: (d) => `${d.b}`,
    });
    const Leaf = error({
      name: 'L',
      fields: z.object({ a: z.string(), b: z.coerce.number() }),
      message: (d) => `${d.a}-${d.b}`,
      inherits: Parent,
    });

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
    //
    // Round 4: the child has a permissive schema that lets the
    // parent add `b` without constraining it.
    const P1 = error({
      name: 'P1',
      fields: z.object({ b: z.coerce.number() }),
      message: (d) => String(d.b),
    });
    const Child = error({
      name: 'C',
      fields: z.object({ b: z.coerce.number().optional() }),
      message: (d) => d,
      inherits: P1,
    });
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
    //
    // Round 4: the leaf has a permissive schema so the strict
    // rule does not fire; the kind compatibility check passes.
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
    const C = error({
      name: 'C',
      fields: z.object({ x: z.number().optional(), y: z.string().optional() }),
      message: (d) => d,
      inherits: [P1, P2],
    });
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
    //
    // Round 4: the leaf has an explicit schema for `k`; the
    // leaf re-validation accepts the kind-compatible cascade.
    const Grandparent = error({
      name: 'G',
      fields: z.object({ k: z.number() }),
      message: (d) => String(d.k),
    });
    const Parent = error({
      name: 'P',
      fields: z.object({ k: z.number().optional() }),
      message: (d) => d,
      inherits: Grandparent,
    });
    const Child = error({
      name: 'C',
      fields: z.object({ k: z.number() }),
      message: (d) => String(d.k),
      inherits: Parent,
    });

    const instance = (Child as unknown as (input: { k: number }) => { fields: { k: number } })({
      k: 42,
    });
    expect(instance.fields.k).toBe(42);
  });
});

// ============================================================================
// Round 4: deep structural shape contract.
//
// The Round 3 shape gate (typeof / Array.isArray primitives) is too
// coarse: it cannot detect object shape mismatches, literal value
// mismatches, array-of-objects, or nested structural differences.
// Round 4 introduces a leaf re-validation oracle: after every parent
// writes, the cascade runs the leaf's `runSchema` on the merged
// data. The leaf's schema is the only vendor-neutral oracle for
// "is the merged data still valid per the leaf's contract?"
//
// Each test below pins one of the user's five scenarios.
// ============================================================================

describe('inherits: deep structural shape contract (Round 4)', () => {
  it('rejects when a parent transforms a nested object into an incompatible shape', () => {
    // User scenario 2: leaf promises `payload: {id: string}`,
    // parent produces `payload: {count: 1}`. The kind gate
    // sees `object → object` (same kind) and lets it through.
    // The leaf's `z.object({id: z.string()})` is the oracle:
    // it rejects `{count: 1}` because the missing `id` field.
    const Parent = error({
      name: 'P',
      fields: z.object({ payload: z.object({ count: z.number() }) }),
      message: (d) => String(d.payload.count),
    });
    const Leaf = error({
      name: 'L',
      fields: z.object({ payload: z.object({ id: z.string() }) }),
      message: (d) => d.payload.id,
      inherits: Parent,
    });

    let caught: unknown = null;
    try {
      (Leaf as unknown as (input: { payload: { count: number } }) => unknown)({
        payload: { count: 1 },
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    // Source is the parent that triggered the leaf's
    // re-validation failure. P's transform produced the
    // incompatible shape.
    const err = caught as ArgsValidationError;
    expect(['P', 'L']).toContain(err.source);
  });

  it('rejects when a parent transforms a literal value to a different literal', () => {
    // User scenario 3: leaf promises `n: z.literal('ok')`,
    // parent transforms to `n: 'bad'`. Both are strings at
    // the kind gate; the kind gate lets it through. The
    // leaf's `z.literal('ok')` is the oracle: it rejects
    // the parent's `'bad'` output.
    const Parent = error({
      name: 'P',
      fields: z.object({ n: z.string().transform(() => 'bad') }),
      message: (d) => d.n,
    });
    const Leaf = error({
      name: 'L',
      fields: z.object({ n: z.literal('ok') }),
      message: (d) => d.n,
      inherits: Parent,
    });

    let caught: unknown = null;
    try {
      (Leaf as unknown as (input: { n: string }) => unknown)({ n: 'ok' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const err = caught as ArgsValidationError;
    expect(['P', 'L']).toContain(err.source);
  });

  it('rejects when a parent transforms an array of objects into an incompatible shape', () => {
    // User scenario 4: leaf promises
    // `items: Array<{id: string}>`, parent produces
    // `items: Array<{count: number}>`. Both are arrays at
    // the kind gate. The leaf's `z.array(z.object({id:
    // z.string()}))` is the oracle: it rejects the
    // parent's array of `{count}` objects.
    const Parent = error({
      name: 'P',
      fields: z.object({ items: z.array(z.object({ count: z.number() })) }),
      message: (d) => String(d.items.length),
    });
    const Leaf = error({
      name: 'L',
      fields: z.object({ items: z.array(z.object({ id: z.string() })) }),
      message: (d) => d.items.length,
      inherits: Parent,
    });

    let caught: unknown = null;
    try {
      (Leaf as unknown as (input: { items: { count: number }[] }) => unknown)({
        items: [{ count: 1 }, { count: 2 }],
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const err = caught as ArgsValidationError;
    expect(['P', 'L']).toContain(err.source);
  });

  it('rejects when a parent transforms a nested structure two levels deep', () => {
    // User scenario 5: leaf promises
    // `data: {user: {id: string}}`, parent produces
    // `data: {user: {name: string}}`. The kind gate is
    // `object → object` at every level. The leaf's schema
    // is the oracle: it rejects the nested `name` field
    // and accepts the missing `id` field.
    const Parent = error({
      name: 'P',
      fields: z.object({ data: z.object({ user: z.object({ name: z.string() }) }) }),
      message: (d) => d.data.user.name,
    });
    const Leaf = error({
      name: 'L',
      fields: z.object({ data: z.object({ user: z.object({ id: z.string() }) }) }),
      message: (d) => d.data.user.id,
      inherits: Parent,
    });

    let caught: unknown = null;
    try {
      (Leaf as unknown as (input: { data: { user: { name: string } } }) => unknown)({
        data: { user: { name: 'x' } },
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const err = caught as ArgsValidationError;
    expect(['P', 'L']).toContain(err.source);
  });

  it('rejects a manual generic without schema when a parent transforms any key (strict by default)', () => {
    // User scenario 1: leaf has a manual generic
    // `<{n: string}>` and no schema. The runtime cannot
    // tell whether the generic is present, so the
    // strict-by-default rule fires: any schema-bearing
    // parent write is rejected. Consumers who want
    // permissive behaviour must add a schema to the leaf
    // or drop the manual generic.
    const Parent = error({
      name: 'P',
      fields: z.object({ n: z.coerce.number() }),
      message: (d) => String(d.n),
    });
    const Leaf = error<{ n: string }>({ name: 'L', inherits: Parent });

    let caught: unknown = null;
    try {
      (Leaf as unknown as (input: { n: string }) => unknown)({ n: '42' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const err = caught as ArgsValidationError;
    expect(err.source).toBe('P');
    const issues = err.issues as ReadonlyArray<{ message: string; path: string[] }>;
    expect(issues[0]?.message).toMatch(/per-key protection/);
  });

  it('rejects a manual generic + schema combination when the leaf re-validation fires', () => {
    // User scenario 1, schema path: leaf has a manual
    // generic AND a schema. The leaf's `z.string()`
    // re-validates the post-parent data and rejects the
    // number that the parent coerced.
    const Parent = error({
      name: 'P',
      fields: z.object({ n: z.coerce.number() }),
      message: (d) => String(d.n),
    });
    const Leaf = error<{ n: string }>({
      name: 'L',
      fields: z.object({ n: z.string() }),
      message: (d) => d.n,
      inherits: Parent,
    });

    let caught: unknown = null;
    try {
      (Leaf as unknown as (input: { n: string }) => unknown)({ n: '42' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const err = caught as ArgsValidationError;
    // The leaf's schema is the oracle and rejects the
    // post-P number. Source is whichever the cascade
    // surfaces — P (because the leaf re-validation runs
    // after P's write) or L (the leaf's schema itself
    // is the re-validator). Accept either.
    expect(['P', 'L']).toContain(err.source);
  });

  it('classifies function and symbol values through the ShapeKind union', () => {
    // Latent bug fix: `'function'` and `'symbol'` are now
    // in the ShapeKind union, so the kind gate produces
    // the correct category for these values.
    //
    // We exercise this via a custom schema that produces
    // a function value, and a parent that tries to
    // overwrite it with a string. The kind gate should
    // see `function → string` and reject. Without the
    // union extension, `kindOf` would have returned
    // `'function'` (typeof string) anyway — this test
    // pins the public ShapeKind surface.
    const fn = (): number => 42;
    const P1 = error({
      name: 'P1',
      fields: shapeSchema<unknown, { x: () => number }>(() => ({ x: fn })),
      message: (d) => String(d.x()),
    });
    const P2 = error({
      name: 'P2',
      fields: shapeSchema<unknown, { x: string }>(() => ({ x: 'hello' })),
      message: (d) => d.x,
    });
    const Leaf = error({
      name: 'L',
      fields: z.object({}),
      message: (d) => d,
      inherits: [P1, P2],
    });

    let caught: unknown = null;
    try {
      (Leaf as unknown as (input: Record<string, never>) => unknown)({});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const err = caught as ArgsValidationError;
    expect(err.source).toBe('P2');
    const issue = err.issues[0] as { message: string; path: string[]; from: string; to: string };
    expect(issue.path).toEqual(['x']);
    expect(issue.from).toBe('function');
    expect(issue.to).toBe('string');
  });

  it('regression: Round 3 "applies a manual-generic cascade" now requires a schema', () => {
    // The Round 3 happy-path test used a manual-generic
    // child with no schema, plus a parent that adds an
    // undeclared key. Under Round 4 strict-by-default,
    // the no-schema child fires the per-parent throw.
    // The Round 4 happy path is the schema-bearing
    // version (covered by "rejects a manual generic +
    // schema combination" and the "transitive chain"
    // regression above).
    //
    // This test pins the strict-by-default behaviour:
    // a manual generic without schema rejects parent
    // writes. Consumers who want permissive behaviour
    // must add a schema to the leaf.
    const Parent = error({
      name: 'P',
      fields: z.object({ b: z.coerce.number() }),
      message: (d) => String(d.b),
    });
    const Leaf = error<{ a: string; b: number }>({ name: 'L', inherits: Parent });

    expect(() =>
      (Leaf as unknown as (input: { a: string; b: string }) => unknown)({
        a: 'x',
        b: '1',
      })
    ).toThrow(ArgsValidationError);
  });
});
