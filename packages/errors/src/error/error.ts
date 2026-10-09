/**
 * @deessejs/errors - TypeScript Error Handling Library
 *
 * Error factory function and related implementations.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

import type {
  AnyErrorFactory,
  ErrorFactory,
  ErrorInstance,
  ObjectOutputSchema,
  ParentFor,
  SchemaErrorFactory,
} from './types.js';
import { acceptsFields } from './types.js';
import { captureStack } from './capture.js';
import { formatTemplate, hasTemplatePlaceholders } from './format.js';

// ============================================================================
// Node ambient types
// ============================================================================

// The package ships pure ESM and intentionally does not depend on `@types/node`
// at runtime. For this single use site we declare the narrow subset we need.
// `process` is read only inside `warnLegacy`, which guards the read with
// `typeof process !== 'undefined'` to survive environments where the
// identifier is not present (e.g. browser bundles without a polyfill).
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
 * Stored on the error instance to enable reliable recognition by
 * `is()`. Uses `Symbol.for` so the same key resolves across
 * realms/bundles.
 *
 * @internal
 */
const FACTORY_SYMBOL = Symbol.for('@deessejs/errors/factory');

// ============================================================================
// Deprecation tracking
// ============================================================================

/**
 * Tracks call sites that still use the legacy string-template form
 * (`error({ name, message: 'Hello {name}' })`). The runtime emits a
 * single warning per site so consumers can find and migrate.
 *
 * Set `process.env.DEESSEJS_ERRORS_LEGACY_TEMPLATES = '1'` to silence.
 *
 * The warning is now scoped to the *template* form (string with
 * `{field}` placeholders) only. A plain string `message` (no
 * placeholders) and a function-form `message` do not warn.
 *
 * @internal
 */
const warnedLegacyCallSites = new Set<string>();
function warnLegacy(callSite: string): void {
  if (typeof process === 'undefined') return;
  const legacyGate = process.env?.DEESSEJS_ERRORS_LEGACY_TEMPLATES;
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
 * Run a `StandardSchemaV1` validator and return either the validated
 * output or the failure result. Reuses `StandardSchemaV1.Result` and
 * `StandardSchemaV1.Issue` from the spec rather than re-typing them.
 *
 * @internal
 */
function runSchema(
  schema: StandardSchemaV1,
  input: unknown,
  factoryName: string
): { ok: true; value: unknown } | { ok: false; issues: ReadonlyArray<StandardSchemaV1.Issue> } {
  const result = schema['~standard'].validate(input);
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    // The schema returned a Promise, but error() is synchronous. We
    // refuse to wait. The Promise itself is still in flight; attach a
    // no-op catch so its rejection is contained.
    (result as Promise<unknown>).catch(() => undefined);
    throw new ArgsValidationError(
      factoryName,
      [{ message: 'Async validation not supported in error()' }],
      schema['~standard'].vendor ?? 'unknown'
    );
  }
  const r = result as { value?: unknown; issues?: ReadonlyArray<StandardSchemaV1.Issue> };
  if (r && Array.isArray(r.issues)) {
    return { ok: false, issues: r.issues };
  }
  return { ok: true, value: r.value };
}

/**
 * Runtime guard: a schema's validated output must be a non-null,
 * non-array object. Schemas whose transformation returns a primitive,
 * null, or array violate the public contract
 * (`instance.fields: Record<string, unknown>`); the consumer's
 * downstream code would crash.
 *
 * The type-level gate `IsObjectOutput<O>` rejects the same case at
 * compile time. This guard is the runtime equivalent: it catches
 * schemas whose output type passed the type check (e.g. through
 * `any`) but whose value is malformed.
 */
function isObjectFields(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return true;
}

// ============================================================================
// ArgsValidationError
// ============================================================================

