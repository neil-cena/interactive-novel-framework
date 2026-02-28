/**
 * Debounce utility for coalescing rapid invocations. Pure; no Node built-ins.
 *
 * @param {(...args: unknown[]) => void} fn
 * @param {number} ms
 * @returns {(...args: unknown[]) => void}
 */
export function debounce(fn, ms) {
  let timeoutId = null
  return function (...args) {
    if (timeoutId != null) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      timeoutId = null
      fn.apply(this, args)
    }, ms)
  }
}
