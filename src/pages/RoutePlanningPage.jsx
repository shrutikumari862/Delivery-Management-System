import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  MapPinned,
  Package,
  Route as RouteIcon,
  Save,
  Sparkles,
  Undo2,
} from 'lucide-react'
import DemoDataError from '../components/DemoDataError.jsx'
import RouteMap from '../components/RouteMap.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useDeliveryData } from '../services/useDeliveryData.js'
import { isValidLocation, optimizeRoute } from '../services/routePlanning.js'

function getActivePartnerOrders(orders, partnerId) {
  return orders.filter(
    (order) =>
      order.partnerId === partnerId &&
      order.status !== 'Cancelled' &&
      order.status !== 'Delivered',
  )
}

function getRouteStopIds(routes, partnerId, partnerOrders) {
  const activeOrders = getActivePartnerOrders(partnerOrders, partnerId)
  const activeIds = new Set(activeOrders.map((order) => order.id))
  const savedRoute = routes.find((route) => route.partnerId === partnerId)
  const savedIds = (savedRoute?.stopOrderIds ?? []).filter((id) => activeIds.has(id))
  const includedIds = new Set(savedIds)
  return [
    ...savedIds,
    ...activeOrders.filter((order) => !includedIds.has(order.id)).map((order) => order.id),
  ]
}

