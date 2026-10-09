/**
 * Error factory types.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

// ============================================================================
// Schema inference helpers
// ============================================================================

/**
 * Extracts the input type from a `StandardSchemaV1`.
 *
 * Standard Schema declares `~standard.schema.<I, O>` with input/output generics.
 * The input type is what the caller must pass; the output type is what the
 * validator returns after coercions, defaults, and transformations.
 *
 * @example
 * ```ts
 * type T = InferStandardSchemaInput<typeof z.object({ id: z.string() })>;
 * // T === { id: string }
 * ```
 */
export type InferStandardSchemaInput<S> = S extends StandardSchemaV1<infer I, unknown> ? I : never;

/**
 * Extracts the output type from a `StandardSchemaV1`.
 *
 * For schemas that transform (z.coerce, z.default, z.transform), the output
 * type differs from the input. This helper is what consumers should rely on
 * for downstream type-checking of validated data.
 *
 * @example
 * ```ts
 * type T = InferStandardSchemaOutput<typeof z.coerce.number()>;
 * // T === number
 * ```
 */
export type InferStandardSchemaOutput<S> = S extends StandardSchemaV1<unknown, infer O> ? O : never;

/**
 * Core properties present on every error instance.
 * These are guaranteed to exist regardless of how the error was created.
 */
export type ErrorInstanceCore = {
  /** Error name identifier */
  name: string;
  /** Human-readable error message */
  message: string;
  /** Stack trace string */
  stack: string;
};

/**
 * Error factory function type.
 *
 * Creates typed, structured errors. The two type parameters separate the
 * *input* contract (what the caller passes) from the *output* contract
 * (what the instance carries in its `fields` slot). With a Standard Schema,
 * the input and output are independently inferred from the schema and may
 * differ when the schema transforms (coercion, defaults, branding).
 *
 * The call signature is conditional on `TInput`: when `TInput` is the empty
 * shape (`Record<string, never>`), the factory is callable with no
 * arguments; when it is non-empty, the input argument is required at the
 * call site. This closes the gap where a factory carrying a declared
 * `TInput` could be called with no arguments and then crash on
 * `instance.fields.x` with a confusing `TypeError` from the wrong frame.
 *
 * @typeParam TInput  Shape the caller must supply when invoking the factory.
 * @typeParam TOutput Shape the instance carries in `.fields` after validation.
 */
export type ErrorFactory<
  TInput extends Record<string, unknown> = Record<string, never>,
  TOutput extends Record<string, unknown> = TInput,
> = [TInput] extends [Record<string, never>]
  ? {
      /**
       * Invoke the factory to mint a new instance.
       *
       * When `TInput` is the empty shape, the argument is optional — the
       * legacy string-template form (`error({ name, message })` with no
       * manual generic) is allowed to be called with `()` or `({})`. The
       * runtime coerces a non-object input to `{}` so the legacy template
       * still renders, and a missing input falls back to `name` as the
       * message.
       */
      (input?: TInput): ErrorInstance<TOutput>;
      /** Error name identifier. */
      name: string;
      /** Parent error factories for type checking. */
      inherits?: AnyErrorFactory | readonly AnyErrorFactory[];
      /** The Standard Schema used to validate the args at instantiation time. */
      schema?: StandardSchemaV1;
      /** The original message template or function (introspection only). */
      rawMessage?: string | ((data: TOutput) => string);
    }
  : {
      /**
       * Invoke the factory to mint a new instance.
       *
       * When `TInput` is non-empty (the caller declared a manual generic
       * or supplied a schema), the input argument is required. A factory
       * with a non-empty `TInput` called with no arguments is a type
       * error; the runtime also throws a localized `TypeError` when a
       * schema-bearing factory is called without input.
       */
      (input: TInput): ErrorInstance<TOutput>;
      /** Error name identifier. */
      name: string;
      /** Parent error factories for type checking. */
      inherits?: AnyErrorFactory | readonly AnyErrorFactory[];
      /** The Standard Schema used to validate the args at instantiation time. */
      schema?: StandardSchemaV1;
      /** The original message template or function (introspection only). */
      rawMessage?: string | ((data: TOutput) => string);
    };

