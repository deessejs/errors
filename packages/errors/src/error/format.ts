/**
 * Message formatting utilities.
 */

import { TEMPLATE_PLACEHOLDER_REGEX } from './constants.js';

/**
 * Formats a message template by replacing {field} placeholders with values.
 *
 * @internal
 */
const formatTemplate = ( template: string, fields: Record<string, unknown> ): string => {
  return template.replace( /\{(\w+)(?::(\w+))?\}/g, ( fullMatch, fieldName, modifier ) => {
    const value = fields[fieldName];
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
