/**
 * @deessejs/errors - TypeScript Error Handling Library
 *
 * Public API exports for the error handling library.
 */

// Types
export type { StandardSchemaV1 } from '@standard-schema/spec';
export type {
  ErrorFactory,
  ErrorInstance,
  ErrorInstanceCore,
} from './types/index.js';

// Error factory function
export { error } from './error.js';
