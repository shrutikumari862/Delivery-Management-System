import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  ExternalLink,
  MapPinned,
  PackageCheck,
  Truck,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import RouteMap from '../components/RouteMap.jsx'
import { parseTimestamp } from '../services/deliveryAnalytics.js'
import { getPartnerRouteStops } from '../services/routePlanning.js'
import { useDeliveryData } from '../services/useDeliveryData.js'

const EXCEPTION_TYPES = [
  'Delivery delayed',
  'Failed delivery attempt',
  'Incorrect or incomplete address',
  'Customer unavailable',
  'Damaged shipment',
  'Route or assignment issue',
]
const ROLE_LABELS = {
  admin: 'Admin',
  warehouseStaff: 'Warehouse staff',
  deliveryPartner: 'Delivery partner',
}

function formatTimestamp(value) {
  const timestamp = parseTimestamp(value)
  return timestamp === null
    ? 'Timestamp unavailable'
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(timestamp)
}

function getEventTitle(event) {
  if (event.type === 'created') return 'Order created'
  if (event.type === 'assigned') return 'Delivery partner assigned'
  if (event.type === 'status') return event.status
  if (event.type === 'delayed') return 'Delivery delayed'
  if (event.type === 'attempt_failed') return 'Failed delivery attempt'
  if (event.type === 'exception') return `Exception ${event.status.toLocaleLowerCase()}`
  const notificationTitles = {
    'delivery.delayed': 'Delivery delayed',
    'delivery.attempt_failed': 'Failed delivery attempt',
    'order.packed': 'Order packed',
    'order.dispatched': 'Order dispatched',
    'order.out_for_delivery': 'Out for delivery',
    'order.delivered': 'Delivered',
    'order.assigned': 'Delivery partner assigned',
  }
  return notificationTitles[event.eventType] ?? null
}

function getEventDescription(event) {
  if (event.notes) return event.notes
  if (event.type === 'exception') {
    return `${event.description ? `${event.description} · ` : ''}Exception status changed to ${event.status}.`
  }
  if (event.type === 'delayed') return 'A delivery delay was explicitly reported.'
  if (event.type === 'attempt_failed') return 'An unsuccessful delivery attempt was explicitly recorded.'
  return event.description ?? ''
}

