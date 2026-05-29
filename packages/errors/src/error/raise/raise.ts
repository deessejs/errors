/**
 * Error raising utilities.
 */

import type { ErrorInstance } from '../types.js';

/**
 * Throws an ErrorInstance.
 *
 * This is the primary mechanism for throwing errors in @deessejs/errors.
 * The library also supports native `throw` syntax for compatibility.
 *
 * @param error - An error created by an error factory
 * @returns never - This function always throws
 *
 * @example
 * ```typescript
 * import { error, raise } from '@deessejs/errors';
 *
 * const ValidationError = error({
 *   name: 'ValidationError',
 *   fields: z.object({ field: z.string() }),
 * });
 *
 * raise(ValidationError({ field: 'email' }));
 * ```
 *
 * @example
 * ```typescript
 * // Also works with native throw
 * throw ValidationError({ field: 'email' });
 * ```
 *
 * @example
 * ```typescript
 * // Method chaining before raising
 * raise(AppError().from(err).addNote('Context here'));
 * ```
 */
const raise = ( error: ErrorInstance ): never => {
  throw error;
};

export { raise };
