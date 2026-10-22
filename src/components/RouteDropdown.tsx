import { useEffect, useRef, useState } from 'react'
import { useInfiniteRoutes, useRoutesByIds } from '../api/mbta/routes'
import type { RouteResource, RoutesInfiniteParams } from '../api/mbta/types'

interface RouteDropdownProps {
  /** Selected route ids */
  value: string[]
  onChange: (ids: string[]) => void
  params?: RoutesInfiniteParams
}

function routeLabel({ id, attributes }: RouteResource) {
  return attributes.short_name || attributes.long_name || id
}

function selectionLabel(labels: string[]) {
  if (labels.length === 0) return 'Select routes'
  if (labels.length <= 2) return labels.join(', ')
  return `${labels.length} routes selected`
}

export default function RouteDropdown({ value, onChange, params }: RouteDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const sentinelRef = useRef<HTMLLIElement>(null)

  const { data, error, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteRoutes(params, { enabled: open })

  // Ids may come from the URL, so resolve names for them independently of the loaded pages.
  const selected = useRoutesByIds(value)
  const names = new Map(
    [...(selected.data?.data ?? []), ...(data?.pages.flatMap((page) => page.data) ?? [])].map(
      (route) => [route.id, routeLabel(route)],
    ),
  )
  const labels = value.map((id) => names.get(id) ?? id)

  // The API has no text search, so filter what has been loaded so far.
  const needle = query.trim().toLowerCase()
  const routes = (data?.pages.flatMap((page) => page.data) ?? []).filter(
    ({ id, attributes }) =>
      !needle || `${attributes.short_name} ${attributes.long_name} ${id}`.toLowerCase().includes(needle),
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
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage, routes.length])

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
        onClick={() => (open ? close() : setOpen(true))}
        className="flex w-full items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-left text-sm"
      >
        <span className={`truncate ${value.length ? '' : 'text-slate-400'}`}>
          {selectionLabel(labels)}
        </span>
        <span aria-hidden className="ml-2">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded border border-slate-300 bg-white shadow">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search routes…"
            className="w-full border-b border-slate-200 px-3 py-2 text-sm outline-none"
          />

          <ul ref={listRef} className="max-h-60 overflow-y-auto text-sm">
            {routes.map((route) => (
              <li key={route.id}>
                <button
                  type="button"
                  onClick={() => toggle(route.id)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(route.id)}
                    readOnly
                    tabIndex={-1}
                    className="mt-0.5"
                  />
                  <span>
                    {routeLabel(route)}
                    {route.attributes.long_name && route.attributes.short_name && (
                      <span className="block text-xs text-slate-500">
                        {route.attributes.long_name}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}

            {hasNextPage && <li ref={sentinelRef} className="h-1" aria-hidden />}
            {(isPending || isFetchingNextPage) && (
              <li className="px-3 py-2 text-slate-500">Loading…</li>
            )}
            {error && <li className="px-3 py-2 text-red-600">{error.message}</li>}
            {!isPending && !hasNextPage && routes.length === 0 && !error && (
              <li className="px-3 py-2 text-slate-500">No routes found.</li>
            )}
          </ul>

          {value.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
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
