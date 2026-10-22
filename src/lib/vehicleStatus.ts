import type { VehicleCurrentStatus, VehicleOccupancyStatus } from '../api/mbta/types'

/** Badge colors per vehicle status, so the status reads at a glance. */
const STATUS_CLASS: Record<VehicleCurrentStatus, string> = {
  IN_TRANSIT_TO: 'bg-green-100 text-green-800',
  STOPPED_AT: 'bg-amber-100 text-amber-800',
  INCOMING_AT: 'bg-violet-100 text-violet-800',
}

export function statusBadgeClass(status: VehicleCurrentStatus): string {
  return STATUS_CLASS[status]
}

const OCCUPANCY_CLASS: Record<VehicleOccupancyStatus, string> = {
  MANY_SEATS_AVAILABLE: 'bg-green-100 text-green-800',
  FEW_SEATS_AVAILABLE: 'bg-amber-100 text-amber-800',
  FULL: 'bg-red-100 text-red-800',
  NO_DATA_AVAILABLE: 'bg-surface text-black',
}

export function occupancyBadgeClass(status: VehicleOccupancyStatus | null): string {
  return status ? OCCUPANCY_CLASS[status] : OCCUPANCY_CLASS.NO_DATA_AVAILABLE
}
