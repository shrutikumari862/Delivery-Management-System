import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Package,
  RotateCcw,
  Truck,
  X,
} from 'lucide-react'
import DemoDataError from '../components/DemoDataError.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { SCORING_WEIGHTS, getPartnerRecommendations } from '../services/deliveryData.js'
import { useDeliveryData } from '../services/useDeliveryData.js'

function formatWeight(weight) {
  return `${Math.round(weight * 100)}%`
}

function AssignmentDialog({ order, recommendation, onCancel, onConfirm, saving }) {
  const isReassignment = Boolean(order.partnerId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel()
      }}
    >
      <section
        aria-labelledby="confirm-assignment-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
              {isReassignment ? 'Reassign delivery' : 'Confirm assignment'}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950" id="confirm-assignment-title">
              {isReassignment ? 'Move this delivery?' : 'Assign this order?'}
            </h2>
          </div>
          <button
            aria-label="Close confirmation"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {isReassignment
            ? `Order ${order.id} will move from its current partner to ${recommendation.partner.name}. The old workload will be decremented and the new workload incremented together.`
            : `Order ${order.id} will be assigned to ${recommendation.partner.name}. This uses one of their remaining delivery slots.`}
        </p>
        {recommendation.distanceOmitted && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            No distance estimate is available. The recommendation score omits
            distance and renormalizes its other factors.
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
            disabled={saving}
            onClick={onConfirm}
            type="button"
          >
            {saving ? 'Saving…' : isReassignment ? 'Confirm reassignment' : 'Confirm assignment'}
          </button>
        </div>
      </section>
    </div>
  )
}

