import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useVehicles } from '../api/mbta/vehicles'
import type { TripsInfiniteParams, VehiclesFilter } from '../api/mbta/types'
import Pagination from '../components/Pagination'
import RouteDropdown from '../components/RouteDropdown'
import TripDropdown from '../components/TripDropdown'
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
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <div className="w-full sm:w-auto sm:flex-1 sm:max-w-sm">
          <h2 className="mb-2 text-lg font-semibold">Routes</h2>
          <RouteDropdown value={routeIds} onChange={handleRoutesChange} />
        </div>

        <div className="w-full sm:w-auto sm:flex-1 sm:max-w-sm">
          <h2 className="mb-2 text-lg font-semibold">Trips</h2>
          <TripDropdown value={tripIds} onChange={handleTripsChange} params={tripsParams} />
        </div>
      </div>

      <h1 className="mb-4 text-2xl font-bold">Vehicles</h1>
      {isPending && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">{error.message}</p>}
      {data && data.data.length === 0 && <p className="text-slate-500">No vehicles found.</p>}

      <div
        className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${
          isPlaceholderData ? 'opacity-50' : ''
        }`}
      >
        {data?.data.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} onSelect={handleVehicleSelect} />
        ))}
      </div>

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
