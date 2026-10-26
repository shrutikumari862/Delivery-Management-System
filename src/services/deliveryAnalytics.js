const ACTIVE_STATUSES = new Set(['Dispatched', 'Out for delivery'])
const CLOSED_STATUSES = new Set(['Delivered', 'Cancelled'])
const APPROACHING_DEADLINE_MS = 2 * 60 * 60 * 1000
const DELIVERY_DELAYED_EVENT = 'delivery.delayed'
const DELIVERY_ATTEMPT_FAILED_EVENT = 'delivery.attempt_failed'

export const ANALYTICS_PERIODS = Object.freeze({
  SEVEN_DAYS: '7',
  THIRTY_DAYS: '30',
  ALL: 'all',
})

export const DELIVERY_RISK_LEVELS = Object.freeze([
  'Low',
  'Medium',
  'High',
  'Insufficient data',
])

export function parseTimestamp(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function getDeadline(order) {
  for (const raw of [order.promisedDeliveryAt, order.estimatedDeliveryAt]) {
    const timestamp = parseTimestamp(raw)
    if (timestamp !== null) return { raw, timestamp }
  }
  return null
}

function getActualDuration(order) {
  const start = parseTimestamp(order.dispatchedAt)
  const end = parseTimestamp(order.deliveredAt)
  if (start === null || end === null || end <= start) return null
  return end - start
}

function getOnTimeOutcome(order) {
  const deadline = getDeadline(order)
  const deliveredAt = parseTimestamp(order.deliveredAt)
  if (order.status !== 'Delivered' || !deadline || deliveredAt === null) return null
  return deliveredAt <= deadline.timestamp
}

export function filterOrdersByPeriod(orders, period, now = Date.now()) {
  if (period === ANALYTICS_PERIODS.ALL) return orders
  const days = Number(period)
  if (![7, 30].includes(days) || !Number.isFinite(now)) return []
  const start = now - days * 24 * 60 * 60 * 1000
  return orders.filter((order) => {
    const createdAt = parseTimestamp(order.createdAt)
    return createdAt !== null && createdAt >= start && createdAt <= now
  })
}

export function getPartnerDurationBaselines(orders) {
  const durationsByPartner = new Map()
  for (const order of orders) {
    if (order.status !== 'Delivered' || !order.partnerId) continue
    const duration = getActualDuration(order)
    if (duration === null) continue
    const durations = durationsByPartner.get(order.partnerId) ?? []
    durations.push(duration)
    durationsByPartner.set(order.partnerId, durations)
  }
  return new Map(
    [...durationsByPartner].map(([partnerId, durations]) => [
      partnerId,
      {
        averageDurationMs:
          durations.reduce((total, duration) => total + duration, 0) /
          durations.length,
        sampleSize: durations.length,
      },
    ]),
  )
}

export function assessShipmentRisk(
  order,
  {
    notifications = [],
    durationBaselines = new Map(),
    now = Date.now(),
  } = {},
) {
  const base = { score: null, riskLevel: 'Insufficient data', evidenceKey: null }
  if (order.status === 'Cancelled') {
    return { ...base, reason: 'This order is cancelled; no active delivery risk applies.' }
  }

  const delaySignal = notifications.find(
    (notification) =>
      notification.orderId === order.id &&
      notification.eventType === DELIVERY_DELAYED_EVENT,
  )
  if (delaySignal && ACTIVE_STATUSES.has(order.status)) {
    return {
      score: 100,
      riskLevel: 'High',
      evidenceKey: `reported-delay:${delaySignal.eventId ?? delaySignal.id}`,
      reason: 'A delivery delay has been explicitly reported for this active shipment.',
      recommendedAction: 'Review the saved route and contact the assigned delivery partner.',
    }
  }

  const deadline = getDeadline(order)
  const deadlinePassed =
    ACTIVE_STATUSES.has(order.status) &&
    deadline !== null &&
    Number.isFinite(now) &&
    now > deadline.timestamp
  const failedAttempt = notifications.find(
    (notification) =>
      notification.orderId === order.id &&
      notification.eventType === DELIVERY_ATTEMPT_FAILED_EVENT,
  )
  if (failedAttempt && ACTIVE_STATUSES.has(order.status) && !deadlinePassed) {
    return {
      score: 60,
      riskLevel: 'Medium',
      evidenceKey: `failed-attempt:${failedAttempt.eventId ?? failedAttempt.id}`,
      reason: 'A failed delivery attempt is recorded for this active shipment.',
      recommendedAction: 'Review delivery instructions and contact the assigned partner.',
    }
  }

  const deliveredAt = parseTimestamp(order.deliveredAt)
  if (order.status === 'Delivered') {
    if (!deadline || deliveredAt === null) {
      return {
        ...base,
        reason: 'Delivery is complete, but verified promised and actual delivery times are unavailable.',
      }
    }
    const late = deliveredAt > deadline.timestamp
    return {
      score: late ? 100 : 0,
      riskLevel: late ? 'High' : 'Low',
      evidenceKey: `completed:${order.id}:${deadline.raw}:${order.deliveredAt}`,
      reason: late
        ? 'Observed delivery completed after its promised time; this is a recorded delay, not a prediction.'
        : 'Observed delivery was completed by its promised time.',
      recommendedAction: late
        ? 'Review this completed delivery to identify follow-up needs.'
        : 'No action needed; delivery is complete.',
    }
  }

  if (!ACTIVE_STATUSES.has(order.status)) {
    return {
      ...base,
      reason: 'The order has not entered an active dispatched delivery status.',
    }
  }

  if (!Number.isFinite(now)) {
    return { ...base, reason: 'The current time is invalid, so deadline risk cannot be evaluated.' }
  }
  if (deadline) {
    if (now > deadline.timestamp) {
      return {
        score: 100,
        riskLevel: 'High',
        evidenceKey: `deadline:${order.id}:${deadline.raw}`,
        reason: 'The verified promised or estimated delivery time has passed and the shipment is still active.',
        recommendedAction: 'Review the saved route and contact the assigned delivery partner.',
      }
    }
    if (deadline.timestamp - now <= APPROACHING_DEADLINE_MS) {
      return {
        score: 55,
        riskLevel: 'Medium',
        evidenceKey: `approaching:${order.id}:${deadline.raw}`,
        reason: 'The shipment is active and its verified delivery deadline is within two hours.',
        recommendedAction: 'Check route progress and confirm the delivery plan with the partner.',
      }
    }
    return {
      score: 0,
      riskLevel: 'Low',
      evidenceKey: `on-track:${order.id}:${deadline.raw}`,
      reason: 'The shipment is active and its verified delivery deadline has not been approached or exceeded.',
      recommendedAction: 'Continue monitoring the shipment.',
    }
  }

  const dispatchedAt = parseTimestamp(order.dispatchedAt)
  const baseline = durationBaselines.get(order.partnerId)
  if (
    dispatchedAt !== null &&
    now >= dispatchedAt &&
    baseline?.sampleSize >= 2 &&
    Number.isFinite(baseline.averageDurationMs) &&
    baseline.averageDurationMs > 0
  ) {
    const elapsed = now - dispatchedAt
    const ratio = elapsed / baseline.averageDurationMs
    if (ratio >= 2) {
      return {
        score: 100,
        riskLevel: 'High',
        evidenceKey: `duration:${order.id}:${order.dispatchedAt}:${baseline.sampleSize}`,
        reason: `Elapsed time is at least twice this partner's average across ${baseline.sampleSize} timed completed deliveries.`,
        recommendedAction: 'Review the saved route and contact the assigned delivery partner.',
      }
    }
    if (ratio >= 1.25) {
      return {
        score: 55,
        riskLevel: 'Medium',
        evidenceKey: `duration:${order.id}:${order.dispatchedAt}:${baseline.sampleSize}`,
        reason: `Elapsed time exceeds this partner's timed delivery average across ${baseline.sampleSize} completed deliveries.`,
        recommendedAction: 'Check route progress with the assigned delivery partner.',
      }
    }
    return {
      score: 0,
      riskLevel: 'Low',
      evidenceKey: `duration:${order.id}:${order.dispatchedAt}:${baseline.sampleSize}`,
      reason: `Elapsed time is within this partner's average from ${baseline.sampleSize} timed completed deliveries.`,
      recommendedAction: 'Continue monitoring the shipment.',
    }
  }

  return {
    ...base,
    reason: 'No verified delivery deadline, dispatch timestamp with a reliable history baseline, or reported delay is available.',
  }
}

export function buildShipmentRiskRows(
  orders,
  partners,
  notifications,
  now = Date.now(),
  baselineOrders = orders,
) {
  const partnerById = new Map(partners.map((partner) => [partner.id, partner]))
  const baselines = getPartnerDurationBaselines(baselineOrders)
  return orders.map((order) => {
    const risk = assessShipmentRisk(order, {
      notifications,
      durationBaselines: baselines,
      now,
    })
    return {
      order,
      partner: partnerById.get(order.partnerId) ?? null,
      risk,
      deadline: getDeadline(order),
      destination: order.destination?.address ?? 'Destination unavailable',
    }
  })
}

export function getPartnerPerformance(
  orders,
  partners,
  notifications = [],
  now = Date.now(),
  baselineOrders = orders,
) {
  const rows = buildShipmentRiskRows(
    orders,
    partners,
    notifications,
    now,
    baselineOrders,
  )
  return partners.map((partner) => {
    const assignedRows = rows.filter(({ order }) => order.partnerId === partner.id)
    const completed = assignedRows.filter(({ order }) => order.status === 'Delivered')
    const pending = assignedRows.filter(
      ({ order }) => order.status !== 'Delivered' && order.status !== 'Cancelled',
    )
    const outcomes = completed
      .map(({ order }) => getOnTimeOutcome(order))
      .filter((value) => value !== null)
    const durations = completed
      .map(({ order }) => getActualDuration(order))
      .filter((value) => value !== null)
    const delayed = assignedRows.filter(
      ({ risk }) => risk.riskLevel === 'High',
    ).length
    return {
      partner,
      assignedDeliveries: assignedRows.length,
      completedDeliveries: completed.length,
      pendingDeliveries: pending.length,
      delayedDeliveries: delayed,
      onTimePercentage:
        outcomes.length === 0
          ? null
          : (outcomes.filter(Boolean).length / outcomes.length) * 100,
      onTimeSampleSize: outcomes.length,
      averageDurationMs:
        durations.length === 0
          ? null
          : durations.reduce((total, duration) => total + duration, 0) /
            durations.length,
      durationSampleSize: durations.length,
    }
  })
}

export function getAnalyticsSummary(rows) {
  const delivered = rows.filter(({ order }) => order.status === 'Delivered')
  const onTimeOutcomes = delivered
    .map(({ order }) => getOnTimeOutcome(order))
    .filter((value) => value !== null)
  const durations = delivered
    .map(({ order }) => getActualDuration(order))
    .filter((value) => value !== null)
  return {
    totalOrders: rows.length,
    deliveredOrders: delivered.length,
    pendingDeliveries: rows.filter(
      ({ order }) => !CLOSED_STATUSES.has(order.status),
    ).length,
    delayedDeliveries: rows.filter(
      ({ risk }) => risk.riskLevel === 'High',
    ).length,
    onTimePercentage:
      onTimeOutcomes.length === 0
        ? null
        : (onTimeOutcomes.filter(Boolean).length / onTimeOutcomes.length) * 100,
    onTimeSampleSize: onTimeOutcomes.length,
    averageDurationMs:
      durations.length === 0
        ? null
        : durations.reduce((total, duration) => total + duration, 0) /
          durations.length,
    durationSampleSize: durations.length,
  }
}

export function getStatusCounts(orders) {
  const counts = new Map()
  for (const order of orders) {
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1)
  }
  return [...counts].map(([status, count]) => ({ status, count }))
}

