import type { MbtaApiErrorBody } from './types'

const BASE_URL = 'https://api-v3.mbta.com'

export interface RateLimitInfo {
  limit: number | null
  remaining: number | null
  /** UTC epoch seconds at which the current window ends */
  reset: number | null
}

export class MbtaApiError extends Error {
  /** HTTP status, or 0 when the request never got a response (network failure). */
  status: number
  code: string | null
  detail: string | null
  /** Name of the query parameter the API rejected, if any. */
  parameter: string | null
  rateLimit: RateLimitInfo

  constructor(
    message: string,
    init: {
      status: number
      code?: string | null
      detail?: string | null
      parameter?: string | null
      rateLimit?: RateLimitInfo
      cause?: unknown
    },
  ) {
    super(message, { cause: init.cause })
    this.name = 'MbtaApiError'
    this.status = init.status
    this.code = init.code ?? null
    this.detail = init.detail ?? null
    this.parameter = init.parameter ?? null
    this.rateLimit = init.rateLimit ?? { limit: null, remaining: null, reset: null }
  }

  get isNetworkError() {
    return this.status === 0
  }

  get isRateLimited() {
    return this.status === 429
  }

  get isClientError() {
    return this.status >= 400 && this.status < 500
  }
}

export function isMbtaApiError(error: unknown): error is MbtaApiError {
  return error instanceof MbtaApiError
}

function readNumberHeader(headers: Headers, name: string): number | null {
  const raw = headers.get(name)
  if (raw === null) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function readRateLimit(headers: Headers): RateLimitInfo {
  return {
    limit: readNumberHeader(headers, 'x-ratelimit-limit'),
    remaining: readNumberHeader(headers, 'x-ratelimit-remaining'),
    reset: readNumberHeader(headers, 'x-ratelimit-reset'),
  }
}

async function readErrorBody(res: Response): Promise<MbtaApiErrorBody['errors'][number] | null> {
  try {
    const body = (await res.json()) as Partial<MbtaApiErrorBody>
    return body.errors?.[0] ?? null
  } catch {
    return null
  }
}

async function toApiError(res: Response): Promise<MbtaApiError> {
  const first = await readErrorBody(res)
  const detail = first?.detail ?? first?.title ?? null
  return new MbtaApiError(detail ?? `MBTA request failed: ${res.status} ${res.statusText}`.trim(), {
    status: res.status,
    code: first?.code,
    detail,
    parameter: first?.source?.parameter,
    rateLimit: readRateLimit(res.headers),
  })
}

export async function mbtaFetch<T>(
  path: string,
  searchParams?: URLSearchParams,
  signal?: AbortSignal,
): Promise<T> {
  const query = searchParams?.toString()
  const url = `${BASE_URL}${path}${query ? `?${query}` : ''}`

  const headers: Record<string, string> = { Accept: 'application/vnd.api+json' }
  const apiKey = import.meta.env.VITE_MBTA_API_KEY
  if (apiKey) headers['x-api-key'] = apiKey

  let res: Response
  try {
    res = await fetch(url, { headers, signal })
  } catch (error) {
    // Aborts are driven by TanStack Query (unmount / key change); don't wrap them.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new MbtaApiError('Unable to reach the MBTA API. Check your connection.', {
      status: 0,
      cause: error,
    })
  }

  if (!res.ok) throw await toApiError(res)

  try {
    return (await res.json()) as T
  } catch (error) {
    throw new MbtaApiError('MBTA API returned an invalid response.', {
      status: res.status,
      rateLimit: readRateLimit(res.headers),
      cause: error,
    })
  }
}
