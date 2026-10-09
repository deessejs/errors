---
'@deessejs/errors': major
---

# 2.0.0 — drop the parent-schema cascade

The internal cascade that applied each parent's schema to a child's
data at instantiation is removed. Each factory now runs its own
schema; inheritance is a static type-level relationship plus a
recognition walk for `is()`.

## What changed

**Removed.** The `validateAncestors` walk, the per-key shape-kind
gate, the `ShapeKind`/`kindOf`/`kindsCompatible` helpers, the
`childKeys` derivation, the `parentWrites` map, the leaf
re-validation oracle, and the strict-by-default throw for the
manual-generic path. None of these exist in 2.0.

**New static type-level constraint.** The `error()` overloads now
reject `inherits` from factories whose `InferOutput` is not a
supertype of the leaf's `InferOutput`. This is enforced at the
call site: a `Child` whose output would break a `Parent` contract
is a TypeScript error, not a runtime throw. The constraint accepts
a single parent or an array; every parent in the array must be a
supertype of the leaf.

**`is()` is unchanged.** The walk still recognizes a child as a
parent instance for type-narrowing purposes.

**`instance.fields` reflects only the leaf's schema.** The factory
is responsible for composing its own schema; the library does not
merge two schemas for the consumer. Consumers who need the parent
keys in the leaf compose the schema themselves (`z.object({ ... })`,
`v.object({ ...ParentSchema.entries, slug: v.string() })`,
`parentSchema.and({ slug: 'string' })`).

## Caveats

- The `inherits` array freeze and the `inherits` field on
  `ErrorInstance<T>` are preserved.
- `instance.inherits` is still set for introspection.
- The no-schema path is unchanged: `error({name, message?})` with
  no `fields` and no `inherits` works as before.
- `ArgsValidationError.source` is always the leaf when the leaf
  has a schema (it is the only schema that runs).
