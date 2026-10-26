import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MOCK_STORAGE_KEY,
  assignOrder,
  createDeliveryDataStore,
  createDeliveryException,
  updateDeliveryException,
  getPartnerRecommendations,
  initialDeliveryData,
  loadDeliveryData,
  saveRoutePlan,
  updateDeliveryStatus,
  updateOrderStatus,
  createOrder,
  markAllNotificationsRead,
  markNotificationRead,
  recordDeliveryAlert,
  setNotificationPreference,
} from './deliveryData.js'
import {
  getPartnerRouteStops,
  haversineDistanceKm,
  isValidLocation,
  optimizeRoute,
} from './routePlanning.js'
import {
  NOTIFICATION_EVENT_TYPES,
  evaluatePotentialDelay,
  getNotificationPreference,
  getNotificationsForIdentity,
} from './notificationService.js'

function freshData() {
  return structuredClone(initialDeliveryData)
}

function getPartner(data, partnerId) {
  return data.partners.find((partner) => partner.id === partnerId)
}

function getOrder(data, orderId) {
  return data.orders.find((order) => order.id === orderId)
}

test('assigns an unassigned order and updates both sides of the workload', () => {
  const data = freshData()
  const result = assignOrder(data, 'ORD-2048', 'DP-104')

  assert.equal(result.ok, true)
  assert.equal(getOrder(result.data, 'ORD-2048').partnerId, 'DP-104')
  assert.equal(getOrder(result.data, 'ORD-2048').status, 'Out for delivery')
  assert.equal(getPartner(result.data, 'DP-104').activeDeliveries, 2)
  assert.equal(getPartner(data, 'DP-104').activeDeliveries, 1)
})

test('keeps every mock partner workload consistent with its active orders', () => {
  const data = freshData()
  for (const partner of data.partners) {
    const activeOrders = data.orders.filter(
      (order) => order.partnerId === partner.id && order.status === 'Out for delivery',
    ).length
    assert.equal(partner.activeDeliveries, activeOrders, partner.id)
  }
})

test('blocks offline partners', () => {
  const result = assignOrder(freshData(), 'ORD-2054', 'DP-119')
  assert.equal(result.ok, false)
  assert.match(result.error, /offline/i)
})

test('blocks partners at maximum capacity', () => {
  const result = assignOrder(freshData(), 'ORD-2048', 'DP-123')
  assert.equal(result.ok, false)
  assert.match(result.error, /capacity/i)
})

test('excludes partners outside the order service area', () => {
  const data = freshData()
  const order = getOrder(data, 'ORD-2048')
  const recommendations = getPartnerRecommendations(order, data.partners)
  const unsupported = recommendations.find(({ partner }) => partner.id === 'DP-127')

  assert.equal(unsupported.eligible, false)
  assert.match(unsupported.eligibilityReason, /outside/i)
  assert.equal(assignOrder(data, order.id, 'DP-127').ok, false)
})

test('omits missing distance and renormalizes available score weights', () => {
  const data = freshData()
  const order = getOrder(data, 'ORD-2051')
  const recommendation = getPartnerRecommendations(order, data.partners).find(
    ({ partner }) => partner.id === 'DP-104',
  )

  assert.equal(recommendation.distanceKm, null)
  assert.equal(recommendation.distanceOmitted, true)
  assert.equal(recommendation.factors.some((factor) => factor.key === 'distance'), false)
  const normalizedWeight = recommendation.factors.reduce(
    (sum, factor) => sum + factor.effectiveWeight,
    0,
  )
  assert.ok(Math.abs(normalizedWeight - 1) < Number.EPSILON * 2)
})

