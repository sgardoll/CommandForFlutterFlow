// HTML escaping for untrusted text — model output, API responses, error bodies.
//
// These are pure string transforms rather than the DOM `textContent` trick, so
// they are testable outside a browser, work before the document exists, and
// cannot be affected by the state of the DOM.

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes text for interpolation into HTML, preserving whitespace exactly.
 * Use inside <pre>/<code> or anywhere newlines must survive unchanged.
 * @param {*} value - Value to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtmlText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Escapes text for HTML and renders newlines as line breaks. For prose shown in
 * a block element, such as an error message.
 * @param {*} value - Value to escape
 * @returns {string} HTML-escaped text with <br> for newlines
 */
export function escapeHtml(value) {
  if (!value) return "";
  return escapeHtmlText(value).replace(/\n/g, "<br>");
}

/**
 * Escapes text for use inside a quoted HTML attribute, flattening newlines so
 * they cannot terminate the attribute value.
 * @param {*} value - Value to escape
 * @returns {string} HTML-escaped single-line text
 */
export function escapeAttr(value) {
  return escapeHtmlText(value).replace(/\r?\n/g, " ");
}
