import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { mbtaFetch, type MbtaApiError } from './client'
import { retryDelay, shouldRetry } from './retry'
import type { VehicleParams, VehicleResponse, VehiclesParams, VehiclesResponse } from './types'

function buildVehicleSearchParams({ fields, include }: VehicleParams = {}): URLSearchParams {
  const search = new URLSearchParams()
  if (fields?.length) search.set('fields[vehicle]', fields.join(','))
  if (include?.length) search.set('include', include.join(','))
  return search
}

function buildVehiclesSearchParams(params: VehiclesParams = {}): URLSearchParams {
  const { pageLimit, pageOffset, sort, filter } = params
  const search = buildVehicleSearchParams(params)

  if (pageLimit !== undefined) search.set('page[limit]', String(pageLimit))
  if (pageOffset !== undefined) search.set('page[offset]', String(pageOffset))
  if (sort) search.set('sort', sort)

  if (filter) {
    const lists = {
      'filter[id]': filter.id,
      'filter[trip]': filter.trip,
      'filter[label]': filter.label,
      'filter[route]': filter.route,
      'filter[route_type]': filter.routeType,
      'filter[revenue]': filter.revenue,
    }
    for (const [key, values] of Object.entries(lists)) {
      if (values?.length) search.set(key, values.join(','))
    }
    if (filter.directionId !== undefined) {
      search.set('filter[direction_id]', String(filter.directionId))
    }
  }

  return search
}

export const vehicleKeys = {
  all: ['mbta', 'vehicles'] as const,
  list: (params: VehiclesParams = {}) => [...vehicleKeys.all, 'list', params] as const,
  detail: (id: string, params: VehicleParams = {}) =>
    [...vehicleKeys.all, 'detail', id, params] as const,
}

// Vehicle positions are live data, so go stale much sooner than the global default.
const VEHICLE_STALE_TIME = 10_000

export function fetchVehicles(
  params: VehiclesParams = {},
  signal?: AbortSignal,
): Promise<VehiclesResponse> {
  return mbtaFetch<VehiclesResponse>('/vehicles', buildVehiclesSearchParams(params), signal)
}

export function vehiclesQueryOptions(params: VehiclesParams = {}) {
  return queryOptions<VehiclesResponse, MbtaApiError>({
    queryKey: vehicleKeys.list(params),
    queryFn: ({ signal }) => fetchVehicles(params, signal),
    staleTime: VEHICLE_STALE_TIME,
    retry: shouldRetry,
    retryDelay,
  })
}

export function fetchVehicle(
  id: string,
  params: VehicleParams = {},
  signal?: AbortSignal,
): Promise<VehicleResponse> {
  return mbtaFetch<VehicleResponse>(
    `/vehicles/${encodeURIComponent(id)}`,
    buildVehicleSearchParams(params),
    signal,
  )
}

export function vehicleQueryOptions(id: string, params: VehicleParams = {}) {
  return queryOptions<VehicleResponse, MbtaApiError>({
    queryKey: vehicleKeys.detail(id, params),
    queryFn: ({ signal }) => fetchVehicle(id, params, signal),
    staleTime: VEHICLE_STALE_TIME,
    retry: shouldRetry,
    retryDelay,
  })
}

interface UseVehiclesOptions {
  enabled?: boolean
  /** Poll interval in ms; omit for no polling. */
  refetchInterval?: number | false
}

export function useVehicle(id: string, params: VehicleParams = {}, options: UseVehiclesOptions = {}) {
  return useQuery({
    ...vehicleQueryOptions(id, params),
    ...options,
  })
}

export function useVehicles(params: VehiclesParams = {}, options: UseVehiclesOptions = {}) {
  return useQuery({
    ...vehiclesQueryOptions(params),
    placeholderData: keepPreviousData,
    ...options,
  })
}
