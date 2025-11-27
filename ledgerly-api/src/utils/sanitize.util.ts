import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize user input to prevent XSS attacks
 * Removes all HTML tags and dangerous content
 */
export function sanitizeInput(value: string): string {
  if (!value || typeof value !== 'string') return value;
  
  return sanitizeHtml(value, {
    allowedTags: [], // Remove all HTML tags
    allowedAttributes: {}, // Remove all attributes
    disallowedTagsMode: 'discard',
  }).trim();
}
