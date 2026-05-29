/**
 * Error factory types.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

// ============================================================================
// Types
// ============================================================================

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
  ( fields?: Partial<TFields> ): ErrorInstance<TFields>;
  name: string;
  inherits?: ErrorFactory | ErrorFactory[];
  schema?: StandardSchemaV1;
  rawMessage?: string;
};

/**
 * Error instance returned by an ErrorFactory.
 * Contains all standard Error properties plus additional domain-specific fields.
 *
 * Note: .addNote() is implemented in a separate task.
 */
export type ErrorInstance<TFields extends Record<string, unknown> = Record<string, never>> =
  ErrorInstanceCore & {
    /** User-defined fields from Standard Schema */
    fields: TFields;
    // TODO: Implement .addNote() method (Task XX)
    /** Additional notes added via .addNote() */
    notes: string[];
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
    from( cause: Error | ErrorInstance ): ErrorInstance<TFields>;
    /** Direct cause of this error (from .from()) */
    cause: Error | null;
    /** Full cause chain from .from() calls */
    causes: Error[];
    // TODO: Implement context injection (Task 10)
    /** Injected context data */
    context: Record<string, unknown> | null;
    /** Parent error factories for type checking */
    inherits?: ErrorFactory | ErrorFactory[];
  };

/**
 * Full error config for the error() function.
 *
 * @internal - Type parameter reserved for future Standard Schema type inference
 */
export type ErrorConfig<_T extends Record<string, unknown> = Record<string, unknown>> = {
  /** Error name identifier */
  name: string;
  /** Standard Schema field definitions */
  fields?: StandardSchemaV1;
  /** Single parent error factory to inherit from */
  inherits?: ErrorFactory | ErrorFactory[];
  /** Message template with {field} placeholders */
  message?: string;
};
