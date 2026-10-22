import { isMbtaApiError } from './client'

export function shouldRetry(failureCount: number, error: Error) {
  if (isMbtaApiError(error)) {
    // Bad params / bad key / unknown id won't fix themselves; a 429 deserves one patient retry.
    if (error.isClientError && !error.isRateLimited) return false
    if (error.isRateLimited) return failureCount < 1
  }
  return failureCount < 2
}

export function retryDelay(attempt: number, error: Error) {
  const reset = isMbtaApiError(error) ? error.rateLimit.reset : null
  if (reset !== null) {
    const wait = reset * 1000 - Date.now()
    if (wait > 0) return Math.min(wait, 30_000)
  }
  return Math.min(1000 * 2 ** attempt, 30_000)
}
