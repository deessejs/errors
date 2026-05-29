/**
 * Error factory types and related interfaces.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

// ============================================================================
// Types
// ============================================================================

/**
 * Core properties present on every error instance.
 * These are guaranteed to exist regardless of how the error was created.
 */
export interface ErrorInstanceCore {
  /** Error name identifier */
  name: string;
  /** Human-readable error message */
  message: string;
  /** Stack trace string */
  stack: string;
}

/**
 * Error factory function type.
 * Creates typed, structured errors with optional field definitions.
 */
export interface ErrorFactory<TFields extends Record<string, unknown> = Record<string, never>> {
  ( fields?: Partial<TFields> ): ErrorInstance<TFields>;
  name: string;
  inherits?: ErrorFactory | ErrorFactory[];
  schema?: StandardSchemaV1;
  template?: string;
  httpStatus?: number;
}

/**
 * Error instance returned by an ErrorFactory.
 * Contains all standard Error properties plus additional domain-specific fields.
 *
 * Note: Methods like .addNote() and .from() are implemented in separate tasks.
 */
export interface ErrorInstance<TFields extends Record<string, unknown> = Record<string, never>>
  extends ErrorInstanceCore {
  /** User-defined fields from Standard Schema */
  fields: TFields;
  // TODO: Implement .addNote() method (Task 05)
  /** Additional notes added via .addNote() */
  notes: string[];
  // TODO: Implement .from() method (Task 06)
  /** Direct cause of this error (from .from()) */
  cause: Error | null;
  /** Full cause chain from .from() calls */
  causes: Error[];
  // TODO: Implement context injection (Task 10)
  /** Injected context data */
  context: Record<string, unknown> | null;
  /** HTTP status code (null if not defined) */
  httpStatus: number | null;
  /** Parent error factories for type checking */
  inherits?: ErrorFactory | ErrorFactory[];
  /** Reference to the factory that created this instance */
  _factory: ErrorFactory<TFields>;
}

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
  /** HTTP status code */
  httpStatus?: number;
};
