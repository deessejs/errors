/**
 * Constants used throughout the error handling library.
 */

// Regex pattern for matching stack frames
export const STACK_FRAME_PATTERN = /^\s+at\s+/i;

// Template placeholder regex
export const TEMPLATE_PLACEHOLDER_REGEX = /\{(\w+)(?::(\w+))?\}/g;
