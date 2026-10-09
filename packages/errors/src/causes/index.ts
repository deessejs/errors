/**
 * Cause chain traversal utilities.
 */

/**
 * Walks the cause chain of an error, returning the chain from the
 * immediate cause down to the root.
 *
 * The chain is built by following `.cause` (with structural guards
 * that accept any value, including native `Error.cause` and
 * `ErrorInstance.cause`). Cycle detection via a `Set` ensures that
 * a malformed cycle does not hang the process.
 *
 * The returned array is a *new* array; mutations do not affect the
 * underlying error. The `causes: Error[]` field that older versions
 * of this package attached to each instance has been removed in
 * Phase 4b. Walk the chain instead.
 *
 * @param error - The error to get causes from. `null` and
 * `undefined` return `[]`. Native `Error` instances are accepted
 * alongside `ErrorInstance`.
 * @returns Array of errors in the cause chain, ordered immediate
 * cause first, root cause last.
 *
 * @example
 * ```typescript
 * import { causes, raise } from '@deessejs/errors';
 *
 * try {
 *   await sync();
 * } catch (err) {
 *   causes(err).forEach((cause) => logError(cause));
 * }
 * ```
 *
 * @example
 * ```typescript
 * const err = ValidationError({ field: 'email' })
 *   .from(new NetworkError('Connection failed'))
 *   .from(new Error('DNS lookup failed'));
 *
 * // causes(err) returns [NetworkError, Error]
 * // (err.cause is NetworkError, NetworkError.cause is Error)
 * ```
 */
const causes = (error: unknown): Error[] => {
  if (error == null || typeof error !== 'object') {
    return [];
  }

  const result: Error[] = [];
  const seen = new Set<Error>();

  // Only follow `.cause` if it is itself an Error (or ErrorInstance).
  // A primitive or non-Error object as `cause` is a malformed input
  // (the runtime or upstream set it incorrectly); we stop the walk
  // rather than include the malformed value in the result.
  const rawCause = (error as { cause?: unknown }).cause;
  let current: Error | null = rawCause !== null && rawCause instanceof Error ? rawCause : null;

  while (current !== null && !seen.has(current)) {
    seen.add(current);
    result.push(current);
    const nextRaw = (current as { cause?: unknown }).cause;
    current = nextRaw !== null && nextRaw instanceof Error ? nextRaw : null;
  }

  return result;
};

export { causes };
