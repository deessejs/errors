/**
 * Error factory types.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

// ============================================================================
// Compatibility witness symbol
// ============================================================================

/**
 * Symbol used as the key for the inheritance compatibility witness.
 *
 * The witness is a hidden property of `ErrorFactory` whose value is a
 * function whose parameter type is the factory's **output** shape. Under
 * `strictFunctionTypes`, function-typed property values are checked
 * contravariantly in their parameters: a parent factory parameterized
 * over `OutputParent` declares a callable that accepts `OutputParent`,
 * so it can only be used as a parent by a child whose output is
 * *assignable to* `OutputParent`. The TypeScript compiler enforces
 * this at the call site of `error({...})` without any custom
 * conditional types or `infer` tricks.
 *
 * The witness is purely declarative: no code calls the function. It
 * exists only to make the contravariance visible to the type checker.
 *
 * The `unique symbol` type is preserved without an `as any` cast: the
 * const is annotated explicitly as the unique-symbol type, and the
 * `Symbol(...)` call is the only expression that produces a value
 * narrowable to that type.
 *
 * **Requires `strictFunctionTypes`.** Without it, function-typed
 * property values are checked bivariantly and the contravariance
 * check is bypassed. `strictFunctionTypes` is enabled by `strict`,
 * which is on in this project's tsconfig.
 *
 * @internal
 */
export const acceptsFields: unique symbol = Symbol('@deessejs/errors/acceptsFields');

/**
 * Computes the parameter type of a factory's compatibility witness.
 * For a factory whose output is the empty shape
 * (`Record<string, never>`), the witness accepts `unknown` so that any
 * leaf can declare it as a parent — a parent with no fields can
 * classify children carrying data. For a non-empty output, the
 * witness accepts exactly that output.
 *
 * @internal
 */
type AcceptsFieldsArg<Output> = [Output] extends [Record<string, never>] ? unknown : Output;

/**
 * Compile-time predicate: is the schema's output type a non-null,
 * non-array object?
 *
 * The predicate is `true` for record-shaped types and `false` for
 * the malformed cases the audit enumerated: `null`, `undefined`,
 * arrays, and primitives (string, number, boolean, bigint,
 * symbol). The result is consulted by the schema-bearing
 * `error()` overload to reject malformed schemas at the call site
 * (R10) and by the runtime guard `isObjectFields` to reject the
 * value when the schema actually fires.
 *
 * For `unknown` and `any` the result is intentionally `true`:
 * the type system cannot prove the runtime value is a record,
 * but the consumer's downstream code reads `instance.fields` as
 * `Record<string, unknown>` regardless, and the runtime guard
 * catches the malformed value. A pure-type reject for `unknown`/
 * `any` would force every test fixture and every consumer that
 * uses an untyped schema to cast, which the audit did not
 * intend.
 *
 * @internal
 */
export type IsObjectOutput<O> = [O] extends [Record<string, never>]
  ? true
  : [O] extends [Record<string, unknown>]
    ? [O] extends [readonly unknown[]]
      ? false
      : true
    : false;

/**
 * The shape an `inherits:` value must take.
 *
 * `ParentFor<Output>` is a callable factory whose compatibility
 * witness accepts `Output`. A leaf whose output is `LeafOutput` can
 * use this factory as a parent only if `[LeafOutput] extends [Output]`
 * — the contravariance flips the check the other way, but the
 * resulting constraint is the same: the child must be assignable to
 * the parent's output.
 *
 * The shape also requires a `name` and a callable signature so the
 * witness cannot be satisfied by an arbitrary object literal.
 *
 * @internal
 */
export type ParentFor<Output> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: never[]): ErrorInstance<any>;
  name: string;
  readonly [acceptsFields]?: (fields: AcceptsFieldsArg<Output>) => void;
};

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
  /** Human-readable message */
  message: string;
  /** Stack trace string */
  stack: string;
};

