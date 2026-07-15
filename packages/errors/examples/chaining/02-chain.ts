/**
 * Cause Chain Traversal with causes()
 *
 * Demonstrates how to traverse the full cause chain.
 */

import { error, causes } from '../../src/index.js';

// ============================================================================
// Build a Chain
// ============================================================================

const AppError = error({ name: 'AppError' });
const ServiceError = error({ name: 'ServiceError' });
const DatabaseError = error({ name: 'DatabaseError' });

console.log('=== Cause Chain ===');
console.log();

// Create a chain: AppError -> ServiceError -> DatabaseError
const dbErr = DatabaseError();
const serviceErr = ServiceError();
serviceErr.from(dbErr);

const appErr = AppError();
appErr.from(serviceErr);

console.log('Chain: AppError -> ServiceError -> DatabaseError');
console.log();

// ============================================================================
// Traverse with causes()
// ============================================================================

const chain = causes(appErr);

console.log('causes(appErr):');
for (let i = 0; i < chain.length; i++) {
  console.log(`  [${i}] ${chain[i].name}`);
}
console.log();

// ============================================================================
// Practical: Error Logging
// ============================================================================

console.log('=== Error Logging ===');
console.log();

function logError(err: unknown) {
  const instance = err as { name: string; message: string; causes?: unknown[] };
  console.log(`Error: ${instance.name}`);
  console.log(`  Message: ${instance.message}`);

  const chain = causes(err);
  if (chain.length > 0) {
    console.log('  Causes:');
    for (const cause of chain) {
      console.log(
        `    - ${(cause as { name: string }).name}: ${(cause as { message: string }).message}`
      );
    }
  }
  console.log();
}

logError(appErr);

console.log('✅ Cause chain examples completed!');
