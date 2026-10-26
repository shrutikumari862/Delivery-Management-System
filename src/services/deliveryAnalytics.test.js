import assert from 'node:assert/strict'
import test from 'node:test'
import { initialDeliveryData, createDeliveryDataStore, MOCK_STORAGE_KEY } from './deliveryData.js'
import {
  ANALYTICS_PERIODS,
  assessShipmentRisk,
  createShipmentRiskCsv,
  filterOrdersByPeriod,
  getAnalyticsSummary,
  getDeliveryOutcomeCounts,
  getPartnerDurationBaselines,
  getPartnerPerformance,
} from './deliveryAnalytics.js'
import {
  NOTIFICATION_EVENT_TYPES,
  getNotificationsForIdentity,
} from './notificationService.js'

const NOW = Date.parse('2026-10-22T18:00:00.000Z')

function makeActiveOrder(overrides = {}) {
  return {
    id: 'ORD-RISK-1',
    status: 'Out for delivery',
    partnerId: 'DP-104',
    createdAt: '2026-10-22T08:00:00.000Z',
    destination: { address: '100 Main Street' },
    ...overrides,
  }
}

test('shipment risk requires reliable evidence and applies documented deadline thresholds', () => {
  assert.equal(assessShipmentRisk(makeActiveOrder(), { now: NOW }).riskLevel, 'Insufficient data')
  assert.equal(
    assessShipmentRisk(
      makeActiveOrder({ promisedDeliveryAt: '2026-10-22T21:00:00.000Z' }),
      { now: NOW },
    ).riskLevel,
    'Low',
  )
  assert.equal(
    assessShipmentRisk(
      makeActiveOrder({ promisedDeliveryAt: '2026-10-22T19:00:00.000Z' }),
      { now: NOW },
    ).riskLevel,
    'Medium',
  )
  const overdue = assessShipmentRisk(
    makeActiveOrder({ promisedDeliveryAt: '2026-10-22T17:00:00.000Z' }),
    { now: NOW },
  )
  assert.equal(overdue.riskLevel, 'High')
  assert.match(overdue.reason, /has passed/i)
})

test('invalid timestamps and statuses without dispatch evidence remain insufficient', () => {
  assert.equal(
    assessShipmentRisk(
      makeActiveOrder({ promisedDeliveryAt: 'not-a-date' }),
      { now: NOW },
    ).riskLevel,
    'Insufficient data',
  )
  assert.equal(
    assessShipmentRisk(
      makeActiveOrder({ status: 'Packed', promisedDeliveryAt: '2026-10-22T19:00:00.000Z' }),
      { now: NOW },
    ).riskLevel,
    'Insufficient data',
  )
})

test('failed attempts are medium risk and explicitly reported delays are high risk', () => {
  const order = makeActiveOrder()
  const failed = assessShipmentRisk(order, {
    now: NOW,
    notifications: [{
      orderId: order.id,
      eventType: NOTIFICATION_EVENT_TYPES.DELIVERY_ATTEMPT_FAILED,
      eventId: 'attempt-1',
    }],
  })
  const delayed = assessShipmentRisk(order, {
    now: NOW,
    notifications: [{
      orderId: order.id,
      eventType: NOTIFICATION_EVENT_TYPES.DELIVERY_DELAYED,
      eventId: 'delay-1',
    }],
  })
  assert.equal(failed.riskLevel, 'Medium')
  assert.equal(delayed.riskLevel, 'High')
  assert.equal(
    assessShipmentRisk(
      { ...order, promisedDeliveryAt: '2026-10-22T17:00:00.000Z' },
      {
        now: NOW,
        notifications: [{
          orderId: order.id,
          eventType: NOTIFICATION_EVENT_TYPES.DELIVERY_ATTEMPT_FAILED,
          eventId: 'attempt-1',
        }],
      },
    ).riskLevel,
    'High',
  )
})

test('historical partner risk baseline requires two valid completed deliveries', () => {
  const completed = [
    {
      id: 'DONE-1',
      status: 'Delivered',
      partnerId: 'DP-104',
      dispatchedAt: '2026-10-20T08:00:00.000Z',
      deliveredAt: '2026-10-20T09:00:00.000Z',
    },
    {
      id: 'DONE-2',
      status: 'Delivered',
      partnerId: 'DP-104',
      dispatchedAt: '2026-10-21T08:00:00.000Z',
      deliveredAt: '2026-10-21T09:00:00.000Z',
    },
  ]
  const baselines = getPartnerDurationBaselines(completed)
  assert.equal(baselines.get('DP-104').sampleSize, 2)
  assert.equal(
    assessShipmentRisk(
      makeActiveOrder({ dispatchedAt: '2026-10-22T15:00:00.000Z' }),
      { now: NOW, durationBaselines: baselines },
    ).riskLevel,
    'High',
  )
  assert.equal(
    assessShipmentRisk(
      makeActiveOrder({ dispatchedAt: '2026-10-22T15:00:00.000Z' }),
      {
        now: NOW,
        durationBaselines: new Map([['DP-104', { averageDurationMs: 3_600_000, sampleSize: 1 }]]),
      },
    ).riskLevel,
    'Insufficient data',
  )
})

