/**
 * Single Inheritance
 *
 * Demonstrates how errors can inherit from a parent error.
 */

import { error, is } from '../../src/index.js';

// ============================================================================
// Create Parent Error
// ============================================================================

const AppError = error({ name: 'AppError' });

// ============================================================================
// Child Error Inherits from Parent
// ============================================================================

const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
});

console.log('=== Single Inheritance ===');
console.log();

// The child error
const validation = ValidationError();
console.log('Child error (ValidationError):');
console.log('  is(validation, ValidationError):', is(validation, ValidationError));
console.log('  is(validation, AppError):', is(validation, AppError), '(via inherits)');
console.log();

// The parent error
const app = AppError();
console.log('Parent error (AppError):');
console.log('  is(app, ValidationError):', is(app, ValidationError));
console.log('  is(app, AppError):', is(app, AppError));
console.log();

// ============================================================================
// Inheritance Chain
// ============================================================================

const DomainError = error({
  name: 'DomainError',
  inherits: AppError,
});

const SpecificError = error({
  name: 'SpecificError',
  inherits: DomainError,
});

const specific = SpecificError();
console.log('=== Deeper Inheritance Chain ===');
console.log('SpecificError -> DomainError -> AppError');
console.log();
console.log('specific is SpecificError:', is(specific, SpecificError));
console.log('specific is DomainError:', is(specific, DomainError));
console.log('specific is AppError:', is(specific, AppError));
console.log();

console.log('✅ Single inheritance examples completed!');