function ShipmentMonitoringDetailsPage() {
  const { orderId } = useParams()
  const {
    orders,
    partners,
    routes,
    notifications,
    orderEvents,
    exceptions,
    createException,
    updateException,
    error,
  } = useDeliveryData()
  const order = orders.find((item) => item.id === orderId)
  const partner = partners.find((item) => item.id === order?.partnerId)
  const routePlan = useMemo(
    () =>
      order?.partnerId
        ? getPartnerRouteStops({ orders, routes }, order.partnerId)
        : {
            pickupLocation: null,
            stops: order
              ? [{
                  orderId: order.id,
                  address: order.destination?.address ?? 'Destination unavailable',
                  location: order.destination?.location ?? null,
                  stopNumber: 1,
                }]
              : [],
          },
    [order, orders, routes],
  )
  const [type, setType] = useState(EXCEPTION_TYPES[0])
  const [severity, setSeverity] = useState('Medium')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [responsibleRole, setResponsibleRole] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [saving, setSaving] = useState(false)

  const timeline = useMemo(() => {
    if (!order) return []
    const items = []
    if (order.createdAt) {
      items.push({
        id: `created:${order.id}`,
        type: 'created',
        occurredAt: order.createdAt,
        description: '',
      })
    }
    if (order.dispatchedAt) {
      items.push({
        id: `dispatched:${order.id}`,
        type: 'status',
        status: 'Dispatched',
        occurredAt: order.dispatchedAt,
      })
    }
    if (order.deliveredAt) {
      items.push({
        id: `delivered:${order.id}`,
        type: 'status',
        status: 'Delivered',
        occurredAt: order.deliveredAt,
      })
    }
    items.push(
      ...(orderEvents ?? []).filter((event) => event.orderId === order.id),
    )
    const knownEventIds = new Set(items.map((event) => event.id))
    for (const notification of notifications.filter((item) => item.orderId === order.id)) {
      const title = getEventTitle(notification)
      if (
        title &&
        !knownEventIds.has(notification.eventId) &&
        !knownEventIds.has(notification.id)
      ) {
        items.push({
          id: notification.id,
          eventId: notification.eventId,
          type: 'notification',
          eventType: notification.eventType,
          occurredAt: notification.createdAt,
          description: notification.message,
        })
        knownEventIds.add(notification.eventId)
        knownEventIds.add(notification.id)
      }
    }
    for (const exception of exceptions.filter((item) => item.orderId === order.id)) {
      for (const [index, item] of exception.history.entries()) {
        items.push({
          id: `exception:${exception.id}:${index}`,
          type: 'exception',
          status: item.status,
          occurredAt: item.occurredAt,
          notes: item.notes,
          description: `${exception.type} · ${exception.severity} severity`,
        })
      }
    }
    return items.sort((first, second) => {
      const firstTime = parseTimestamp(first.occurredAt)
      const secondTime = parseTimestamp(second.occurredAt)
      if (firstTime === null && secondTime === null) return first.id.localeCompare(second.id)
      if (firstTime === null) return 1
      if (secondTime === null) return -1
      return firstTime - secondTime
    })
  }, [order, orderEvents, notifications, exceptions])

  if (error) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">Delivery data could not be loaded: {error}</p>
  }
  if (!order) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-950">Shipment not found</h1>
        <p className="mt-2 text-sm text-slate-600">No local order record matches this shipment ID.</p>
        <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-900" to="/admin/monitoring">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to monitoring
        </Link>
      </section>
    )
  }

  const orderExceptions = exceptions.filter((item) => item.orderId === order.id)
  const hasActiveException = orderExceptions.some((item) => item.status !== 'Resolved')

  function handleCreateException(event) {
    event.preventDefault()
    if (!window.confirm(`Create a ${severity.toLowerCase()} severity exception for ${order.id}?`)) return
    setSaving(true)
    const result = createException(order.id, {
      type,
      severity,
      description,
      notes,
      responsibleRole,
    })
    setSaving(false)
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.error })
      return
    }
    setDescription('')
    setNotes('')
    setResponsibleRole('')
    setFeedback({ type: 'success', message: `Exception ${result.exception?.id ?? ''} created in this browser.` })
  }

  function handleExceptionStatus(exception, nextStatus) {
    const resolutionNote = resolutionNotes[exception.id] ?? ''
    if (
      nextStatus === 'Resolved' &&
      !resolutionNote.trim()
    ) {
      setFeedback({ type: 'error', message: 'Add resolution notes before resolving this exception.' })
      return
    }
    if (!window.confirm(`Move exception ${exception.id} to ${nextStatus}?`)) return
    const result = updateException(exception.id, nextStatus, resolutionNote)
    setFeedback(
      result.ok
        ? { type: 'success', message: `Exception ${exception.id} is now ${nextStatus.toLowerCase()}.` }
        : { type: 'error', message: result.error },
    )
  }

  return (
    <section>
      <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-white hover:text-emerald-900" to="/admin/monitoring">
        <ArrowLeft aria-hidden="true" size={17} />
        Back to delivery monitoring
      </Link>

      <header className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Shipment record · browser-local demo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">{order.id}</h1>
          <p className="mt-2 text-sm text-slate-600">{order.customerName ? `${order.customerName} · ` : ''}{order.destination?.address ?? 'Destination unavailable'}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
          <PackageCheck aria-hidden="true" size={17} />
          {order.status}
        </span>
      </header>

      {feedback && (
        <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${feedback.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Truck aria-hidden="true" className="text-emerald-800" size={19} />
            <h2 className="font-semibold text-slate-950">Delivery context</h2>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned partner</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">{partner ? `${partner.name} · ${partner.id}` : 'Unassigned'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Promised delivery</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">{formatTimestamp(order.promisedDeliveryAt ?? order.estimatedDeliveryAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">{formatTimestamp(order.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last recorded update</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">{formatTimestamp(timeline.filter((item) => parseTimestamp(item.occurredAt) !== null).at(-1)?.occurredAt)}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-lg bg-sky-50 px-3 py-2.5 text-xs leading-5 text-sky-950">
            No live vehicle position is available. Saved route information is a planned stop sequence only.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {partner && routePlan.stops.length > 0 && (
              <Link className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to={`/partner/my-route?partnerId=${encodeURIComponent(partner.id)}`}>
                <MapPinned aria-hidden="true" size={16} />
                Review partner deliveries
              </Link>
            )}
            {partner && (
              <Link className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to={`/admin/assignments?orderId=${encodeURIComponent(order.id)}`}>
                <ExternalLink aria-hidden="true" size={16} />
                Review assignment
              </Link>
            )}
            {partner && (
              <Link className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/admin/delivery-partners">
                <Truck aria-hidden="true" size={16} />
                Review partner
              </Link>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Clock3 aria-hidden="true" className="text-emerald-800" size={19} />
            <h2 className="font-semibold text-slate-950">Shipment timeline</h2>
          </div>
          {timeline.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No shipment events have been recorded.</p>
          ) : (
            <ol className="mt-5 space-y-0">
              {timeline.map((event, index) => {
                const title = getEventTitle(event)
                if (!title) return null
                return (
                  <li className="relative flex gap-3 pb-5 last:pb-0" key={event.id}>
                    {index < timeline.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[9px] top-5 w-px bg-slate-200" />}
                    <span className="relative z-10 mt-0.5 size-[19px] shrink-0 rounded-full border-2 border-emerald-700 bg-white" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatTimestamp(event.occurredAt)}</p>
                      {getEventDescription(event) && <p className="mt-1 text-sm leading-5 text-slate-600">{getEventDescription(event)}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <MapPinned aria-hidden="true" className="mt-0.5 text-emerald-800" size={19} />
          <div>
            <h2 className="font-semibold text-slate-950">Planned route visualization</h2>
            <p className="mt-1 text-sm text-slate-600">
              This map shows only saved route stops and recorded coordinates. It does not display live vehicle location or road-following navigation.
            </p>
          </div>
        </div>
        <RouteMap pickup={routePlan.pickupLocation} stops={routePlan.stops} />
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle aria-hidden="true" className="text-amber-800" size={19} />
          <h2 className="font-semibold text-slate-950">Delivery exceptions</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Exceptions are stored in this browser only. Notifications are in-app; no email, SMS, or push service is configured.
        </p>
        {orderExceptions.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">No exceptions have been recorded for this shipment.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {orderExceptions.map((exception) => (
              <article className="rounded-xl border border-slate-200 p-4" key={exception.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{exception.type}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{exception.description}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {exception.severity} severity · {exception.status}
                      {exception.responsibleRole ? ` · Responsible: ${ROLE_LABELS[exception.responsibleRole]}` : ''}
                      {' · '}Created {formatTimestamp(exception.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{exception.status}</span>
                </div>
                {exception.history.map((event, index) => (
                  <p className="mt-2 border-l-2 border-slate-200 pl-3 text-xs leading-5 text-slate-600" key={`${exception.id}:${index}`}>
                    {event.status} · {formatTimestamp(event.occurredAt)}
                    {event.notes ? ` · ${event.notes}` : ''}
                  </p>
                ))}
                {exception.status !== 'Resolved' && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    {exception.status === 'In Progress' && (
                      <label className="flex-1">
                        <span className="mb-1 block text-xs font-semibold text-slate-600">Resolution notes (required)</span>
                        <textarea
                          className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                          onChange={(event) => setResolutionNotes((current) => ({ ...current, [exception.id]: event.target.value }))}
                          value={resolutionNotes[exception.id] ?? ''}
                        />
                      </label>
                    )}
                    {exception.status === 'Open' && (
                      <button className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => handleExceptionStatus(exception, 'In Progress')} type="button">
                        Mark in progress
                      </button>
                    )}
                    {exception.status === 'In Progress' && (
                      <button className="min-h-10 rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900" onClick={() => handleExceptionStatus(exception, 'Resolved')} type="button">
                        Resolve exception
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        <form className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2" onSubmit={handleCreateException}>
          <h3 className="sm:col-span-2 font-semibold text-slate-900">Report an exception</h3>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">Exception type</span>
            <select className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" onChange={(event) => setType(event.target.value)} value={type}>
              {EXCEPTION_TYPES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">Severity</span>
            <select className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" onChange={(event) => setSeverity(event.target.value)} value={severity}>
              {['Low', 'Medium', 'High'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Description</span>
            <textarea className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700" maxLength={1000} onChange={(event) => setDescription(event.target.value)} required value={description} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">Notes (optional)</span>
            <textarea className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700" maxLength={1000} onChange={(event) => setNotes(event.target.value)} value={notes} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">Responsible role (optional)</span>
            <select className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" onChange={(event) => setResponsibleRole(event.target.value)} value={responsibleRole}>
              <option value="">Not assigned</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <span className="mt-1 block text-xs text-slate-500">Role labels are organizational only; this demo has no user accounts or enforced assignment.</span>
          </label>
          <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2" disabled={saving || !description.trim()} type="submit">
            <AlertTriangle aria-hidden="true" size={16} />
            Create exception
          </button>
          {hasActiveException && <p className="text-xs text-amber-800 sm:col-span-2">This shipment already has an unresolved exception. Add another only if it represents a distinct issue.</p>}
        </form>
      </section>
    </section>
  )
}

export default ShipmentMonitoringDetailsPage