function RoutePlanningPage() {
  const {
    partners,
    orders,
    routes,
    error,
    saveRoute,
    updateLocation,
  } = useDeliveryData()
  const [partnerId, setPartnerId] = useState(
    () => partners.find((partner) => getActivePartnerOrders(orders, partner.id).length > 0)?.id ?? '',
  )
  const [selectedOrderIds, setSelectedOrderIds] = useState(
    () => (partnerId ? getRouteStopIds(routes, partnerId, orders) : []),
  )
  const initialSavedRoute = routes.find((route) => route.partnerId === partnerId)
  const [pickupLabel, setPickupLabel] = useState(initialSavedRoute?.pickupLocation?.label ?? '')
  const [pickupLat, setPickupLat] = useState(
    initialSavedRoute?.pickupLocation?.lat?.toString() ?? '',
  )
  const [pickupLon, setPickupLon] = useState(
    initialSavedRoute?.pickupLocation?.lon?.toString() ?? '',
  )
  const [locationForms, setLocationForms] = useState({})
  const [optimizedOrderIds, setOptimizedOrderIds] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [saving, setSaving] = useState(false)
  const [optimizing, setOptimizing] = useState(false)

  const activeOrders = useMemo(
    () => getActivePartnerOrders(orders, partnerId),
    [orders, partnerId],
  )
  const selectedOrders = useMemo(() => {
    const selected = new Set(selectedOrderIds)
    return activeOrders.filter((order) => selected.has(order.id))
  }, [activeOrders, selectedOrderIds])
  const selectedOrderById = new Map(selectedOrders.map((order) => [order.id, order]))
  const originalStops = selectedOrderIds
    .map((id) => selectedOrderById.get(id))
    .filter(Boolean)
    .map((order, index) => ({
      orderId: order.id,
      address: order.destination?.address ?? 'Address not provided',
      location: order.destination?.location,
      stopNumber: index + 1,
      order,
    }))
  const orderedStops =
    optimizedOrderIds === null
      ? originalStops
      : optimizedOrderIds
          .map((id) => selectedOrderById.get(id))
          .filter(Boolean)
          .map((order, index) => ({
            orderId: order.id,
            address: order.destination?.address ?? 'Address not provided',
            location: order.destination?.location,
            stopNumber: index + 1,
            order,
          }))
  const pickupLocation = {
    label: pickupLabel.trim() || 'Pickup location',
    lat: Number(pickupLat),
    lon: Number(pickupLon),
  }
  const pickupIsValid =
    pickupLat.trim() !== '' &&
    pickupLon.trim() !== '' &&
    isValidLocation(pickupLocation)
  const invalidStopCount = orderedStops.filter((stop) => !isValidLocation(stop.location)).length
  const optimization =
    originalStops.length > 0 &&
    pickupIsValid &&
    originalStops.every((stop) => isValidLocation(stop.location))
      ? optimizeRoute(pickupLocation, originalStops)
      : null
  const savedRoute = routes.find((route) => route.partnerId === partnerId)
  const savedRouteMatches =
    savedRoute &&
    savedRoute.stopOrderIds.length === orderedStops.length &&
    savedRoute.stopOrderIds.every((id, index) => id === orderedStops[index]?.orderId)

  if (error) return <DemoDataError message={error} />

  function choosePartner(nextPartnerId) {
    setPartnerId(nextPartnerId)
    setSelectedOrderIds(getRouteStopIds(routes, nextPartnerId, orders))
    const nextRoute = routes.find((route) => route.partnerId === nextPartnerId)
    setPickupLabel(nextRoute?.pickupLocation?.label ?? '')
    setPickupLat(nextRoute?.pickupLocation?.lat?.toString() ?? '')
    setPickupLon(nextRoute?.pickupLocation?.lon?.toString() ?? '')
    setOptimizedOrderIds(null)
    setLocationForms({})
    setFeedback(null)
  }

  function toggleStop(orderId) {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    )
    setOptimizedOrderIds(null)
    setFeedback(null)
  }

  async function handleOptimize() {
    setFeedback(null)
    if (!optimization?.ok) {
      setFeedback({
        type: 'error',
        message:
          optimization?.error ??
          `Add a valid pickup coordinate and destination coordinates for all ${invalidStopCount} incomplete stop(s) before optimizing.`,
      })
      return
    }
    setOptimizing(true)
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    setOptimizedOrderIds(optimization.optimizedStops.map((stop) => stop.orderId))
    setOptimizing(false)
    setFeedback({
      type: 'success',
      message: optimization.improved
        ? `Nearest-neighbor sequence calculated. Approximate straight-line distance saved: ${optimization.distanceSavedKm.toFixed(2)} km.`
        : 'Nearest-neighbor sequence calculated. It did not shorten the approximate straight-line distance.',
    })
  }

  function saveStopLocation(orderId) {
    const values = locationForms[orderId] ?? {}
    if (!values.lat?.trim() || !values.lon?.trim()) {
      setFeedback({
        type: 'error',
        message: `Enter both latitude and longitude for ${orderId}.`,
      })
      return
    }
    const result = updateLocation(orderId, {
      lat: Number(values.lat),
      lon: Number(values.lon),
    })
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.error })
      return
    }
    setOptimizedOrderIds(null)
    setLocationForms((current) => {
      const next = { ...current }
      delete next[orderId]
      return next
    })
    setFeedback({
      type: 'success',
      message: `Coordinates saved for ${orderId}. Use the verified destination coordinates for this address.`,
    })
  }

  async function handleSaveRoute() {
    if (saving) return
    setSaving(true)
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    const result = saveRoute(
      partnerId,
      pickupLocation,
      orderedStops.map((stop) => stop.orderId),
    )
    setSaving(false)
    setFeedback(
      result.ok
        ? {
            type: 'success',
            message: 'Route saved to this browser’s demo data.',
          }
        : { type: 'error', message: result.error },
    )
  }

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Dispatch desk
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Route planning
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Sequence active assigned orders with a nearest-neighbor heuristic.
            Distances are approximate straight-line estimates, not road routes.
          </p>
        </div>
        {savedRouteMatches && (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 aria-hidden="true" size={16} />
            Saved route
          </span>
        )}
      </div>

      {feedback && (
        <div
          className={`mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
          role="status"
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
          ) : (
            <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
          )}
          <span className="leading-6">{feedback.message}</span>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(19rem,0.85fr)_minmax(0,1.4fr)]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Route setup</h2>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Delivery partner
              </span>
              <select
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                onChange={(event) => choosePartner(event.target.value)}
                value={partnerId}
              >
                <option value="">Select a delivery partner</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} · {partner.id}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <MapPinned aria-hidden="true" className="text-emerald-800" size={17} />
                Pickup / route start
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Location label
                </span>
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                  onChange={(event) => setPickupLabel(event.target.value)}
                  placeholder="Enter the actual pickup location"
                  value={pickupLabel}
                />
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Latitude
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                    inputMode="decimal"
                    onChange={(event) => setPickupLat(event.target.value)}
                    placeholder="-90 to 90"
                    type="number"
                    value={pickupLat}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Longitude
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                    inputMode="decimal"
                    onChange={(event) => setPickupLon(event.target.value)}
                    placeholder="-180 to 180"
                    type="number"
                    value={pickupLon}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Enter verified coordinates. No warehouse location is assumed or
                inferred from an address.
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-900">Assigned active orders</h2>
                <span className="text-xs text-slate-500">
                  {activeOrders.length} available
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Cancelled and delivered orders are excluded. Select or remove stops.
              </p>
            </div>
            {activeOrders.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Package aria-hidden="true" className="mx-auto text-slate-300" size={26} />
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  No active assigned orders
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Assign orders first, then return to build a route.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {activeOrders.map((order) => {
                  const selected = selectedOrderIds.includes(order.id)
                  const location = order.destination?.location
                  const form = locationForms[order.id]
                  return (
                    <li className="p-4" key={order.id}>
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          checked={selected}
                          className="mt-1 size-4 accent-emerald-800"
                          onChange={() => toggleStop(order.id)}
                          type="checkbox"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {order.id}
                            </span>
                            <StatusBadge status={order.status} />
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-600">
                            {order.destination?.address ?? 'Address not provided'}
                          </span>
                          <span
                            className={`mt-1 block text-[11px] ${
                              isValidLocation(location) ? 'text-emerald-800' : 'text-amber-800'
                            }`}
                          >
                            {isValidLocation(location)
                              ? `Coordinates ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
                              : 'Valid coordinates required for map and optimization'}
                          </span>
                        </span>
                      </label>
                      {selected && !isValidLocation(location) && (
                        <div className="ml-7 mt-3 rounded-lg bg-amber-50 p-3">
                          <p className="text-xs font-semibold text-amber-950">
                            Add verified destination coordinates for {order.id}
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <label>
                              <span className="mb-1 block text-[11px] text-amber-900">Latitude</span>
                              <input
                                className="h-9 w-full rounded-md border border-amber-200 bg-white px-2 text-xs outline-none focus:border-emerald-700"
                                inputMode="decimal"
                                onChange={(event) =>
                                  setLocationForms((current) => ({
                                    ...current,
                                    [order.id]: {
                                      ...current[order.id],
                                      lat: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="-90 to 90"
                                type="number"
                                value={form?.lat ?? ''}
                              />
                            </label>
                            <label>
                              <span className="mb-1 block text-[11px] text-amber-900">Longitude</span>
                              <input
                                className="h-9 w-full rounded-md border border-amber-200 bg-white px-2 text-xs outline-none focus:border-emerald-700"
                                inputMode="decimal"
                                onChange={(event) =>
                                  setLocationForms((current) => ({
                                    ...current,
                                    [order.id]: {
                                      ...current[order.id],
                                      lon: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="-180 to 180"
                                type="number"
                                value={form?.lon ?? ''}
                              />
                            </label>
                          </div>
                          <button
                            className="mt-2 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-950"
                            onClick={() => saveStopLocation(order.id)}
                            type="button"
                          >
                            Save verified coordinates
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Route map</h2>
                <p className="mt-1 text-xs text-slate-500">
                  OpenStreetMap tiles · no paid routing service
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!partnerId || selectedOrderIds.length === 0 || !pickupIsValid || invalidStopCount > 0 || optimizing}
                  onClick={handleOptimize}
                  type="button"
                >
                  <Sparkles aria-hidden="true" size={16} />
                  {optimizing ? 'Optimizing…' : 'Optimize route'}
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!selectedOrderIds.length}
                  onClick={() => {
                    setOptimizedOrderIds(null)
                    setFeedback(null)
                  }}
                  type="button"
                >
                  <Undo2 aria-hidden="true" size={16} />
                  Reset original
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3.5 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!partnerId || orderedStops.length === 0 || saving}
                  onClick={handleSaveRoute}
                  type="button"
                >
                  <Save aria-hidden="true" size={16} />
                  {saving ? 'Saving…' : 'Save route'}
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {invalidStopCount > 0
                ? `${invalidStopCount} selected stop(s) need valid coordinates before optimization.`
                : !pickupIsValid
                  ? 'Enter valid pickup coordinates to optimize and display the complete route.'
                  : 'Approximate straight-line distance only. No road distance or travel-time estimate is available.'}
            </p>
            <div className="mt-4">
              <RouteMap pickup={pickupIsValid ? pickupLocation : null} stops={orderedStops} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <RouteIcon aria-hidden="true" className="text-emerald-800" size={18} />
              <h2 className="font-semibold text-slate-900">Route summary & stop sequence</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Total stops</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{orderedStops.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Original distance</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {optimization?.ok
                    ? `${optimization.originalDistanceKm.toFixed(2)} km`
                    : 'Unavailable'}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Current distance</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {optimization?.ok
                    ? `${(optimizedOrderIds
                        ? optimization.optimizedDistanceKm
                        : optimization.originalDistanceKm
                      ).toFixed(2)} km`
                    : 'Unavailable'}
                </p>
              </div>
            </div>
            {optimization?.ok && (
              <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {optimizedOrderIds && optimization.improved
                  ? `Approximate straight-line distance saved: ${optimization.distanceSavedKm.toFixed(2)} km.`
                  : optimizedOrderIds
                    ? 'The proposed sequence did not shorten the approximate straight-line distance.'
                    : optimization.improved
                      ? `Nearest-neighbor suggests a possible ${optimization.distanceSavedKm.toFixed(2)} km straight-line saving.`
                      : 'Nearest-neighbor found no shorter straight-line sequence.'}
              </div>
            )}
            {orderedStops.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                Select active assigned orders to build a route.
              </div>
            ) : (
              <ol className="mt-4 divide-y divide-slate-100">
                {orderedStops.map((stop) => (
                  <li className="flex items-start gap-3 py-3" key={stop.orderId}>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white">
                      {stop.stopNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">
                        {stop.orderId}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                        {stop.address}
                      </span>
                    </span>
                    <button
                      aria-label={`Remove ${stop.orderId} from route`}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      onClick={() => toggleStop(stop.orderId)}
                      type="button"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Distance is calculated from the pickup point through the listed
              stops using the Haversine formula. It is not actual road distance.
              Travel time is not estimated.
            </p>
          </section>
        </div>
      </div>
    </section>
  )
}

export default RoutePlanningPage
