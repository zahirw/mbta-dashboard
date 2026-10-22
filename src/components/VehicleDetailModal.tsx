import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useVehicle } from '../api/mbta/vehicles'
import type {
  IncludedResource,
  JsonApiRelationship,
  RouteAttributes,
  TripAttributes,
  VehicleResponse,
} from '../api/mbta/types'

// Leaflet is only needed once a popup opens, so keep it out of the main bundle.
const VehicleMap = lazy(() => import('./VehicleMap'))

interface VehicleDetailModalProps {
  vehicleId: string
  onClose: () => void
}

const EMPTY = '–'

function formatEnum(value: string | null | undefined): string {
  return value ? value.replaceAll('_', ' ') : EMPTY
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
    <section>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <dl className="space-y-1 text-sm">{children}</dl>
    </section>
  )
}

interface FieldProps {
  label: string
  children: ReactNode
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-600">{label}</dt>
      <dd className="text-right font-medium">{children ?? EMPTY}</dd>
    </div>
  )
}

export default function VehicleDetailModal({ vehicleId, onClose }: VehicleDetailModalProps) {
  // Poll so the marker follows the vehicle while the popup is open.
  const { data, isPending, error } = useVehicle(
    vehicleId,
    { include: ['route', 'trip', 'stop'] },
    { refetchInterval: 10_000 },
  )
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vehicle-detail-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 text-slate-900 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="vehicle-detail-title" className="text-xl font-bold">
            Vehicle {attrs?.label ?? vehicleId}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded border border-slate-300 bg-white px-2 py-0.5 text-sm hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {isPending && <p className="text-slate-500">Loading…</p>}
        {error && <p className="text-red-600">{error.message}</p>}

        {attrs && (
          <div className="space-y-5">
            <p className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {formatEnum(attrs.current_status)}
            </p>

            {/* `isolate` keeps Leaflet's high z-index panes inside the modal's stacking context. */}
            <div className="isolate">
              <Suspense fallback={<div className="h-64 rounded-lg bg-slate-100" />}>
                <VehicleMap
                  latitude={attrs.latitude}
                  longitude={attrs.longitude}
                  label={attrs.label ?? vehicleId}
                  bearing={attrs.bearing}
                />
              </Suspense>
            </div>

            <Section title="Position">
              <Field label="Latitude">{attrs.latitude}</Field>
              <Field label="Longitude">{attrs.longitude}</Field>
              <Field label="Last update">{new Date(attrs.updated_at).toLocaleString()}</Field>
            </Section>

            <Section title="Route">
              <Field label="Name">{route ? `${route.short_name} ${route.long_name}`.trim() : EMPTY}</Field>
              <Field label="Direction">
                {route && directionId !== null ? route.direction_names[directionId] : EMPTY}
              </Field>
              <Field label="Destination">
                {route && directionId !== null ? route.direction_destinations[directionId] : EMPTY}
              </Field>
            </Section>

            <Section title="Trip">
              <Field label="Name">{trip?.name || EMPTY}</Field>
              <Field label="Headsign">{trip?.headsign}</Field>
              <Field label="Block">{trip?.block_id}</Field>
              <Field label="Wheelchair">
                {trip ? formatAccess(trip.wheelchair_accessible, 'Accessible', 'Not accessible') : EMPTY}
              </Field>
              <Field label="Bikes">
                {trip ? formatAccess(trip.bikes_allowed, 'Allowed', 'Not allowed') : EMPTY}
              </Field>
            </Section>

            <Section title="Other">
              <Field label="Stop">{stop?.name}</Field>
              <Field label="Stop sequence">{attrs.current_stop_sequence}</Field>
              <Field label="Speed">
                {attrs.speed !== null ? `${(attrs.speed * 3.6).toFixed(1)} km/h` : EMPTY}
              </Field>
              <Field label="Bearing">{attrs.bearing !== null ? `${attrs.bearing}°` : EMPTY}</Field>
              <Field label="Occupancy">{formatEnum(attrs.occupancy_status)}</Field>
              <Field label="Revenue">{formatEnum(attrs.revenue)}</Field>
            </Section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
