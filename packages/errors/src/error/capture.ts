/**
 * Stack trace capture utilities.
 *
 * Uses V8's `Error.captureStackTrace` when available (Node.js, Chrome,
 * Edge, modern browsers). The optional second argument names a
 * constructor above which frames are excluded — we pass `error` so
 * callers see only the call site that invoked the factory, not
 * the factory's own frame. In non-V8 engines, falls back to
 * `new Error().stack` and post-processes the string to drop
 * vendor-internal frames.
 *
 * @internal
 */

// `Error.captureStackTrace` is a V8 extension, not in lib.dom or
// lib.es2022. We feature-detect it at module load time and cast
// through `unknown` to keep the call site terse. The `Function`
// type for the `exclude` parameter is intentional: V8's spec
// accepts any callable, and `Function` is the only single-token
// name in lib.es2022 that describes it without enumerating every
// conceivable signature.
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type AnyFunction = Function;
const errorWithCapture = Error as unknown as {
  captureStackTrace?: (target: object, exclude?: AnyFunction) => void;
};

const hasV8Capture = typeof errorWithCapture.captureStackTrace === 'function';

const captureStackV8 = (message: string, exclude: AnyFunction): string => {
  // V8's captureStackTrace mutates the target in place to set
  // `.stack`. The exclude argument drops frames above it in the
  // call stack. We build a throwaway holder, capture into it, and
  // return the resulting string.
  const holder: { stack?: string } = {};
  errorWithCapture.captureStackTrace!(holder, exclude);
  const raw = holder.stack ?? '';
  // V8's first line is the error name + message; replace it with
  // our preferred header. The rest of the stack is already filtered
  // by V8 itself.
  const lines = raw.split('\n');
  if (lines.length === 0) {
    return `Error: ${message}`;
  }
  return [`Error: ${message}`, ...lines.slice(1)].join('\n');
};

const captureStackFallback = (message: string): string => {
  // Non-V8 engines: build a stack via the standard `Error`
  // constructor and post-process the string to drop vendor
  // frames. The same heuristic as before, kept for parity with
  // the pre-Phase-11 behavior on engines that do not implement
  // V8's captureStackTrace.
  const stack = new Error(message).stack ?? '';
  const lines = stack.split('\n');
  const cleanedLines: string[] = [`Error: ${message}`];
  for (const line of lines) {
    if (line.includes('node_modules/@deessejs')) continue;
    if (line.includes('__vite')) continue;
    if (line.trim().length === 0) continue;
    cleanedLines.push(line);
  }
  return cleanedLines.join('\n');
};

/**
 * Captures the current stack trace as a string.
 *
 * The optional second argument is a constructor function whose
 * frame (and above) should be excluded from the trace. Pass
 * `error` to drop the factory's own frame.
 *
 * @internal
 */
const captureStack = (message: string, exclude?: AnyFunction): string => {
  if (hasV8Capture && exclude) {
    return captureStackV8(message, exclude);
  }
  return captureStackFallback(message);
};

export { captureStack };
