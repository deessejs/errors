/**
 * Type Checking with is()
 *
 * Demonstrates type narrowing using the is() function.
 */

import { error, is } from '../../src/index.js';

// ============================================================================
// Custom Error Hierarchy
// ============================================================================

const AppError = error({ name: 'AppError' });
const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
});

// ============================================================================
// Type Checking Basics
// ============================================================================

const err = ValidationError();

console.log('=== Type Checking ===');
console.log();
console.log(`err is ValidationError: ${is(err, ValidationError)}`);
console.log(`err is AppError (via inheritance): ${is(err, AppError)}`);
console.log();

// ============================================================================
// Native Error Checking
// ============================================================================

try {
  JSON.parse('invalid json');
} catch (err) {
  console.log('=== Native Errors ===');
  console.log(`is(err, SyntaxError): ${is(err, SyntaxError)}`);
  console.log(`is(err, Error): ${is(err, Error)}`);
  console.log();
}

// ============================================================================
// Defensive Checking
// ============================================================================

console.log('=== Defensive Checking ===');
console.log(`is(null, ValidationError): ${is(null, ValidationError)}`);
console.log(`is(undefined, ValidationError): ${is(undefined, ValidationError)}`);
console.log(`is('string', ValidationError): ${is('string', ValidationError)}`);
console.log();

console.log('✅ Type checking examples completed!');
