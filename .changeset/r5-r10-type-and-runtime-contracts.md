---
'@deessejs/errors': major
---

# 2.0.0

This release locks in the public surface of `@deessejs/errors`. The
two `error()` overloads are the supported entry points; the
constraints around `inherits`, `from`, `is`, and `causes` are
pinned in the type system and verified by a runtime probe against
every example in the docs.

## What shipped

### Two `error()` overloads

The function is overloaded on whether a Standard Schema is supplied
for `fields`. Both overloads share the same call-site shape for
`name`, `message`, and `inherits`.

```ts
// No-schema form. The factory is callable with no arguments,
// or with a manual generic that constrains the field shape:
//
//   error<{ n: string }>({ name: 'X' }).fields.n // string
//
// The no-schema form accepts a string `message` (with optional
// `{field}` placeholders) or a function `message: (data) => string`.
const E = error({ name: 'E' });
const instance = E();

// Schema form. The factory's call signature requires the
// schema's `InferInput` as the argument; `message` is a function
// of the schema's `InferOutput`. A string `message` is not
// accepted alongside a schema.
const S = error({
  name: 'S',
  fields: z.object({ n: z.number() }),
  message: (data) => String(data.n),
});
const s = S({ n: 1 });
```

A factory with a schema always requires its input, even for
`z.object({})`. A no-schema factory is callable with no arguments
when `T` defaults to `Record<string, never>`, or with the input
required by the manual generic.

### Inheritance is structural

`inherits` is a static type-level relationship plus a recognition
walk for `is()`. The leaf's `InferOutput` (or manual generic `T`)
must be assignable to every parent's `InferOutput`; the
constraint is enforced at the `error()` definition site. The
walk is what makes `is()` match a child against any of its
ancestors.

```ts
const Parent = error({
  name: 'Parent',
  fields: z.object({ id: z.string() }),
  message: (d) => d.id,
});
const Child = error({
  name: 'Child',
  fields: z.object({ id: z.string(), extra: z.string() }),
  message: (d) => `${d.id}-${d.extra}`,
  inherits: Parent,
}); // ok
```

`Parent.fields.id` is the only requirement the child must
satisfy. The child may add fields but must not drop or change
the parent's required ones. The library does not run the
parent's schema at instantiation; the leaf's own schema is
the only one that runs.

### `.from()` builds chains, one link at a time

Each `.from()` call sets the direct cause of the receiver. To
build a chain of length N, attach each layer's cause to the
previous one — the previous cause carries its own `.cause`.

```ts
const root = new Error('Network timeout');
const middle = ValidationError().from(root);
const app = AppError().from(middle);
const chain = causes(app); // [middle, root]
```

The chain is recoverable because every link carries its own
`.cause`; replacing the direct cause on a layer drops the
previous link from the walk. `causes()` returns a fresh array,
ordered immediate cause first, root cause last, with cycle
detection.

### `is()` narrows and walks

`is(err, factory)` returns `true` if `err` is an instance of
the factory, directly or through the inheritance walk. The
factory overload narrows `err` to that factory's own
`InferOutput`. The native-constructor overload narrows to
`InstanceType<typeof NativeErrorClass>`.

The walk consults a package-private `WeakSet` keyed on
instance identity, in addition to the factory marker. A
foreign object that imitates the marker slot is rejected by
the registry check. See the Caveats for the per-load limit.

## Caveats

- **`strictFunctionTypes` is required.** The contravariance
  witness that enforces inheritance compatibility relies on
  function parameters being checked contravariantly. Without
  `strictFunctionTypes`, the inheritance constraint is
  bypassed. `strictFunctionTypes` is enabled by `strict`,
  which is on in this project's tsconfig.

- **TypeScript 5.4 or later.** The public `error()` overloads
  use `NoInfer<T>`, which was introduced in TypeScript 5.4.
  Earlier versions compile but lose the `NoInfer` semantics on
  the `T` parameter.

- **Schema output must be a non-null, non-array object.** A
  schema whose `InferOutput` is `null`, an `unknown[]`, a
  primitive, or `undefined` is rejected at compile time via
  the `fields: S & (IsObjectOutput<InferOutput<S>> extends true
  ? unknown : never)` intersection, and at runtime via the
  `isObjectFields` guard that throws `ArgsValidationError` if
  the schema's value is malformed.

- **Schemas must be synchronous.** A schema whose `validate`
  returns a `Promise` is rejected with `ArgsValidationError`.
  The Promise is still attached and a no-op `.catch` is added
  so a late rejection cannot surface as an `unhandledRejection`.

- **Input is required when a schema is supplied.** A factory
  declared with a Standard Schema refuses a no-arg call at
  compile time. The runtime also throws a localized `TypeError`
  for the schema-bearing path so consumers who bypass the
  type-checker still get a clear message. This applies even
  when the schema accepts the empty shape (`z.object({})`).

- **`.fields` carries the post-transform output.** For schemas
  that transform (e.g. `z.coerce`, `z.default`, `z.transform`),
  the leaf's `.fields` is the schema's `InferOutput`, not the
  `InferInput`. The factory's `message` function receives the
  post-transform output.

- **`is()` is per-package-load.** An instance created by a
  second copy of `@deessejs/errors` (a duplicate in
  `node_modules`, a separate bundle, a CommonJS/ESM dual load,
  two copies in a micro-frontend) is registered in *that*
  copy's internal `INSTANCE_REGISTRY` (a `WeakSet`), not ours.
  Holding a direct reference to its factory is not sufficient:
  the marker slot is read and matches, but the registry check
  fails, and `is()` returns false. To recognize cross-load
  instances, the consumer must call `is()` from the same load
  that produced the instance.

- **The instance marker is non-writable on real instances.**
  Set via `Object.defineProperty` with `writable: false`. A
  foreign object that imitates the marker is rejected by the
  registry check; a hostile object that re-defines the marker
  on a real instance is rejected in strict mode (the
  assignment throws) and silently fails in sloppy mode (the
  marker is unchanged).

- **The factory's `inherits` slot is a snapshot.** Built once
  at construction, before the closure, and used for both the
  factory's metadata and every produced instance's `inherits`.
  The caller's array is not mutated. Classification is
  preserved across caller-side mutations on the original
  list.

## Docs

- **Public examples in `apps/web/content/docs/*.mdx` are
  type-checked AND runtime-verified against `dist/index.d.ts`.**
  `tests/docs-examples-typecheck.mjs` walks every fenced
  TypeScript code block in the docs, runs `tsc --noEmit`
  against the published types, then executes the block under
  `node --experimental-strip-types` and verifies every
  `console.log(...) // -> <expected>` annotation against the
  captured stdout. A doc that announces the wrong value
  fails the probe. As part of the audit, all MDX examples
  were rewritten to compile, to assert the values the page
  claims, and to build chains layer-by-layer so the
  announced `causes(...).length` matches the walk.
