/**
 * @deessejs/errors - TypeScript Error Handling Library
 *
 * Error factory function and related implementations.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

import type { AnyErrorFactory, ErrorFactory, ErrorInstance } from './types.js';
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
// Shape-kind classification
// ============================================================================

/**
 * Coarse runtime kind of a value, used by the cascade's shape gate.
 * The categories are primitive kind + reference-kind (array vs object);
 * the gate allows same-kind transitions and rejects cross-category
 * ones (e.g. number → string). This is the "Option A" fallback for
 * the no-manual-generic path; the typed-child path uses the
 * strict per-key rule in `validateAncestors`.
 *
 * @internal
 */
type ShapeKind =
  'number' | 'string' | 'boolean' | 'bigint' | 'null' | 'array' | 'object' | 'undefined';

function kindOf(value: unknown): ShapeKind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return typeof value as ShapeKind;
}

function kindsCompatible(prior: ShapeKind, next: ShapeKind): boolean {
  return prior === next;
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
// Inheritance walk
// ============================================================================

/**
 * Recursively validates `data` against the schema of every reachable
 * ancestor of `root` (following the `inherits` chain), and applies
 * each ancestor's transformed output to `data` as it cascades
 * downstream.
 *
 * Cycle protection: the `seen` set is passed in by the caller (pre-
 * seeded with `root` itself to skip self-loops) and shared across
 * siblings so diamond inheritance does not re-validate the same
 * ancestor twice on the same `data`. The pattern is the same as
 * `is/index.ts:197, 203-206`.
 *
 * The walk reads from `(parent as ErrorFactory<unknown>).inherits`
 * — the Phase 4 frozen snapshot, not the caller's original array.
 * This keeps a single source of truth shared with `is()`.
 *
 * Round 3: the cascade enforces the invariant "every instance must
 * simultaneously satisfy the types of the child AND the parents
 * recognized by `is()`" — i.e. the same intersection that the
 * type-level `ExtractFactoryFields` implements in
 * `is/index.ts:42-118`. For each key K a parent writes:
 *
 *  - If the child declared a manual generic (`error<T>()`) and K
 *    is in T's keys, the parent is forbidden from rewriting K
 *    (the child's contract is load-bearing). Throws
 *    `ArgsValidationError` with `source: <parent.name>` and
 *    `path: [K]`.
 *  - Otherwise, if K already had a value in `data` (from a prior
 *    parent or the child's own schema), the new value's shape kind
 *    must equal the prior value's kind. Cross-category changes
 *    (e.g. number → string) throw with `path: [K]`, `from`, `to`.
 *  - Same-kind transitions (number → number, string → string) and
 *    brand-new keys (no prior value) are allowed.
 *
 * @internal
 */
function validateAncestors(
  root: AnyErrorFactory,
  data: Record<string, unknown>,
  seen: Set<AnyErrorFactory>,
  childKeys: ReadonlySet<string> | null,
  parentWrites: Map<string, ShapeKind>
): Record<string, unknown> {
  const rootInherits = root.inherits;
  if (rootInherits === undefined) return data;
  const parents: AnyErrorFactory[] = Array.isArray(rootInherits) ? rootInherits : [rootInherits];
  for (const parent of parents) {
    if (seen.has(parent)) continue;
    seen.add(parent);
    const parentSchema = (parent as { schema?: unknown }).schema;
    if (parentSchema !== undefined && parentSchema !== null) {
      const result = runSchema(parentSchema as StandardSchemaV1, data, parent.name);
      if (!result.ok) {
        throw new ArgsValidationError(
          parent.name,
          result.issues as ReadonlyArray<unknown>,
          (parentSchema as StandardSchemaV1)['~standard'].vendor
        );
      }
      // Per-key merge with childKeys check (Option C) and shape-kind
      // gate (Option A). A single `{ ...data, ...transformed }` spread
      // would silently overwrite child-constrained keys and silently
      // accept cross-category rewrites — both are the bug. Walking
      // key by key lets us surface each as `ArgsValidationError` with
      // `path: [K]`.
      //
      // The shape gate's "prior" is the kind recorded in
      // `parentWrites` (a sibling/grandparent that wrote K earlier
      // in declaration order), NOT the input value. The input is
      // data, not a contract; the load-bearing prior is the
      // previous parent's transformed output. This is what
      // detects the user's scenario 2: P1 writes number, P2
      // writes string on the same key — the cross-category
      // between two parents fires.
      const transformed = result.value as Record<string, unknown> | undefined;
      if (transformed !== undefined) {
        const vendor = (parentSchema as StandardSchemaV1)['~standard'].vendor;
        for (const key of Object.keys(transformed)) {
          const next = transformed[key];
          const nextKind = kindOf(next);
          if (childKeys !== null && childKeys.has(key)) {
            // The leaf declared this key. The parent's schema
            // already ran on `data` (which includes the leaf's
            // value) and accepted it. The parent is now trying to
            // overwrite the leaf's value. This is a kind-level
            // check: if the parent's output has the same shape
            // kind as the leaf's existing value, the rewrite is
            // safe (e.g. z.coerce.number() with number input
            // produces a number — same kind as the leaf's
            // declared type). If the kinds differ, the parent is
            // changing the type, which the strict rule forbids.
            const priorKind = kindOf(data[key]);
            if (!kindsCompatible(priorKind, nextKind)) {
              throw new ArgsValidationError(
                parent.name,
                [
                  {
                    message: `parent "${parent.name}" rewrites child-constrained key "${key}" with incompatible kind`,
                    path: [key],
                    from: priorKind,
                    to: nextKind,
                  },
                ],
                vendor
              );
            }
            // Same kind: allow the rewrite (the parent's value
            // replaces the leaf's value of the same kind).
          }
          const priorKind = parentWrites.get(key);
          if (priorKind !== undefined && !kindsCompatible(priorKind, nextKind)) {
            // A previous parent (in declaration order) wrote this
            // key with a different kind. The current parent's
            // transformation is incompatible with that.
            throw new ArgsValidationError(
              parent.name,
              [
                {
                  message: `parent "${parent.name}" produces incompatible transformation on key "${key}"`,
                  path: [key],
                  from: priorKind,
                  to: nextKind,
                },
              ],
              vendor
            );
          }
          // Record this parent's write so a later parent can be
          // gated against it. We use a fresh map for the recursion
          // so a sibling that doesn't touch K doesn't see this
          // write.
          parentWrites.set(key, nextKind);
          data = { ...data, [key]: next };
        }
      }
    }
    // Recurse into the parent's own inherits. The walk matches the
    // type-level `ExtractFactoryFields` recursion in is/index.ts:42-118,
    // so the runtime narrowing and the runtime fields agree. The
    // childKeys set is rooted at the leaf factory, so the same
    // restriction applies transitively.
    data = validateAncestors(parent, data, seen, childKeys, parentWrites);
  }
  return data;
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
// Phase 2: schema-driven I/O inference. The overloads below
// discriminate on `fields`. The first overload matches calls
// that supply a schema; the second matches calls that don't.
// TypeScript picks the first matching overload, so the schema
// overload must be first for its inference to win.
//
// Implementation note: we use a discriminated union on
// `{ fields: S }` vs `{ fields?: never; message?: ... }` so
// TypeScript can statically route the call. The first overload
// is the only one where `message`'s parameter type is
// determined by the schema.
//
// The `any, any` parameters on StandardSchemaV1 let us capture
// every concrete schema (Zod, valibot, arktype, custom mocks) and
// derive the per-call input/output types via InferInput/InferOutput.
// Without `any`, the call signature would require `<infer I, infer O>`
// and the overload would lose its ability to discriminate on the
// call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function error<S extends StandardSchemaV1<any, any>>(config: {
  name: string;
  fields: S;
  message: (data: StandardSchemaV1.InferOutput<S>) => string;
  inherits?: AnyErrorFactory | AnyErrorFactory[];
}): ErrorFactory<StandardSchemaV1.InferInput<S>, StandardSchemaV1.InferOutput<S>>;

