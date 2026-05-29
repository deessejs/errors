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

    return String( value );
  } );
}

// Regex pattern for matching stack frames
const STACK_FRAME_PATTERN = /^\s+at\s+/i;

/**
 * Captures the current stack trace, cleaning up internal frames.
 * Note: This is V8-specific and may not work in non-V8 environments (Deno, etc.)
 *
 * @internal
 */
function captureStack( message: string ): string {
  const stack = new Error().stack || '';

  const lines = stack.split( '\n' );
  const cleanedLines: string[] = [ `Error: ${message}` ];

  // Find start index (skip "Error: message" line)
  let startIndex = 0;
  for ( let i = 0; i < lines.length; i++ ) {
    if ( STACK_FRAME_PATTERN.test( lines[i] ) ) {
      startIndex = i;
      break;
    }
  }

  // Filter internal frames
  for ( let i = startIndex; i < lines.length; i++ ) {
    const line = lines[i];
    if ( line.includes( 'node_modules/@deessejs' ) ) {
      continue;
    }
    if ( line.includes( '__vite' ) ) {
      continue;
    }
    cleanedLines.push( line );
  }

  return cleanedLines.join( '\n' );
}

// Template placeholder regex (reusable)
const TEMPLATE_PLACEHOLDER_REGEX = /\{(\w+)(?::(\w+))?\}/g;

/**
 * Checks if a message string contains template placeholders.
 *
 * @internal
 */
function hasTemplatePlaceholders( message: string ): boolean {
  TEMPLATE_PLACEHOLDER_REGEX.lastIndex = 0;
  return TEMPLATE_PLACEHOLDER_REGEX.test( message );
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

    // Format message if template has placeholders
    let errorMessage = name;
    if ( message && hasTemplatePlaceholders( message ) ) {
      errorMessage = formatTemplate( message, fieldsData );
    } else if ( message ) {
      errorMessage = message;
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
      inherits: inherits ?? undefined,
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