/**
 * Render a list of `StandardSchemaV1.Issue`s as a human-readable
 * string. Reads each issue's `message` field (the standard guarantees
 * one) and joins them with newlines. The `.path` is included when
 * present so the consumer can locate the failing input.
 *
 * The function is defensive: a malformed issue (no `message`,
 * non-string `message`) does not throw. The audit found that the
 * previous `JSON.stringify(issues, null, 2)` would itself throw on a
 * circular issue, hiding the `ArgsValidationError` behind a
 * `TypeError`.
 */
const renderIssues = (issues: ReadonlyArray<StandardSchemaV1.Issue>): string => {
  const parts: string[] = [];
  for (const issue of issues) {
    if (issue === null || typeof issue !== 'object') {
      parts.push(String(issue));
      continue;
    }
    const message = typeof issue.message === 'string' ? issue.message : '';
    const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
    parts.push(path ? `${path}: ${message}` : message);
  }
  return parts.join('\n');
};

/**
 * Thrown when args supplied to a Standard Schema-backed factory fail
 * validation. Wraps the validator's issues verbatim so consumers can
 * introspect or serialize them.
 *
 * Catching this error lets the consumer decide whether to surface a
 * user-facing message, log to a structured sink, or convert to a
 * different format. The validator's raw output is exposed via
 * `.issues` and `.vendor`.
 *
 * The `message` is built from the issues' `.message` fields rather
 * than `JSON.stringify` so a circular issue (or any issue whose
 * structure is hostile to JSON) does not turn the validation error
 * into a `TypeError` from the formatter.
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
 *     console.error(e.message);
 *     console.error(e.issues);
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
   * The validator's raw failure result. Typed as
   * `ReadonlyArray<StandardSchemaV1.Issue>` so consumers can read
   * `.message` and `.path` without re-casting.
   */
  public readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;
  public constructor(
    source: string,
    issues: ReadonlyArray<StandardSchemaV1.Issue>,
    vendor: string
  ) {
    super(`Argument validation failed for "${source}": ${renderIssues(issues)}`);
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
 * Format the call-site string used in deprecation warnings.
 *
 * @internal
 */
function formatCallSite(): string {
  const err = new Error();
  const stack = err.stack ?? '';
  const match = stack.match(/^\s+at\s+(.+?):\d+:\d+\s*$/m);
  if (match && match[1]) return match[1];
  return 'unknown';
}

/**
 * The normalized view of the public config that the implementation
 * body operates on. The `(config: any)` signature at the
 * implementation boundary exists so the strict public overloads are
 * TS2394-assignable, but the body does not read field-level types
 * from it. Destructuring into a `NormalizedConfig` confines the
 * `any` to a single structural read: the four fields below are
 * typed independently, so the cast does not propagate into the rest
 * of the body.
 *
 * @internal
 */
interface NormalizedConfig {
  name: string;
  fields: StandardSchemaV1 | undefined;
  inherits: AnyErrorFactory | readonly AnyErrorFactory[] | undefined;
  message: string | ((data: unknown) => string) | undefined;
}

const normalize = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any
): NormalizedConfig => ({
  name: typeof raw?.name === 'string' ? raw.name : '',
  fields: raw?.fields,
  inherits: raw?.inherits,
  message: raw?.message,
});

/**
 * Fields required to assemble a complete `ErrorInstance`. Lifted
 * from the body of `error()` so the helper can construct the
 * instance once, with all fields populated before any consumer
 * reads it. The previous version assigned `.fields`, `.notes`,
 * `.cause`, etc. on a `new Error(...)` cast, leaving a window
 * where the type system believed the instance was complete but
 * some fields were still undefined.
 *
 * @internal
 */
interface InstanceSeed {
  name: string;
  message: string;
  fields: Record<string, unknown>;
  inherits: AnyErrorFactory | readonly AnyErrorFactory[] | undefined;
  stack: string;
}

