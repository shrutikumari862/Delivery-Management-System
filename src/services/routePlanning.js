export function isValidLocation(location) {
  return (
    location !== null &&
    typeof location === 'object' &&
    Number.isFinite(location.lat) &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    Number.isFinite(location.lon) &&
    location.lon >= -180 &&
    location.lon <= 180
  )
}

export function haversineDistanceKm(first, second) {
  if (!isValidLocation(first) || !isValidLocation(second)) return null

  const radians = (degrees) => (degrees * Math.PI) / 180
  const latitudeDelta = radians(second.lat - first.lat)
  const longitudeDelta = radians(second.lon - first.lon)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.lat)) *
      Math.cos(radians(second.lat)) *
      Math.sin(longitudeDelta / 2) ** 2
  const boundedHaversine = Math.min(1, Math.max(0, haversine))

  return 6371 * 2 * Math.atan2(
    Math.sqrt(boundedHaversine),
    Math.sqrt(1 - boundedHaversine),
  )
}

function getRouteDistanceKm(startLocation, stops) {
  let total = 0
  let previousLocation = startLocation

  for (const stop of stops) {
    const distance = haversineDistanceKm(previousLocation, stop.location)
    if (distance === null) return null
    total += distance
    previousLocation = stop.location
  }

  return total
}

function getLocationErrors(startLocation, stops) {
  const errors = []
  if (!isValidLocation(startLocation)) {
    errors.push('Enter a valid pickup/start coordinate to calculate the route.')
  }

  for (const stop of stops) {
    if (!stop.orderId) {
      errors.push('Every route stop must have an order ID.')
    }
    if (!isValidLocation(stop.location)) {
      errors.push(`Order ${stop.orderId || '(unknown)'} needs valid destination coordinates.`)
    }
  }

  const orderIds = stops.map((stop) => stop.orderId)
  if (new Set(orderIds).size !== orderIds.length) {
    errors.push('A route cannot contain duplicate order stops.')
  }

  return errors
}

export function optimizeRoute(startLocation, stops) {
  if (!Array.isArray(stops)) {
    return { ok: false, error: 'Route stops must be provided as a list.' }
  }

  const errors = getLocationErrors(startLocation, stops)
  if (errors.length > 0) return { ok: false, error: errors.join(' ') }

  const originalStops = stops.map((stop) => ({ ...stop }))
  const originalDistanceKm = getRouteDistanceKm(startLocation, originalStops)
  const remainingStops = stops.map((stop, index) => ({
    ...stop,
    originalIndex: index,
  }))
  const optimizedStops = []
  let currentLocation = startLocation

  while (remainingStops.length > 0) {
    let nearestIndex = 0
    let nearestDistance = haversineDistanceKm(currentLocation, remainingStops[0].location)

    for (let index = 1; index < remainingStops.length; index += 1) {
      const candidateDistance = haversineDistanceKm(
        currentLocation,
        remainingStops[index].location,
      )
      const currentCandidate = remainingStops[nearestIndex]
      if (
        candidateDistance < nearestDistance ||
        (candidateDistance === nearestDistance &&
          (remainingStops[index].originalIndex < currentCandidate.originalIndex ||
            (remainingStops[index].originalIndex === currentCandidate.originalIndex &&
              remainingStops[index].orderId.localeCompare(currentCandidate.orderId) < 0)))
      ) {
        nearestIndex = index
        nearestDistance = candidateDistance
      }
    }

    const [nearestStop] = remainingStops.splice(nearestIndex, 1)
    optimizedStops.push(nearestStop)
    currentLocation = nearestStop.location
  }

  const stopsWithoutInternalIndex = optimizedStops.map((stop) => {
    const { originalIndex: _originalIndex, ...publicStop } = stop
    return publicStop
  })
  const optimizedDistanceKm = getRouteDistanceKm(startLocation, stopsWithoutInternalIndex)
  const distanceSavedKm =
    originalDistanceKm !== null &&
    optimizedDistanceKm !== null &&
    originalDistanceKm > optimizedDistanceKm
      ? originalDistanceKm - optimizedDistanceKm
      : 0

  return {
    ok: true,
    algorithm: 'nearest-neighbor',
    originalStops,
    optimizedStops: stopsWithoutInternalIndex,
    originalDistanceKm,
    optimizedDistanceKm,
    distanceSavedKm,
    improved: distanceSavedKm > 0.001,
    distanceLabel: 'Approximate straight-line distance; not road distance.',
  }
}

export function getRouteDirectionsUrl(order) {
  const location = order?.destination?.location
  if (isValidLocation(location)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${location.lat},${location.lon}`)}&travelmode=driving`
  }

  const address = order?.destination?.address?.trim()
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`
  }

  return null
}

export function getPartnerRouteStops(data, partnerId) {
  const activeOrders = data.orders.filter(
    (order) =>
      order.partnerId === partnerId &&
      order.status !== 'Delivered' &&
      order.status !== 'Cancelled',
  )
  const ordersById = new Map(activeOrders.map((order) => [order.id, order]))
  const savedRoute = data.routes?.find((route) => route.partnerId === partnerId)
  const savedOrderIds = savedRoute?.stopOrderIds ?? []
  const savedIdSet = new Set(savedOrderIds)
  const orderedOrders = [
    ...savedOrderIds.map((id) => ordersById.get(id)).filter(Boolean),
    ...activeOrders.filter((order) => !savedIdSet.has(order.id)),
  ]

  return {
    pickupLocation: savedRoute?.pickupLocation ?? null,
    stops: orderedOrders.map((order, index) => ({
      orderId: order.id,
      address: order.destination?.address ?? 'Delivery address not available',
      location: order.destination?.location ?? null,
      status: order.status,
      stopNumber: index + 1,
      destination: {
        address: order.destination?.address ?? '',
        location: order.destination?.location ?? null,
      },
    })),
  }
}
