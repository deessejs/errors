/**
 * Multiple Inheritance
 *
 * Demonstrates how errors can inherit from multiple parents.
 */

import { error, is } from '../../src/index.js';

// ============================================================================
// Parent Errors
// ============================================================================

const NetworkError = error({ name: 'NetworkError' });
const StorageError = error({ name: 'StorageError' });

// ============================================================================
// Child Inherits from Multiple Parents
// ============================================================================

const CombinedError = error({
  name: 'CombinedError',
  inherits: [NetworkError, StorageError],
});

const combined = CombinedError();
console.log('=== Multiple Inheritance ===');
console.log();

// The combined error can be checked against any of its parents
console.log('combined is CombinedError:', is(combined, CombinedError));
console.log('combined is NetworkError:', is(combined, NetworkError));
console.log('combined is StorageError:', is(combined, StorageError));
console.log();

// ============================================================================
// Real-world Example: Combined Error Handling
// ============================================================================

console.log('=== Practical Use Case ===');
console.log();

// Simulate error handling
function handleError(err: unknown) {
  if (is(err, CombinedError)) {
    console.log('Handling combined error...');
    if (is(err, NetworkError)) {
      console.log('  → Also a network issue');
    }
    if (is(err, StorageError)) {
      console.log('  → Also a storage issue');
    }
  } else if (is(err, NetworkError)) {
    console.log('Handling network error...');
  } else if (is(err, StorageError)) {
    console.log('Handling storage error...');
  } else {
    console.log('Unknown error type');
  }
}

console.log('NetworkError:');
handleError(NetworkError());

console.log();
console.log('CombinedError:');
handleError(CombinedError());

console.log();
console.log('✅ Multiple inheritance examples completed!');
