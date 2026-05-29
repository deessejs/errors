/**
 * @deessejs/errors - TypeScript Error Handling Library
 *
 * Error factory function and related implementations.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

import type { ErrorFactory, ErrorInstance } from './types/index.js';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats a message template by replacing {field} placeholders with values.
 *
 * @internal
 */
function formatTemplate( template: string, fields: Record<string, unknown> ): string {
  return template.replace( /\{(\w+)(?::(\w+))?\}/g, ( fullMatch, fieldName, modifier ) => {
    const value = fields[fieldName];
    if ( value === undefined ) {
      return fullMatch;
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
  config: {
    name: string;
    fields?: StandardSchemaV1;
    inherits?: ErrorFactory | ErrorFactory[];
    message?: string;
    httpStatus?: number;
  }
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