function AdminAssignmentPage() {
  const { partners, orders, assign, error } = useDeliveryData()
  const [searchParams] = useSearchParams()
  const requestedOrderId = searchParams.get('orderId')
  const requestedOrder = orders.find((order) => order.id === requestedOrderId)
  const [orderScope, setOrderScope] = useState(() =>
    requestedOrder?.partnerId ? 'Reassign' : 'Unassigned',
  )
  const [selectedOrderId, setSelectedOrderId] = useState(requestedOrder?.id ?? null)
  const [confirmation, setConfirmation] = useState(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const displayedOrders = useMemo(
    () =>
      orderScope === 'Unassigned'
        ? orders.filter((order) => !order.partnerId && order.status === 'Ready for assignment')
        : orders.filter(
            (order) =>
              order.partnerId &&
              order.status !== 'Delivered' &&
              order.status !== 'Cancelled',
          ),
    [orders, orderScope],
  )
  const selectedOrder =
    displayedOrders.find((order) => order.id === selectedOrderId) ??
    displayedOrders[0] ??
    null
  const recommendations = useMemo(
    () =>
      selectedOrder
        ? getPartnerRecommendations(selectedOrder, partners)
        : [],
    [selectedOrder, partners],
  )
  const eligibleRecommendations = recommendations.filter((item) => item.eligible)
  const currentPartner = selectedOrder?.partnerId
    ? partners.find((partner) => partner.id === selectedOrder.partnerId)
    : null
  const assignedCount = orders.filter((order) => order.partnerId).length
  const unassignedCount = orders.filter(
    (order) => !order.partnerId && order.status === 'Ready for assignment',
  ).length

  if (error) return <DemoDataError message={error} />

  function requestAssignment(recommendation) {
    setFeedback(null)
    setConfirmation(recommendation)
  }

  async function confirmAssignment() {
    if (!selectedOrder || !confirmation || saving) return
    setSaving(true)
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    const result = assign(selectedOrder.id, confirmation.partner.id)
    setSaving(false)

    if (!result.ok) {
      setConfirmation(null)
      setFeedback({ type: 'error', message: result.error })
      return
    }

    setConfirmation(null)
    setFeedback({
      type: 'success',
      message: `${selectedOrder.id} ${selectedOrder.partnerId ? 'reassigned' : 'assigned'} to ${confirmation.partner.name}.`,
    })
  }

  return (
    <section>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Dispatch desk
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Smart delivery assignment
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Compare eligible partners with transparent, rule-based recommendations.
            Scores are guidance—not AI-generated decisions.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-32 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">Awaiting assignment</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{unassignedCount}</p>
          </div>
          <div className="min-w-32 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">Assigned orders</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{assignedCount}</p>
          </div>
        </div>
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
          <span className="flex-1 leading-6">{feedback.message}</span>
          <button
            aria-label="Dismiss message"
            className="rounded p-1 opacity-70 hover:bg-black/5 hover:opacity-100"
            onClick={() => setFeedback(null)}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      )}

      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.5fr)]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <div className="flex rounded-lg bg-slate-100 p-1">
              {['Unassigned', 'Reassign'].map((scope) => (
                <button
                  aria-pressed={orderScope === scope}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                    orderScope === scope
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  key={scope}
                  onClick={() => {
                    setOrderScope(scope)
                    setSelectedOrderId(null)
                    setFeedback(null)
                  }}
                  type="button"
                >
                  {scope === 'Unassigned' ? 'Unassigned' : 'Reassign'}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {orderScope === 'Unassigned'
                ? 'Select an order to compare partner recommendations.'
                : 'Select an active order to move it to another eligible partner.'}
            </p>
          </div>
          {displayedOrders.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <Package aria-hidden="true" className="mx-auto text-slate-300" size={26} />
              <p className="mt-3 font-semibold text-slate-800">
                {orderScope === 'Unassigned'
                  ? 'All caught up'
                  : 'No active assignments'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {orderScope === 'Unassigned'
                  ? 'There are no orders waiting for a partner.'
                  : 'Assigned, undelivered orders will appear here.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {displayedOrders.map((order) => {
                const partner = partners.find((item) => item.id === order.partnerId)
                const isSelected = selectedOrder?.id === order.id
                return (
                  <li key={order.id}>
                    <button
                      aria-pressed={isSelected}
                      className={`w-full border-l-2 px-4 py-4 text-left transition ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50/60'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        setSelectedOrderId(order.id)
                        setFeedback(null)
                      }}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900">{order.id}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{order.customerName}</p>
                      <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
                        <MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={13} />
                        {order.destination.address} · {order.destination.serviceArea}
                      </p>
                      {partner && (
                        <p className="mt-2 text-xs font-medium text-violet-800">
                          Current partner: {partner.name}
                        </p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <div className="space-y-5">
          {!selectedOrder ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <ClipboardCheck aria-hidden="true" className="mx-auto text-slate-300" size={30} />
              <p className="mt-3 font-semibold text-slate-800">No order selected</p>
              <p className="mt-1 text-sm text-slate-500">
                Choose an order from the list to see a partner comparison.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
                      {selectedOrder.partnerId ? 'Reassignment review' : 'Order details'}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                      {selectedOrder.id}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedOrder.customerName} · {selectedOrder.destination.address}
                    </p>
                  </div>
                  {selectedOrder.partnerId && currentPartner && (
                    <div className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
                      Currently with <span className="font-semibold">{currentPartner.name}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Top recommendation
                      </p>
                      {eligibleRecommendations[0] ? (
                        <p className="mt-1 font-semibold text-slate-900">
                          {eligibleRecommendations[0].partner.name}
                          <span className="ml-2 text-sm font-medium text-emerald-800">
                            {eligibleRecommendations[0].score}/100
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 font-semibold text-slate-900">
                          No eligible partners for this order
                        </p>
                      )}
                    </div>
                    {eligibleRecommendations[0] && (
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        onClick={() => requestAssignment(eligibleRecommendations[0])}
                        type="button"
                      >
                        {selectedOrder.partnerId ? (
                          <RotateCcw aria-hidden="true" size={16} />
                        ) : (
                          <Truck aria-hidden="true" size={16} />
                        )}
                        {selectedOrder.partnerId ? 'Reassign to top pick' : 'Assign top pick'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-semibold text-slate-900">Partner comparison</h2>
                    <p className="text-xs text-slate-500">
                      Higher scores rank ahead; ties break by lighter workload, then partner ID.
                    </p>
                  </div>
                </div>
                {recommendations.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-slate-500">
                    No delivery partners are available in the demo data.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recommendations.map((recommendation) => {
                      const { partner } = recommendation
                      const isCurrent = partner.id === selectedOrder.partnerId
                      return (
                        <article className="p-4 sm:p-5" key={partner.id}>
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-slate-900">{partner.name}</h3>
                                <span className="text-xs text-slate-500">{partner.id}</span>
                                <StatusBadge status={partner.availability} />
                                {isCurrent && (
                                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                                    Current partner
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                {partner.activeDeliveries}/{partner.maxCapacity} active ·{' '}
                                {partner.serviceAreas.join(', ')}
                                {recommendation.distanceKm !== null &&
                                  ` · ${recommendation.distanceKm.toFixed(1)} km`}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-4 sm:justify-end">
                              <div className="text-right">
                                <p className="text-2xl font-semibold tracking-tight text-slate-950">
                                  {recommendation.score}
                                  <span className="text-sm font-medium text-slate-400">/100</span>
                                </p>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Match score
                                </p>
                              </div>
                              <button
                                className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                                disabled={!recommendation.eligible || isCurrent}
                                onClick={() => requestAssignment(recommendation)}
                                title={
                                  recommendation.eligibilityReason ??
                                  (isCurrent
                                    ? 'This is already the assigned partner.'
                                    : 'Assign this partner')
                                }
                                type="button"
                              >
                                {isCurrent ? 'Assigned' : recommendation.eligible ? 'Assign' : 'Unavailable'}
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {recommendation.factors.map((factor) => (
                              <div
                                className="rounded-lg bg-slate-50 px-3 py-2.5"
                                key={factor.key}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-700">
                                    {factor.label}
                                  </span>
                                  <span className="text-[11px] font-medium text-slate-500">
                                    {Math.round(factor.score)} · {formatWeight(factor.effectiveWeight)}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                                  {factor.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                          {!recommendation.eligible && (
                            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-rose-800">
                              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
                              Not eligible: {recommendation.eligibilityReason}
                            </p>
                          )}
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-800">How the score works</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Availability {formatWeight(SCORING_WEIGHTS.availability)} ·
                  capacity {formatWeight(SCORING_WEIGHTS.remainingCapacity)} ·
                  distance {formatWeight(SCORING_WEIGHTS.distance)} ·
                  service area {formatWeight(SCORING_WEIGHTS.serviceArea)} ·
                  workload {formatWeight(SCORING_WEIGHTS.workload)}. Scores are
                  weighted and normalized to 100; missing distance is omitted,
                  and the remaining factors are proportionally renormalized.
                  Offline, full-capacity, and out-of-area partners are excluded.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmation && selectedOrder && (
        <AssignmentDialog
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmAssignment}
          order={selectedOrder}
          recommendation={confirmation}
          saving={saving}
        />
      )}
    </section>
  )
}

export default AdminAssignmentPage
