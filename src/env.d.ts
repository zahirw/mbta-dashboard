declare global {
  interface ImportMetaEnv {
    /** Optional MBTA V3 API key; without one requests use a stricter per-IP rate limit. */
    readonly VITE_MBTA_API_KEY?: string
  }
}

export {}
