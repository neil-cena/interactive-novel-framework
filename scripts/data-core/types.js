/**
 * Diagnostic payload shape for lint/validate output.
 * Used by lint-data CLI and authoring tool; no Node built-ins.
 *
 * @typedef {Object} Diagnostic
 * @property {string} code - Stable error code (e.g. DATA001)
 * @property {'error'|'warning'} severity
 * @property {string} [file] - Source file name
 * @property {number} [row] - 1-based row index
 * @property {number} [column] - 1-based column if applicable
 * @property {string} message - Human-readable message
 * @property {string} [hint] - Optional fix suggestion
 * @property {Record<string,unknown>} [context] - Extra context
 */

export const DIAGNOSTIC_SEVERITY = /** @type {const} */ ({ error: 'error', warning: 'warning' })