/**
 * Builds a complete `ErrorInstance` from a seed + the factory
 * reference. The factory is attached via a non-writable property
 * descriptor on the FACTORY_SYMBOL key, so the marker cannot be
 * reassigned by a hostile object. Returns a value typed as the
 * full `ErrorInstance<Record<string, unknown>>` extension (the
 * body is type-erased; the precise shape is conveyed through
 * the public overloads' return type).
 */
const buildErrorInstance = (
  factory: AnyErrorFactory,
  seed: InstanceSeed
): ErrorInstance<Record<string, unknown>> => {
  const instance = new Error(seed.message) as ErrorInstance<Record<string, unknown>>;
  // The native Error carries its own `.message`; we don't reassign it.
  Object.defineProperty(instance, 'name', {
    value: seed.name,
    writable: false,
    enumerable: false,
    configurable: false,
  });
  instance.fields = seed.fields;
  instance.notes = [];
  instance.cause = null;
  instance.context = null;
  instance.inherits = seed.inherits;
  instance.stack = seed.stack;
  instance.from = (cause: Error): ErrorInstance<Record<string, unknown>> => {
    instance.cause = cause;
    return instance;
  };
  instance.addNote = (note: string): ErrorInstance<Record<string, unknown>> => {
    instance.notes.push(note);
    return instance;
  };
  // Non-writable marker: a consumer or hostile object cannot
  // reassign this slot to make the instance pass `is()` checks
  // for a different factory.
  Object.defineProperty(instance, FACTORY_SYMBOL, {
    value: factory,
    writable: false,
    enumerable: false,
    configurable: false,
  });
  return instance;
};

