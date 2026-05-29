/**
 * Message Templates with Modifiers
 *
 * Demonstrates {field} placeholders and modifiers (:upper, :lower, :json).
 */

import { error } from '../../src/index.js';

// ============================================================================
// Basic Placeholder
// ============================================================================

const ValidationError = error<{ field: string }>({
  name: 'ValidationError',
  message: 'Field "{field}" is invalid',
});

const err1 = ValidationError({ field: 'email' });
console.log('=== Basic Placeholder ===');
console.log('message:', err1.message);
console.log();

// ============================================================================
// Multiple Placeholders
// ============================================================================

const FormatError = error<{ expected: string; actual: string }>({
  name: 'FormatError',
  message: 'Expected {expected}, got {actual}',
});

const err2 = FormatError({ expected: 'number', actual: 'string' });
console.log('=== Multiple Placeholders ===');
console.log('message:', err2.message);
console.log();

// ============================================================================
// Modifiers
// ============================================================================

const UserCreatedError = error<{ userId: string }>({
  name: 'UserCreatedError',
  message: 'Created user: {userId:upper}',
});

const err3 = UserCreatedError({ userId: 'usr_abc123' });
console.log('=== :upper Modifier ===');
console.log('message:', err3.message);
console.log();

const LowerError = error<{ path: string }>({
  name: 'LowerError',
  message: 'PATH: {path:lower}',
});

const err4 = LowerError({ path: '/USERS/DATA' });
console.log('=== :lower Modifier ===');
console.log('message:', err4.message);
console.log();

// ============================================================================
// JSON Modifier
// ============================================================================

const DataError = error<{ data: { id: number; name: string } }>({
  name: 'DataError',
  message: 'Invalid data: {data:json}',
});

const err5 = DataError({ data: { id: 1, name: 'test' } });
console.log('=== :json Modifier ===');
console.log('message:', err5.message);
console.log();

// ============================================================================
// Missing Field
// ============================================================================

const PartialError = error<{ field: string }>({
  name: 'PartialError',
  message: 'Field "{field}" is required',
});

const err6 = PartialError({});
console.log('=== Missing Field ===');
console.log('message:', err6.message);
console.log();

console.log('✅ Message template examples completed!');
