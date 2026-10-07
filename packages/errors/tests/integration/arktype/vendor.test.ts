/**
 * Integration tests for arktype with the new standard-schema mode (RFC 0001).
 *
 * These tests are colocated under tests/integration/ because they depend
 * on an external package. They exercise the runtime dispatch end-to-end
 * through error().
 */

import { describe, it, expect } from 'vitest';
import { type } from '@ark/type';
import { ArgsValidationError, error } from '../../../src/error/error.js';

describe('arktype 2', () => {
  it('renders the message on a passing input', () => {
    const E = error({
      name: 'ArkError',
      fields: type({
        name: 'string',
        'age?': 'number',
      }),
      message: (data: { name: string; age?: number }) => `${data.name} ${data.age ?? '(unknown)'}`,
    });
    const instance = E({ name: 'ada', age: 36 });
    expect(instance.message).toBe('ada 36');
  });

  it('throws ArgsValidationError on a failing input', () => {
    const E = error({
      name: 'ArkError',
      fields: type({ name: 'string' }),
      message: (data: { name: string }) => data.name,
    });
    expect(() => E({ name: 42 as unknown as string })).toThrow(ArgsValidationError);
  });

  it('exposes the issues and vendor on failure', () => {
    const E = error({
      name: 'ArkIssue',
      fields: type({ name: 'string' }),
      message: (data: { name: string }) => data.name,
    });
    let caught: unknown = null;
    try {
      E({ name: 42 as unknown as string });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const ae = caught as ArgsValidationError;
    expect(ae.vendor).toBe('arktype');
    expect(ae.issues.length).toBeGreaterThan(0);
  });
});
