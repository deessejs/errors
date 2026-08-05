/**
 * Integration tests for valibot with the new standard-schema mode (RFC 0001).
 *
 * These tests are colocated under tests/integration/ because they depend
 * on an external package. They exercise the runtime dispatch end-to-end
 * through error().
 */

import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { ArgsValidationError, error } from '../../../src/error/error.js';

describe('valibot 1', () => {
  it('renders the message on a passing input', () => {
    const E = error({
      name: 'ValibotError',
      fields: v.object({
        tag: v.picklist(['info', 'warn', 'error']),
        message: v.string(),
      }),
      message: (data: { tag: string; message: string }) => `[${data.tag}] ${data.message}`,
    });
    const instance = E({ tag: 'info', message: 'hello' });
    expect(instance.message).toBe('[info] hello');
    expect(instance.fields).toEqual({ tag: 'info', message: 'hello' });
  });

  it('throws ArgsValidationError on a failing input', () => {
    const E = error({
      name: 'ValibotError',
      fields: v.object({
        tag: v.picklist(['info', 'warn', 'error']),
      }),
      message: (data: { tag: string }) => data.tag,
    });
    expect(() => E({ tag: 'weird' })).toThrow(ArgsValidationError);
  });

  it('exposes the issues and vendor on failure', () => {
    const E = error({
      name: 'ValibotIssue',
      fields: v.object({
        count: v.pipe(v.number(), v.minValue(0)),
      }),
      message: (data: { count: number }) => String(data.count),
    });
    let caught: unknown = null;
    try {
      E({ count: -1 });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const ae = caught as ArgsValidationError;
    expect(ae.vendor).toBe('valibot');
    expect(ae.issues.length).toBeGreaterThan(0);
  });
});
