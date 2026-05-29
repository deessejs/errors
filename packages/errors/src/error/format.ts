/**
 * Message formatting utilities.
 */

import { TEMPLATE_PLACEHOLDER_REGEX } from './constants.js';

/**
 * Extracts placeholder keys from a template string at compile-time.
 *
 * @example
 * ```typescript
 * type Keys = ExtractKeys<'Hello {name} and {age:number}'>;
 * // => 'name' | 'age'
 * ```
 */
type ExtractKeys<S extends string> =
  S extends `${string}{${infer Key}}${infer Rest}`
    ? (Key extends `${infer RealKey}:${string}` ? RealKey : Key) | ExtractKeys<Rest>
    : never;

/**
 * Formats a message template by replacing {field} placeholders with values.
 * Data keys are validated at compile-time based on template string.
 *
 * @internal
 */
const formatTemplate = <S extends string>(
  template: S,
  data: Record<ExtractKeys<S>, unknown>
): string => {
  return template.replace( /\{(\w+)(?::(\w+))?\}/g, ( fullMatch, fieldName, modifier ) => {
    const value = data[fieldName as keyof typeof data];
    if ( value === undefined ) {
      return fullMatch;
    }

    if ( modifier === 'upper' ) {
      return String( value ).toUpperCase();
    }
    if ( modifier === 'lower' ) {
      return String( value ).toLowerCase();
    }
    if ( modifier === 'json' ) {
      return JSON.stringify( value );
    }

    return String( value );
  } );
};

/**
 * Checks if a message string contains template placeholders.
 *
 * @internal
 */
const hasTemplatePlaceholders = ( message: string ): boolean => {
  TEMPLATE_PLACEHOLDER_REGEX.lastIndex = 0;
  return TEMPLATE_PLACEHOLDER_REGEX.test( message );
};

export { formatTemplate, hasTemplatePlaceholders };
