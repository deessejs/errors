/**
 * Error type checking utilities.
 */

import type { AnyErrorFactory, ErrorInstance } from '../error/types.js';
import { FACTORY_SYMBOL } from '../error/error.js';

/**
 * Type to extract the fields from an ErrorFactory or native Error
 * class.
 *
 * For an ErrorFactory, the fields type is the **output** shape —
 * the second type parameter on `ErrorFactory<TInput, TOutput>`.
 * We extract it by introspecting the call signature: the factory
 * is `(input?: TInput) => ErrorInstance<TOutput>`, so TOutput
 * is the type of the awaited return value.
 *
 * For a native Error constructor, the value is the instance type.
 * See the overloads below for the discriminated return.
 *
 * @internal
 */
type ExtractFactoryFields<T> = T extends AnyErrorFactory
  ? T extends (...args: never[]) => ErrorInstance<infer F>
    ? F
    : never
  : T extends new (...args: never[]) => Error
    ? T
    : never;

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
function is<T extends AnyErrorFactory>(error: unknown, ErrorType: T): error is ErrorInstance<ExtractFactoryFields<T>>;
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