test('breaks equal recommendation scores consistently by partner ID', () => {
  const data = freshData()
  const partners = data.partners
    .filter((partner) => ['DP-104', 'DP-108'].includes(partner.id))
    .map((partner) => ({
      ...partner,
      activeDeliveries: 0,
      availability: 'Available',
      location: null,
    }))
  const order = {
    ...getOrder(data, 'ORD-2048'),
    destination: {
      ...getOrder(data, 'ORD-2048').destination,
      location: null,
    },
  }

  const recommendations = getPartnerRecommendations(order, partners.reverse())
  assert.equal(recommendations[0].partner.id, 'DP-104')
  assert.equal(recommendations[1].partner.id, 'DP-108')
  assert.equal(recommendations[0].score, recommendations[1].score)
})

test('prevents assigning an order twice to the same partner', () => {
  const first = assignOrder(freshData(), 'ORD-2048', 'DP-104')
  const duplicate = assignOrder(first.data, 'ORD-2048', 'DP-104')

  assert.equal(duplicate.ok, false)
  assert.match(duplicate.error, /already assigned/i)
  assert.equal(getPartner(first.data, 'DP-104').activeDeliveries, 2)
})

test('reassigns an active order without double-counting either partner', () => {
  const data = freshData()
  const result = assignOrder(data, 'ORD-2042', 'DP-112')

  assert.equal(result.ok, true)
  assert.equal(getOrder(result.data, 'ORD-2042').partnerId, 'DP-112')
  assert.equal(getPartner(result.data, 'DP-104').activeDeliveries, 0)
  assert.equal(getPartner(result.data, 'DP-112').activeDeliveries, 3)
})

test('does not count an order twice when reassigning to the same partner', () => {
  const result = assignOrder(freshData(), 'ORD-2042', 'DP-104')
  assert.equal(result.ok, false)
  assert.match(result.error, /already assigned/i)
})

test('allows an out-of-area recommendation and assignment only with explicit admin authorization', () => {
  const data = freshData()
  const order = getOrder(data, 'ORD-2048')
  const normalRecommendation = getPartnerRecommendations(order, data.partners).find(
    ({ partner }) => partner.id === 'DP-127',
  )
  const overrideRecommendation = getPartnerRecommendations(order, data.partners, {
    adminAuthorized: true,
  }).find(({ partner }) => partner.id === 'DP-127')

  assert.equal(normalRecommendation.eligible, false)
  assert.equal(overrideRecommendation.eligible, true)
  assert.equal(assignOrder(data, order.id, 'DP-127', { overrideServiceArea: true }).ok, false)

  const authorized = assignOrder(data, order.id, 'DP-127', {
    adminAuthorized: true,
    overrideServiceArea: true,
  })
  assert.equal(authorized.ok, true)
  assert.equal(getPartner(authorized.data, 'DP-127').activeDeliveries, 2)
})

test('persists successful assignments and leaves state untouched when storage fails', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const store = createDeliveryDataStore(storage)
  let notifications = 0
  store.subscribe(() => {
    notifications += 1
  })

  assert.deepEqual(store.assign('ORD-2048', 'DP-104'), { ok: true })
  assert.equal(notifications, 1)
  assert.equal(
    JSON.parse(values.get(MOCK_STORAGE_KEY)).orders.find((order) => order.id === 'ORD-2048')
      .partnerId,
    'DP-104',
  )

  const failingStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('storage is full')
    },
  }
  const failingStore = createDeliveryDataStore(failingStorage)
  const failed = failingStore.assign('ORD-2048', 'DP-104')
  assert.equal(failed.ok, false)
  assert.match(failed.error, /storage is full/)
  assert.equal(
    failingStore.getSnapshot().orders.find((order) => order.id === 'ORD-2048').partnerId,
    null,
  )
})

test('reports invalid saved demo data instead of silently replacing it', () => {
  assert.throws(
    () => loadDeliveryData({ getItem: () => '{invalid json' }),
    /Could not load saved demo delivery data/,
  )
})

