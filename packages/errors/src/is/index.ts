/**
 * Error type checking utilities.
 */

import type { AnyErrorFactory, ErrorInstance } from '../error/types.js';
import { FACTORY_SYMBOL } from '../error/error.js';

/**
 * Type to extract the fields from a single ErrorFactory.
 *
 * For an ErrorFactory, the fields type is the **output** shape —
 * the second type parameter on `ErrorFactory<TInput, TOutput>`.
 * We extract it by introspecting the call signature: the factory
 * is `(input?: TInput) => ErrorInstance<TOutput>`, so TOutput
 * is the type of the awaited return value.
 *
 * @internal
 */
type ExtractOwnFactoryFields<T> = T extends (...args: never[]) => ErrorInstance<infer F>
  ? F
  : never;

/**
 * Type to extract the fields from an ErrorFactory or native Error
 * class.
 *
 * For an ErrorFactory, the narrowed type is **the factory's own
 * output shape**, not the intersection with parents. Under the
 * R6 contract, every child is statically assignable to each of
 * its parents at the `error()` definition site (enforced by the
 * `[acceptsFields]` contravariance witness in `types.ts`), so the
 * recursive walk that previously produced an intersection is no
 * longer needed: the child carries its own output, and the parent
 * contract is satisfied by construction.
 *
 * For a native Error constructor, the value is the instance type.
 *
 * @internal
 */
type ExtractFactoryFields<T> = T extends AnyErrorFactory
  ? ExtractOwnFactoryFields<T>
  : T extends new (...args: never[]) => Error
    ? T
    : never;

/**
 * Validates a candidate factory reference read from the marker
 * slot on an error-shaped object. Returns the value only if it is
 * a callable factory — anything else (null, primitive, plain
 * object) is rejected and `is()` returns false.
 *
 * The marker slot is itself non-writable (set via
 * `Object.defineProperty` on the instance), but a malicious or
 * foreign object may still place a non-function value at the same
 * key. This guard keeps `is()` sound: an empty marker that *looks*
 * like the right shape but isn't callable is still a non-match.
 */
const isCallableFactory = (value: unknown): value is AnyErrorFactory => {
  return typeof value === 'function';
};

/**
 * Validates that a candidate is a real `ErrorInstance` produced by
 * a factory, not a foreign object that imitates the marker shape.
 *
 * The audit found a gap: a hand-rolled object that places a real
 * factory reference at `Symbol.for('@deessejs/errors/factory')` —
 * but has no `.fields`, `.from()`, `.addNote()`, or `.cause` — was
 * accepted by `is()`. The marker read returned the real factory,
 * the DFS walk resolved the queried factory on the first hop, and
 * `is()` returned true. The audit's intended contract: a foreign
 * object that lacks the instance methods is not an instance of
 * the factory, even if its marker is a callable reference.
 *
 * The check is the union of every `ErrorInstance` shape a real
 * factory produces: it must extend `Error` and carry a function
 * `from` and a function `addNote`. `fields`, `notes`, and `cause`
 * are not used as discriminants because they are *typed* but the
 * audit case has them absent; checking their presence (rather than
 * method presence) would silently accept the foreign object as
 * long as the right `fields` value is supplied.
 *
 * The marker-based check is the primary contract; this is a
 * defense-in-depth check for the spoofed-marker case.
 */
const isErrorInstance = (value: unknown): value is ErrorInstance => {
  if (value === null || typeof value !== 'object') return false;
  if (!(value instanceof Error)) return false;
  const v = value as { from?: unknown; addNote?: unknown };
  return typeof v.from === 'function' && typeof v.addNote === 'function';
};

/**
 * Checks if an error is an instance of a specific error type.
 *
 * Works with:
 * - Custom error factories created by error()
 * - Single and multiple inheritance hierarchies
 * - Native JavaScript errors (TypeError, SyntaxError, etc.)
 *
 * The return type discriminates:
 * - For a factory: `error is ErrorInstance<F>` (where F is the factory's
 *   inferred output shape).
 * - For a native constructor: `error is InstanceType<T>` (a plain native
 *   Error subclass instance, without the `.fields` / `.notes` / `.from()`
 *   / `.addNote()` extensions).
 *
 * The marker-based recognition reads `Symbol.for('@deessejs/errors/factory')`
 * on the candidate value, then walks the factory's `inherits` graph
 * depth-first. Markers that are not callable (null, primitive, or
 * arbitrary object) are rejected; the function returns false rather
 * than crashing. See `isCallableFactory` for the validation.
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
 * is(err, ValidationError); // true; err is typed as ErrorInstance<...>
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
 *     // Handle syntax errors — err is typed as SyntaxError
 *   }
 * }
 * ```
 */
function is<T extends AnyErrorFactory>(
  error: unknown,
  ErrorType: T
): error is ErrorInstance<ExtractFactoryFields<T>>;
function is<T extends new (...args: never[]) => Error>(
  error: unknown,
  ErrorType: T
): error is InstanceType<T>;
function is(
  error: unknown,
  ErrorType: AnyErrorFactory | (new (...args: never[]) => Error)
): boolean {
  if (error == null) {
    return false;
  }

  // Native error check first. Some hosts (cross-realm, VMs) raise
  // on instanceof for foreign constructors; the try/catch keeps the
  // function total.
  if (typeof ErrorType === 'function' && 'prototype' in ErrorType) {
    try {
      if (error instanceof ErrorType) {
        return true;
      }
    } catch {
      // Cross-realm / hostile-prototype: fall through to the marker check.
    }
  }

  if (typeof error !== 'object') {
    return false;
  }

  // The marker slot is non-writable (set via Object.defineProperty on
  // the instance in error.ts), so a well-behaved factory instance
  // always carries a callable reference here. Foreign or hand-rolled
  // objects can still place any value at the symbol key; we validate
  // the read.
  const marker = (error as { [k: symbol]: unknown })[FACTORY_SYMBOL];
  if (!isCallableFactory(marker)) {
    return false;
  }

  // Defense-in-depth: a foreign object that imitates the marker
  // (places a real factory reference at the symbol key) but lacks
  // the instance methods (`.from`, `.addNote`) is not a real
  // ErrorInstance. The audit found a case where such a forgery
  // passed the marker check and `is()` returned true. The check
  // uses method presence (functions, not values) so a hand-rolled
  // object cannot satisfy it by carrying the right `.fields`.
  if (!isErrorInstance(error)) {
    return false;
  }

  // DFS walk of the inheritance tree. A Set of seen factories
  // breaks the cycle in malformed graphs.
  const stack: AnyErrorFactory[] = [marker];
  const seen = new Set<AnyErrorFactory>();

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (current === ErrorType) {
      return true;
    }

    const inherits = current.inherits;
    if (inherits !== undefined) {
      if (Array.isArray(inherits)) {
        for (let i = 0; i < inherits.length; i++) {
          const next = inherits[i];
          if (isCallableFactory(next)) {
            stack.push(next);
          }
        }
      } else if (isCallableFactory(inherits)) {
        stack.push(inherits);
      }
    }
  }

  return false;
}

export { is };
