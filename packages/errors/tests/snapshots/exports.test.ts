// Public surface snapshot. Locks the list of named exports from
// @deessejs/errors so accidental removals or renames are caught by
// CI. Also locks the runtime identity of the exported classes.

import { describe, it, expect } from 'vitest';
import * as errors from '../../src/index.js';

describe('public surface snapshot', () => {
  it('exports the expected set of runtime and type members', () => {
    expect(Object.keys(errors).sort()).toEqual(
      ['ArgsValidationError', 'causes', 'error', 'is', 'raise'].sort()
    );
  });

  it('ArgsValidationError is a class extending Error', () => {
    expect(typeof errors.ArgsValidationError).toBe('function');
    const proto = Object.getPrototypeOf(errors.ArgsValidationError);
    expect(proto).toBe(Error);
  });

  it('error, raise, is, causes are functions', () => {
    expect(typeof errors.error).toBe('function');
    expect(typeof errors.raise).toBe('function');
    expect(typeof errors.is).toBe('function');
    expect(typeof errors.causes).toBe('function');
  });

  it('ArgsValidationError accepts a custom source and vendor', () => {
    const e = new errors.ArgsValidationError('MyError', [{ message: 'x' }], 'vendor');
    expect(e.source).toBe('MyError');
    expect(e.vendor).toBe('vendor');
    expect(e.name).toBe('ArgsValidationError');
  });

  it('ArgsValidationError message includes the source', () => {
    const e = new errors.ArgsValidationError('MyError', [], 'vendor');
    expect(e.message).toContain('MyError');
  });
});