/**
 * Error factory function type for **schema-bearing** factories.
 *
 * The call signature is *not* conditional: a factory with a schema
 * always requires its input at the call site, even when the schema
 * accepts the empty shape (`z.object({})`). The audit found a gap
 * where `Empty()` (no args, `z.object({})` schema) compiled but
 * threw at runtime — the conditional `[TInput] extends
 * [Record<string, never>]` in the original `ErrorFactory` treated
 * the empty shape as optional. Splitting this case into a separate
 * type removes the gap: a schema-bearing factory is required to
 * receive an input.
 *
 * The hidden `[acceptsFields]` property is the R7 inheritance
 * witness. It is a function typed `(fields: Output) => void`, which
 * under `strictFunctionTypes` is checked contravariantly. A factory
 * is a valid parent of a leaf whose output is `LeafOutput` only if
 * `[LeafOutput] extends [Output]`, i.e. the leaf's output is
 * assignable to the parent's. The constraint runs at the call site
 * of `error({...})` because `inherits?` is typed as
 * `ParentFor<NoInfer<...>>`.
 *
 * @typeParam TInput  Shape the caller must supply when invoking the factory.
 * @typeParam TOutput Shape the instance carries in `.fields` after validation.
 */
export type SchemaErrorFactory<TInput, TOutput> = {
  /**
   * Invoke the factory to mint a new instance.
   *
   * The input is always required. A factory with a non-empty `TInput`
   * called with no arguments is a type error; the runtime also throws
   * a localized `TypeError` when a schema-bearing factory is called
   * without input.
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
  /** R7 compatibility witness — do not set or read. */
  readonly [acceptsFields]?: (fields: AcceptsFieldsArg<TOutput>) => void;
};

/**
 * Error factory function type.
 *
 * Creates typed, structured errors. The two type parameters separate the
 * *input* contract (what the caller passes) from the *output* contract
 * (what the instance carries in its `fields` slot).
 *
 * The call signature is conditional on `TInput`: when `TInput` is the empty
 * shape (`Record<string, never>`), the factory is callable with no
 * arguments; when it is non-empty, the input argument is required at the
 * call site. This is the legacy form. **Schema-bearing factories use
 * `SchemaErrorFactory` instead**, which is never conditional — a
 * factory with a schema must always receive an input.
 *
 * The hidden `[acceptsFields]` property is the R7 inheritance witness.
 * It is a function typed `(fields: Output) => void`, which under
 * `strictFunctionTypes` is checked contravariantly.
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
      /** R7 compatibility witness — do not set or read. */
      readonly [acceptsFields]?: (fields: AcceptsFieldsArg<TOutput>) => void;
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
       *
       * For schema-bearing factories, prefer `SchemaErrorFactory`, which
       * has the same shape but is documented as the *only* factory type
       * used in the schema path. `ErrorFactory` is the type-erased form
       * surfaced in `AnyErrorFactory` and at runtime.
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
      /** R7 compatibility witness — do not set or read. */
      readonly [acceptsFields]?: (fields: AcceptsFieldsArg<TOutput>) => void;
    };

/**
 * Type-erased ErrorFactory. Accepts any concrete factory regardless of
 * its input/output generics. Used in `inherits` lists at runtime
 * (frozen on the instance), in the `is()` discriminator, and as the
 * return type of the implementation signature of `error()`.
 *
 * The compatibility witness is exposed with an `unknown` parameter,
 * so a `AnyErrorFactory` is a valid `ParentFor<unknown>` and can
 * appear in any `inherits:` slot without triggering the constraint.
 * Concrete factories expose a narrower witness and are checked
 * against the leaf's output.
 *
 * @internal
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly [acceptsFields]?: (fields: any) => void;
};

/**
 * Extract the output (post-validation `fields`) shape of a single
 * `ErrorFactory`. Used in `is/index.ts:ExtractOwnFactoryFields` and
 * kept here as the canonical type-level description of the
 * extraction. The R6 design dropped the recursive walk over parents
 * in favor of returning the queried factory's own output.
 *
 * @internal
 */
export type ExtractOwnFactoryOutput<F> = F extends (...args: never[]) => ErrorInstance<infer O>
  ? O
  : never;

/**
 * Error instance returned by an ErrorFactory.
 *
 * Contains all standard `Error` properties plus additional domain-specific
 * fields. The `fields` slot holds the **post-validation** shape.
 */
export type ErrorInstance<TFields = Record<string, never>> = ErrorInstanceCore & {
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