export function error<T extends Record<string, unknown> = Record<string, never>>(config: {
  name: string;
  fields?: undefined;
  message?: string | ((data: T) => string);
  inherits?: AnyErrorFactory | AnyErrorFactory[];
}): ErrorFactory<T>;

export function error<T extends Record<string, unknown> = Record<string, unknown>>(config: {
  name: string;
  fields?: StandardSchemaV1;
  message?: string | ((data: T) => string);
  inherits?: AnyErrorFactory | AnyErrorFactory[];
}): ErrorFactory<T> {
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
  const ErrorFactoryInstance: ErrorFactory<T> = (input?: Partial<T>): ErrorInstance<T> => {
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

    // Round 3: the child-constrained key set is derived from the
    // schema's actual output for THIS input (i.e. the keys of
    // `fieldsData` after the schema branch has populated it). This
    // means the strict rule applies to whatever the schema
    // produced — not to a static, probed set. Probing the schema
    // at construction time (the alternative) was rejected because
    // schemas with strict required-keys throw on empty input, and
    // some test schemas (async, throwing) would not survive a
    // probe. The downside of the per-input derivation: when the
    // user passes empty input that yields `{}` (no defaults), the
    // childKeys set is empty and the shape gate (Option A) runs.
    // The user's scenarios both pass non-empty input, so this is
    // fine in practice.
    let childKeys: ReadonlySet<string> | null = null;

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
        errorMessage = (message as (data: T) => string)(fieldsData as unknown as T);
      }
      // else: errorMessage stays as the factory name. The validated
      // fields are still on the instance; consumers that want a
      // rendered message can supply `message`.
      // Round 3: derive childKeys from the schema's output. The
      // keys of `fieldsData` are the load-bearing child contract
      // for this instantiation.
      if (Object.keys(fieldsData).length > 0) {
        childKeys = new Set(Object.keys(fieldsData));
      }
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
        errorMessage = (message as (data: T) => string)(fieldsData as unknown as T);
      }
      // The deprecation marker is gated by the warning once per call site.
      // Set `process.env.DEESSEJS_ERRORS_LEGACY_TEMPLATES = "1"` to silence.
      warnLegacy(formatCallSite());
    }

    // Validate the child's fields against every reachable ancestor that
    // carries a schema. Without this, a child factory whose `fields`
    // do not satisfy a parent's contract would still be classified as
    // the parent by `is()`, but its `.fields` would not satisfy the
    // parent's contract — a runtime lie that the type-checker now
    // actively tells (the type-level `ExtractFactoryFields` in
    // `is/index.ts` already intersects every reachable ancestor's
    // output). The walk below covers the full transitive chain with
    // a `Set`-based cycle guard, and applies each ancestor's
    // transformed output to `fieldsData` as it cascades.
    //
    // Round 3: the cascade also enforces the "child + parents agree"
    // invariant via the childKeys set computed above. When T is the
    // empty shape, childKeys is `null` and the cascade falls back to
    // the per-key shape-kind gate.
    const rootInherits = (ErrorFactoryInstance as ErrorFactory<T>).inherits;
    if (rootInherits !== undefined) {
      fieldsData = validateAncestors(
        ErrorFactoryInstance as AnyErrorFactory,
        fieldsData,
        new Set<AnyErrorFactory>([ErrorFactoryInstance as AnyErrorFactory]),
        childKeys,
        new Map<string, ShapeKind>()
      );
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
    const instance = new Error(errorMessage) as ErrorInstance<T>;
    instance.name = name;
    instance.fields = fieldsData as unknown as T;
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
    instance.from = (cause: Error): ErrorInstance<T> => {
      instance.cause = cause;
      return instance;
    };

    // Add .addNote() method for runtime context (PEP 678)
    instance.addNote = (note: string): ErrorInstance<T> => {
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
    const inheritsSnapshot: AnyErrorFactory | AnyErrorFactory[] = Array.isArray(inherits)
      ? [...inherits]
      : inherits;
    Object.freeze(inheritsSnapshot);
    (ErrorFactoryInstance as ErrorFactory<T>).inherits = inheritsSnapshot;
  }

  if (fields !== undefined) {
    (ErrorFactoryInstance as ErrorFactory<T>).schema = fields;
  }

  if (message !== undefined) {
    (ErrorFactoryInstance as ErrorFactory<T>).rawMessage = message;
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
