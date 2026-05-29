/**
 * Real-world Validation Example
 *
 * Demonstrates how to use the error library in a validation context.
 */

import { error, is, raise } from '../../src/index.js';

// ============================================================================
// Domain Errors
// ============================================================================

const ValidationError = error<{ field: string; value: unknown }>({
  name: 'ValidationError',
  message: 'Validation failed for field "{field}"',
});

const AppError = error({ name: 'AppError' });
ValidationError.inherits = AppError;

// ============================================================================
// Validation Functions
// ============================================================================

function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const err = ValidationError({ field: 'email', value: email });
    raise(err);
  }
}

function validateAge(age: number): void {
  if (age < 0 || age > 150) {
    const err = ValidationError({ field: 'age', value: age });
    raise(err);
  }
}

// ============================================================================
// Higher-level Validation
// ============================================================================

interface User {
  name: string;
  email: string;
  age: number;
}

function validateUser(user: User): void {
  const errors: unknown[] = [];

  try {
    validateEmail(user.email);
  } catch (err) {
    errors.push(err);
  }

  try {
    validateAge(user.age);
  } catch (err) {
    errors.push(err);
  }

  if (errors.length > 0) {
    const err = AppError();
    for (const error of errors) {
      err.from(error as { cause: null; causes: unknown[]; from: (e: unknown) => typeof err });
    }
    raise(err);
  }
}

// ============================================================================
// Usage
// ============================================================================

console.log('=== Real-world Validation ===');
console.log();

try {
  validateUser({
    name: 'John',
    email: 'invalid-email',
    age: 200,
  });
} catch (err) {
  console.log('Caught validation error:');
  console.log('  err.name:', err.name);
  console.log('  is(err, ValidationError):', is(err, ValidationError));
  console.log('  is(err, AppError):', is(err, AppError));
  console.log('  err.cause:', err.cause?.['name'] || err.cause?.constructor?.name);
  console.log('  Total errors in chain:', (err as { causes: unknown[] }).causes?.length);

  // Handle specific validation errors
  const causes = (err as { causes: unknown[] }).causes || [];
  console.log();
  console.log('Individual validation errors:');
  for (const cause of causes) {
    const c = cause as { fields?: { field: string; value: unknown }; name: string };
    if (is(c, ValidationError)) {
      console.log(`  - ${c.fields?.field}: ${c.fields?.value}`);
    }
  }
}

console.log();
console.log('✅ Real-world validation example completed!');
