/**
 * Consumer-from-dist smoke test.
 *
 * Imports the published entry point (../dist/index.js) rather than the
 * source. If the build is broken (e.g. types.ts changes were not
 * reflected in the build output), this script fails at runtime.
 *
 * Run via `pnpm test:consumer` (which builds first) or
 * `pnpm build && node tests/consumer-from-dist.mjs`.
 *
 * Exits 0 on success, non-zero on the first failure. Each check uses
 * a bare `assert` rather than a test framework so the file is
 * self-contained and runnable on a bare Node install.
 */

import { error, raise, is, causes, ArgsValidationError } from '../dist/index.js';
import assert from 'node:assert/strict';

let pass = 0;
let fail = 0;

function check(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    fail += 1;
    console.log(`  fail ${name}`);
    console.log(`       ${err.message}`);
  }
}

console.log('consumer-from-dist:');

check('error() returns a callable factory', () => {
  assert.equal(typeof error, 'function');
  assert.equal(typeof raise, 'function');
  assert.equal(typeof is, 'function');
  assert.equal(typeof causes, 'function');
  assert.equal(typeof ArgsValidationError, 'function');
});

check('error() round-trips a typed instance', () => {
  const E = error({ name: 'E' });
  const instance = E();
  assert.equal(instance.name, 'E');
  assert.deepEqual(instance.fields, {});
});

check('raise() throws an instance of the factory', () => {
  const E = error({ name: 'E' });
  let caught = null;
  try {
    raise(E());
  } catch (err) {
    caught = err;
  }
  assert.ok(caught !== null);
  assert.equal(caught.name, 'E');
});

check('is() discriminates factory from native error', () => {
  const E = error({ name: 'E' });
  assert.equal(is(E(), E), true);
  assert.equal(is(new TypeError('x'), TypeError), true);
});

check('causes() returns the cause array', () => {
  const E = error({ name: 'E' });
  const cause = new Error('c');
  const instance = E().from(cause);
  const cs = causes(instance);
  assert.equal(cs[0], cause);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
