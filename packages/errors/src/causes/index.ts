/**
 * Cause chain traversal utilities.
 */

import type { ErrorInstance } from '../error/types.js';

/**
 * Returns all causes in the error chain, from most recent to root cause.
 *
 * @param error - The error to get causes from
 * @returns Array of errors in the cause chain, ordered newest to oldest
 *
 * @example
 * ```typescript try {
 *   // ... } catch (err) {   const chain = causes(err);
 *   chain.forEach(e => logError(e));
 * }
 * ```
 *
 * @example
 * ```typescript
 * const err = ValidationError({ field: 'email' })
 *   .from(new NetworkError('Connection failed'))
 *   .from(new Error('DNS lookup failed'));
 *
 * // causes(err) returns newest-to-oldest: [NetworkError, Error]
 * // (err.cause is NetworkError, err.cause.cause is Error)
 * ```
 */
const causes = (error: unknown): Error[] => {
  if (error == null) {
    return [];
  }

  // Get the causes array from the error
  const instance = error as ErrorInstance;

  if (Array.isArray(instance.causes)) {
    return instance.causes;
  }

  return [];
};

export { causes };
