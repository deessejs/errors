/**
 * Basic Error Factory
 *
 * Demonstrates how to create custom error factories.
 */

import { error, raise } from '../../src/index.js';

// ============================================================================
// Basics
// ============================================================================

// Create a simple error factory with just a name
const NotFoundError = error({
  name: 'NotFoundError',
});

// Create an error instance
const notFound = NotFoundError();
console.log('=== Basic Error ===');
console.log('name:', notFound.name);
console.log('message:', notFound.message);
console.log('stack (first line):', notFound.stack?.split('\n')[0]);
console.log();

// ============================================================================
// With Custom Message
// ============================================================================

const ValidationError = error({
  name: 'ValidationError',
  message: 'Validation failed',
});

const validation = ValidationError();
console.log('=== With Custom Message ===');
console.log('message:', validation.message);
console.log();

// ============================================================================
// With Fields
// ============================================================================

const UserError = error<{ userId: string; reason: string }>({
  name: 'UserError',
  message: 'User "{userId}" error: {reason}',
});

const userError = UserError({ userId: 'usr_123', reason: 'not found' });
console.log('=== With Fields ===');
console.log('message:', userError.message);
console.log('fields:', userError.fields);
console.log();

// ============================================================================
// Raising Errors
// ============================================================================

try {
  const appError = NotFoundError();
  raise(appError);
} catch (err) {
  console.log('=== Caught Error ===');
  console.log('name:', err.name);
  console.log('message:', err.message);
  console.log('instanceof Error:', err instanceof Error);
}

console.log();
console.log('✅ All basics examples completed!');