test('validates coordinate bounds and returns no distance for missing or invalid locations', () => {
  assert.equal(isValidLocation({ lat: 90, lon: 180 }), true)
  assert.equal(isValidLocation({ lat: 90.01, lon: 0 }), false)
  assert.equal(isValidLocation({ lat: 0, lon: -180.01 }), false)
  assert.equal(isValidLocation(null), false)
  assert.equal(haversineDistanceKm(null, { lat: 0, lon: 0 }), null)
  assert.equal(haversineDistanceKm({ lat: 100, lon: 0 }, { lat: 0, lon: 0 }), null)
})

test('optimizes multiple stops with nearest-neighbor and preserves order IDs', () => {
  const start = { lat: 0, lon: 0 }
  const stops = [
    { orderId: 'ORD-A', location: { lat: 0, lon: 2 } },
    { orderId: 'ORD-B', location: { lat: 0, lon: 1 } },
    { orderId: 'ORD-C', location: { lat: 0, lon: 3 } },
  ]
  const result = optimizeRoute(start, stops)

  assert.equal(result.ok, true)
  assert.deepEqual(
    result.originalStops.map((stop) => stop.orderId),
    ['ORD-A', 'ORD-B', 'ORD-C'],
  )
  assert.deepEqual(
    result.optimizedStops.map((stop) => stop.orderId),
    ['ORD-B', 'ORD-A', 'ORD-C'],
  )
  assert.ok(result.optimizedDistanceKm < result.originalDistanceKm)
  assert.ok(result.distanceSavedKm > 0)
  assert.equal(result.distanceLabel, 'Approximate straight-line distance; not road distance.')
})

test('returns a clear error for missing/invalid route coordinates and duplicate stops', () => {
  const validStop = { orderId: 'ORD-A', location: { lat: 0, lon: 1 } }
  assert.match(optimizeRoute(null, [validStop]).error, /pickup\/start/i)
  assert.match(
    optimizeRoute({ lat: 0, lon: 0 }, [{ orderId: 'ORD-B', location: null }]).error,
    /ORD-B needs valid destination coordinates/,
  )
  assert.match(
    optimizeRoute({ lat: 0, lon: 0 }, [validStop, validStop]).error,
    /duplicate/i,
  )
})

test('saves and reloads a route in the existing mock data store', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const store = createDeliveryDataStore(storage)
  const saved = store.saveRoute('DP-112', {
    label: 'Verified warehouse',
    lat: 37.77,
    lon: -122.42,
  }, ['ORD-2039', 'ORD-2037'])

  assert.deepEqual(saved, { ok: true })
  const reloaded = createDeliveryDataStore(storage).getSnapshot()
  assert.deepEqual(
    reloaded.routes.find((route) => route.partnerId === 'DP-112').stopOrderIds,
    ['ORD-2039', 'ORD-2037'],
  )
  assert.equal(
    reloaded.routes.find((route) => route.partnerId === 'DP-112').pickupLocation.label,
    'Verified warehouse',
  )
})

test('rejects duplicate, unassigned, completed, or missing-location route stops', () => {
  const data = freshData()
  const pickup = { lat: 37.77, lon: -122.42 }
  assert.match(
    saveRoutePlan(data, 'DP-112', pickup, ['ORD-2037', 'ORD-2037']).error,
    /duplicate/i,
  )
  assert.match(saveRoutePlan(data, 'DP-104', pickup, ['ORD-2037']).error, /not assigned/i)
  assert.match(saveRoutePlan(data, 'DP-112', pickup, ['ORD-2048']).error, /not assigned/i)
  assert.match(saveRoutePlan(data, 'DP-112', pickup, []).error, /at least one/i)
  assert.match(
    saveRoutePlan(data, 'DP-104', null, ['ORD-2042']).error,
    /pickup location/i,
  )

  const noCoordinates = freshData()
  const missingOrder = getOrder(noCoordinates, 'ORD-2037')
  missingOrder.destination.location = null
  assert.match(
    saveRoutePlan(noCoordinates, 'DP-112', pickup, ['ORD-2037']).error,
    /valid destination coordinates/,
  )
})

