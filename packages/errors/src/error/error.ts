/**
 * @deessejs/errors - TypeScript Error Handling Library
 *
 * Error factory function and related implementations.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

import type { AnyErrorFactory, ErrorFactory, ErrorInstance, ParentFor } from './types.js';
import { captureStack } from './capture.js';
import { formatTemplate, hasTemplatePlaceholders } from './format.js';

// The compatibility witness symbol is imported as a runtime value
// (despite being declared as a `unique symbol`) so that the
// implementation can attach the witness property to the factory
// instance. The TypeScript declaration `export declare const
// acceptsFields: unique symbol;` produces a value-side binding
// when emitted; importing it via the bare specifier gives us
// access at runtime.
import { acceptsFields } from './types.js';

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
  const legacyGate = (process as { env?: Record<string, string | undefined> } | undefined)?.env
    ?.DEESSEJS_ERRORS_LEGACY_TEMPLATES;
  if (legacyGate === '1') return;
  if (warnedLegacyCallSites.has(callSite)) return;
  warnedLegacyCallSites.add(callSite);
  console.warn(
    `[@deessejs/errors] Legacy string-template form in \`error({...})\` is deprecated and will be removed in 2.0.0. ` +
      `Migrate to \`fields: standardSchema + message: (data) => string\`. ` +
      `See https://github.com/deessejs/errors/blob/main/docs/internal/engineering/rfcs/0001-standard-schema-fields.md. ` +
      `(Site: ${callSite})`
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
  factoryName: string
): { ok: true; value: unknown } | { ok: false; issues: ReadonlyArray<unknown> } {
  const handle = schema;
  const result = handle['~standard'].validate(input) as unknown;
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    // The schema returned a Promise, but error() is synchronous. We
    // refuse to wait (that's what "async schemas are not supported"
    // means). The Promise itself is still in flight; if we let it
    // settle, its rejection would surface as an unhandledRejection.
    // Attach a no-op catch so the rejection is contained. Consumers
    // who need async validation should call the schema directly.
    (result as Promise<unknown>).catch(() => undefined);
    throw new ArgsValidationError(
      factoryName,
      [{ message: 'Async validation not supported in error()' }],
      handle['~standard'].vendor ?? 'unknown'
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
    super(`Argument validation failed for "${source}": ${JSON.stringify(issues, null, 2)}`);
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
// The R7 design replaces the R6 conditional return type with a
// parameter-level constraint. The compatibility witness
// `[acceptsFields]?: (fields: Output) => void` declared on every
// `ErrorFactory<_, Output>` is a function-typed property, so
// under `strictFunctionTypes` its parameter is checked
// contravariantly. A leaf whose output is `LeafOutput` can use a
// parent only if `[LeafOutput] extends [Output]`, where `Output`
// is the parent's output.
//
// To exercise this, the `inherits?` parameter of each public
// overload is typed as `ParentFor<NoInfer<Output>>` (or
// `ParentFor<NoInfer<T>>` in the no-schema overload). The
// `NoInfer` keeps the leaf's output from being inferred from the
// parent — the leaf is still driven by the schema (or the
// explicit generic).
//
// The implementation signature uses `(config: any)` and returns
// `AnyErrorFactory`. This is an explicit internal boundary: the
// strict public overloads must be assignable to a permissive
// implementation signature, otherwise TS2394 fires at the
// overload declarations themselves. The `any` here is *not*
// type erasure of the constraint — the constraint runs at the
// public overloads' parameter types, not at the implementation.
// The implementation body operates on `Record<string, unknown>`
// and never reads field-level types.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function error<S extends StandardSchemaV1<any, any>>(config: {
  name: string;
  fields: S;
  message: (data: StandardSchemaV1.InferOutput<S>) => string;
  inherits?:
    | ParentFor<NoInfer<StandardSchemaV1.InferOutput<S>>>
    | readonly ParentFor<NoInfer<StandardSchemaV1.InferOutput<S>>>[];
}): ErrorFactory<StandardSchemaV1.InferInput<S>, StandardSchemaV1.InferOutput<S>>;

export function error<T extends Record<string, unknown> = Record<string, never>>(config: {
  name: string;
  fields?: undefined;
  message?: string | ((data: T) => string);
  inherits?: ParentFor<NoInfer<T>> | readonly ParentFor<NoInfer<T>>[];
}): ErrorFactory<T>;

// The R7 implementation signature is `(config: any)` because the
// public overloads (above) must be assignable to it (TS2394-safe).
// The `any` here is an explicit internal boundary: the constraint
// runs at the public overloads' parameter types, not at the
// implementation. Two `eslint-disable` lines below are necessary:
// one for the function declaration header and one for the
// `config: any` parameter.
export function error(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any
): AnyErrorFactory {
  const { name, fields, inherits, message } = config;

  // Phase 3: validation is gated on the presence of `fields` alone,
  // not on the conjunction with a function-form `message`. A schema
  // without a function message still validates; the resulting error
  // carries the validated fields and the error name as the message.
  const hasSchema = fields !== undefined;
  const hasFunctionMessage = typeof message === 'function';

  /**
   * Error factory function - creates error instances.
   */
  const ErrorFactoryInstance: ErrorFactory<Record<string, unknown>, Record<string, unknown>> = (
    input?: Partial<Record<string, unknown>>
  ): ErrorInstance<Record<string, unknown>> => {
    // Runtime safety net for the audit's P1 #1 finding: when a
    // factory carries a schema, the input is required at the call
    // site. The type signature accepts `input?` for backward
    // compatibility, but the runtime throws if the consumer calls
    // without arguments. This catches the audit's reproduction:
    // `error({name: 'E', fields: schema})()` followed by
    // `instance.fields.x` would crash with a generic TypeError
    // on `undefined`; this version makes the failure explicit
    // and localized.
    if (input === undefined && hasSchema) {
      throw new TypeError(
        `error("${name}") was called with no arguments. The factory ` +
          `carries a schema, so the input shape is required. Pass ` +
          `the validated input, e.g. ${name}({ ... }).`
      );
    }

    let fieldsData: Record<string, unknown> = {};
    let errorMessage = name;

    if (hasSchema) {
      // Unreachable at runtime when isStandard is true; the overloads
      // guarantee that, when `fields` is present, we go through here.
      if (fields === undefined) {
        throw new Error('Internal: schema branch entered without fields');
      }
      const result = runSchema(fields, input, name);
      if (!result.ok) {
        throw new ArgsValidationError(
          name,
          result.issues as ReadonlyArray<unknown>,
          fields['~standard'].vendor
        );
      }
      fieldsData = (result.value as Record<string, unknown>) ?? {};
      if (hasFunctionMessage && typeof message === 'function') {
        errorMessage = (message as (data: Record<string, unknown>) => string)(fieldsData);
      }
      // else: errorMessage stays as the factory name. The validated
      // fields are still on the instance; consumers that want a
      // rendered message can supply `message`.
    } else {
      // Legacy path — no schema. Accepts a string template, a plain
      // string, or a function-form message. Function-form is now
      // invoked (the audit's P2 finding: it was previously dropped on
      // the floor, leaving the factory's `name` as the rendered
      // message). The cast mirrors the schema branch's invocation at
      // line ~311.
      fieldsData = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
      if (typeof message === 'string' && hasTemplatePlaceholders(message)) {
        errorMessage = formatTemplate(message, fieldsData);
      } else if (typeof message === 'string') {
        errorMessage = message;
      } else if (hasFunctionMessage && typeof message === 'function') {
        errorMessage = (message as (data: Record<string, unknown>) => string)(fieldsData);
      }
      // The deprecation marker is gated by the warning once per call site.
      // Set `process.env.DEESSEJS_ERRORS_LEGACY_TEMPLATES = "1"` to silence.
      warnLegacy(formatCallSite());
    }

    // Capture stack trace.
    // Phase 11: pass the *factory* itself (the closure that the
    // consumer invokes) as the second argument so V8's
    // captureStackTrace excludes this factory's frames from the
    // captured trace. Passing the outer `error` function would
    // exclude all frames because `error` is not in the call chain
    // at runtime — the consumer calls the factory returned by
    // `error()`, not `error` itself. On non-V8 engines the
    // argument is ignored and the fallback path post-processes
    // the string.
    // Cast: ErrorFactoryInstance is an overloaded callable;
    // captureStackTrace accepts any callable.
    const stack = captureStack(
      errorMessage,
      ErrorFactoryInstance as (...args: unknown[]) => unknown
    );

    // Create error instance using native Error
    const instance = new Error(errorMessage) as ErrorInstance<Record<string, unknown>>;
    instance.name = name;
    instance.fields = fieldsData;
    instance.notes = [];
    instance.cause = null;
    instance.context = null;
    instance.inherits = inherits ?? undefined;
    instance.stack = stack;

    // Add .from() method for exception chaining. Phase 4b: only
    // `.cause` is mutated. The historical chain (the deprecated
    // `causes: Error[]` field) is reconstructed on demand by
    // `causes(error)` in src/causes/index.ts. This keeps the type
    // model honest: an instance has a single direct cause, not
    // a flat history.
    instance.from = (cause: Error): ErrorInstance<Record<string, unknown>> => {
      instance.cause = cause;
      return instance;
    };

    // Add .addNote() method for runtime context (PEP 678)
    instance.addNote = (note: string): ErrorInstance<Record<string, unknown>> => {
      instance.notes.push(note);
      return instance;
    };

    // Mark this instance as created by this factory (for is() checks).
    // Cast: ErrorFactoryInstance's call signature is conditional on
    // TInput (empty vs non-empty), so the simplest way to assign through
    // the symbol-keyed marker is via `unknown` and then a single callable
    // shape that captureStack accepts.
    (instance as unknown as Record<typeof FACTORY_SYMBOL, (...args: never[]) => unknown>)[
      FACTORY_SYMBOL
    ] = ErrorFactoryInstance as unknown as (...args: never[]) => unknown;

    return instance;
  };

  // Attach metadata to the factory function
  Object.defineProperty(ErrorFactoryInstance, 'name', {
    value: name,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  // R7 compatibility witness: a hidden function-typed property used
  // by the type checker to enforce inheritance compatibility
  // contravariantly. The function is never called at runtime — the
  // value is purely a marker that satisfies the `[acceptsFields]?`
  // shape declared on `ErrorFactory`. The parameter type is
  // `unknown` here because the implementation signature is
  // type-erased; the actual contravariance check happens at the
  // public overloads via `ParentFor<NoInfer<...>>`.
  Object.defineProperty(ErrorFactoryInstance, acceptsFields, {
    value: (_fields: unknown) => undefined,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  // Phase 4: copy the inherits list at definition so subsequent
  // mutations of the caller's array do not retroactively change
  // the classification. The copy is then frozen (Object.freeze
  // below) so consumers cannot mutate the factory's own copy
  // either. A reassignment of `factory.inherits = ...` is
  // rejected by the freeze.
  //
  // Round 2: the caller's array itself is also frozen in place.
  // The earlier snapshot-only freeze left a window where mutating
  // the caller's array between factory construction and the first
  // invocation could desynchronize the runtime validation block
  // (which read the closure) from `is()` (which read the frozen
  // snapshot). Freezing the input reference closes the window at
  // the source — any later mutation now throws in strict mode.
  if (inherits !== undefined) {
    if (Array.isArray(inherits)) {
      Object.freeze(inherits);
    }
    const inheritsSnapshot: AnyErrorFactory | readonly AnyErrorFactory[] = Array.isArray(inherits)
      ? ([...inherits] as readonly AnyErrorFactory[])
      : inherits;
    Object.freeze(inheritsSnapshot);
    (
      ErrorFactoryInstance as ErrorFactory<Record<string, unknown>, Record<string, unknown>>
    ).inherits = inheritsSnapshot;
  }

  if (fields !== undefined) {
    (
      ErrorFactoryInstance as ErrorFactory<Record<string, unknown>, Record<string, unknown>>
    ).schema = fields;
  }

  if (message !== undefined) {
    (
      ErrorFactoryInstance as ErrorFactory<Record<string, unknown>, Record<string, unknown>>
    ).rawMessage = message;
  }

  // Phase 4: freeze the factory's metadata so consumers cannot
  // mutate classification at runtime. The factory's `name`, `inherits`,
  // and `schema` are part of the type contract and must not change
  // after construction. The `rawMessage` and the function name are
  // already non-writable via defineProperty above.
  Object.freeze(ErrorFactoryInstance as unknown as object);

  return ErrorFactoryInstance;
}

// ============================================================================
// Exports for is() function
// ============================================================================

export { FACTORY_SYMBOL };
