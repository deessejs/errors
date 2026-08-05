/**
 * @deessejs/errors - TypeScript Error Handling Library
 *
 * Error factory function and related implementations.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

import type {
  ErrorFactory,
  ErrorInstance,
} from './types.js';
import { captureStack } from './capture.js';
import { formatTemplate, hasTemplatePlaceholders } from './format.js';

// ============================================================================
// Node ambient types
// ============================================================================

// The package ships pure ESM and intentionally does not depend on `@types/node`
// at runtime. For this single use site we declare the narrow subset we need.
declare const process:
  | {
      env: Record<string, string | undefined>;
    }
  | undefined;

// ============================================================================
// Symbols for identity
// ============================================================================

/**
 * Symbol used to identify factory-created errors.
 * Stored on the error instance to enable reliable instanceof checks.
 *
 * @internal
 */
const FACTORY_SYMBOL = Symbol.for('@deessejs/errors/factory');

// ============================================================================
// Deprecation tracking
// ============================================================================

/**
 * Tracks call sites that still use the legacy message-template form. The
 * runtime emits a single warning per site so consumers can find and migrate
 * their `error({ name, message: 'string' })` calls.
 *
 * Set `process.env.DEESSEJS_ERRORS_LEGACY_TEMPLATES = '1'` to silence.
 *
 * @internal
 */
const warnedLegacyCallSites = new Set<string>();
function warnLegacy(callSite: string): void {
  const legacyGate = (process as { env?: Record<string, string | undefined> } | undefined)?.env?.DEESSEJS_ERRORS_LEGACY_TEMPLATES;
  if (legacyGate === '1') return;
  if (warnedLegacyCallSites.has(callSite)) return;
  warnedLegacyCallSites.add(callSite);
  console.warn(
    `[@deessejs/errors] Legacy string-template form in \`error({...})\` is deprecated and will be removed in 2.0.0. ` +
      `Migrate to \`fields: standardSchema + message: (data) => string\`. ` +
      `See https://github.com/deessejs/errors/blob/main/docs/internal/engineering/rfcs/0001-standard-schema-fields.md. ` +
      `(Site: ${callSite})`,
  );
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Run a `StandardSchemaV1` validator and return either the validated output
 * or the failure result. Mirrors the shape documented in `@standard-schema/spec`.
 *
 * The output is typed as `unknown` here; the caller (which knows the
 * concrete `T`) is responsible for the cast.
 *
 * @internal
 */
function runSchema(
  schema: StandardSchemaV1,
  input: unknown,
):
  | { ok: true; value: unknown }
  | { ok: false; issues: ReadonlyArray<unknown> } {
  const handle = schema;
  const result = handle['~standard'].validate(input) as unknown;
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    throw new ArgsValidationError(
      `Async schemas are not supported in \`error({...})\`. ` +
        `Use \`schema\` directly (await) before instantiating.`,
      [{ message: 'Async validation not supported in error()' }],
      handle['~standard'].vendor ?? 'unknown',
    );
  }
  const r = result as { value?: unknown; issues?: unknown };
  if (r && Array.isArray(r.issues)) {
    return { ok: false, issues: r.issues as ReadonlyArray<unknown> };
  }
  return { ok: true, value: r.value as unknown };
}

// ============================================================================
// ArgsValidationError
// ============================================================================

/**
 * Thrown when args supplied to a Standard Schema-backed factory fail
 * validation. Wraps the validator's issues verbatim so consumers can
 * introspect or serialize them.
 *
 * Catching this error lets the consumer decide whether to surface a
 * user-facing message, log to a structured sink, or convert to a different
 * format. The validator's raw output is exposed via `.issues` and `.vendor`.
 *
 * @example
 * ```ts
 * import { error } from '@deessejs/errors';
 * import { z } from 'zod';
 *
 * const ValidationError = error({
 *   name: 'ValidationError',
 *   fields: z.object({ field: z.string() }),
 *   message: (data) => `Field "${data.field}" invalid`,
 * });
 *
 * try {
 *   ValidationError({ field: 1 as unknown as string });
 * } catch (e) {
 *   if (e instanceof Error && e.name === 'ArgsValidationError') {
 *     console.error(e.message); // "Argument validation failed for ValidationError: ..."
 *     console.error(e.issues); // raw issues
 *   }
 * }
 * ```
 */
export class ArgsValidationError extends Error {
  /** The factory's `name` field, surfaced for logs and UIs. */
  public readonly source: string;
  /** The vendor of the Standard Schema that produced the failure. */
  public readonly vendor: string;
  /**
   * The validator's raw failure result. Typed loosely because each validator
   * has its own issue shape; consult your validator's docs for details.
   */
  public readonly issues: ReadonlyArray<unknown>;
  /** Internal constructor, but exported as a class so consumers can `instanceof`. */
  public constructor(source: string, issues: ReadonlyArray<unknown>, vendor: string) {
    super(
      `Argument validation failed for "${source}": ${JSON.stringify(issues, null, 2)}`,
    );
    this.name = 'ArgsValidationError';
    this.source = source;
    this.issues = issues;
    this.vendor = vendor;
    Object.setPrototypeOf(this, ArgsValidationError.prototype);
  }
}

