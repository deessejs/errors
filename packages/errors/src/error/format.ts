/**
 * Message formatting utilities.
 */

import { TEMPLATE_PLACEHOLDER_REGEX } from './constants.js';

/**
 * Formats a message template by replacing {field} placeholders with values.
 *
 * @internal
 */
const formatTemplate = <T extends Record<string, unknown>>(
  template: string,
  data: T
): string => {
  return template.replace(
    TEMPLATE_PLACEHOLDER_REGEX,
    ( fullMatch, fieldName, modifier ) => {
      const value = data[fieldName as keyof T];
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
    }
  );
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
