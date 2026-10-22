import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useVehicles } from '../api/mbta/vehicles'
import type { TripsInfiniteParams, VehiclesFilter } from '../api/mbta/types'
import Pagination from '../components/Pagination'
import RouteDropdown from '../components/RouteDropdown'
import TripDropdown from '../components/TripDropdown'
import Spinner from '../components/Spinner'
import VehicleCard from '../components/VehicleCard'
import VehicleDetailModal from '../components/VehicleDetailModal'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]
const DEFAULT_PAGE_SIZE = 10
/** Buses only, until specific routes are picked. */
const DEFAULT_FILTER: VehiclesFilter = { routeType: [3] }

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Invalid or missing values fall back to the defaults, which are kept out of the URL.
  const requestedPage = Math.max(1, Math.floor(Number(searchParams.get('page'))) || 1)
  const requestedPageSize = Number(searchParams.get('pageSize'))
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize)
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE

  function updateSearchParams(updates: Record<string, string | null>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      return next
    })
  }

  function setPage(page: number) {
    updateSearchParams({ page: page > 1 ? String(page) : null })
  }

  function setPageSize(size: number) {
    updateSearchParams({
      pageSize: size === DEFAULT_PAGE_SIZE ? null : String(size),
      page: null,
    })
  }

  const routeParam = searchParams.get('route') ?? ''
  const routeIds = useMemo(() => routeParam.split(',').filter(Boolean), [routeParam])
  const tripParam = searchParams.get('trip') ?? ''
  const tripIds = useMemo(() => tripParam.split(',').filter(Boolean), [tripParam])
  // The vehicles API rejects `filter[trip]` combined with any other filter, so trips take over.
  const filter = useMemo<VehiclesFilter>(() => {
    if (tripIds.length) return { trip: tripIds }
    return routeIds.length ? { route: routeIds } : DEFAULT_FILTER
  }, [routeIds, tripIds])
  const tripsParams = useMemo<TripsInfiniteParams>(
    () => ({ filter: { route: routeIds }, sort: 'name' }),
    [routeIds],
  )

  // Trips are listed per route, so picking different routes invalidates the trip selection.
  function handleRoutesChange(ids: string[]) {
    updateSearchParams({ route: ids.length ? ids.join(',') : null, trip: null, page: null })
  }

  function handleTripsChange(ids: string[]) {
    updateSearchParams({ trip: ids.length ? ids.join(',') : null, page: null })
  }

  const hasActiveFilters = routeIds.length > 0 || tripIds.length > 0

  function handleReset() {
    updateSearchParams({ route: null, trip: null, page: null })
  }

  const selectedVehicleId = searchParams.get('vehicle')

  function handleVehicleSelect(id: string) {
    updateSearchParams({ vehicle: id })
  }

  const handleVehicleClose = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('vehicle')
      return next
    })
  }, [setSearchParams])

  // MBTA returns no total count, so get it from a one-field, unpaginated query.
  const count = useVehicles({ filter, fields: ['label'] })
  const total = count.data?.data.length ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(requestedPage, totalPages)

  // Sorted so pages stay stable while live positions change.
  const { data, isPending, isPlaceholderData, error } = useVehicles({
    filter,
    pageLimit: pageSize,
    pageOffset: (page - 1) * pageSize,
    sort: 'label',
  })

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-end">
        <div className="sm:w-72">
          <h3 className="mb-1 text-xs font-medium text-primary-600">Routes</h3>
          <RouteDropdown value={routeIds} onChange={handleRoutesChange} />
        </div>

        <div className="sm:w-72">
          <h3 className="mb-1 text-xs font-medium text-primary-600">Trips</h3>
          <TripDropdown value={tripIds} onChange={handleTripsChange} params={tripsParams} />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="self-start rounded-md px-2 py-2.5 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:self-auto"
          >
            Reset
          </button>
        )}
      </div>

      <h1 className="mb-4 text-2xl font-bold">Vehicles</h1>
      {error && <p className="text-red-600">{error.message}</p>}
      {data && data.data.length === 0 && <p className="text-primary-600">No vehicles found.</p>}

      {isPending && !error && (
        <div aria-busy="true">
          <Spinner label="Loading vehicles…" className="mb-3 text-primary-600" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: Math.min(pageSize, 6) }, (_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        </div>
      )}

      {data && (
        <div className="relative" aria-busy={isPlaceholderData}>
          {/* Previous results stay visible while the next page or filter loads. */}
          {isPlaceholderData && (
            <Spinner
              label="Loading vehicles…"
              className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border border-primary-200 bg-secondary px-3 py-1.5 text-sm text-primary-600 shadow-md"
            />
          )}
          <div
            className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${
              isPlaceholderData ? 'opacity-50' : ''
            }`}
          >
            {data.data.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} onSelect={handleVehicleSelect} />
            ))}
          </div>
        </div>
      )}

      {data && count.isPending && (
        <Spinner label="Loading pagination…" className="mt-4 text-sm text-primary-600" />
      )}

      {data && count.data && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedVehicleId && (
        <VehicleDetailModal vehicleId={selectedVehicleId} onClose={handleVehicleClose} />
      )}
    </section>
  )
}