export function getDailyOrderVolume(orders) {
  const counts = new Map()
  for (const order of orders) {
    const createdAt = parseTimestamp(order.createdAt)
    if (createdAt === null) continue
    const day = new Date(createdAt).toISOString().slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return [...counts]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, orders]) => ({ date, orders }))
}

export function getRiskCounts(rows) {
  return DELIVERY_RISK_LEVELS.map((riskLevel) => ({
    riskLevel,
    count: rows.filter(({ risk }) => risk.riskLevel === riskLevel).length,
  }))
}

export function getDeliveryOutcomeCounts(orders) {
  let onTime = 0
  let delayed = 0
  for (const order of orders) {
    const outcome = getOnTimeOutcome(order)
    if (outcome === true) onTime += 1
    if (outcome === false) delayed += 1
  }
  return [
    { outcome: 'On time', count: onTime },
    { outcome: 'Delayed', count: delayed },
  ]
}

export function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return 'Insufficient data'
  const hours = durationMs / (60 * 60 * 1000)
  if (hours < 1) return `${Math.round(durationMs / 60_000)} min`
  return `${hours.toFixed(1)} hrs`
}

export function escapeCsv(value) {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function createShipmentRiskCsv(rows) {
  const headers = [
    'Order ID',
    'Destination',
    'Delivery Partner',
    'Status',
    'Promised Delivery Time',
    'Risk Level',
    'Risk Score',
    'Reason',
    'Recommended Action',
  ]
  const lines = rows.map(({ order, partner, deadline, risk, destination }) => [
    order.id,
    destination,
    partner?.name ?? 'Unassigned',
    order.status,
    deadline?.raw ?? '',
    risk.riskLevel,
    risk.score ?? '',
    risk.reason,
    risk.recommendedAction ?? '',
  ])
  return [headers, ...lines].map((line) => line.map(escapeCsv).join(',')).join('\r\n')
}

export function getOrderDeadline(order) {
  return getDeadline(order)
}
