/**
 * Compile-time checks for the schema-with-message configuration.
 *
 * Phase 3 of the audit established that a Standard Schema must
 * always trigger validation, and the message function is the only
 * way to render the resulting fields. The overloads in error.ts
 * encode this contract:
 *
 * - Schema + function message: overload 1, validation runs.
 * - Schema + string message: NEITHER overload matches. TypeScript
 *   refuses the call. (The previous implementation accepted this
 *   shape but silently skipped validation.)
 * - No schema + function message: overload 2 with the manual
 *   generic.
 * - No schema + string message: overload 2 (legacy template form).
 * - No schema, no message: overload 2.
 *
 * These tests are picked up by `pnpm type-check:test` because the
 * file lives under `tests/`. The failures are compile-time, not
 * runtime, so the assertion is the absence of a type error.
 */

import { describe, it, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { error } from '../src/index.js';

describe('schema + message configuration overloads', () => {
  it('accepts a schema with a function message', () => {
    const E = error({
      name: 'StandardError',
      fields: z.object({ x: z.string() }),
      message: (data) => data.x,
    });
    expectTypeOf(E).toBeCallableWith({ x: 'hello' });
  });

  it('rejects a schema with a string message at compile time', () => {
    // The previous implementation silently skipped validation when
    // a schema was paired with a string message. The current
    // overloads require a function-form message when a schema is
    // supplied. This is the only way to guarantee the validation
    // path runs.
    // @ts-expect-error
    error({
      name: 'InvalidError',
      fields: z.object({ x: z.string() }),
      // The schema overload requires a function-form `message`.
      message: 'Hello {x}',
    });
  });

  it('accepts a function message without a schema (manual generic)', () => {
    const E = error<{ name: string }>({
      name: 'ManualGeneric',
      message: (data) => data.name,
    });
    expectTypeOf(E).toBeCallableWith({ name: 'Ada' });
  });

  it('accepts a string message without a schema (legacy template form)', () => {
    const E = error({
      name: 'Legacy',
      message: 'Hello {name}',
    });
    expectTypeOf(E).toBeCallableWith({ name: 'world' });
  });
});
