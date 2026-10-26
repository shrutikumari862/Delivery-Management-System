import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Search,
  Truck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { buildShipmentRiskRows, parseTimestamp } from '../services/deliveryAnalytics.js'
import { useDeliveryData } from '../services/useDeliveryData.js'

const PAGE_SIZE = 10
const ACTIVE_STATUSES = new Set([
  'Ready for assignment',
  'Packed',
  'Dispatched',
  'Out for delivery',
])

function formatTime(value) {
  const timestamp = parseTimestamp(value)
  return timestamp === null
    ? 'Not available'
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(timestamp)
}

function SummaryCard({ label, value, detail, icon: Icon, tone = 'emerald' }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    blue: 'bg-sky-50 text-sky-800',
    rose: 'bg-rose-50 text-rose-800',
  }
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon aria-hidden="true" size={19} />
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  )
}

function RiskLabel({ level }) {
  const styles = {
    High: 'border-rose-200 bg-rose-50 text-rose-800',
    Medium: 'border-amber-200 bg-amber-50 text-amber-900',
    Low: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    'Insufficient data': 'border-slate-200 bg-slate-50 text-slate-600',
  }
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[level] ?? styles['Insufficient data']}`}>
      {level}
    </span>
  )
}

function DeliveryMonitoringPage() {
  const { orders, partners, routes, notifications, exceptions, orderEvents, error } = useDeliveryData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [partnerFilter, setPartnerFilter] = useState('All partners')
  const [riskFilter, setRiskFilter] = useState('All risk levels')
  const [sortBy, setSortBy] = useState('created-newest')
  const [page, setPage] = useState(0)
  const [now, setNow] = useState(null)

  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    updateNow()
    const interval = window.setInterval(updateNow, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const rows = useMemo(
    () => buildShipmentRiskRows(orders, partners, notifications, now ?? 0),
    [orders, partners, notifications, now],
  )
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const filtered = rows.filter(({ order, risk }) => {
      const matchesQuery =
        !query ||
        order.id.toLocaleLowerCase().includes(query) ||
        (order.customerName ?? '').toLocaleLowerCase().includes(query) ||
        (order.destination?.address ?? '').toLocaleLowerCase().includes(query)
      return (
        matchesQuery &&
        (statusFilter === 'All statuses' || order.status === statusFilter) &&
        (partnerFilter === 'All partners' || order.partnerId === partnerFilter) &&
        (riskFilter === 'All risk levels' || risk.riskLevel === riskFilter)
      )
    })
    return filtered.sort((first, second) => {
      if (sortBy === 'id') return first.order.id.localeCompare(second.order.id)
      if (sortBy === 'status') return first.order.status.localeCompare(second.order.status)
      return (
        (parseTimestamp(second.order.createdAt) ?? 0) -
        (parseTimestamp(first.order.createdAt) ?? 0)
      )
    })
  }, [rows, search, statusFilter, partnerFilter, riskFilter, sortBy])

  const activeCount = orders.filter((order) => ACTIVE_STATUSES.has(order.status)).length
  const awaitingPickup = orders.filter((order) =>
    ['Ready for assignment', 'Packed'].includes(order.status),
  ).length
  const inTransit = orders.filter((order) => order.status === 'Dispatched').length
  const outForDelivery = orders.filter(
    (order) => order.status === 'Out for delivery',
  ).length
  const deliveredToday = orders.filter((order) => {
    const deliveredAt = parseTimestamp(order.deliveredAt)
    return now !== null && deliveredAt !== null && new Date(deliveredAt).toDateString() === new Date(now).toDateString()
  })
  const hasDeliveryTimestamps = orders.some(
    (order) => parseTimestamp(order.deliveredAt) !== null,
  )
  const openExceptionOrderIds = new Set(
    exceptions
      .filter((exception) => exception.status !== 'Resolved')
      .map((exception) => exception.orderId),
  )
  const attentionCount = rows.filter(
    ({ order, risk }) =>
      ACTIVE_STATUSES.has(order.status) &&
      (risk.riskLevel === 'High' || openExceptionOrderIds.has(order.id)),
  ).length
  const start = page * PAGE_SIZE
  const pageRows = filteredRows.slice(start, start + PAGE_SIZE)

  function changeFilter(setter, value) {
    setter(value)
    setPage(0)
  }

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Delivery Monitoring
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Monitor shipment status, review delivery exceptions, and open a
            shipment record for its timeline and recovery actions.
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          to="/admin/assignments"
        >
          <Truck aria-hidden="true" size={17} />
          Review assignments
        </Link>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
        <Clock3 aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
        <p>
          Demo monitoring: status and route information comes from browser-local
          sample data. There is no live GPS or real-time tracking feed.
        </p>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
          Delivery data could not be loaded: {error}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="Active deliveries" value={activeCount} detail="Not delivered or cancelled" icon={Truck} />
            <SummaryCard label="Awaiting pickup" value={awaitingPickup} detail="Ready for assignment or packed" icon={PackageCheck} tone="blue" />
            <SummaryCard label="In transit" value={inTransit} detail="Dispatched; no live vehicle position" icon={ArrowDownUp} tone="blue" />
            <SummaryCard label="Out for delivery" value={outForDelivery} detail="Current order status" icon={Truck} />
            <SummaryCard
              label="Delivered today"
              value={hasDeliveryTimestamps ? deliveredToday.length : '—'}
              detail={hasDeliveryTimestamps ? 'Based on recorded delivery timestamps' : 'No verified delivery timestamps available'}
              icon={CheckCircle2}
            />
            <SummaryCard label="Require attention" value={attentionCount} detail="Active high-risk shipments or unresolved exceptions" icon={AlertTriangle} tone="rose" />
          </div>

          <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1fr)_12rem_13rem_13rem_12rem]">
              <label className="relative block">
                <span className="sr-only">Search order or destination</span>
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                  onChange={(event) => changeFilter(setSearch, event.target.value)}
                  placeholder="Search order, customer, or destination"
                  type="search"
                  value={search}
                />
              </label>
              <label>
                <span className="sr-only">Filter by shipment status</span>
                <select className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" onChange={(event) => changeFilter(setStatusFilter, event.target.value)} value={statusFilter}>
                  <option>All statuses</option>
                  {[...new Set(orders.map((order) => order.status))].sort().map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by delivery partner</span>
                <select className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" onChange={(event) => changeFilter(setPartnerFilter, event.target.value)} value={partnerFilter}>
                  <option value="All partners">All partners</option>
                  {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name} · {partner.id}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by delivery risk</span>
                <select className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" onChange={(event) => changeFilter(setRiskFilter, event.target.value)} value={riskFilter}>
                  <option>All risk levels</option>
                  {['High', 'Medium', 'Low', 'Insufficient data'].map((level) => <option key={level}>{level}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Sort shipments</span>
                <select className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" onChange={(event) => changeFilter(setSortBy, event.target.value)} value={sortBy}>
                  <option value="created-newest">Newest orders</option>
                  <option value="id">Order ID</option>
                  <option value="status">Status</option>
                </select>
              </label>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Shipment records</h2>
              <span className="text-sm text-slate-500">{filteredRows.length} shown</span>
            </div>
            {filteredRows.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <Search aria-hidden="true" className="mx-auto text-slate-300" size={27} />
                <p className="mt-3 font-semibold text-slate-800">No shipments match these filters</p>
                <button
                  className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-900 underline underline-offset-4"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('All statuses')
                    setPartnerFilter('All partners')
                    setRiskFilter('All risk levels')
                    setPage(0)
                  }}
                  type="button"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Order / destination</th>
                        <th className="px-4 py-3 font-semibold">Partner</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Route progress</th>
                        <th className="px-4 py-3 font-semibold">Promised time</th>
                        <th className="px-4 py-3 font-semibold">Risk</th>
                        <th className="px-5 py-3 font-semibold">Last updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pageRows.map(({ order, partner, risk, deadline }) => {
                        const savedRoute = routes.find((route) => route.partnerId === order.partnerId)
                        const stopIndex = savedRoute?.stopOrderIds.indexOf(order.id) ?? -1
                        const updatedAt = [
                          ...(orderEvents ?? [])
                            .filter((item) => item.orderId === order.id)
                            .map((item) => item.occurredAt),
                          ...notifications
                            .filter((item) => item.orderId === order.id)
                            .map((item) => item.createdAt),
                          ...(exceptions ?? [])
                            .filter((item) => item.orderId === order.id)
                            .map((item) => item.updatedAt),
                          savedRoute?.savedAt,
                          order.deliveredAt,
                          order.dispatchedAt,
                        ]
                          .filter((value) => parseTimestamp(value) !== null)
                          .sort((first, second) => parseTimestamp(first) - parseTimestamp(second))
                          .at(-1)
                        return (
                          <tr className="align-top hover:bg-slate-50/70" key={order.id}>
                            <td className="px-5 py-4">
                              <Link className="font-semibold text-emerald-900 underline decoration-emerald-200 underline-offset-4 hover:text-emerald-700" to={`/admin/monitoring/${encodeURIComponent(order.id)}`}>
                                {order.id}
                              </Link>
                              <p className="mt-1 text-xs text-slate-500">{order.destination?.address ?? 'Destination unavailable'}</p>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">{partner ? `${partner.name} · ${partner.id}` : 'Unassigned'}</td>
                            <td className="px-4 py-4 text-sm font-medium text-slate-800">{order.status}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">
                              {stopIndex >= 0
                                ? `Stop ${stopIndex + 1} of ${savedRoute.stopOrderIds.length} · planned`
                                : 'No saved route'}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">{formatTime(deadline?.raw)}</td>
                            <td className="px-4 py-4"><RiskLabel level={risk.riskLevel} /></td>
                            <td className="px-5 py-4 text-sm text-slate-600">{formatTime(updatedAt)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                  <p aria-live="polite" className="text-xs text-slate-500">
                    Showing {start + 1}–{Math.min(start + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
                  </p>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={page === 0} onClick={() => setPage((value) => value - 1)} type="button">Previous</button>
                    <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={start + PAGE_SIZE >= filteredRows.length} onClick={() => setPage((value) => value + 1)} type="button">Next</button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </section>
  )
}

export default DeliveryMonitoringPage
