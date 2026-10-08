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
 * class, **including all reachable ancestors**.
 *
 * For an ErrorFactory, the narrowed type is the intersection of the
 * factory's own output shape and the output shapes of every factory in
 * its `inherits` chain. This pins the inheritance contract: a factory
 * declared with `inherits: Parent` is structurally a `Parent` — its
 * instance must carry the fields the parent contract requires.
 *
 * The walk is bounded by a depth counter (a tuple of `unknown`s) so
 * cyclic inheritance graphs terminate. The default budget is 10
 * hops, which is well above the practical depth of any error
 * hierarchy we have observed.
 *
 * For a native Error constructor, the value is the instance type.
 *
 * @internal
 */
type ExtractFactoryFields<T> = T extends AnyErrorFactory
  ? ExtractOwnFactoryFields<T> extends Record<string, never>
    ? WalkAncestors<T, 10> extends Record<string, never>
      ? Record<string, never>
      : WalkAncestors<T, 10>
    : WalkAncestors<T, 10> extends Record<string, never>
      ? ExtractOwnFactoryFields<T>
      : ExtractOwnFactoryFields<T> & WalkAncestors<T, 10>
  : T extends new (...args: never[]) => Error
    ? T
    : never;

/**
 * Recursive helper that walks `T['inherits']` and intersects each
 * ancestor's own output fields. Multiple parents are intersected
 * (a child must satisfy all of them). Cycles are broken by the depth
 * counter — when the budget is exhausted, the recursion stops and
 * the type falls back to the empty shape.
 *
 * @internal
 */
type WalkAncestors<T, Depth extends number> = Depth extends 0
  ? Record<string, never>
  : T extends { inherits?: infer Inh }
    ? Inh extends AnyErrorFactory
      ? ExtractOwnFactoryFields<Inh> & WalkAncestors<Inh, Decrement<Depth>>
      : Inh extends readonly AnyErrorFactory[]
        ? IntersectArray<Inh, Depth>
        : Record<string, never>
    : Record<string, never>;

/**
 * Intersects every element of an `inherits` array with the recursive
 * walk for each. The empty-array case contributes the empty shape so
 * the intersection collapses to the walk product.
 *
 * @internal
 */
type IntersectArray<
  T extends readonly AnyErrorFactory[],
  Depth extends number,
> = T extends readonly [infer Head, ...infer Tail]
  ? Head extends AnyErrorFactory
    ? ExtractOwnFactoryFields<Head> &
        WalkAncestors<Head, Decrement<Depth>> &
        IntersectArray<Tail extends readonly AnyErrorFactory[] ? Tail : [], Depth>
    : never
  : Record<string, never>;

/**
 * Decrement a non-negative depth counter for the recursion bound.
 * Implemented via tuple-length subtraction so it works for any
 * non-negative literal `Depth`.
 *
 * @internal
 */
type Decrement<D extends number> = TupleLengthMinusOne<BuildTuple<D>>;

/**
 * Build a tuple of `D` `unknown` entries. Used as a numeric encoding
 * for the depth counter.
 *
 * @internal
 */
type BuildTuple<D extends number, Acc extends readonly unknown[] = []> = Acc['length'] extends D
  ? Acc
  : BuildTuple<D, [...Acc, unknown]>;

/**
 * Length of a tuple minus one. Goes through `unknown[]` cast to keep
 * the type-level arithmetic portable across TypeScript versions.
 *
 * @internal
 */
type TupleLengthMinusOne<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Rest]
  ? Rest['length']
  : 0;

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
  // Handle null/undefined
  if (error == null) {
    return false;
  }

  // Handle native errors - check prototype chain ends in Error
  if (typeof ErrorType === 'function' && 'prototype' in ErrorType) {
    try {
      if (error instanceof ErrorType) {
        return true;
      }
    } catch {
      // instanceof can fail for cross-realm errors
    }
  }

  // Handle our ErrorFactory instances using Symbol-based reference
  if (typeof error === 'object' && error !== null) {
    const marker = error as Record<typeof FACTORY_SYMBOL, unknown>;
    const factory = marker[FACTORY_SYMBOL];

    if (factory !== undefined) {
      // DFS walk of inheritance tree using stack (prevents GC pressure)
      const stack: AnyErrorFactory[] = [factory as AnyErrorFactory];
      const seen = new Set<AnyErrorFactory>();

      while (stack.length > 0) {
        const current = stack.pop()!;

        // Prevent infinite loops in cyclic inheritance
        if (seen.has(current)) {
          continue;
        }
        seen.add(current);

        // Direct match
        if (current === ErrorType) {
          return true;
        }

        // Add parents to stack
        const inherits = (current as AnyErrorFactory).inherits;
        if (inherits !== undefined) {
          if (Array.isArray(inherits)) {
            for (let i = 0; i < inherits.length; i++) {
              stack.push(inherits[i]);
            }
          } else {
            stack.push(inherits);
          }
        }
      }
    }
  }

  return false;
}

export { is };