/**
 * Type-erased ErrorFactory. Accepts any concrete factory regardless of
 * its input/output generics. Used in `inherits` lists, the `is()`
 * discriminator, and any other surface where the field-level types are
 * not material.
 *
 * The conditional on `ErrorFactory<TInput, TOutput>` makes
 * `ErrorFactory<any, any>` self-referential (the body references
 * `AnyErrorFactory` via the `inherits` field). Inlining the two branches
 * with `any` generics breaks the structural cycle: the body's `inherits`
 * now references a stand-alone alias defined *before* the conditional
 * factory, not the factory itself.
 */
export type AnyErrorFactory = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (input?: any): ErrorInstance<any>;
  name: string;
  inherits?: AnyErrorFactory | readonly AnyErrorFactory[];
  schema?: StandardSchemaV1;
  rawMessage?:
    | string // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ((data: any) => string);
};

/**
 * Extract the output (post-validation `fields`) shape of a single
 * `ErrorFactory`. Mirrors `is/index.ts:ExtractOwnFactoryFields` but
 * lives in `types.ts` so the `error()` overloads can use it as a
 * compile-time constraint without an import cycle.
 *
 * @internal
 */
export type ExtractOwnFactoryOutput<F> = F extends (...args: never[]) => ErrorInstance<infer O>
  ? O
  : never;

/**
 * Compile-time constraint for the `inherits` field of a leaf factory.
 *
 * The R6 contract: the leaf's `InferOutput` (or manual generic `T`)
 * must be assignable to every parent's `InferOutput`. Inverting the
 * old cascade, the parent is a *supertype* of the child: the child
 * may add fields but must not drop or change the parent's required
 * ones.
 *
 * `NoInfer<Leaf>` is used at the comparison site to prevent the
 * check from contributing to the inference of `Leaf` (which is
 * driven by the schema parameter `S`, not by the constraint).
 *
 * The helper returns `true` when the constraint holds and `false`
 * (a "type-level false" / never) when it does not. The `error()`
 * overloads use this in a conditional return type so a violation
 * at the call site surfaces as a TypeScript error.
 *
 * Three cases are distinguished at the top level:
 *  - `undefined`: no parents, trivially compatible.
 *  - `AnyErrorFactory`: a single parent. The leaf's output must
 *    extend the parent's output.
 *  - `readonly AnyErrorFactory[]`: zero, one, or more parents.
 *    The list is matched by `LeafCompatibleWithEach` which handles
 *    tuples (literal lists), non-tuple arrays (e.g. `const p =
 *    [A, B]`, typed `AnyErrorFactory[]`), and empty arrays.
 *
 * The non-tuple array branch is the R6 fix: the previous helper
 * (`AssignableThroughInheritsArray`) only checked tuple literals;
 * a non-tuple array hit the fallback `true` and bypassed the
 * constraint entirely.
 *
 * @internal
 */
export type CompatibleWith<Leaf, Parents> = Parents extends undefined
  ? true
  : Parents extends AnyErrorFactory
    ? [NoInfer<Leaf>] extends [ExtractOwnFactoryOutput<Parents>]
      ? true
      : false
    : Parents extends readonly AnyErrorFactory[]
      ? LeafCompatibleWithEach<NoInfer<Leaf>, Parents>
      : true;

/**
 * Recursive helper: iterate over the parents and require each to
 * accept the leaf. The tuple branch recurses head-by-head; the
 * non-tuple array branch collapses to the element type
 * (`P[number]`) so a list typed `AnyErrorFactory[]` is checked
 * uniformly rather than via its structural declaration.
 *
 * The empty-tuple / empty-array fallback is `true` (no parents,
 * nothing to satisfy).
 *
 * @internal
 */
