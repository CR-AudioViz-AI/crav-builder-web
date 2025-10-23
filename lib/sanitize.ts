import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - Unsanitized HTML string
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeHTML(dirty: string): string {
  if (typeof window === 'undefined') {
    return dirty;
  }
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'div', 'span', 'img', 'section', 'article', 'header', 'footer'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'id']
  });
}

/**
 * Escapes user input for safe display as text
 */
export function sanitizeUserInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