test('partner route contains only that partner’s active assigned orders in saved order', () => {
  const data = freshData()
  data.routes.push({
    partnerId: 'DP-112',
    pickupLocation: { label: 'Pickup', lat: 37.77, lon: -122.42 },
    stopOrderIds: ['ORD-2039', 'ORD-2037'],
  })
  const route = getPartnerRouteStops(data, 'DP-112')

  assert.deepEqual(
    route.stops.map((stop) => stop.orderId),
    ['ORD-2039', 'ORD-2037'],
  )
  assert.equal(route.stops.some((stop) => stop.orderId === 'ORD-2042'), false)
  assert.equal('customerName' in route.stops[0], false)
  assert.equal(route.stops[0].stopNumber, 1)
})

test('delivery status update requires the assigned partner and a valid transition', () => {
  const data = freshData()
  assert.equal(
    updateDeliveryStatus(data, 'ORD-2042', 'DP-112', 'Delivered').ok,
    false,
  )
  assert.equal(
    updateDeliveryStatus(data, 'ORD-2042', 'DP-104', 'Out for delivery').ok,
    false,
  )

  const result = updateDeliveryStatus(data, 'ORD-2042', 'DP-104', 'Delivered')
  assert.equal(result.ok, true)
  assert.equal(getOrder(result.data, 'ORD-2042').status, 'Delivered')
  assert.equal(getPartner(result.data, 'DP-104').activeDeliveries, 0)
  assert.equal(getPartner(result.data, 'DP-104').completedDeliveries, 385)
  assert.equal(updateDeliveryStatus(result.data, 'ORD-2042', 'DP-104', 'Out for delivery').ok, false)
})

test('delivery exceptions validate fields and record a high-severity notification once', () => {
  const data = freshData()
  const exception = {
    id: 'EXC-TEST-1',
    orderId: 'ORD-2042',
    type: 'Delivery delayed',
    severity: 'High',
    description: 'Road closure reported by the delivery partner.',
    notes: 'Use the alternate route.',
    responsibleRole: 'deliveryPartner',
    createdAt: '2026-10-24T10:00:00.000Z',
  }

  const created = createDeliveryException(data, exception)
  assert.equal(created.ok, true)
  assert.equal(created.exception.status, 'Open')
  assert.equal(created.data.notifications.filter(
    (item) => item.eventType === NOTIFICATION_EVENT_TYPES.HIGH_EXCEPTION,
  ).length, 2)
  assert.ok(created.data.notifications.some(
    (item) =>
      item.eventType === NOTIFICATION_EVENT_TYPES.HIGH_EXCEPTION &&
      item.role === 'admin' &&
      item.route === '/admin/monitoring/ORD-2042',
  ))
  assert.ok(created.data.notifications.some(
    (item) =>
      item.eventType === NOTIFICATION_EVENT_TYPES.HIGH_EXCEPTION &&
      item.role === 'deliveryPartner' &&
      item.route === '/partner/my-route',
  ))
  assert.equal(createDeliveryException(created.data, exception).ok, false)
  assert.equal(createDeliveryException(data, { ...exception, id: 'EXC-TEST-2', description: ' ' }).ok, false)
  assert.equal(createDeliveryException(data, { ...exception, id: 'EXC-TEST-3', orderId: 'missing' }).ok, false)
})