test('completed on-time and late outcomes require actual and promised timestamps', () => {
  const data = structuredClone(initialDeliveryData)
  data.orders = [
    {
      id: 'DONE-ON-TIME',
      status: 'Delivered',
      partnerId: 'DP-104',
      createdAt: '2026-10-21T08:00:00.000Z',
      dispatchedAt: '2026-10-21T08:30:00.000Z',
      deliveredAt: '2026-10-21T09:00:00.000Z',
      promisedDeliveryAt: '2026-10-21T09:30:00.000Z',
    },
    {
      id: 'DONE-LATE',
      status: 'Delivered',
      partnerId: 'DP-104',
      createdAt: '2026-10-21T08:00:00.000Z',
      dispatchedAt: '2026-10-21T08:30:00.000Z',
      deliveredAt: '2026-10-21T10:00:00.000Z',
      promisedDeliveryAt: '2026-10-21T09:30:00.000Z',
    },
    {
      id: 'DONE-UNKNOWN',
      status: 'Delivered',
      partnerId: 'DP-104',
      createdAt: '2026-10-21T08:00:00.000Z',
    },
  ]
  const summary = getAnalyticsSummary(data.orders.map((order) => ({
    order,
    risk: { riskLevel: order.id === 'DONE-LATE' ? 'High' : 'Low' },
  })))
  assert.equal(summary.deliveredOrders, 3)
  assert.equal(summary.onTimePercentage, 50)
  assert.equal(summary.onTimeSampleSize, 2)
  assert.equal(summary.averageDurationMs, 3_600_000)
  assert.equal(summary.durationSampleSize, 2)
  assert.deepEqual(
    getDeliveryOutcomeCounts(data.orders),
    [{ outcome: 'On time', count: 1 }, { outcome: 'Delayed', count: 1 }],
  )
  const partner = getPartnerPerformance(data.orders, data.partners)[0]
  assert.equal(partner.onTimeSampleSize, 2)
  assert.equal(partner.durationSampleSize, 2)
})

test('empty analytics data produces zero counts and unavailable rates without division errors', () => {
  const summary = getAnalyticsSummary([])
  assert.deepEqual(summary, {
    totalOrders: 0,
    deliveredOrders: 0,
    pendingDeliveries: 0,
    delayedDeliveries: 0,
    onTimePercentage: null,
    onTimeSampleSize: 0,
    averageDurationMs: null,
    durationSampleSize: 0,
  })
  const performance = getPartnerPerformance([], initialDeliveryData.partners)
  assert.ok(performance.every((item) =>
    item.assignedDeliveries === 0 &&
    item.completedDeliveries === 0 &&
    item.onTimePercentage === null &&
    item.averageDurationMs === null,
  ))
})

test('date filters retain only valid records inside the selected range', () => {
  const orders = [
    { id: 'recent', createdAt: '2026-10-20T00:00:00.000Z' },
    { id: 'old', createdAt: '2026-09-01T00:00:00.000Z' },
    { id: 'invalid', createdAt: 'invalid' },
  ]
  assert.deepEqual(
    filterOrdersByPeriod(orders, ANALYTICS_PERIODS.SEVEN_DAYS, NOW).map(({ id }) => id),
    ['recent'],
  )
  assert.equal(filterOrdersByPeriod(orders, ANALYTICS_PERIODS.ALL, NOW).length, 3)
})

test('CSV export escapes quoted values and includes the filtered risk rows', () => {
  const order = makeActiveOrder({ customerName: 'Ignored private field' })
  const rows = [{
    order: { ...order, destination: { address: '7 "Oak" Street' } },
    destination: '7 "Oak" Street',
    partner: null,
    deadline: null,
    risk: { riskLevel: 'Insufficient data', score: null, reason: 'No data', recommendedAction: null },
  }]
  const csv = createShipmentRiskCsv(rows)
  assert.match(csv, /Order ID/)
  assert.match(csv, /"7 ""Oak"" Street"/)
  assert.doesNotMatch(csv, /Ignored private field/)
})

test('high-risk admin notification is persisted once across repeated evaluations', () => {
  const saved = structuredClone(initialDeliveryData)
  saved.orders.find((order) => order.id === 'ORD-2042').promisedDeliveryAt =
    '2000-01-01T00:00:00.000Z'
  const values = new Map([[MOCK_STORAGE_KEY, JSON.stringify(saved)]])
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const store = createDeliveryDataStore(storage)
  const firstNotifications = getNotificationsForIdentity(store.getSnapshot(), {
    role: 'admin',
    userId: 'admin',
  }).filter((notification) =>
    notification.eventType === NOTIFICATION_EVENT_TYPES.SHIPMENT_HIGH_RISK,
  )
  assert.equal(firstNotifications.length, 1)
  assert.equal(firstNotifications[0].priority, 'critical')
  assert.equal(store.evaluatePotentialDelays().created, 0)
  const reloaded = createDeliveryDataStore(storage).getSnapshot()
  assert.equal(
    getNotificationsForIdentity(reloaded, { role: 'admin', userId: 'admin' }).filter(
      (notification) => notification.eventType === NOTIFICATION_EVENT_TYPES.SHIPMENT_HIGH_RISK,
    ).length,
    1,
  )
})

test('recording a delivery delay immediately emits an admin high-risk notification', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const store = createDeliveryDataStore(storage)
  const result = store.recordDeliveryAlert('ORD-2042', 'delayed', '2026-10-22T18:00:00.000Z')
  assert.equal(result.ok, true)
  const highRisk = getNotificationsForIdentity(store.getSnapshot(), {
    role: 'admin',
    userId: 'admin',
  }).filter((notification) =>
    notification.eventType === NOTIFICATION_EVENT_TYPES.SHIPMENT_HIGH_RISK,
  )
  assert.equal(highRisk.length, 1)
})
