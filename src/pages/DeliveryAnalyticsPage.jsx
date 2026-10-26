import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  CalendarDays,
  Download,
  PackageCheck,
  TrendingUp,
  Truck,
  Timer,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import DemoDataError from '../components/DemoDataError.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import {
  ANALYTICS_PERIODS,
  DELIVERY_RISK_LEVELS,
  buildShipmentRiskRows,
  createShipmentRiskCsv,
  filterOrdersByPeriod,
  formatDuration,
  getAnalyticsSummary,
  getDailyOrderVolume,
  getDeliveryOutcomeCounts,
  getPartnerPerformance,
  getRiskCounts,
  getStatusCounts,
  parseTimestamp,
} from '../services/deliveryAnalytics.js'
import { useDeliveryData } from '../services/useDeliveryData.js'

const RISK_COLORS = {
  Low: '#059669',
  Medium: '#d97706',
  High: '#dc2626',
  'Insufficient data': '#94a3b8',
}

const RISK_ORDER = new Map(DELIVERY_RISK_LEVELS.map((level, index) => [level, index]))

function KpiCard({ label, value, detail, icon: Icon, tone = 'emerald' }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-800',
    blue: 'bg-sky-50 text-sky-800',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-rose-50 text-rose-800',
  }
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`flex size-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon aria-hidden="true" size={19} />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  )
}

function ChartCard({ title, description, children, empty }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {empty ? (
        <p className="flex h-64 items-center justify-center px-4 text-center text-sm text-slate-500">
          Not enough records in this period to display this chart.
        </p>
      ) : (
        <div className="mt-5 h-64">{children}</div>
      )}
    </section>
  )
}

function RiskBadge({ riskLevel }) {
  const colors = {
    Low: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    Medium: 'border-amber-200 bg-amber-50 text-amber-900',
    High: 'border-rose-200 bg-rose-50 text-rose-800',
    'Insufficient data': 'border-slate-200 bg-slate-50 text-slate-700',
  }
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${colors[riskLevel]}`}>
      {riskLevel}
    </span>
  )
}

function formatPercent(value) {
  return value === null ? 'Insufficient data' : `${value.toFixed(1)}%`
}

function formatDeadline(value) {
  if (!value) return 'Not available'
  const timestamp = parseTimestamp(value)
  return timestamp === null
    ? 'Invalid timestamp'
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(timestamp)
}

function getPeriodLabel(period) {
  if (period === ANALYTICS_PERIODS.SEVEN_DAYS) return 'Last 7 days'
  if (period === ANALYTICS_PERIODS.THIRTY_DAYS) return 'Last 30 days'
  return 'All available records'
}