test('delivery exception transitions require resolution notes and preserve history', () => {
  const created = createDeliveryException(freshData(), {
    id: 'EXC-TEST-4',
    orderId: 'ORD-2042',
    type: 'Customer unavailable',
    severity: 'Medium',
    description: 'Customer did not answer.',
  })
  const inProgress = updateDeliveryException(created.data, 'EXC-TEST-4', 'In Progress', '')
  assert.equal(inProgress.ok, true)
  assert.equal(updateDeliveryException(inProgress.data, 'EXC-TEST-4', 'Resolved', '').ok, false)

  const resolved = updateDeliveryException(
    inProgress.data,
    'EXC-TEST-4',
    'Resolved',
    'Customer requested a new delivery time.',
  )
  assert.equal(resolved.ok, true)
  assert.equal(resolved.exception.history.length, 3)
  assert.equal(resolved.exception.history[2].notes, 'Customer requested a new delivery time.')
  assert.equal(
    resolved.data.notifications.filter(
      (item) => item.eventType === NOTIFICATION_EVENT_TYPES.EXCEPTION_RESOLVED,
    ).length,
    2,
  )
  assert.equal(updateDeliveryException(resolved.data, 'EXC-TEST-4', 'Open', '').ok, false)
})

test('delivery exception state and notification event IDs persist through store reload', () => {
  const values = new Map()
  const storage = {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
  const store = createDeliveryDataStore(storage)
  assert.equal(
    store.createException('ORD-2042', {
      type: 'Damaged shipment',
      severity: 'High',
      description: 'Packaging is visibly damaged.',
    }).ok,
    true,
  )
  const beforeReload = JSON.parse(values.get(MOCK_STORAGE_KEY))
  const reloaded = createDeliveryDataStore(storage).getSnapshot()
  assert.equal(reloaded.exceptions.length, 1)
  assert.equal(
    reloaded.notifications.filter(
      (item) => item.eventType === NOTIFICATION_EVENT_TYPES.HIGH_EXCEPTION,
    ).length,
    beforeReload.notifications.filter(
      (item) => item.eventType === NOTIFICATION_EVENT_TYPES.HIGH_EXCEPTION,
    ).length,
  )
})

test('order creation creates a customer-scoped confirmation, admin, and warehouse notifications once', () => {
  const data = freshData()
  const result = createOrder(data, {
    id: 'ORD-3001',
    customerId: 'CUS-22',
    customerName: 'Private Customer Name',
    destination: { address: 'Test address', serviceArea: 'Central District', location: null },
  })

  assert.equal(result.ok, true)
  const createdEvents = result.data.notifications.filter((item) =>
    item.eventType === NOTIFICATION_EVENT_TYPES.ORDER_CREATED,
  )
  assert.equal(createdEvents.length, 3)
  assert.ok(createdEvents.some((item) => item.role === 'admin'))
  assert.ok(createdEvents.some((item) => item.role === 'warehouseStaff'))
  const customerEvents = getNotificationsForIdentity(result.data, {
    role: 'customer',
    userId: 'CUS-22',
  })
  assert.equal(customerEvents.length, 1)
  assert.equal(customerEvents[0].message.includes('Private Customer Name'), false)
  assert.equal(createOrder(result.data, { ...result.data.orders.at(-1) }).ok, false)
})

test('assignment creates separate partner/customer/admin updates without cross-customer details', () => {
  const store = createDeliveryDataStore({
    getItem: () => null,
    setItem: () => {},
  })
  assert.equal(store.assign('ORD-2048', 'DP-104').ok, true)
  const result = store.getSnapshot()
  const partnerNotifications = getNotificationsForIdentity(result, {
    role: 'deliveryPartner',
    userId: 'DP-104',
  })
  const customerNotifications = getNotificationsForIdentity(result, {
    role: 'customer',
    userId: 'customer:ORD-2048',
  })
  const otherCustomerNotifications = getNotificationsForIdentity(result, {
    role: 'customer',
    userId: 'customer:ORD-2051',
  })

  assert.equal(partnerNotifications.length, 2)
  assert.equal(customerNotifications.length, 2)
  assert.equal(otherCustomerNotifications.length, 0)
  assert.ok(partnerNotifications.every((item) => !item.message.includes('Avery Thompson')))
  assert.ok(
    result.notifications.some(
      (item) => item.role === 'admin' && item.eventType === NOTIFICATION_EVENT_TYPES.ORDER_ASSIGNED,
    ),
  )
})

test('order lifecycle notifications are generated on valid transitions only', () => {
  let result = createOrder(freshData(), {
    id: 'ORD-3002',
    customerId: 'CUS-23',
    destination: { address: 'Test address', serviceArea: 'Central District', location: null },
  })
  result = updateOrderStatus(result.data, 'ORD-3002', 'Packed')
  assert.equal(result.ok, true)
  assert.equal(
    result.data.notifications.filter((item) => item.eventType === NOTIFICATION_EVENT_TYPES.ORDER_PACKED).length,
    3,
  )
  assert.equal(updateOrderStatus(result.data, 'ORD-3002', 'Delivered').ok, false)
  result = updateOrderStatus(result.data, 'ORD-3002', 'Dispatched')
  assert.equal(result.ok, true)
  assert.ok(
    Number.isFinite(
      Date.parse(result.data.orders.find((order) => order.id === 'ORD-3002').dispatchedAt),
    ),
  )
  assert.ok(
    result.data.notifications.some((item) => item.eventType === NOTIFICATION_EVENT_TYPES.ORDER_DISPATCHED),
  )
  assert.deepEqual(
    result.data.orderEvents.map((event) => event.status),
    ['Packed', 'Dispatched'],
  )
})

test('route assignment and changes notify only admin and the affected partner', () => {
  const data = freshData()
  const first = saveRoutePlan(
    data,
    'DP-112',
    { label: 'Pickup', lat: 37.77, lon: -122.42 },
    ['ORD-2037', 'ORD-2039'],
  )
  const routeEvents = first.data.notifications.filter((item) =>
    [NOTIFICATION_EVENT_TYPES.ROUTE_ASSIGNED, NOTIFICATION_EVENT_TYPES.ROUTE_CHANGED].includes(
      item.eventType,
    ),
  )
  assert.equal(routeEvents.length, 2)
  assert.ok(routeEvents.some((item) => item.role === 'admin'))
  assert.ok(routeEvents.some((item) => item.role === 'deliveryPartner' && item.userId === 'DP-112'))
  assert.equal(routeEvents.some((item) => item.role === 'customer'), false)

  const unchanged = saveRoutePlan(
    first.data,
    'DP-112',
    { label: 'Pickup', lat: 37.77, lon: -122.42 },
    ['ORD-2037', 'ORD-2039'],
  )
  assert.equal(
    unchanged.data.notifications.filter(
      (item) => item.eventType === NOTIFICATION_EVENT_TYPES.ROUTE_CHANGED,
    ).length,
    0,
  )
})

test('delivery alerts are critical or warning and duplicate event keys notify only once', () => {
  const data = freshData()
  const time = '2026-10-22T11:00:00.000Z'
  const first = recordDeliveryAlert(data, 'ORD-2042', 'attempt_failed', time)
  const duplicate = recordDeliveryAlert(first.data, 'ORD-2042', 'attempt_failed', time)
  assert.equal(first.ok, true)
  assert.equal(duplicate.ok, true)

  const adminAlerts = getNotificationsForIdentity(duplicate.data, {
    role: 'admin',
    userId: 'admin',
  }).filter((item) => item.eventType === NOTIFICATION_EVENT_TYPES.DELIVERY_ATTEMPT_FAILED)
  assert.equal(adminAlerts.length, 1)
  assert.equal(adminAlerts[0].priority, 'critical')
})

test('blocked offline assignment raises a deduplicated admin availability alert', () => {
  const store = createDeliveryDataStore({
    getItem: () => null,
    setItem: () => {},
  })
  const first = store.assign('ORD-2054', 'DP-119')
  const second = store.assign('ORD-2054', 'DP-119')
  const adminAlerts = getNotificationsForIdentity(store.getSnapshot(), {
    role: 'admin',
    userId: 'admin',
  }).filter((item) => item.eventType === 'partner.assignment_issue')

  assert.equal(first.ok, false)
  assert.equal(second.ok, false)
  assert.equal(adminAlerts.length, 1)
  assert.equal(adminAlerts[0].priority, 'warning')
})

test('potential delay alerts require an overdue verified timestamp and active dispatched status', () => {
  const now = Date.parse('2026-10-22T12:00:00.000Z')
  assert.equal(evaluatePotentialDelay({ status: 'Out for delivery' }, now), null)
  assert.equal(
    evaluatePotentialDelay(
      { status: 'Out for delivery', promisedDeliveryAt: 'invalid' },
      now,
    ),
    null,
  )
  assert.equal(
    evaluatePotentialDelay(
      { status: 'Delivered', promisedDeliveryAt: '2026-10-22T11:00:00.000Z' },
      now,
    ),
    null,
  )
  assert.equal(
    evaluatePotentialDelay(
      { id: 'ORD-2042', status: 'Out for delivery', promisedDeliveryAt: '2026-10-22T11:00:00.000Z' },
      now,
    ).eventId,
    'delay:ORD-2042:2026-10-22T11:00:00.000Z',
  )
})

test('overdue alerts are generated once from a promised time and persisted', () => {
  const data = freshData()
  const order = getOrder(data, 'ORD-2042')
  order.promisedDeliveryAt = '2000-01-01T00:00:00.000Z'
  const values = new Map([[MOCK_STORAGE_KEY, JSON.stringify(data)]])
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const store = createDeliveryDataStore(storage)
  const initialAlerts = getNotificationsForIdentity(store.getSnapshot(), {
    role: 'admin',
    userId: 'admin',
  }).filter((item) => item.eventType === NOTIFICATION_EVENT_TYPES.DELIVERY_DELAYED)

  assert.equal(initialAlerts.length, 1)
  assert.equal(store.evaluatePotentialDelays().created, 0)
  const reloaded = createDeliveryDataStore(storage).getSnapshot()
  assert.equal(
    getNotificationsForIdentity(reloaded, { role: 'admin', userId: 'admin' }).filter(
      (item) => item.eventType === NOTIFICATION_EVENT_TYPES.DELIVERY_DELAYED,
    ).length,
    1,
  )
})

test('notification preferences apply to new events and default to enabled', () => {
  const data = freshData()
  const identity = { role: 'customer', userId: 'CUS-24' }
  assert.equal(getNotificationPreference(data, identity, 'orders'), true)
  const changed = setNotificationPreference(data, identity, 'orders', false)
  assert.equal(changed.ok, true)
  assert.equal(getNotificationPreference(changed.data, identity, 'orders'), false)

  const created = createOrder(changed.data, {
    id: 'ORD-3003',
    customerId: identity.userId,
    destination: { address: 'Test address', serviceArea: 'Central District', location: null },
  })
  assert.equal(
    getNotificationsForIdentity(created.data, identity).length,
    0,
  )
  assert.equal(setNotificationPreference(data, identity, 'email', true).ok, false)
})

test('notification read actions are scoped to the target identity', () => {
  const data = freshData()
  const created = createOrder(data, {
    id: 'ORD-3004',
    customerId: 'CUS-25',
    destination: { address: 'Test address', serviceArea: 'Central District', location: null },
  })
  const customerNotification = getNotificationsForIdentity(created.data, {
    role: 'customer',
    userId: 'CUS-25',
  })[0]
  assert.equal(
    markNotificationRead(created.data, customerNotification.id, {
      role: 'customer',
      userId: 'CUS-26',
    }).ok,
    false,
  )
  const read = markNotificationRead(created.data, customerNotification.id, {
    role: 'customer',
    userId: 'CUS-25',
  })
  assert.equal(read.ok, true)
  const allRead = markAllNotificationsRead(read.data, {
    role: 'customer',
    userId: 'CUS-25',
  })
  assert.ok(
    getNotificationsForIdentity(allRead.data, {
      role: 'customer',
      userId: 'CUS-25',
    }).every((item) => item.read),
  )
})
