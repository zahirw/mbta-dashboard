import type { VehicleResource } from '../api/mbta/types'

interface VehicleCardProps {
  vehicle: VehicleResource
  onSelect: (id: string) => void
}

export default function VehicleCard({ vehicle, onSelect }: VehicleCardProps) {
  const { label, current_status, latitude, longitude, updated_at } = vehicle.attributes

  return (
    <article className="relative rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500">
      <h2 className="font-semibold">
        {/* Stretched button so the whole card is clickable without nesting content in a button. */}
        <button
          type="button"
          onClick={() => onSelect(vehicle.id)}
          className="text-left outline-none after:absolute after:inset-0 after:content-['']"
        >
          Vehicle {label ?? vehicle.id}
        </button>
      </h2>
      <p className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
        {current_status.replaceAll('_', ' ')}
      </p>
      <dl className="mt-3 space-y-1 text-sm text-slate-600">
        <div className="flex justify-between gap-2">
          <dt>Latitude</dt>
          <dd>{latitude}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Longitude</dt>
          <dd>{longitude}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Last update</dt>
          <dd>{new Date(updated_at).toLocaleString()}</dd>
        </div>
      </dl>
    </article>
  )
}
