export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const noStorage = { getItem: () => null, setItem: () => undefined }

/** localStorage, or a stand-in that remembers nothing when the browser blocks it. */
export const storage = () => {
  try {
    return window.localStorage
  } catch {
    return noStorage
  }
}
