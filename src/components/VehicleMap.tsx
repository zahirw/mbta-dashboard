import { useEffect, useMemo } from 'react'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface VehicleMapProps {
  latitude: number
  longitude: number
  label: string
  /** Degrees clockwise from true north; no arrow is drawn when null. */
  bearing: number | null
}

const ZOOM = 15

/** Keeps the map centered on the vehicle when its position updates. */
function Recenter({ latitude, longitude }: Pick<VehicleMapProps, 'latitude' | 'longitude'>) {
  const map = useMap()
  useEffect(() => {
    map.setView([latitude, longitude])
  }, [map, latitude, longitude])
  return null
}

/**
 * Built by hand because Leaflet's default marker image URLs break under Vite.
 * Inline hex values mirror primary-600 / primary-800 in index.css (tokens can't reach this HTML).
 */
function createVehicleIcon(bearing: number | null) {
  const arrow =
    bearing === null
      ? ''
      : `<div style="position:absolute;inset:0;transform:rotate(${bearing}deg)">
          <div style="position:absolute;left:50%;top:-8px;margin-left:-5px;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid #06367c"></div>
        </div>`

  return divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="position:relative;width:20px;height:20px">
      ${arrow}
      <div style="position:absolute;inset:3px;border-radius:9999px;background:#174da1;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.3)"></div>
    </div>`,
  })
}

export default function VehicleMap({ latitude, longitude, label, bearing }: VehicleMapProps) {
  const icon = useMemo(() => createVehicleIcon(bearing), [bearing])

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={ZOOM}
      // Wheel zoom is off so scrolling inside the modal doesn't get captured by the map.
      scrollWheelZoom={false}
      className="h-64 w-full rounded-lg"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[latitude, longitude]} icon={icon}>
        <Tooltip direction="top" offset={[0, -12]}>
          Vehicle {label}
        </Tooltip>
      </Marker>
      <Recenter latitude={latitude} longitude={longitude} />
    </MapContainer>
  )
}
