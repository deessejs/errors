/**
 * Regression tests for the audit's P1 #1 finding: a factory
 * carrying a schema must receive an input at the call site. The
 * previous implementation silently produced an instance whose
 * `fields` were `undefined`, and consumers crashed with a
 * confusing `TypeError: Cannot read properties of undefined`
 * far from the source of the bug.
 *
 * The fix is a runtime safety net: the type signature accepts
 * `input?` for backward compatibility, but the runtime throws
 * a localized `TypeError` with the factory name and a migration
 * hint. These tests pin the new behavior.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { error } from '../src/index.js';

describe('required input argument (P1 #1)', () => {
  it('throws a localized TypeError when a schema factory is called with no arguments', () => {
    const E = error({
      name: 'SchemaError',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });

    expect(() => (E as unknown as () => unknown)()).toThrow(TypeError);
    expect(() => (E as unknown as () => unknown)()).toThrow(/SchemaError/);
    expect(() => (E as unknown as () => unknown)()).toThrow(/input shape is required/);
  });

  it('accepts no arguments for the legacy no-fields form', () => {
    const E = error({ name: 'Legacy' });
    expect(() => E()).not.toThrow();
    const instance = E();
    expect(instance.name).toBe('Legacy');
  });

  it('accepts no arguments for the legacy template-message form (no schema)', () => {
    const E = error({ name: 'LegacyTemplate', message: 'Hello' });
    expect(() => E()).not.toThrow();
    const instance = E();
    expect(instance.message).toBe('Hello');
  });

  it('accepts the input when the consumer supplies it', () => {
    const E = error({
      name: 'SchemaError',
      fields: z.object({ id: z.string() }),
      message: (data) => data.id,
    });
    expect(() => E({ id: 'x' })).not.toThrow();
  });
});
