import { divIcon } from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { isValidLocation } from '../services/routePlanning.js'

function createMarkerIcon(label, kind) {
  return divIcon({
    className: 'route-marker-shell',
    html: `<span class="route-marker route-marker--${kind}">${label}</span>`,
    iconSize: [34, 38],
    iconAnchor: [17, 36],
  })
}

function FitRouteBounds({ points }) {
  const map = useMap()

  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points.map(({ lat, lon }) => [lat, lon]), {
        padding: [32, 32],
        maxZoom: 14,
      })
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 13)
    }
  }, [map, points])

  return null
}

function RouteMap({ pickup, stops }) {
  const validPickup = isValidLocation(pickup)
  const validStops = stops.filter((stop) => isValidLocation(stop.location))
  const mapPoints = [
    ...(validPickup ? [{ ...pickup, kind: 'pickup' }] : []),
    ...validStops.map((stop) => ({ ...stop.location, kind: 'stop', stop })),
  ]
  const center = mapPoints.length
    ? [mapPoints[0].lat, mapPoints[0].lon]
    : [37.7749, -122.4194]
  const linePositions =
    mapPoints.length > 1
      ? mapPoints.map(({ lat, lon }) => [lat, lon])
      : []

  return (
    <div className="relative h-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-[28rem]">
      {mapPoints.length === 0 ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/95 p-6 text-center">
          <div>
            <p className="font-semibold text-slate-800">No valid map locations yet</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
              Add a real pickup coordinate and valid destination coordinates to
              display the route. Geographic coordinates are never guessed from addresses.
            </p>
          </div>
        </div>
      ) : (
        <>
          {(stops.length !== validStops.length || !validPickup) && (
            <div className="absolute left-3 right-3 top-3 z-[500] rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs leading-5 text-amber-900 shadow-sm sm:left-auto sm:max-w-sm">
              {!validPickup && 'Pickup coordinates are missing. '}
              {stops.length !== validStops.length &&
                `${stops.length - validStops.length} stop(s) without valid coordinates are not shown on the map.`}
            </div>
          )}
          <MapContainer
            center={center}
            className="h-full w-full"
            scrollWheelZoom={false}
            zoom={12}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitRouteBounds points={mapPoints} />
            {linePositions.length > 1 && (
              <Polyline
                pathOptions={{ color: '#047857', weight: 4, opacity: 0.8 }}
                positions={linePositions}
              />
            )}
            {validPickup && (
              <Marker
                icon={createMarkerIcon('P', 'pickup')}
                position={[pickup.lat, pickup.lon]}
              >
                <Popup>
                  <strong>{pickup.label || 'Pickup location'}</strong>
                  <br />
                  Route starting point
                </Popup>
              </Marker>
            )}
            {validStops.map((stop) => (
              <Marker
                icon={createMarkerIcon(String(stop.stopNumber), 'stop')}
                key={stop.orderId}
                position={[stop.location.lat, stop.location.lon]}
              >
                <Popup>
                  <strong>Stop {stop.stopNumber}: {stop.orderId}</strong>
                  <br />
                  {stop.address}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </>
      )}
      <div className="absolute bottom-3 right-3 z-[500] rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-500 shadow-sm">
        OpenStreetMap · route line is approximate, not road-following
      </div>
    </div>
  )
}

export default RouteMap
