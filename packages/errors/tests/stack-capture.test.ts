/**
 * Tests for stack-trace capture. The P1 #1 audit found that the
 * previous implementation passed the outer `error` function to
 * `Error.captureStackTrace`, which excluded all frames because
 * `error` is not in the runtime call chain. The fix passes the
 * factory itself. These tests pin the corrected behavior.
 */

import { describe, it, expect } from 'vitest';
import { error } from '../src/index.js';

describe('stack trace capture', () => {
  it('includes the call site of the factory invocation', () => {
    const E = error({ name: 'E' });

    // The line below is the call site. The captured stack must
    // mention this test file by name; the previous implementation
    // produced a stack with zero frames.
    const instance = E();

    expect(instance.stack).toBeDefined();
    expect(instance.stack).toContain('stack-capture.test.ts');
  });

  it('does not include the factory definition frames', () => {
    const E = error({ name: 'E' });
    const instance = E();

    // The factory's source file should be excluded from the
    // trace (V8 drops frames above the `exclude` argument).
    // On V8 this is guaranteed; on the non-V8 fallback, the
    // string filter trims internal frames. Either way, the
    // caller-side frame is what matters.
    expect(instance.stack).not.toContain('ErrorFactoryInstance');
  });

  it('starts with the documented "Error: <message>" header', () => {
    const E = error({ name: 'MyError' });
    const instance = E();
    const firstLine = (instance.stack ?? '').split('\n')[0] ?? '';
    expect(firstLine).toContain('Error:');
    expect(firstLine).toContain('MyError');
  });
});
