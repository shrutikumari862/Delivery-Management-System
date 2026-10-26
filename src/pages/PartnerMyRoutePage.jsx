import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ExternalLink, MapPinned, PackageCheck } from 'lucide-react'
import DemoDataError from '../components/DemoDataError.jsx'
import RouteMap from '../components/RouteMap.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useDeliveryData } from '../services/useDeliveryData.js'
import {
  getPartnerRouteStops,
  getRouteDirectionsUrl,
  isValidLocation,
} from '../services/routePlanning.js'

function PartnerMyRoutePage() {
  const { partners, orders, routes, error, updateStatus } = useDeliveryData()
  const [searchParams] = useSearchParams()
  const requestedPartnerId = searchParams.get('partnerId')
  const initialPartnerId = partners.find(
    (partner) =>
      partner.id === requestedPartnerId &&
      orders.some(
        (order) =>
          order.partnerId === partner.id &&
          order.status !== 'Delivered' &&
          order.status !== 'Cancelled',
      ) ||
      (partner.id === requestedPartnerId &&
        routes.some((route) => route.partnerId === partner.id)),
  )?.id ?? partners.find(
    (partner) =>
      orders.some(
        (order) =>
          order.partnerId === partner.id &&
          order.status !== 'Delivered' &&
          order.status !== 'Cancelled',
      ) ||
      routes.some((route) => route.partnerId === partner.id),
  )?.id ?? ''
  const [partnerId, setPartnerId] = useState(initialPartnerId)
  const [feedback, setFeedback] = useState(null)

  const partner = partners.find((item) => item.id === partnerId)
  const routePlan = useMemo(
    () => getPartnerRouteStops({ orders, routes }, partnerId),
    [orders, routes, partnerId],
  )
  const savedRoute = routes.find((route) => route.partnerId === partnerId)
  const orderedOrders = routePlan.stops
  const routeStops = routePlan.stops
  const startLocation = routePlan.pickupLocation

  if (error) return <DemoDataError message={error} />

  function markDelivered(order) {
    const result = updateStatus(order.id, partnerId, 'Delivered')
    setFeedback(
      result.ok
        ? { type: 'success', message: `${order.id} marked delivered.` }
        : { type: 'error', message: result.error },
    )
  }

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Delivery partner
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            My Route
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Your saved stop sequence and delivery details. Use the demo partner
            selector only to preview the current prototype.
          </p>
        </div>
        <label className="block w-full sm:w-72">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Demo partner
          </span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            onChange={(event) => {
              setPartnerId(event.target.value)
              setFeedback(null)
            }}
            value={partnerId}
          >
            <option value="">Select a partner</option>
            {partners.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.id}
              </option>
            ))}
          </select>
        </label>
      </div>

      {feedback && (
        <div
          className={`mt-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
          role="status"
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 aria-hidden="true" size={18} />
          ) : (
            <AlertCircle aria-hidden="true" size={18} />
          )}
          {feedback.message}
        </div>
      )}

      {!partner ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <MapPinned aria-hidden="true" className="mx-auto text-slate-300" size={30} />
          <p className="mt-3 font-semibold text-slate-800">Select a delivery partner</p>
          <p className="mt-1 text-sm text-slate-500">
            A partner route and assigned stops will appear here.
          </p>
        </div>
      ) : orderedOrders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
          <PackageCheck aria-hidden="true" className="mx-auto text-slate-300" size={30} />
          <p className="mt-3 font-semibold text-slate-800">No active delivery stops</p>
          <p className="mt-1 text-sm text-slate-500">
            Completed and cancelled orders are not shown on the active route.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {savedRoute ? 'Saved delivery route' : 'Assigned delivery stops'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {partner.name} · {routeStops.length} active stops
                  </p>
                </div>
                {savedRoute && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 aria-hidden="true" size={14} />
                    Saved
                  </span>
                )}
              </div>
              {savedRoute && (
                <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Start: <span className="font-semibold text-slate-800">{savedRoute.pickupLocation.label}</span>
                  {isValidLocation(savedRoute.pickupLocation) &&
                    ` · ${savedRoute.pickupLocation.lat.toFixed(4)}, ${savedRoute.pickupLocation.lon.toFixed(4)}`}
                </div>
              )}
              <ol className="divide-y divide-slate-100">
                {orderedOrders.map((order) => {
                  const directionsUrl = getRouteDirectionsUrl(order)
                  return (
                    <li className="py-4 first:pt-1 last:pb-1" key={order.orderId}>
                      <div className="flex items-start gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white">
                          {order.stopNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">{order.orderId}</h3>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {order.address}
                          </p>
                          {isValidLocation(order.location) && (
                            <p className="mt-1 text-xs text-slate-500">
                              {order.location.lat.toFixed(4)},{' '}
                              {order.location.lon.toFixed(4)}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {directionsUrl && (
                              <a
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                href={directionsUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <ExternalLink aria-hidden="true" size={14} />
                                Open directions
                              </a>
                            )}
                            {order.status === 'Out for delivery' && (
                              <button
                                className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
                                onClick={() =>
                                  markDelivered({
                                    id: order.orderId,
                                    status: order.status,
                                  })
                                }
                                type="button"
                              >
                                Mark delivered
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4">
                <h2 className="font-semibold text-slate-900">Route overview</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Approximate straight-line line between known locations.
                </p>
              </div>
              <RouteMap pickup={startLocation} stops={routeStops} />
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Directions open an external map using the address or coordinates.
                This prototype does not provide live GPS, road distance, or travel-time estimates.
              </p>
            </section>
          </div>
        </>
      )}
    </section>
  )
}

export default PartnerMyRoutePage
