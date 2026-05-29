/**
 * Stack trace capture utilities.
 */

import { STACK_FRAME_PATTERN } from './constants.js';

/**
 * Captures the current stack trace, cleaning up internal frames.
 * Note: This is V8-specific and may not work in non-V8 environments (Deno, etc.)
 *
 * @internal
 */
const captureStack = ( message: string ): string => {
  const stack = new Error().stack || '';

  const lines = stack.split( '\n' );
  const cleanedLines: string[] = [ `Error: ${message}` ];

  // Find start index (skip "Error: message" line)
  let startIndex = 0;
  for ( let i = 0; i < lines.length; i++ ) {
    if ( STACK_FRAME_PATTERN.test( lines[i] ) ) {
      startIndex = i;
      break;
    }
  }

  // Filter internal frames
  for ( let i = startIndex; i < lines.length; i++ ) {
    const line = lines[i];
    if ( line.includes( 'node_modules/@deessejs' ) ) {
      continue;
    }
    if ( line.includes( '__vite' ) ) {
      continue;
    }
    cleanedLines.push( line );
  }

  return cleanedLines.join( '\n' );
};

export { captureStack };
