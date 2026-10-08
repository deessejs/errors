---
'@deessejs/errors': minor
---

fix: reject parent transformations that break the child or sibling contract

The parent-schema cascade now enforces the invariant
"every instance must simultaneously satisfy the types of the
child AND the parents recognized by `is()`" — i.e. the same
intersection that the type-level `ExtractFactoryFields`
implements in `is/index.ts`.

When the leaf carries a schema (the `fields: standardSchema`
form), the leaf's schema output is the load-bearing source of
the child-constrained key set. An ancestor whose schema writes
the same key with a different shape kind (number vs. string,
object vs. array) now throws `ArgsValidationError` with
`source: <ancestor.name>`, `issues[0].path: [<key>]`, and
`from` / `to` shape kinds. Ancestors may still freely add new
keys the schema did not declare, and same-kind transitions
(number → number) are allowed.

When the leaf has no schema (the legacy no-fields path), the
shape gate still runs at the parent-to-parent level: a parent
that overwrites a key already written by an earlier parent in
the cascade with a different shape kind throws the same
`ArgsValidationError`. The user's input value is never a
"prior" for the gate — only parents' transformed outputs are.

This is a minor bump. The public API surface is unchanged;
previously-silent runtime inputs (that already broke the type
contract) are now rejected at the factory call site. The two
canonical reproductions are documented in
`tests/inherits-compatibility.test.ts`:

  * Leaf schema `n: z.string()` + ancestor schema
    `n: z.coerce.number()` → throws.
  * Two ancestors in a multi-inheritance chain, the first
    writing `n` as number and the second as string → throws.

Note on the type-level contract: TypeScript erases the manual
generic `<T>` at runtime, so the strict per-key rule is
sourced from the leaf's schema output, not the generic. The
generic remains a type-level guarantee. Consumers who want
runtime per-key protection must declare a schema (the schema
is the runtime source of the contract).
