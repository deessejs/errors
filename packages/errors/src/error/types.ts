/**
 * Error factory types.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

// ============================================================================
// Types
// ============================================================================

/**
 * Helper to extract the inferred output type from a `StandardSchemaV1`.
 *
 * Standard Schema declares `~standard.schema.<I, O>` with input/output generics.
 * Most validators (zod, valibot, arktype, etc.) infer `Output` from the schema
 * builder. This helper simply walks the property path.
 *
 * @example
 * ```ts
 * type T = InferStandardSchemaOutput<typeof z.object({ id: z.string() })>;
 * // T === { id: string }
 * ```
 */
export type InferStandardSchemaOutput<S> = S extends StandardSchemaV1<unknown, infer O>
  ? O
  : never;

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
 * Creates typed, structured errors with optional field definitions.
 */
export type ErrorFactory<TFields extends Record<string, unknown> = Record<string, never>> = {
  (fields?: Partial<TFields>): ErrorInstance<TFields>;
  name: string;
  inherits?: ErrorFactory | ErrorFactory[];
  /**
   * The Standard Schema used to validate the args at instantiation time.
   * Exposed for consumers that want to read it back from the factory itself.
   */
  schema?: StandardSchemaV1;
  /**
   * The original message template or function. Exposed for introspection
   * (e.g. docs UI, serializer inspection).
   */
  rawMessage?: string | ((data: TFields) => string);
};

/**
 * Error instance returned by an ErrorFactory.
 * Contains all standard Error properties plus additional domain-specific fields.
 */
export type ErrorInstance<TFields extends Record<string, unknown> = Record<string, never>> =
  ErrorInstanceCore & {
    /** User-defined fields from Standard Schema */
    fields: TFields;
    /** Additional notes added via .addNote() */
    notes: string[];
    /**
     * Adds a note to this error instance.
     *
     * Notes provide runtime context that complements the structured fields.
     * Patterned after Python 3.11's `BaseException.add_note()` (PEP 678).
     *
     * @param note - The note text to attach
     * @returns This error instance for chaining
     *
     * @example
     * ```typescript
     * const err = AppError().addNote('Attempt 1 failed').addNote('Retrying...');
     * // err.notes === ['Attempt 1 failed', 'Retrying...']
     * ```
     */
    addNote(note: string): ErrorInstance<TFields>;
    /**
     * Chains a cause error to this error.
     *
     * @param cause - The error that caused this one
     * @returns This error instance for chaining
     *
     * @example
     * ```typescript
     * const err = ValidationError({ field: 'email' })
     *   .from(new NetworkError('Connection failed'));
     * ```
     */
    from(cause: Error | ErrorInstance): ErrorInstance<TFields>;
    /** Direct cause of this error (from .from()) */
    cause: Error | null;
    /** Full cause chain from .from() calls */
    causes: Error[];
    /** Injected context data */
    context: Record<string, unknown> | null;
    /** Parent error factories for type checking */
    inherits?: ErrorFactory | ErrorFactory[];
  };

/**
 * New-style config: schema-inferred fields plus a function-form message.
 *
 * The `fields` is a `StandardSchemaV1`; the args shape is the inferred
 * `Output` of the schema. The `message` is a function that receives the
 * validated output and returns the rendered string.
 *
 * Only enabled when both `fields` and a function-form `message` are supplied.
 * The legacy config (no `fields`, string `message`) lives in `LegacyErrorConfig`.
 */
export type StandardErrorConfig<S extends StandardSchemaV1, M extends (data: InferStandardSchemaOutput<S>) => string> = {
  /** Error name identifier */
  name: string;
  /** Standard Schema field definitions (zod, valibot, arktype, etc.) */
  fields: S;
  /** Single parent error factory to inherit from */
  inherits?: ErrorFactory | ErrorFactory[];
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
  inherits?: ErrorFactory | ErrorFactory[];
  /** @deprecated Message template with `{field}` placeholders */
  message?: string;
  /**
   * @deprecated Was never wired up to runtime validation. Migrate to
   * `StandardErrorConfig` (RFC 0001).
   */
  schema?: StandardSchemaV1;
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
  | StandardErrorConfig<StandardSchemaV1, (data: InferStandardSchemaOutput<StandardSchemaV1>) => string>
  | LegacyErrorConfig;
