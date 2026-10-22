import type { VehicleResource } from '../api/mbta/types'
import { formatRelativeTime } from '../lib/formatTime'
import { statusBadgeClass } from '../lib/vehicleStatus'

interface VehicleCardProps {
  vehicle: VehicleResource
  onSelect: (id: string) => void
}

function BusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-7 shrink-0 text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="3" width="16" height="15" rx="3" />
      <path d="M4 11h16M8 18v2M16 18v2" />
      <circle cx="8" cy="14.5" r="0.5" fill="currentColor" />
      <circle cx="16" cy="14.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

export default function VehicleCard({ vehicle, onSelect }: VehicleCardProps) {
  const { label, current_status, latitude, longitude, updated_at } = vehicle.attributes

  return (
    <article className="relative overflow-hidden rounded-xl border border-primary-200 bg-secondary p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500">
      <div className="border-b border-primary-200 pb-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-primary">
            {/* Stretched button so the whole card is clickable without nesting content in a button. */}
            <button
              type="button"
              onClick={() => onSelect(vehicle.id)}
              className="text-left outline-none after:absolute after:inset-0 after:content-['']"
            >
              Vehicle {label ?? vehicle.id}
            </button>
          </h2>
          <BusIcon />
        </div>
        <p
          className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(current_status)}`}
        >
          {current_status.replaceAll('_', ' ')}
        </p>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-primary-600">Latitude</dt>
          <dd className="text-black">{latitude.toFixed(5)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-primary-600">Longitude</dt>
          <dd className="text-black">{longitude.toFixed(5)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-primary-600">Last update</dt>
          <dd className="text-black" title={new Date(updated_at).toLocaleString()}>
            {formatRelativeTime(updated_at)}
          </dd>
        </div>
      </dl>
    </article>
  )
}
