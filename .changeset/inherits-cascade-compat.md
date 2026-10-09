---
'@deessejs/errors': minor
---

fix: close the deep-shape contract gap; reject parent transformations that violate constrained structures or values

The parent-schema cascade now enforces the invariant
"every instance must simultaneously satisfy the types of
the child AND the parents recognized by `is()`" — i.e. the
same intersection that the type-level `ExtractFactoryFields`
implements in `is/index.ts` — at three levels of depth:

1. **Per-key shape kind (Round 3).** When the leaf carries
   a schema, the leaf's schema output is the load-bearing
   source of the child-constrained key set. An ancestor
   whose schema writes the same key with a different shape
   kind (number vs. string, object vs. array) now throws
   `ArgsValidationError` with `source: <ancestor.name>`,
   `issues[0].path: [<key>]`, and `from` / `to` shape
   kinds. Ancestors may still freely add new keys the
   schema did not declare, and same-kind transitions
   (number → number) are allowed.

2. **Leaf re-validation oracle (Round 4).** After every
   parent writes, the cascade re-validates the merged
   `data` against the leaf's schema. The leaf's schema is
   the only vendor-neutral oracle for the user's invariant
   because it encodes:

     - `z.literal('ok')` — distinguishes literal values
       the kind gate cannot tell apart (`'ok'` vs `'bad'`,
       both strings at the `typeof` level).
     - `z.object({id: z.string()})` — distinguishes
       object shapes (`{id}` vs `{count}`, both objects).
     - `z.array(z.object(...))` — distinguishes array
       element shapes.
     - Nested structures (`data.user.id` vs
       `data.user.name`).

   The kind gate's "two objects can have incompatible
   structures" gap is closed by this oracle. The cost is
   one extra `runSchema` call per parent per instantiation.

3. **Strict-by-default on the manual-generic path
   (Round 4).** When the leaf declares a manual generic
   (`error<{n: string}>()`) but no schema, the runtime
   cannot recover the generic's keys (TypeScript erases
   them). The cascade now rejects any parent that writes
   a key when the leaf has no schema — strict by default
   per the user's stated invariant: "guarantee the
   compatibility of constrained structures and values, or
   reject inherited transformations likely to modify
   them." The throw is `ArgsValidationError` with
   `source: <parent.name>`, and the issue message
   references "per-key protection" so consumers can
   migrate. Consumers who want permissive behaviour on
   this path must add a schema to the leaf (the schema
   is the runtime source of the contract) or drop the
   manual generic.

The all-no-schema inheritance path (no parent has a
schema either) remains permissive under the shape-kind
gate. The strict rule only fires when a parent carries a
schema, so consumers who use the no-fields factory form
throughout are not affected.

This is a minor bump. The public API surface is
unchanged; previously-silent runtime inputs (that already
broke the type contract) are now rejected at the factory
call site. The five canonical reproductions are
documented in `tests/inherits-compatibility.test.ts`:

  * Leaf schema `n: z.string()` + ancestor schema
    `n: z.coerce.number()` → throws.
  * Leaf schema `payload: z.object({id: z.string()})` +
    ancestor schema `payload: z.object({count: z.number()})`
    → throws (Round 4: object-shape mismatch).
  * Leaf schema `n: z.literal('ok')` + ancestor schema
    `n: z.string().transform(() => 'bad')` → throws
    (Round 4: literal mismatch).
  * Leaf schema `items: z.array(z.object({id: z.string()}))`
    + ancestor schema
    `items: z.array(z.object({count: z.number()}))` →
    throws (Round 4: array of objects).
  * Leaf schema `data: z.object({user: z.object({id: z.string()})})`
    + ancestor schema
    `data: z.object({user: z.object({name: z.string()})})` →
    throws (Round 4: nested structural mismatch).
  * Manual generic `error<{n: string}>()` with no schema,
    ancestor schema `n: z.coerce.number()` → throws
    (Round 4: strict by default).

Two latent improvements ride along:

  - The `ShapeKind` union now includes `'function'` and
    `'symbol'`, so values of those types are not silently
    categorised under the generic `'object'` fallback.
  - Tests in the inheritance suite were updated to give
    the leaf a permissive schema under the new
    strict-by-default rule. The all-no-schema inheritance
    tests in `is.test.ts` and `inherits-immutable.test.ts`
    remain unchanged.
