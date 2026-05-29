/**
 * Basic Chaining with .from()
 *
 * Demonstrates how to chain errors to preserve the cause.
 */

import { error, raise } from '../../src/index.js';

// ============================================================================
// Create Errors
// ============================================================================

const AppError = error({ name: 'AppError' });
const DatabaseError = error<{ query: string }>({
  name: 'DatabaseError',
  message: 'Database query failed: {query}',
});

// ============================================================================
// Single Cause
// ============================================================================

const dbErr = DatabaseError({ query: 'SELECT * FROM users' });
const appErr = AppError();

console.log('=== Basic Chaining ===');
console.log();

// Chain the error
appErr.from(dbErr);

console.log('Direct cause:');
console.log('  appErr.cause === dbErr:', appErr.cause === dbErr);
console.log();

console.log('Causes array (newest first):');
console.log('  appErr.causes:', appErr.causes.length, 'item(s)');
console.log();

// ============================================================================
// Using in try/catch
// ============================================================================

console.log('=== Real-world Example ===');
console.log();

try {
  try {
    // Simulate a database error
    raise(DatabaseError({ query: 'SELECT * FROM missing_table' }));
  } catch (err) {
    // Wrap it in an application error
    AppError().from(err).from(new Error('Connection timeout'));
  }
} catch (finalErr) {
  console.log('Final error name:', finalErr.name);
  console.log('Cause chain length:', (finalErr as { causes: unknown[] }).causes?.length);
  console.log();
  console.log('This preserves the full error history for debugging.');
}

console.log();
console.log('✅ Basic chaining examples completed!');