/**
 * Creates an error factory function for defining typed, structured
 * errors. Two configurations are supported:
 *
 * **Standard path** (RFC 0001): pass `fields: standardSchema` and a
 * function-form `message`. Args are validated at instantiation. The
 * schema's `InferOutput` is constrained to a non-null, non-array
 * object at the type level via `ObjectOutputSchema`, and a runtime
 * guard rejects malformed outputs.
 *
 * **Legacy path** (deprecated in 1.4.0, removed in 2.0.0): pass a
 * string `message`. No validation runs.
 *
 * The schema overload returns `SchemaErrorFactory<I, O>`, whose
 * call signature is *not* conditional: a factory with a schema
 * always requires its input, even for `z.object({})`. The no-schema
 * overload returns `ErrorFactory<T>`, the legacy form, which keeps
 * the optional-input form for the no-input legacy case.
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
// R7 + R8: the schema overload constrains the schema's output to a
// non-null, non-array object via `ObjectOutputSchema`. The `inherits`
// parameter is constrained via `ParentFor<NoInfer<...>>` (a
// contravariance witness — requires `strictFunctionTypes`).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function error<S extends ObjectOutputSchema<StandardSchemaV1<any, any>>>(config: {
  name: string;
  fields: S;
  message: (data: StandardSchemaV1.InferOutput<S>) => string;
  inherits?:
    | ParentFor<NoInfer<StandardSchemaV1.InferOutput<S>>>
    | readonly ParentFor<NoInfer<StandardSchemaV1.InferOutput<S>>>[];
}): SchemaErrorFactory<StandardSchemaV1.InferInput<S>, StandardSchemaV1.InferOutput<S>>;

export function error<T extends Record<string, unknown> = Record<string, never>>(config: {
  name: string;
  fields?: undefined;
  message?: string | ((data: T) => string);
  inherits?: ParentFor<NoInfer<T>> | readonly ParentFor<NoInfer<T>>[];
}): ErrorFactory<T>;

// The implementation signature is `(config: any)` because the public
// overloads (above) must be assignable to it (TS2394-safe). The
// `any` is an explicit internal boundary: the constraint runs at
// the public overloads' parameter types, not at the implementation.
// The body destructures through `normalize()` so the `any` is read
// once and confined; the rest of the body operates on a typed
// `NormalizedConfig`.
export function error(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any
): AnyErrorFactory {
  const { name, fields, inherits, message } = normalize(config);

  const hasSchema = fields !== undefined;
  const hasFunctionMessage = typeof message === 'function';

  const ErrorFactoryInstance: ErrorFactory<Record<string, unknown>, Record<string, unknown>> = (
    input?: Partial<Record<string, unknown>>
  ): ErrorInstance<Record<string, unknown>> => {
    // Runtime safety net: when a factory carries a schema, the
    // input is required at the call site. The schema path now also
    // has a non-optional call signature (see `SchemaErrorFactory`),
    // so this is the safety net for JS callers and any
    // `error({fields: schema})()` call that bypassed the type
    // system.
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
      if (fields === undefined) {
        throw new Error('Internal: schema branch entered without fields');
      }
      const result = runSchema(fields, input, name);
      if (!result.ok) {
        throw new ArgsValidationError(name, result.issues, fields['~standard'].vendor);
      }
      if (!isObjectFields(result.value)) {
        // Runtime mirror of the type-level `IsObjectOutput` gate.
        // A schema whose validated output is null, a primitive, or
        // an array violates the `instance.fields: Record<string,
        // unknown>` contract. The previous version silently coerced
        // to `{}` via `?? {}`, hiding the bug from the consumer.
        throw new ArgsValidationError(
          name,
          [
            {
              message:
                'Schema output must be a non-null object. The transformation returned ' +
                (result.value === null
                  ? 'null'
                  : Array.isArray(result.value)
                    ? 'an array'
                    : `a ${typeof result.value} value`) +
                '.',
            },
          ],
          fields['~standard'].vendor
        );
      }
      fieldsData = result.value;
      if (hasFunctionMessage && typeof message === 'function') {
        errorMessage = (message as (data: Record<string, unknown>) => string)(fieldsData);
      }
    } else {
      // Legacy path — no schema. Accepts a string template, a plain
      // string, or a function-form message.
      if (input !== undefined && typeof input === 'object' && input !== null) {
        fieldsData = input as Record<string, unknown>;
      }
      if (typeof message === 'string' && hasTemplatePlaceholders(message)) {
        // The legacy deprecation is for the *template* form: a
        // string `message` with `{field}` placeholders. A plain
        // string (no placeholders) and a function-form message do
        // not warn.
        warnLegacy(formatCallSite());
        errorMessage = formatTemplate(message, fieldsData);
      } else if (typeof message === 'string') {
        errorMessage = message;
      } else if (hasFunctionMessage && typeof message === 'function') {
        errorMessage = (message as (data: Record<string, unknown>) => string)(fieldsData);
      }
    }

    const stack = captureStack(errorMessage, ErrorFactoryInstance);

    return buildErrorInstance(ErrorFactoryInstance, {
      name,
      message: errorMessage,
      fields: fieldsData,
      inherits,
      stack,
    });
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
  // contravariantly. The function is never called at runtime.
  Object.defineProperty(ErrorFactoryInstance, acceptsFields, {
    value: (_fields: unknown) => undefined,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  // R8: keep a single frozen snapshot of the parents list. The
  // previous version also froze the caller's array, which surprised
  // consumers who passed a shared list. With the cascade machinery
  // removed, a single frozen snapshot is sufficient: the runtime
  // walk in `is()` reads only the factory's own copy, and
  // reassignment of `factory.inherits` is rejected by the
  // `Object.freeze` below.
  if (inherits !== undefined) {
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

  // Freeze the factory's metadata. The factory's `name`, `inherits`,
  // and `schema` are part of the type contract and must not change
  // after construction. The `rawMessage` and the function name are
  // already non-writable via defineProperty above.
  Object.freeze(ErrorFactoryInstance);

  return ErrorFactoryInstance;
}

// ============================================================================
// Exports for is() function
// ============================================================================

export { FACTORY_SYMBOL };