// ============================================================================
// Error Factory
// ============================================================================

/**
 * Format the call-site string used in deprecation warnings. Inlined here
 * (rather than importing `callsites`) to keep the bundle small.
 *
 * @internal
 */
function formatCallSite(): string {
  const err = new Error();
  const stack = err.stack ?? '';
  // Walk past the top frames (this function and its callers in error.ts) and
  // capture the first userland frame. The format is V8-style
  // "    at file:line:col".
  const match = stack.match(/^\s+at\s+(.+?):\d+:\d+\s*$/m);
  if (match && match[1]) return match[1];
  return 'unknown';
}

/**
 * Creates an error factory function for defining typed, structured errors.
 *
 * Two configurations are supported:
 *
 * **Standard path** (RFC 0001): pass `fields: standardSchema` and a
 * function-form `message`. Args are validated at instantiation.
 *
 * **Legacy path** (deprecated in 1.4.0, removed in 2.0.0): pass a string
 * `message`. No validation runs.
 *
 * @param config - Error configuration
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
 *   message: (data) => `Field "${data.field}" is invalid: ${data.reason}`,
 * });
 *
 * const err = ValidationError({ field: 'email', reason: 'invalid format' });
 * ```
 *
 * @example
 * ```typescript
 * // Legacy string-template form (deprecated, removed in 2.0.0)
 * const LegacyError = error({
 *   name: 'LegacyError',
 *   message: 'Hello {name}',
 * });
 * ```
 */
export function error<T extends Record<string, unknown> = Record<string, unknown>>(config: {
  name: string;
  fields?: StandardSchemaV1;
  message?: string | ((data: T) => string);
  inherits?: ErrorFactory | ErrorFactory[];
}): ErrorFactory<T> {
  const { name, fields, inherits, message } = config;

  // Decide API mode up front and surface call sites early so the deprecation
  // warning points at the user's call.
  const isStandard = fields !== undefined && typeof message === 'function';

  /**
   * Error factory function - creates error instances.
   */
  const ErrorFactoryInstance: ErrorFactory<T> = (input?: Partial<T>): ErrorInstance<T> => {
    let fieldsData: Record<string, unknown> = {};
    let errorMessage = name;

    if (isStandard) {
      if (fields === undefined || typeof message !== 'function') {
        // Unreachable at runtime; the overloads guarantee both are present.
        throw new Error('Internal: standard mode without fields or message function');
      }
      const result = runSchema(fields, input);
      if (!result.ok) {
        throw new ArgsValidationError(
          name,
          result.issues as ReadonlyArray<unknown>,
          fields['~standard'].vendor,
        );
      }
      fieldsData = (result.value as Record<string, unknown>) ?? {};
      errorMessage = (message as (data: T) => string)(fieldsData as unknown as T);
    } else {
      // Legacy path — coerce input and interpolate the template if any.
      fieldsData = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
      if (typeof message === 'string' && hasTemplatePlaceholders(message)) {
        errorMessage = formatTemplate(message, fieldsData);
      } else if (typeof message === 'string') {
        errorMessage = message;
      }
      // The deprecation marker is gated by the warning once per call site.
      // Set `process.env.DEESSEJS_ERRORS_LEGACY_TEMPLATES = "1"` to silence.
      warnLegacy(formatCallSite());
    }

    // Capture stack trace
    const stack = captureStack(errorMessage);

    // Create error instance using native Error
    const instance = new Error(errorMessage) as ErrorInstance<T>;
    instance.name = name;
    instance.fields = fieldsData as unknown as T;
    instance.notes = [];
    instance.cause = null;
    instance.causes = [];
    instance.context = null;
    instance.inherits = inherits ?? undefined;
    instance.stack = stack;

    // Add .from() method for exception chaining
    instance.from = (cause: Error): ErrorInstance<T> => {
      // Build new causes array: [new cause] + [cause's causes] + [existing causes of instance]
      // This maintains chronological order: newest first
      const causeCauses = 'causes' in cause && Array.isArray(cause.causes) ? cause.causes : [];
      instance.causes = [cause, ...causeCauses, ...instance.causes];
      instance.cause = cause;
      return instance;
    };

    // Add .addNote() method for runtime context (PEP 678)
    instance.addNote = (note: string): ErrorInstance<T> => {
      instance.notes.push(note);
      return instance;
    };

    // Mark this instance as created by this factory (for is() checks)
    (instance as unknown as Record<typeof FACTORY_SYMBOL, () => unknown>)[FACTORY_SYMBOL] =
      ErrorFactoryInstance;

    return instance;
  };

  // Attach metadata to the factory function
  Object.defineProperty(ErrorFactoryInstance, 'name', {
    value: name,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  if (inherits !== undefined) {
    (ErrorFactoryInstance as ErrorFactory<T>).inherits = inherits;
  }

  if (fields !== undefined) {
    (ErrorFactoryInstance as ErrorFactory<T>).schema = fields;
  }

  if (message !== undefined) {
    (ErrorFactoryInstance as ErrorFactory<T>).rawMessage = message;
  }

  return ErrorFactoryInstance;
}

// ============================================================================
// Exports for is() function
// ============================================================================

export { FACTORY_SYMBOL };