type LeafCompatibleWithEach<Leaf, P extends readonly AnyErrorFactory[]> = P extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Head extends AnyErrorFactory
    ? [Leaf] extends [ExtractOwnFactoryOutput<Head>]
      ? Tail extends readonly AnyErrorFactory[]
        ? LeafCompatibleWithEach<Leaf, Tail>
        : true
      : false
    : false
  : P extends AnyErrorFactory[]
    ? [Leaf] extends [ExtractOwnFactoryOutput<P[number]>]
      ? true
      : false
    : true;

/**
 * Error instance returned by an ErrorFactory.
 *
 * Contains all standard `Error` properties plus additional domain-specific
 * fields. The `fields` slot holds the **post-validation** shape.
 */
export type ErrorInstance<TFields extends Record<string, unknown> = Record<string, never>> =
  ErrorInstanceCore & {
    /** Validated fields, post-transformation. */
    fields: TFields;
    /** Additional notes added via .addNote() */
    notes: string[];
    /**
     * Adds a note to this error instance.
     *
     * Notes provide runtime context that complements the structured fields.
     * Patterned after Python 3.11's `BaseException.add_note()` (PEP 678).
     */
    addNote(note: string): ErrorInstance<TFields>;
    /**
     * Chains a cause error to this error. The cause is the direct failure
     * that explains this one. Walk `cause` (singular) to follow the chain.
     */
    // The `any` here lets `cause` accept any ErrorInstance shape
    // without forcing a covariant narrowing that would reject
    // structurally-compatible instances from sibling factories.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from(cause: Error | ErrorInstance<any>): ErrorInstance<TFields>;
    /** Direct cause of this error. Walk `.cause` to follow the chain. */
    cause: Error | null;
    /** Injected context data */
    context: Record<string, unknown> | null;
    /** Parent error factories for type checking */
    inherits?: AnyErrorFactory | readonly AnyErrorFactory[];
  };

/**
 * Standard-schema-backed config.
 *
 * When `fields` is a `StandardSchemaV1`, the input shape is the schema's
 * inferred **input** and the instance's `.fields` is the schema's inferred
 * **output**. They may differ for schemas that transform.
 *
 * The `message` is a function that receives the validated output and returns
 * the rendered string. The presence of `fields` triggers validation at
 * instantiation time, regardless of the message form.
 */
export type StandardErrorConfig<
  S extends StandardSchemaV1,
  M extends (data: InferStandardSchemaOutput<S>) => string,
> = {
  /** Error name identifier */
  name: string;
  /** Standard Schema field definitions (zod, valibot, arktype, etc.) */
  fields: S;
  /** Single parent error factory, or list of parents, to inherit from */
  inherits?: AnyErrorFactory | readonly AnyErrorFactory[];
  /** Message-as-function, receives the validated output */
  message: M;
};

/**
 * Legacy config: no schema, plain string message template.
 *
 * Marked `@deprecated` in 1.4.0; removed in 2.0.0.
 */
export type LegacyErrorConfig = {
  /** Error name identifier */
  name: string;
  /** @deprecated Single parent error factory to inherit from */
  inherits?: AnyErrorFactory | readonly AnyErrorFactory[];
  /** @deprecated Message template with `{field}` placeholders */
  message?: string;
};

/**
 * Configuration accepted by `error()`.
 *
 * - Standard path: supply `fields` (a `StandardSchemaV1`) and a function-form
 *   `message`. The args shape is inferred.
 * - Legacy path: omit `fields` or use a string `message`. Works in 1.4.0 with
 *   a deprecation warning; removed in 2.0.0.
 */
export type ErrorConfig =
  | StandardErrorConfig<
      StandardSchemaV1,
      (data: InferStandardSchemaOutput<StandardSchemaV1>) => string
    >
  | LegacyErrorConfig;
