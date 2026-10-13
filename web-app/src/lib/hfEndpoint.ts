/**
 * Resolves the base URL for direct HuggingFace API calls made from the webview.
 *
 * These calls (Hub repo metadata, token validation) use `fetch` from the
 * frontend and therefore do NOT pass through the Rust download mirror in
 * `src-tauri/src/core/downloads/helpers.rs`. In regions where huggingface.co is
 * unreachable the whole Hub breaks unless this is overridden too.
 *
 * The value is injected at build time by Vite (`vite.config.ts`) from the
 * `HF_API_BASE_URL` env var. That global is absent in unit tests and in any
 * non-Vite context, so fall back to the public endpoint rather than producing
 * URLs like `undefined/api/models/...`.
 */
export const HF_API_BASE = ((): string => {
  try {
    // `typeof` guards the reference itself: a bare read of an undeclared
    // identifier would throw instead of evaluating to undefined.
    if (typeof HF_API_BASE_URL === 'string' && HF_API_BASE_URL.length > 0) {
      return HF_API_BASE_URL.replace(/\/+$/, '')
    }
  } catch {
    // Not defined in this environment; use the default below.
  }
  return 'https://huggingface.co'
})()

/** Builds a HuggingFace API URL against the configured base. */
export const hfApiUrl = (path: string): string =>
  `${HF_API_BASE}${path.startsWith('/') ? path : `/${path}`}`
