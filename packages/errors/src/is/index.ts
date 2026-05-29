/**
 * Error type checking utilities.
 */

import type { ErrorFactory, ErrorInstance } from '../error/types.js';
import { hasFactory } from '../error/error.js';

/**
 * Checks if an error is an instance of a specific error type.
 *
 * Works with:
 * - Custom error factories created by error()
 * - Single and multiple inheritance hierarchies
 * - Native JavaScript errors (TypeError, SyntaxError, etc.)
 *
 * @param error - The error to check (can be any value)
 * @param ErrorType - The error type to check against
 * @returns boolean - true if the error is the specified type or inherits from it
 *
 * @example
 * ```typescript
 * const AppError = error({ name: 'AppError' });
 * const ValidationError = error({ name: 'ValidationError', inherits: AppError });
 *
 * const err = ValidationError();
 * is(err, ValidationError); // true
 * is(err, AppError);        // true (through inheritance)
 * ```
 *
 * @example
 * ```typescript
 * // Works with native errors
 * try {
 *   JSON.parse('invalid');
 * } catch (err) {
 *   if (is(err, SyntaxError)) {
 *     // Handle syntax errors
 *   }
 * }
 * ```
 */
const is = <T extends ErrorFactory>(
  error: unknown,
  ErrorType: T
): error is ErrorInstance => {
  // Handle null/undefined
  if ( error == null ) {
    return false;
  }

  // Handle native errors (TypeScript constructor comparison)
  if ( typeof ErrorType === 'function' && 'prototype' in ErrorType ) {
    try {
      if ( error instanceof ErrorType ) {
        return true;
      }
    } catch {
      // instanceof can fail for certain cross-realm errors
    }
  }

  // Handle our ErrorFactory instances using Symbol-based identity
  if ( hasFactory( error, ErrorType ) ) {
    return true;
  }

  // Check inheritance chain for parent type matching
  if ( error instanceof Error ) {
    const instance = error as Error & { inherits?: ErrorFactory | ErrorFactory[] };
    const targetFactory = ErrorType;

    // Walk inheritance chain to check if any ancestor matches
    let current: ErrorFactory | ErrorFactory[] | undefined = instance.inherits;

    while ( current !== undefined ) {
      // Normalize to array for iteration
      const factories = Array.isArray( current ) ? current : [current];

      for ( const factory of factories ) {
        if ( factory === targetFactory ) {
          return true;
        }
        // Continue walking up the chain
        current = factory.inherits;
      }
    }
  }

  return false;
};

export { is };