import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useVehicle } from '../api/mbta/vehicles'
import Spinner from './Spinner'
import { formatRelativeTime } from '../lib/formatTime'
import { occupancyBadgeClass, statusBadgeClass } from '../lib/vehicleStatus'
import type {
  IncludedResource,
  JsonApiRelationship,
  RouteAttributes,
  TripAttributes,
  VehicleResponse,
} from '../api/mbta/types'

// Leaflet is only needed once a popup opens, so keep it out of the main bundle.
const VehicleMap = lazy(() => import('./VehicleMap'))

const REFRESH_MS = 10_000
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

interface VehicleDetailModalProps {
  vehicleId: string
  onClose: () => void
}

const EMPTY = '–'

function formatEnum(value: string | null | undefined): string {
  return value ? value.replaceAll('_', ' ') : EMPTY
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

function compassLabel(bearing: number): string {
  return COMPASS[Math.round(bearing / 22.5) % 16]
}

/** Finds the `included` resource a relationship points at. */
function findIncluded<T>(
  response: VehicleResponse,
  relationship: JsonApiRelationship | undefined,
): T | null {
  const ref = relationship?.data
  if (!ref) return null
  const found = response.included?.find(
    (item: IncludedResource) => item.type === ref.type && item.id === ref.id,
  )
  return (found?.attributes as T | undefined) ?? null
}

function formatAccess(value: 0 | 1 | 2, yes: string, no: string): string {
  if (value === 1) return yes
  if (value === 2) return no
  return 'No information'
}

interface SectionProps {
  title: string
  children: ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="rounded-xl border border-primary-200 p-4">
      <h3 className="mb-3 border-b border-primary-200 pb-2 text-xs font-semibold uppercase tracking-wide text-primary">
        {title}
      </h3>
      <dl className="space-y-2 text-sm">{children}</dl>
    </section>
  )
}

interface FieldProps {
  label: string
  children?: ReactNode
  title?: string
}

