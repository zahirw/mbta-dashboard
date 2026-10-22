import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
} from '@tanstack/react-query'
import { mbtaFetch, type MbtaApiError } from './client'
import { retryDelay, shouldRetry } from './retry'
import type { TripsFilter, TripsInfiniteParams, TripsParams, TripsResponse } from './types'

function buildTripsSearchParams({
  pageLimit,
  pageOffset,
  sort,
  fields,
  include,
  filter,
}: TripsParams = {}): URLSearchParams {
  const search = new URLSearchParams()

  if (pageLimit !== undefined) search.set('page[limit]', String(pageLimit))
  if (pageOffset !== undefined) search.set('page[offset]', String(pageOffset))
  if (sort) search.set('sort', sort)
  if (fields?.length) search.set('fields[trip]', fields.join(','))
  if (include?.length) search.set('include', include.join(','))

  if (filter) {
    const lists = {
      'filter[id]': filter.id,
      'filter[name]': filter.name,
      'filter[route]': filter.route,
      'filter[route_pattern]': filter.routePattern,
      'filter[revenue]': filter.revenue,
    }
    for (const [key, values] of Object.entries(lists)) {
      if (values?.length) search.set(key, values.join(','))
    }
    if (filter.directionId !== undefined) {
      search.set('filter[direction_id]', String(filter.directionId))
    }
    if (filter.date) search.set('filter[date]', filter.date)
  }

  return search
}

/** The API returns no trips unless an id, route, route pattern or name filter is present. */
export function hasRequiredTripFilter(filter?: TripsFilter): boolean {
  return Boolean(
    filter?.id?.length || filter?.route?.length || filter?.routePattern?.length || filter?.name?.length,
  )
}

export const tripKeys = {
  all: ['mbta', 'trips'] as const,
  infinite: (params: TripsInfiniteParams = {}) => [...tripKeys.all, 'infinite', params] as const,
  byIds: (ids: string[]) => [...tripKeys.all, 'by-ids', [...ids].sort()] as const,
}

// Trips are scheduled ahead of time, so they change on the order of minutes at most.
const TRIP_STALE_TIME = 5 * 60_000

export function fetchTrips(params: TripsParams = {}, signal?: AbortSignal): Promise<TripsResponse> {
  return mbtaFetch<TripsResponse>('/trips', buildTripsSearchParams(params), signal)
}

const DEFAULT_PAGE_LIMIT = 20

/** Pagination is driven by the API's own `links.next`; no `next` means the last page. */
export function getNextTripsPageParam(lastPage: TripsResponse): number | undefined {
  const next = lastPage.links?.next
  if (!next) return undefined
  const offset = Number(new URL(next).searchParams.get('page[offset]'))
  return Number.isInteger(offset) && offset >= 0 ? offset : undefined
}

export function tripsInfiniteQueryOptions(params: TripsInfiniteParams = {}) {
  return infiniteQueryOptions<
    TripsResponse,
    MbtaApiError,
    InfiniteData<TripsResponse, number>,
    ReturnType<typeof tripKeys.infinite>,
    number
  >({
    queryKey: tripKeys.infinite(params),
    queryFn: ({ pageParam, signal }) =>
      fetchTrips(
        { ...params, pageLimit: params.pageLimit ?? DEFAULT_PAGE_LIMIT, pageOffset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: getNextTripsPageParam,
    enabled: hasRequiredTripFilter(params.filter),
    staleTime: TRIP_STALE_TIME,
    retry: shouldRetry,
    retryDelay,
  })
}

interface UseInfiniteTripsOptions {
  enabled?: boolean
}

export function useInfiniteTrips(
  params: TripsInfiniteParams = {},
  { enabled = true }: UseInfiniteTripsOptions = {},
) {
  return useInfiniteQuery({
    ...tripsInfiniteQueryOptions(params),
    placeholderData: keepPreviousData,
    // Never request without a required filter; the API would return nothing.
    enabled: enabled && hasRequiredTripFilter(params.filter),
  })
}

/** Resolves known trip ids (e.g. from the URL) to full trips, for display. */
export function tripsByIdsQueryOptions(ids: string[]) {
  return queryOptions<TripsResponse, MbtaApiError>({
    queryKey: tripKeys.byIds(ids),
    queryFn: ({ signal }) => fetchTrips({ filter: { id: ids }, pageLimit: ids.length }, signal),
    enabled: ids.length > 0,
    staleTime: TRIP_STALE_TIME,
    retry: shouldRetry,
    retryDelay,
  })
}

export function useTripsByIds(ids: string[]) {
  return useQuery(tripsByIdsQueryOptions(ids))
}
