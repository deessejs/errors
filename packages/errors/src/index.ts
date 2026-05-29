/**
 * @deessejs/errors - TypeScript Error Handling Library
 *
 * Error factory function and related types for creating typed, structured errors.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

// Re-export for consumers
export type { StandardSchemaV1 };

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
 */
export interface ErrorInstance<TFields extends Record<string, unknown> = Record<string, never>>
  extends ErrorInstanceCore {
  /** User-defined fields from Standard Schema */
  fields: TFields;
  /** Additional notes added via .addNote() */
  notes: string[];
  /** Direct cause of this error (from .from()) */
  cause: Error | null;
  /** Full cause chain from .from() calls */
  causes: Error[];
  /** Injected context data */
  context: Record<string, unknown> | null;
  /** HTTP status code (null if not defined) */
  httpStatus: number | null;
  /** Parent error factories for type checking */
  _inherits?: ErrorFactory | ErrorFactory[];
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats a message template by replacing {field} placeholders with values.
 *
 * @internal
 */
function formatTemplate( template: string, fields: Record<string, unknown> ): string {
  return template.replace( /\{(\w+)(?::(\w+))?\}/g, ( match, fieldName, modifier ) => {
    const value = fields[fieldName];
    if ( value === undefined ) {
      return match; // Leave placeholder if field not found
    }

    if ( modifier === 'upper' ) {
      return String( value ).toUpperCase();
    }
    if ( modifier === 'lower' ) {
      return String( value ).toLowerCase();
    }
    if ( modifier === 'json' ) {
      return JSON.stringify( value );
    }

    // Default: stringify the value
    return String( value );
  } );
}

/**
 * Captures the current stack trace, cleaning up internal frames.
 *
 * @internal
 */
function captureStack( message: string ): string {
  // Capture stack - V8 engines provide Error.stack
  const stack = new Error().stack || '';

  // Find the line after the error construction
  // Pattern matches typical stack format: "Error: message\n    at ..."
  const lines = stack.split( '\n' );
  const cleanedLines: string[] = [];

  // Skip the "Error:" line and find where actual code starts
  let startIndex = 0;
  for ( let i = 0; i < lines.length; i++ ) {
    const line = lines[i];
    // Stack lines typically start with "    at " or "\tat "
    if ( line.match( /^\s+at\s+/ ) || line.match( /^\s+at\s+/i ) ) {
      startIndex = i;
      break;
    }
  }

  // Keep the first line (Error: message) and relevant stack frames
  cleanedLines.push( `Error: ${message}` );
  for ( let i = startIndex; i < lines.length; i++ ) {
    const line = lines[i];
    // Filter out internal frames from this library
    if ( !line.includes( 'node_modules/@deessejs' ) && !line.includes( '__vite' ) ) {
      cleanedLines.push( line );
    }
  }

  return cleanedLines.join( '\n' );
}

// ============================================================================
// Error Factory
// ============================================================================

/**
 * Creates an error factory function for defining typed, structured errors.
 *
 * @param config - Error configuration
 * @param config.name - Error name identifier
 * @param config.fields - Standard Schema field definitions (Zod, Valibot, ArkType, etc.)
 * @param config.inherits - Parent error factory to inherit from
 * @param config.message - Message template with {field} placeholders
 * @param config.httpStatus - HTTP status code
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 *
 * const ValidationError = error({
 *   name: 'ValidationError',
 *   fields: z.object({
 *     field: z.string(),
 *     reason: z.string(),
 *   }),
 *   message: 'Field "{field}" is invalid: {reason}',
 *   httpStatus: 400,
 * });
 *
 * const err = ValidationError({ field: 'email', reason: 'invalid format' });
 * // err.message === 'Field "email" is invalid: invalid format'
 * ```
 *
 * @example
 * ```typescript
 * // Single inheritance
 * const AppError = error({ name: 'AppError' });
 * const ValidationError = error({
 *   name: 'ValidationError',
 *   inherits: AppError,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Multiple inheritance
 * const NetworkError = error({ name: 'NetworkError' });
 * const StorageError = error({ name: 'StorageError' });
 * const CombinedError = error({
 *   name: 'CombinedError',
 *   inherits: [NetworkError, StorageError],
 * });
 * ```
 */
export function error<const T extends Record<string, unknown> = Record<string, never>>(
  config: ErrorConfig<T>
): ErrorFactory<T> {
  const { name, fields, inherits, message, httpStatus } = config;

  /**
   * Error factory function - creates error instances.
   */
  function ErrorFactoryInstance( input?: Partial<T> ): ErrorInstance<T> {
    const fieldsData = ( input || {} ) as T;

    // Format message if template is defined
    let errorMessage: string;
    if ( message && Object.keys( fieldsData ).length > 0 ) {
      errorMessage = formatTemplate( message, fieldsData );
    } else if ( message ) {
      errorMessage = message;
    } else {
      errorMessage = name;
    }

    // Capture stack trace with cleaned frames
    const stack = captureStack( errorMessage );

    return {
      name,
      message: errorMessage,
      stack,
      fields: fieldsData,
      notes: [],
      cause: null,
      causes: [],
      context: null,
      httpStatus: httpStatus ?? null,
      _inherits: inherits,
      _factory: ErrorFactoryInstance as ErrorFactory<T>,
    };
  }

  // Attach metadata to the factory function
  Object.defineProperty( ErrorFactoryInstance, 'name', {
    value: name,
    writable: false,
    enumerable: false,
    configurable: false,
  } );

  if ( inherits !== undefined ) {
    ( ErrorFactoryInstance as ErrorFactory<T> ).inherits = inherits;
  }

  if ( fields !== undefined ) {
    ( ErrorFactoryInstance as ErrorFactory<T> ).schema = fields;
  }

  if ( message !== undefined ) {
    ( ErrorFactoryInstance as ErrorFactory<T> ).template = message;
  }

  if ( httpStatus !== undefined ) {
    ( ErrorFactoryInstance as ErrorFactory<T> ).httpStatus = httpStatus;
  }

  return ErrorFactoryInstance as ErrorFactory<T>;
}

// ============================================================================
// Exports
// ============================================================================