function Field({ label, children, title }: FieldProps) {
  const empty = children === null || children === undefined || children === '' || children === EMPTY
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-primary-600">{label}</dt>
      <dd className={`text-right ${empty ? 'text-primary-500' : 'font-medium text-black'}`} title={title}>
        {empty ? EMPTY : children}
      </dd>
    </div>
  )
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50 p-3">
      <p className="text-xs font-medium text-primary-600">{label}</p>
      <div className="mt-1 text-lg font-semibold text-black">{children}</div>
    </div>
  )
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface ${className}`} />
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Spinner label="Loading vehicle details…" className="text-sm text-primary-600" />
      <Skeleton className="h-64" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be unavailable (insecure context); the values stay selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-primary-300 px-2 py-0.5 text-xs font-medium text-primary transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function VehicleDetailModal({ vehicleId, onClose }: VehicleDetailModalProps) {
  // Poll so the marker follows the vehicle while the popup is open.
  const { data, isPending, error } = useVehicle(
    vehicleId,
    { include: ['route', 'trip', 'stop'] },
    { refetchInterval: REFRESH_MS },
  )
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      // Keep Tab inside the dialog.
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const vehicle = data?.data
  const attrs = vehicle?.attributes
  const route = data ? findIncluded<RouteAttributes>(data, vehicle?.relationships.route) : null
  const trip = data ? findIncluded<TripAttributes>(data, vehicle?.relationships.trip) : null
  const stop = data ? findIncluded<{ name: string }>(data, vehicle?.relationships.stop) : null
  const directionId = attrs?.direction_id ?? null
  const routeName = route ? `${route.short_name} ${route.long_name}`.trim() : null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-primary-950/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vehicle-detail-title"
        className="max-h-[92vh] w-full max-w-2xl animate-modal-in overflow-y-auto rounded-t-2xl bg-secondary text-primary shadow-xl motion-reduce:animate-none sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-primary px-5 py-4 text-secondary">
          <div className="min-w-0">
            <h2 id="vehicle-detail-title" className="text-xl font-bold">
              Vehicle {attrs?.label ?? vehicleId}
            </h2>
            {routeName && <p className="mt-0.5 truncate text-sm text-primary-100">{routeName}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {attrs && (
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(attrs.current_status)}`}
                >
                  {formatEnum(attrs.current_status)}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-primary-100">
                <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-green-400" />
                Live · refreshes every {REFRESH_MS / 1000} s
              </span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-secondary/40 p-2 text-secondary transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="p-5">
          {isPending && <LoadingSkeleton />}

          {error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p>{error.message}</p>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 font-medium transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Close
              </button>
            </div>
          )}

          {attrs && (
            <div className="space-y-4">
              {/* `isolate` keeps Leaflet's high z-index panes inside the modal's stacking context. */}
              <div className="isolate overflow-hidden rounded-xl border border-primary-200">
                <Suspense
                  fallback={
                    <div className="flex h-64 items-center justify-center bg-surface">
                      <Spinner label="Loading map…" className="text-sm text-primary-600" />
                    </div>
                  }
                >
                  <VehicleMap
                    latitude={attrs.latitude}
                    longitude={attrs.longitude}
                    label={attrs.label ?? vehicleId}
                    bearing={attrs.bearing}
                  />
                </Suspense>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Tile label="Speed">
                  {attrs.speed !== null ? (
                    <>
                      {(attrs.speed * 3.6).toFixed(1)} <span className="text-sm font-medium">km/h</span>
                    </>
                  ) : (
                    <span className="text-primary-500">{EMPTY}</span>
                  )}
                </Tile>
                <Tile label="Heading">
                  {attrs.bearing !== null ? (
                    <span className="flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        className="size-5 text-primary"
                        style={{ transform: `rotate(${attrs.bearing}deg)` }}
                        fill="currentColor"
                      >
                        <path d="M10 2 15 17l-5-3-5 3z" />
                      </svg>
                      {attrs.bearing}° <span className="text-sm font-medium">{compassLabel(attrs.bearing)}</span>
                    </span>
                  ) : (
                    <span className="text-primary-500">{EMPTY}</span>
                  )}
                </Tile>
                <Tile label="Occupancy">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${occupancyBadgeClass(attrs.occupancy_status)}`}
                  >
                    {formatEnum(attrs.occupancy_status)}
                  </span>
                </Tile>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Section title="Position">
                  <Field label="Latitude">{attrs.latitude}</Field>
                  <Field label="Longitude">{attrs.longitude}</Field>
                  <Field label="Last update" title={new Date(attrs.updated_at).toLocaleString()}>
                    {formatRelativeTime(attrs.updated_at)}
                  </Field>
                  <div className="flex justify-end pt-1">
                    <CopyButton text={`${attrs.latitude}, ${attrs.longitude}`} />
                  </div>
                </Section>

                <Section title="Route">
                  <Field label="Name">{routeName}</Field>
                  <Field label="Direction">
                    {route && directionId !== null ? route.direction_names[directionId] : null}
                  </Field>
                  <Field label="Destination">
                    {route && directionId !== null ? route.direction_destinations[directionId] : null}
                  </Field>
                </Section>

                <Section title="Trip">
                  <Field label="Name">{trip?.name}</Field>
                  <Field label="Headsign">{trip?.headsign}</Field>
                  <Field label="Block">{trip?.block_id}</Field>
                  <Field label="Wheelchair">
                    {trip ? formatAccess(trip.wheelchair_accessible, 'Accessible', 'Not accessible') : null}
                  </Field>
                  <Field label="Bikes">
                    {trip ? formatAccess(trip.bikes_allowed, 'Allowed', 'Not allowed') : null}
                  </Field>
                  <Field label="Revenue">{formatEnum(attrs.revenue)}</Field>
                </Section>

                <Section title="Stop">
                  <Field label="Name">{stop?.name}</Field>
                  <Field label="Sequence">{attrs.current_stop_sequence}</Field>
                </Section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
