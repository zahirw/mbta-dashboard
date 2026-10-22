import { useEffect, useRef, useState } from 'react'
import ChevronIcon from './ChevronIcon'
import Spinner from './Spinner'
import { hasRequiredTripFilter, useInfiniteTrips, useTripsByIds } from '../api/mbta/trips'
import type { TripResource, TripsInfiniteParams } from '../api/mbta/types'

interface TripDropdownProps {
  /** Selected trip ids */
  value: string[]
  onChange: (ids: string[]) => void
  /** Must include an id, route, route pattern or name filter, e.g. `{ filter: { route: ['1'] } }`. */
  params: TripsInfiniteParams
}

function tripLabel({ id, attributes }: TripResource) {
  return attributes.name || attributes.headsign || id
}

function selectionLabel(labels: string[]) {
  if (labels.length === 0) return 'Select trips'
  if (labels.length <= 2) return labels.join(', ')
  return `${labels.length} trips selected`
}

export default function TripDropdown({ value, onChange, params }: TripDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const sentinelRef = useRef<HTMLLIElement>(null)

  const canLoad = hasRequiredTripFilter(params.filter)

  const { data, error, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteTrips(params, { enabled: open })

  // Ids may come from the URL, so resolve names for them independently of the loaded pages.
  const selected = useTripsByIds(value)
  const names = new Map(
    [...(selected.data?.data ?? []), ...(data?.pages.flatMap((page) => page.data) ?? [])].map(
      (trip) => [trip.id, tripLabel(trip)],
    ),
  )
  const labels = value.map((id) => names.get(id) ?? id)

  // The API has no text search, so filter what has been loaded so far.
  const needle = query.trim().toLowerCase()
  const trips = (data?.pages.flatMap((page) => page.data) ?? []).filter(
    ({ id, attributes }) =>
      !needle || `${attributes.name} ${attributes.headsign} ${id}`.toLowerCase().includes(needle),
  )

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  // Load the next page whenever the sentinel scrolls into view. Re-observing after each
  // fetch or filter change also covers a sentinel that is still visible (e.g. few matches).
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!open || !sentinel || !hasNextPage || isFetchingNextPage) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage()
      },
      { root: listRef.current },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage, trips.length])

  function close() {
    setOpen(false)
    setQuery('')
  }

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((selectedId) => selectedId !== id) : [...value, id])
  }

  return (
    <div
      ref={rootRef}
      className="relative w-full max-w-sm"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        disabled={!canLoad}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex w-full items-center justify-between rounded-md border border-primary-200 bg-secondary px-3 py-2 text-left text-sm transition hover:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 aria-expanded:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-primary-200"
      >
        <span className={`truncate ${value.length ? '' : 'text-primary-500'}`}>
          {canLoad ? selectionLabel(labels) : 'Select a route first'}
        </span>
        {value.length > 0 && selected.isPending && (
          <Spinner label="Loading selected trips…" hideLabel className="ml-2" />
        )}
        <ChevronIcon open={open} />
      </button>

      {open && canLoad && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-primary-200 bg-secondary shadow-md">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trips…"
            className="w-full border-b border-primary-200 px-3 py-2 text-sm outline-none"
          />

          <ul ref={listRef} className="max-h-60 overflow-y-auto text-sm">
            {trips.map((trip) => (
              <li key={trip.id}>
                <button
                  type="button"
                  onClick={() => toggle(trip.id)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-primary-50"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(trip.id)}
                    readOnly
                    tabIndex={-1}
                    className="mt-0.5"
                  />
                  <span>
                    {tripLabel(trip)}
                    {trip.attributes.headsign && trip.attributes.name && (
                      <span className="block text-xs text-primary-600">
                        {trip.attributes.headsign}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}

            {hasNextPage && <li ref={sentinelRef} className="h-1" aria-hidden />}
            {(isPending || isFetchingNextPage) && (
              <li className="px-3 py-2 text-primary-600">
                <Spinner label="Loading trips…" />
              </li>
            )}
            {error && <li className="px-3 py-2 text-red-600">{error.message}</li>}
            {!isPending && !hasNextPage && trips.length === 0 && !error && (
              <li className="px-3 py-2 text-primary-600">No trips found.</li>
            )}
          </ul>

          {value.length > 0 && (
            <div className="flex items-center justify-between border-t border-primary-200 px-3 py-2 text-xs text-primary-600">
              <span>{value.length} selected</span>
              <button type="button" onClick={() => onChange([])} className="underline">
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