function DeliveryAnalyticsPage() {
  const { partners, orders, notifications = [], error } = useDeliveryData()
  const [period, setPeriod] = useState(ANALYTICS_PERIODS.THIRTY_DAYS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [sortBy, setSortBy] = useState('risk')
  const [exportError, setExportError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const periodOrders = useMemo(
    () => filterOrdersByPeriod(orders, period, now),
    [orders, period, now],
  )
  const periodOrderIds = useMemo(
    () => new Set(periodOrders.map((order) => order.id)),
    [periodOrders],
  )
  const riskRows = useMemo(
    () =>
      buildShipmentRiskRows(orders, partners, notifications, now).filter(({ order }) =>
        periodOrderIds.has(order.id),
      ),
    [orders, partners, notifications, now, periodOrderIds],
  )
  const summary = useMemo(() => getAnalyticsSummary(riskRows), [riskRows])
  const partnerPerformance = useMemo(
    () => getPartnerPerformance(periodOrders, partners, notifications, now, orders),
    [periodOrders, partners, notifications, now, orders],
  )
  const partnerChartData = useMemo(
    () =>
      partnerPerformance.map((item) => ({
        partner: item.partner.name,
        completed: item.completedDeliveries,
        pending: item.pendingDeliveries,
      })),
    [partnerPerformance],
  )
  const statusData = useMemo(() => getStatusCounts(periodOrders), [periodOrders])
  const volumeData = useMemo(() => getDailyOrderVolume(periodOrders), [periodOrders])
  const riskData = useMemo(() => getRiskCounts(riskRows), [riskRows])
  const outcomeData = useMemo(
    () => getDeliveryOutcomeCounts(periodOrders),
    [periodOrders],
  )
  const availableStatuses = useMemo(
    () => [...new Set(orders.map((order) => order.status))].sort(),
    [orders],
  )
  const filteredRiskRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const result = riskRows.filter(({ order, destination, risk }) => {
      const matchesSearch =
        !query ||
        order.id.toLocaleLowerCase().includes(query) ||
        destination.toLocaleLowerCase().includes(query)
      return (
        matchesSearch &&
        (statusFilter === 'all' || order.status === statusFilter) &&
        (riskFilter === 'all' || risk.riskLevel === riskFilter)
      )
    })
    result.sort((first, second) => {
      if (sortBy === 'deadline') {
        const firstDeadline = first.deadline?.timestamp ?? Number.POSITIVE_INFINITY
        const secondDeadline = second.deadline?.timestamp ?? Number.POSITIVE_INFINITY
        return firstDeadline - secondDeadline || first.order.id.localeCompare(second.order.id)
      }
      return (
        (RISK_ORDER.get(first.risk.riskLevel) ?? 99) -
          (RISK_ORDER.get(second.risk.riskLevel) ?? 99) ||
        (first.deadline?.timestamp ?? Number.POSITIVE_INFINITY) -
          (second.deadline?.timestamp ?? Number.POSITIVE_INFINITY) ||
        first.order.id.localeCompare(second.order.id)
      )
    })
    return result
  }, [riskRows, search, statusFilter, riskFilter, sortBy])

  if (error) return <DemoDataError message={error} />

  function exportCsv() {
    setExportError('')
    try {
      const content = createShipmentRiskCsv(filteredRiskRows)
      const file = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `shipment-risk-${period}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
    } catch (cause) {
      setExportError(
        cause instanceof Error ? cause.message : 'Could not export the filtered table.',
      )
    }
  }

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
            Operations intelligence · demo data
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Delivery analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Rule-based delivery risk and operational trends from orders stored in
            this browser. No machine-learning model or external data is used.
          </p>
        </div>
        <label className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 sm:w-auto">
          <CalendarDays aria-hidden="true" className="text-slate-500" size={18} />
          <span className="whitespace-nowrap">Reporting period</span>
          <select
            aria-label="Reporting period"
            className="min-w-36 rounded-lg border-0 bg-transparent py-1 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-600"
            onChange={(event) => setPeriod(event.target.value)}
            value={period}
          >
            <option value={ANALYTICS_PERIODS.SEVEN_DAYS}>Last 7 days</option>
            <option value={ANALYTICS_PERIODS.THIRTY_DAYS}>Last 30 days</option>
            <option value={ANALYTICS_PERIODS.ALL}>All available records</option>
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
        This prototype uses browser-local demo data. Average delivery duration
        and on-time performance are shown only when verified dispatch, promised,
        and actual delivery timestamps are present.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          detail={getPeriodLabel(period)}
          icon={PackageCheck}
          label="Total orders"
          value={summary.totalOrders}
        />
        <KpiCard
          detail={`${getPeriodLabel(period)} · status is Delivered`}
          icon={PackageCheck}
          label="Delivered orders"
          value={summary.deliveredOrders}
          tone="blue"
        />
        <KpiCard
          detail="Orders not yet delivered or cancelled"
          icon={Truck}
          label="Pending deliveries"
          value={summary.pendingDeliveries}
          tone="amber"
        />
        <KpiCard
          detail="Overdue active shipments and observed late completions"
          icon={AlertTriangle}
          label="Delayed deliveries"
          value={summary.delayedDeliveries}
          tone="red"
        />
        <KpiCard
          detail={`${summary.onTimeSampleSize} completed deliveries with verified promised and actual times`}
          icon={TrendingUp}
          label="On-time delivery rate"
          value={formatPercent(summary.onTimePercentage)}
        />
        <KpiCard
          detail={`${summary.durationSampleSize} completed deliveries with valid dispatch and completion times`}
          icon={Timer}
          label="Average delivery duration"
          value={formatDuration(summary.averageDurationMs)}
          tone="blue"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          description="Orders grouped by their current status."
          empty={statusData.length === 0}
          title="Orders by status"
        >
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={statusData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="status" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#047857" name="Orders" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          description="Order creation volume by day; this is not a GPS or road-delivery count."
          empty={volumeData.length === 0}
          title="Daily order volume"
        >
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={volumeData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip />
              <Bar dataKey="orders" fill="#0284c7" name="Orders created" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          description="Completed deliveries with both verified promised and actual delivery times."
          empty={outcomeData.every(({ count }) => count === 0)}
          title="On-time versus delayed deliveries"
        >
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={outcomeData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="outcome" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" name="Completed deliveries" radius={[6, 6, 0, 0]}>
                {outcomeData.map((entry) => (
                  <Cell
                    fill={entry.outcome === 'On time' ? RISK_COLORS.Low : RISK_COLORS.High}
                    key={entry.outcome}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          description="Counts for current risk assessments and verified completed outcomes."
          empty={riskRows.length === 0}
          title="Delay risk distribution"
        >
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                data={riskData}
                dataKey="count"
                nameKey="riskLevel"
                outerRadius={86}
                label={({ riskLevel, count }) => `${riskLevel}: ${count}`}
              >
                {riskData.map((entry) => (
                  <Cell fill={RISK_COLORS[entry.riskLevel]} key={entry.riskLevel} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          description="Assigned deliveries per partner within the selected reporting period."
          empty={partnerChartData.every((item) => item.completed + item.pending === 0)}
          title="Delivery performance by partner"
        >
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={partnerChartData}
              margin={{ top: 8, right: 8, left: -18, bottom: 8 }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="partner" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#059669" name="Completed" radius={[5, 5, 0, 0]} />
              <Bar dataKey="pending" fill="#0284c7" name="Pending" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">Delivery partner performance</h2>
            <p className="mt-1 text-sm text-slate-500">
              Counts use assigned orders in the selected period. Timed statistics show their eligible sample size.
            </p>
          </div>
          <span className="text-xs text-slate-500">No partner ranking is inferred from small samples.</span>
        </div>
        {partnerPerformance.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No partner records are available.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Delivery partner</th>
                  <th className="px-4 py-3 font-semibold">Assigned</th>
                  <th className="px-4 py-3 font-semibold">Completed</th>
                  <th className="px-4 py-3 font-semibold">On time</th>
                  <th className="px-4 py-3 font-semibold">Average duration</th>
                  <th className="px-4 py-3 font-semibold">Pending</th>
                  <th className="px-4 py-3 font-semibold">Delayed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partnerPerformance.map((item) => (
                  <tr key={item.partner.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{item.partner.name}</p>
                      <p className="text-xs text-slate-500">{item.partner.id}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{item.assignedDeliveries}</td>
                    <td className="px-4 py-3 text-sm">{item.completedDeliveries}</td>
                    <td className="px-4 py-3 text-sm">
                      {formatPercent(item.onTimePercentage)}
                      {item.onTimeSampleSize > 0 && (
                        <span className="block text-xs text-slate-500">
                          Sample: {item.onTimeSampleSize}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDuration(item.averageDurationMs)}
                      {item.durationSampleSize > 0 && (
                        <span className="block text-xs text-slate-500">
                          Sample: {item.durationSampleSize}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{item.pendingDeliveries}</td>
                    <td className="px-4 py-3 text-sm">
                      {item.delayedDeliveries > 0 ? (
                        <span className="font-semibold text-rose-700">{item.delayedDeliveries}</span>
                      ) : (
                        item.delayedDeliveries
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">Shipment risk</h2>
              <p className="mt-1 text-sm text-slate-500">
                Risk is a transparent rule-based estimate; incomplete records are not guessed.
              </p>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={exportCsv}
              type="button"
            >
              <Download aria-hidden="true" size={17} />
              Export filtered CSV
            </button>
          </div>
          {exportError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {exportError}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600">
              Search order or destination
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="e.g. ORD-2042"
                type="search"
                value={search}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Current status
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900"
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="all">All statuses</option>
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Risk level
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900"
                onChange={(event) => setRiskFilter(event.target.value)}
                value={riskFilter}
              >
                <option value="all">All risk levels</option>
                {DELIVERY_RISK_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Sort shipments
              <span className="relative mt-1.5 block">
                <ArrowDownWideNarrow aria-hidden="true" className="absolute left-3 top-3 text-slate-500" size={16} />
                <select
                  aria-label="Sort shipments"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-normal text-slate-900"
                  onChange={(event) => setSortBy(event.target.value)}
                  value={sortBy}
                >
                  <option value="risk">Highest risk first</option>
                  <option value="deadline">Nearest deadline first</option>
                </select>
              </span>
            </label>
          </div>
        </div>
        {filteredRiskRows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <PackageCheck aria-hidden="true" className="mx-auto text-slate-300" size={28} />
            <p className="mt-3 font-semibold text-slate-800">No shipments match these filters</p>
            <p className="mt-1 text-sm text-slate-500">
              Try changing the reporting period, search, status, or risk filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order / shipment</th>
                  <th className="px-4 py-3 font-semibold">Destination</th>
                  <th className="px-4 py-3 font-semibold">Delivery partner</th>
                  <th className="px-4 py-3 font-semibold">Current status</th>
                  <th className="px-4 py-3 font-semibold">Promised delivery</th>
                  <th className="px-4 py-3 font-semibold">Estimated risk</th>
                  <th className="px-4 py-3 font-semibold">Reason and next action</th>
                  <th className="px-4 py-3 font-semibold">Order view</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRiskRows.map(({ order, partner, deadline, risk, destination }) => (
                  <tr className="align-top" key={order.id}>
                    <td className="px-4 py-4 font-semibold text-slate-900">{order.id}</td>
                    <td className="max-w-48 px-4 py-4 text-sm leading-5 text-slate-700">{destination}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {partner ? (
                        <>
                          <span className="block font-medium">{partner.name}</span>
                          <span className="text-xs text-slate-500">{partner.id}</span>
                        </>
                      ) : 'Unassigned'}
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-4 text-sm text-slate-600">{formatDeadline(deadline?.raw)}</td>
                    <td className="px-4 py-4">
                      <RiskBadge riskLevel={risk.riskLevel} />
                      {risk.score !== null && (
                        <span className="mt-1 block text-xs text-slate-500">
                          Rule score: {risk.score}/100
                        </span>
                      )}
                    </td>
                    <td className="max-w-[360px] px-4 py-4 text-sm leading-5 text-slate-600">
                      <p>{risk.reason}</p>
                      {risk.recommendedAction && (
                        <p className="mt-2 font-medium text-slate-800">
                          Next: {risk.recommendedAction}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        className="whitespace-nowrap text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950"
                        to={`/admin/assignments?orderId=${encodeURIComponent(order.id)}`}
                      >
                        Open order
                      </Link>
                      <span className="mt-1 block max-w-32 text-xs leading-4 text-slate-500">
                        Existing assignment view
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          {filteredRiskRows.length} shipment{filteredRiskRows.length === 1 ? '' : 's'} · {getPeriodLabel(period)}
        </div>
      </section>
      <p className="text-xs leading-5 text-slate-500">
        Delay thresholds: a verified deadline within two hours is Medium; an active
        shipment past its deadline is High. Without a deadline, risk uses a partner
        average only when at least two completed deliveries have valid dispatch and
        completion timestamps. A reported failed attempt is Medium; an explicit
        reported delay is High. All other cases without sufficient evidence are
        labeled Insufficient data.
      </p>
    </section>
  )
}

export default DeliveryAnalyticsPage
