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
import type { RoutesInfiniteParams, RoutesParams, RoutesResponse } from './types'

function buildRoutesSearchParams({
  pageLimit,
  pageOffset,
  sort,
  fields,
  include,
  filter,
}: RoutesParams = {}): URLSearchParams {
  const search = new URLSearchParams()

  if (pageLimit !== undefined) search.set('page[limit]', String(pageLimit))
  if (pageOffset !== undefined) search.set('page[offset]', String(pageOffset))
  if (sort) search.set('sort', sort)
  if (fields?.length) search.set('fields[route]', fields.join(','))
  if (include?.length) search.set('include', include.join(','))

  if (filter) {
    const lists = {
      'filter[id]': filter.id,
      'filter[stop]': filter.stop,
      'filter[type]': filter.type,
    }
    for (const [key, values] of Object.entries(lists)) {
      if (values?.length) search.set(key, values.join(','))
    }
    if (filter.directionId !== undefined) {
      search.set('filter[direction_id]', String(filter.directionId))
    }
    if (filter.date) search.set('filter[date]', filter.date)
    if (filter.listedRoute !== undefined) {
      search.set('filter[listed_route]', String(filter.listedRoute))
    }
  }

  return search
}

export const routeKeys = {
  all: ['mbta', 'routes'] as const,
  infinite: (params: RoutesInfiniteParams = {}) => [...routeKeys.all, 'infinite', params] as const,
  byIds: (ids: string[]) => [...routeKeys.all, 'by-ids', [...ids].sort()] as const,
}

// Route definitions change on the order of days, not seconds.
const ROUTE_STALE_TIME = 5 * 60_000

export function fetchRoutes(
  params: RoutesParams = {},
  signal?: AbortSignal,
): Promise<RoutesResponse> {
  return mbtaFetch<RoutesResponse>('/routes', buildRoutesSearchParams(params), signal)
}

const DEFAULT_PAGE_LIMIT = 20

/** Pagination is driven by the API's own `links.next`; no `next` means the last page. */
export function getNextRoutesPageParam(lastPage: RoutesResponse): number | undefined {
  const next = lastPage.links?.next
  if (!next) return undefined
  const offset = Number(new URL(next).searchParams.get('page[offset]'))
  return Number.isInteger(offset) && offset >= 0 ? offset : undefined
}

export function routesInfiniteQueryOptions(params: RoutesInfiniteParams = {}) {
  return infiniteQueryOptions<
    RoutesResponse,
    MbtaApiError,
    InfiniteData<RoutesResponse, number>,
    ReturnType<typeof routeKeys.infinite>,
    number
  >({
    queryKey: routeKeys.infinite(params),
    queryFn: ({ pageParam, signal }) =>
      fetchRoutes(
        { ...params, pageLimit: params.pageLimit ?? DEFAULT_PAGE_LIMIT, pageOffset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: getNextRoutesPageParam,
    staleTime: ROUTE_STALE_TIME,
    retry: shouldRetry,
    retryDelay,
  })
}

interface UseInfiniteRoutesOptions {
  enabled?: boolean
}

export function useInfiniteRoutes(
  params: RoutesInfiniteParams = {},
  options: UseInfiniteRoutesOptions = {},
) {
  return useInfiniteQuery({
    ...routesInfiniteQueryOptions(params),
    placeholderData: keepPreviousData,
    ...options,
  })
}

/** Resolves known route ids (e.g. from the URL) to full routes, for display. */
export function routesByIdsQueryOptions(ids: string[]) {
  return queryOptions<RoutesResponse, MbtaApiError>({
    queryKey: routeKeys.byIds(ids),
    queryFn: ({ signal }) =>
      fetchRoutes({ filter: { id: ids }, pageLimit: ids.length }, signal),
    enabled: ids.length > 0,
    staleTime: ROUTE_STALE_TIME,
    retry: shouldRetry,
    retryDelay,
  })
}

export function useRoutesByIds(ids: string[]) {
  return useQuery(routesByIdsQueryOptions(ids))
}
