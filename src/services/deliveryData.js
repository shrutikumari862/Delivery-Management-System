import { isValidLocation } from './routePlanning.js'
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_EVENT_TYPES,
  appendEventNotifications,
  evaluatePotentialDelay,
} from './notificationService.js'
import {
  assessShipmentRisk,
  getPartnerDurationBaselines,
} from './deliveryAnalytics.js'

export const SCORING_WEIGHTS = Object.freeze({
  availability: 0.15,
  remainingCapacity: 0.25,
  distance: 0.25,
  serviceArea: 0.2,
  workload: 0.15,
})

export const MOCK_STORAGE_KEY = 'routewise.delivery-demo.v1'
const DISTANCE_SCORE_LIMIT_KM = 50

export const initialDeliveryData = {
  partners: [
    {
      id: 'DP-104',
      name: 'Maya Chen',
      availability: 'Available',
      activeDeliveries: 1,
      maxCapacity: 5,
      serviceAreas: ['North District', 'Central District'],
      completedDeliveries: 384,
      onTimePercentage: 97,
      location: { lat: 37.7849, lon: -122.4094 },
    },
    {
      id: 'DP-108',
      name: 'Andre Wilson',
      availability: 'Available',
      activeDeliveries: 0,
      maxCapacity: 4,
      serviceAreas: ['Central District', 'South District'],
      completedDeliveries: 291,
      onTimePercentage: 95,
      location: null,
    },
    {
      id: 'DP-112',
      name: 'Priya Shah',
      availability: 'Busy',
      activeDeliveries: 2,
      maxCapacity: 5,
      serviceAreas: ['North District', 'Central District'],
      completedDeliveries: 512,
      onTimePercentage: 99,
      location: { lat: 37.7793, lon: -122.4192 },
    },
    {
      id: 'DP-119',
      name: 'Jordan Lee',
      availability: 'Offline',
      activeDeliveries: 0,
      maxCapacity: 4,
      serviceAreas: ['South District'],
      completedDeliveries: 178,
      onTimePercentage: 92,
      location: { lat: 37.7501, lon: -122.4142 },
    },
    {
      id: 'DP-123',
      name: 'Elena Garcia',
      availability: 'Available',
      activeDeliveries: 4,
      maxCapacity: 4,
      serviceAreas: ['North District', 'Central District', 'South District'],
      completedDeliveries: 427,
      onTimePercentage: 96,
      location: { lat: 37.7684, lon: -122.4312 },
    },
    {
      id: 'DP-127',
      name: 'Sam Okafor',
      availability: 'Available',
      activeDeliveries: 1,
      maxCapacity: 3,
      serviceAreas: ['South District'],
      completedDeliveries: 205,
      onTimePercentage: 94,
      location: { lat: 37.7544, lon: -122.3988 },
    },
  ],
  orders: [
    {
      id: 'ORD-2048',
      customerName: 'Avery Thompson',
      destination: {
        address: '18 Market Street',
        serviceArea: 'Central District',
        location: { lat: 37.7936, lon: -122.3965 },
      },
      status: 'Ready for assignment',
      partnerId: null,
      createdAt: '2026-10-22T08:30:00.000Z',
    },
    {
      id: 'ORD-2051',
      customerName: 'Noah Patel',
      destination: {
        address: '240 Pine Street',
        serviceArea: 'North District',
        location: null,
      },
      status: 'Ready for assignment',
      partnerId: null,
      createdAt: '2026-10-22T09:10:00.000Z',
    },
    {
      id: 'ORD-2054',
      customerName: 'Camila Brown',
      destination: {
        address: '62 Valencia Street',
        serviceArea: 'South District',
        location: { lat: 37.7681, lon: -122.4217 },
      },
      status: 'Ready for assignment',
      partnerId: null,
      createdAt: '2026-10-22T09:45:00.000Z',
    },
    {
      id: 'ORD-2042',
      customerName: 'Theo Martin',
      destination: {
        address: '500 Howard Street',
        serviceArea: 'Central District',
        location: { lat: 37.7881, lon: -122.3967 },
      },
      status: 'Out for delivery',
      partnerId: 'DP-104',
      createdAt: '2026-10-22T07:00:00.000Z',
    },
    {
      id: 'ORD-2037',
      customerName: 'Lena Foster',
      destination: {
        address: '90 Polk Street',
        serviceArea: 'Central District',
        location: { lat: 37.7922, lon: -122.4211 },
      },
      status: 'Out for delivery',
      partnerId: 'DP-112',
      createdAt: '2026-10-22T06:45:00.000Z',
    },
    {
      id: 'ORD-2039',
      customerName: 'Ethan Kim',
      destination: {
        address: '12 Broadway',
        serviceArea: 'North District',
        location: { lat: 37.7982, lon: -122.4047 },
      },
      status: 'Out for delivery',
      partnerId: 'DP-112',
      createdAt: '2026-10-22T06:55:00.000Z',
    },
    {
      id: 'ORD-2028',
      customerName: 'Olivia Reed',
      destination: {
        address: '330 Geary Street',
        serviceArea: 'Central District',
        location: { lat: 37.7872, lon: -122.4101 },
      },
      status: 'Out for delivery',
      partnerId: 'DP-123',
      createdAt: '2026-10-22T06:20:00.000Z',
    },
    {
      id: 'ORD-2030',
      customerName: 'Mason Diaz',
      destination: {
        address: '75 Mission Street',
        serviceArea: 'Central District',
        location: { lat: 37.7913, lon: -122.3972 },
      },
      status: 'Out for delivery',
      partnerId: 'DP-123',
      createdAt: '2026-10-22T06:25:00.000Z',
    },
    {
      id: 'ORD-2031',
      customerName: 'Zoe Bennett',
      destination: {
        address: '47 Castro Street',
        serviceArea: 'South District',
        location: { lat: 37.7629, lon: -122.435 },
      },
      status: 'Out for delivery',
      partnerId: 'DP-123',
      createdAt: '2026-10-22T06:30:00.000Z',
    },
    {
      id: 'ORD-2033',
      customerName: 'Leo James',
      destination: {
        address: '18 8th Street',
        serviceArea: 'South District',
        location: { lat: 37.7761, lon: -122.4148 },
      },
      status: 'Out for delivery',
      partnerId: 'DP-123',
      createdAt: '2026-10-22T06:35:00.000Z',
    },
    {
      id: 'ORD-2035',
      customerName: 'Amara Lewis',
      destination: {
        address: '801 3rd Street',
        serviceArea: 'South District',
        location: { lat: 37.7731, lon: -122.3944 },
      },
      status: 'Out for delivery',
      partnerId: 'DP-127',
      createdAt: '2026-10-22T06:40:00.000Z',
    },
  ],
  routes: [],
  orderEvents: [],
  exceptions: [],
  notifications: [],
  notificationEventIds: [],
  notificationPreferences: {},
}

function cloneData(data) {
  return structuredClone(data)
}

export function loadDeliveryData(storage = window.localStorage) {
  const savedData = storage.getItem(MOCK_STORAGE_KEY)
  if (savedData === null) return cloneData(initialDeliveryData)

  try {
    const parsed = JSON.parse(savedData)
    if (!Array.isArray(parsed.partners) || !Array.isArray(parsed.orders)) {
      throw new Error('Stored delivery data must contain partner and order lists.')
    }
    if (parsed.routes === undefined) parsed.routes = []
    if (!Array.isArray(parsed.routes)) {
      throw new Error('Stored delivery routes must be a list.')
    }
    if (parsed.orderEvents === undefined) parsed.orderEvents = []
    if (!Array.isArray(parsed.orderEvents)) {
      throw new Error('Stored order events must be a list.')
    }
    if (parsed.exceptions === undefined) parsed.exceptions = []
    if (!Array.isArray(parsed.exceptions)) {
      throw new Error('Stored delivery exceptions must be a list.')
    }
    if (parsed.notifications === undefined) parsed.notifications = []
    if (!Array.isArray(parsed.notifications)) {
      throw new Error('Stored notifications must be a list.')
    }
    if (parsed.notificationEventIds === undefined) {
      parsed.notificationEventIds = parsed.notifications.map((item) => item.id)
    }
    if (!Array.isArray(parsed.notificationEventIds)) {
      throw new Error('Stored notification event IDs must be a list.')
    }
    if (parsed.notificationPreferences === undefined) {
      parsed.notificationPreferences = {}
    }
    if (
      parsed.notificationPreferences === null ||
      typeof parsed.notificationPreferences !== 'object' ||
      Array.isArray(parsed.notificationPreferences)
    ) {
      throw new Error('Stored notification preferences must be an object.')
    }
    return parsed
  } catch (error) {
    throw new Error(`Could not load saved demo delivery data: ${error.message}`)
  }
}

function normalizeArea(area) {
  return area?.trim().toLocaleLowerCase() ?? ''
}

function isWithinServiceArea(partner, order) {
  const destinationArea = normalizeArea(order.destination?.serviceArea)
  return (
    destinationArea !== '' &&
    partner.serviceAreas.some((area) => normalizeArea(area) === destinationArea)
  )
}

function getDistanceKm(origin, destination) {
  if (
    !origin ||
    !destination ||
    !Number.isFinite(origin.lat) ||
    !Number.isFinite(origin.lon) ||
    !Number.isFinite(destination.lat) ||
    !Number.isFinite(destination.lon)
  ) {
    return null
  }

  const radians = (degrees) => (degrees * Math.PI) / 180
  const latitudeDelta = radians(destination.lat - origin.lat)
  const longitudeDelta = radians(destination.lon - origin.lon)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(origin.lat)) *
      Math.cos(radians(destination.lat)) *
      Math.sin(longitudeDelta / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function getEligibility(partner, order) {
  if (partner.availability === 'Offline') return 'Partner is offline.'
  if (partner.activeDeliveries >= partner.maxCapacity) {
    return 'Partner is at maximum delivery capacity.'
  }
  if (!isWithinServiceArea(partner, order)) {
    return 'Destination is outside the partner service area.'
  }
  return null
}

function getWorkloadScores(partners) {
  const workloads = partners.map((partner) => partner.activeDeliveries)
  const lowest = Math.min(...workloads)
  const highest = Math.max(...workloads)

  return new Map(
    partners.map((partner) => [
      partner.id,
      highest === lowest
        ? 50
        : ((highest - partner.activeDeliveries) / (highest - lowest)) * 100,
    ]),
  )
}

export function getPartnerRecommendations(order, partners, { adminAuthorized = false } = {}) {
  const candidates = partners.filter((partner) => {
    if (partner.availability === 'Offline') return false
    if (partner.activeDeliveries >= partner.maxCapacity) return false
    return adminAuthorized || isWithinServiceArea(partner, order)
  })
  const workloadScores = getWorkloadScores(candidates)

  return partners
    .map((partner) => {
      const eligibilityReason = getEligibility(partner, order)
      const overrideAvailable =
        adminAuthorized &&
        partner.availability !== 'Offline' &&
        partner.activeDeliveries < partner.maxCapacity &&
        !isWithinServiceArea(partner, order)
      const eligible = eligibilityReason === null || overrideAvailable
      const distanceKm = getDistanceKm(partner.location, order.destination?.location)
      const factors = [
        {
          key: 'availability',
          label: 'Availability',
          weight: SCORING_WEIGHTS.availability,
          score: partner.availability === 'Available' ? 100 : 50,
          reason:
            partner.availability === 'Available'
              ? 'Available to take an order.'
              : 'Busy, but has remaining capacity.',
        },
        {
          key: 'remainingCapacity',
          label: 'Remaining capacity',
          weight: SCORING_WEIGHTS.remainingCapacity,
          score: Math.max(
            0,
            ((partner.maxCapacity - partner.activeDeliveries) / partner.maxCapacity) *
              100,
          ),
          reason: `${partner.maxCapacity - partner.activeDeliveries} of ${partner.maxCapacity} delivery slots remain.`,
        },
        {
          key: 'serviceArea',
          label: 'Service area',
          weight: SCORING_WEIGHTS.serviceArea,
          score: isWithinServiceArea(partner, order) ? 100 : 0,
          reason: isWithinServiceArea(partner, order)
            ? `Covers ${order.destination.serviceArea}.`
            : overrideAvailable
              ? 'Outside service area; an authorized override is required.'
              : `Does not cover ${order.destination?.serviceArea ?? 'the destination area'}.`,
        },
        {
          key: 'workload',
          label: 'Current workload',
          weight: SCORING_WEIGHTS.workload,
          score: workloadScores.get(partner.id) ?? 0,
          reason:
            candidates.length > 0
              ? `${partner.activeDeliveries} active ${
                  partner.activeDeliveries === 1 ? 'delivery' : 'deliveries'
                }; compared with other eligible partners.`
              : 'No eligible partners to compare workloads.',
        },
      ]

      if (distanceKm !== null) {
        factors.push({
          key: 'distance',
          label: 'Distance',
          weight: SCORING_WEIGHTS.distance,
          score: Math.max(
            0,
            100 - (distanceKm / DISTANCE_SCORE_LIMIT_KM) * 100,
          ),
          reason: `Approximately ${distanceKm.toFixed(1)} km from the destination; closer scores higher (50 km scoring limit).`,
        })
      }

      const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0)
      const score = factors.reduce(
        (sum, factor) => sum + factor.score * factor.weight,
        0,
      )

      return {
        partner,
        eligible,
        eligibilityReason: eligible
          ? overrideAvailable
            ? 'Eligible only with an authorized service-area override.'
            : null
          : eligibilityReason,
        distanceKm,
        score: Math.round((score / totalWeight) * 10) / 10,
        factors: factors.map((factor) => ({
          ...factor,
          effectiveWeight: factor.weight / totalWeight,
        })),
        distanceOmitted: distanceKm === null,
      }
    })
    .sort(
      (first, second) =>
        Number(second.eligible) - Number(first.eligible) ||
        second.score - first.score ||
        first.partner.activeDeliveries - second.partner.activeDeliveries ||
        first.partner.id.localeCompare(second.partner.id),
    )
}

function validateAssignment(data, orderId, partnerId, options) {
  const order = data.orders.find((item) => item.id === orderId)
  const partner = data.partners.find((item) => item.id === partnerId)

  if (!order) return { error: 'Order was not found.' }
  if (!partner) return { error: 'Delivery partner was not found.' }
  if (order.partnerId === partnerId) {
    return { error: 'This order is already assigned to that partner.' }
  }
  if (order.status === 'Delivered' || order.status === 'Cancelled') {
    return { error: 'Delivered or cancelled orders cannot be assigned.' }
  }
  if (partner.availability === 'Offline') {
    return { error: 'Offline partners cannot be assigned.' }
  }

  const previousPartner = order.partnerId
    ? data.partners.find((item) => item.id === order.partnerId)
    : null

  if (order.partnerId && !previousPartner) {
    return { error: 'The current assignment is inconsistent; partner was not found.' }
  }

  const effectiveActiveDeliveries =
    partner.activeDeliveries - Number(previousPartner?.id === partner.id)
  if (effectiveActiveDeliveries >= partner.maxCapacity) {
    return { error: 'This partner has no remaining delivery capacity.' }
  }

  const withinServiceArea = isWithinServiceArea(partner, order)
  if (!withinServiceArea && !(options.adminAuthorized && options.overrideServiceArea)) {
    return { error: 'Destination is outside the partner service area.' }
  }

  if (previousPartner && previousPartner.activeDeliveries < 1) {
    return { error: 'The current partner workload is inconsistent; cannot reassign safely.' }
  }

  return { order, partner, previousPartner }
}

export function assignOrder(data, orderId, partnerId, options = {}) {
  const { adminAuthorized = false, overrideServiceArea = false } = options
  const assignment = validateAssignment(data, orderId, partnerId, {
    adminAuthorized,
    overrideServiceArea,
  })
  if (assignment.error) return { ok: false, error: assignment.error }

  const { order, partner, previousPartner } = assignment
  const nextData = cloneData(data)
  const updatedOrder = nextData.orders.find((item) => item.id === order.id)
  const updatedPartner = nextData.partners.find((item) => item.id === partner.id)

  if (previousPartner) {
    const oldPartner = nextData.partners.find((item) => item.id === previousPartner.id)
    oldPartner.activeDeliveries -= 1
  }

  updatedPartner.activeDeliveries += 1
  updatedOrder.partnerId = updatedPartner.id
  updatedOrder.status = 'Out for delivery'
  if (previousPartner) {
    for (const route of nextData.routes ?? []) {
      if (route.partnerId === previousPartner.id) {
        route.stopOrderIds = route.stopOrderIds.filter((id) => id !== order.id)
      }
    }
  }

  return { ok: true, data: nextData }
}

export function saveRoutePlan(data, partnerId, pickupLocation, orderIds) {
  const partner = data.partners.find((item) => item.id === partnerId)
  if (!partner) return { ok: false, error: 'Delivery partner was not found.' }
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return { ok: false, error: 'Select at least one assigned order for the route.' }
  }
  if (!isValidLocation(pickupLocation)) {
    return { ok: false, error: 'Enter a valid pickup location before saving the route.' }
  }
  if (new Set(orderIds).size !== orderIds.length) {
    return { ok: false, error: 'A route cannot contain duplicate order stops.' }
  }

  for (const orderId of orderIds) {
    const order = data.orders.find((item) => item.id === orderId)
    if (!order) return { ok: false, error: `Order ${orderId} was not found.` }
    if (order.partnerId !== partnerId) {
      return {
        ok: false,
        error: `Order ${orderId} is not assigned to ${partner.name}.`,
      }
    }
    if (order.status === 'Cancelled' || order.status === 'Delivered') {
      return {
        ok: false,
        error: `Order ${orderId} is not an active delivery stop.`,
      }
    }
    if (!isValidLocation(order.destination?.location)) {
      return {
        ok: false,
        error: `Order ${orderId} needs valid destination coordinates before the route can be saved.`,
      }
    }
  }

  const nextData = cloneData(data)
  nextData.routes ??= []
  const route = {
    partnerId,
    pickupLocation: {
      label: pickupLocation.label?.trim() || 'Pickup location',
      lat: pickupLocation.lat,
      lon: pickupLocation.lon,
    },
    stopOrderIds: [...orderIds],
    savedAt: new Date().toISOString(),
  }
  const routeIndex = nextData.routes.findIndex((item) => item.partnerId === partnerId)
  const previousRoute = routeIndex === -1 ? null : nextData.routes[routeIndex]
  const routeChanged =
    !previousRoute ||
    previousRoute.stopOrderIds.length !== route.stopOrderIds.length ||
    previousRoute.stopOrderIds.some((id, index) => id !== route.stopOrderIds[index]) ||
    previousRoute.pickupLocation.lat !== route.pickupLocation.lat ||
    previousRoute.pickupLocation.lon !== route.pickupLocation.lon ||
    previousRoute.pickupLocation.label !== route.pickupLocation.label
  if (routeIndex === -1) nextData.routes.push(route)
  else nextData.routes[routeIndex] = route

  if (routeChanged) {
    appendEventNotifications(nextData, {
      type: previousRoute
        ? NOTIFICATION_EVENT_TYPES.ROUTE_CHANGED
        : NOTIFICATION_EVENT_TYPES.ROUTE_ASSIGNED,
      eventId: `route:${partnerId}:${route.savedAt}`,
      partnerId,
      occurredAt: route.savedAt,
    })
  }

  return { ok: true, data: nextData }
}

export function updateOrderLocation(data, orderId, location) {
  const order = data.orders.find((item) => item.id === orderId)
  if (!order) return { ok: false, error: 'Order was not found.' }
  if (!isValidLocation(location)) {
    return {
      ok: false,
      error: 'Enter valid coordinates: latitude -90 to 90, longitude -180 to 180.',
    }
  }

  const nextData = cloneData(data)
  const updatedOrder = nextData.orders.find((item) => item.id === orderId)
  updatedOrder.destination.location = {
    lat: location.lat,
    lon: location.lon,
  }
  return { ok: true, data: nextData }
}

export function updateDeliveryStatus(data, orderId, partnerId, nextStatus) {
  const order = data.orders.find((item) => item.id === orderId)
  if (!order) return { ok: false, error: 'Order was not found.' }
  if (order.partnerId !== partnerId) {
    return {
      ok: false,
      error: 'This order is not assigned to the selected delivery partner.',
    }
  }
  if (order.status !== 'Out for delivery' || nextStatus !== 'Delivered') {
    return {
      ok: false,
      error: `Cannot change delivery status from "${order.status}" to "${nextStatus}".`,
    }
  }

  const partner = data.partners.find((item) => item.id === partnerId)
  if (!partner || partner.activeDeliveries < 1) {
    return {
      ok: false,
      error: 'Partner workload is inconsistent; the delivery was not updated.',
    }
  }

  const nextData = cloneData(data)
  const updatedOrder = nextData.orders.find((item) => item.id === orderId)
  const updatedPartner = nextData.partners.find((item) => item.id === partnerId)
  updatedOrder.status = 'Delivered'
  const occurredAt = new Date().toISOString()
  updatedOrder.deliveredAt = occurredAt
  updatedPartner.activeDeliveries -= 1
  updatedPartner.completedDeliveries += 1
  nextData.orderEvents ??= []
  nextData.orderEvents.push({
    id: `status:${orderId}:Delivered:${occurredAt}`,
    orderId,
    type: 'status',
    status: 'Delivered',
    occurredAt,
  })
  appendEventNotifications(nextData, {
    type: NOTIFICATION_EVENT_TYPES.ORDER_DELIVERED,
    eventId: `status:${orderId}:Delivered:${occurredAt}`,
    orderId,
    occurredAt,
  })
  return { ok: true, data: nextData }
}

const STATUS_TRANSITIONS = Object.freeze({
  'Ready for assignment': new Set(['Packed']),
  Packed: new Set(['Dispatched']),
  Dispatched: new Set(['Out for delivery']),
  'Out for delivery': new Set(['Delivered']),
})

const STATUS_EVENT_TYPES = Object.freeze({
  Packed: NOTIFICATION_EVENT_TYPES.ORDER_PACKED,
  Dispatched: NOTIFICATION_EVENT_TYPES.ORDER_DISPATCHED,
  'Out for delivery': NOTIFICATION_EVENT_TYPES.ORDER_OUT_FOR_DELIVERY,
  Delivered: NOTIFICATION_EVENT_TYPES.ORDER_DELIVERED,
})

export function updateOrderStatus(data, orderId, nextStatus) {
  const order = data.orders.find((item) => item.id === orderId)
  if (!order) return { ok: false, error: 'Order was not found.' }
  if (!STATUS_TRANSITIONS[order.status]?.has(nextStatus)) {
    return {
      ok: false,
      error: `Cannot change order status from "${order.status}" to "${nextStatus}".`,
    }
  }

  const nextData = cloneData(data)
  const updatedOrder = nextData.orders.find((item) => item.id === orderId)
  const occurredAt = new Date().toISOString()
  updatedOrder.status = nextStatus
  if (nextStatus === 'Dispatched') {
    updatedOrder.dispatchedAt = occurredAt
  }
  if (nextStatus === 'Delivered') {
    updatedOrder.deliveredAt = occurredAt
    const partner = nextData.partners.find((item) => item.id === updatedOrder.partnerId)
    if (!partner || partner.activeDeliveries < 1) {
      return {
        ok: false,
        error: 'Partner workload is inconsistent; the delivery was not updated.',
      }
    }
    partner.activeDeliveries -= 1
    partner.completedDeliveries += 1
  }
  nextData.orderEvents ??= []
  nextData.orderEvents.push({
    id: `status:${orderId}:${nextStatus}:${occurredAt}`,
    orderId,
    type: 'status',
    status: nextStatus,
    occurredAt,
  })

  appendEventNotifications(nextData, {
    type: STATUS_EVENT_TYPES[nextStatus],
    eventId: `status:${orderId}:${nextStatus}:${occurredAt}`,
    orderId,
    occurredAt,
  })
  return { ok: true, data: nextData }
}

export function createOrder(data, newOrder) {
  if (!newOrder?.id?.trim()) {
    return { ok: false, error: 'Order ID is required.' }
  }
  if (data.orders.some((order) => order.id === newOrder.id)) {
    return { ok: false, error: `Order ${newOrder.id} already exists.` }
  }
  if (!newOrder.customerId?.trim()) {
    return { ok: false, error: 'A customer ID is required to scope order notifications.' }
  }

  const createdAt = newOrder.createdAt ?? new Date().toISOString()
  const nextData = cloneData(data)
  const order = {
    ...structuredClone(newOrder),
    status: 'Ready for assignment',
    partnerId: null,
    createdAt,
  }
  nextData.orders.push(order)
  appendEventNotifications(nextData, {
    type: NOTIFICATION_EVENT_TYPES.ORDER_CREATED,
    eventId: `created:${order.id}:${createdAt}`,
    orderId: order.id,
    occurredAt: createdAt,
  })
  return { ok: true, data: nextData }
}

export function recordDeliveryAlert(data, orderId, alertType, occurredAt = new Date().toISOString()) {
  const order = data.orders.find((item) => item.id === orderId)
  if (!order) return { ok: false, error: 'Order was not found.' }
  if (!order.partnerId) {
    return { ok: false, error: 'Delivery alerts require an assigned delivery partner.' }
  }
  if (!['Dispatched', 'Out for delivery'].includes(order.status)) {
    return { ok: false, error: 'Delivery alerts require an active dispatched order.' }
  }

  const type =
    alertType === 'delayed'
      ? NOTIFICATION_EVENT_TYPES.DELIVERY_DELAYED
      : alertType === 'attempt_failed'
        ? NOTIFICATION_EVENT_TYPES.DELIVERY_ATTEMPT_FAILED
        : null
  if (!type) return { ok: false, error: 'Unsupported delivery alert type.' }

  const nextData = cloneData(data)
  nextData.orderEvents ??= []
  nextData.orderEvents.push({
    id: `${type}:${orderId}:${occurredAt}`,
    orderId,
    type: alertType,
    occurredAt,
  })
  appendEventNotifications(nextData, {
    type,
    eventId: `${type}:${order.id}:${occurredAt}`,
    orderId: order.id,
    occurredAt,
  })
  return { ok: true, data: nextData }
}

const EXCEPTION_TYPES = Object.freeze([
  'Delivery delayed',
  'Failed delivery attempt',
  'Incorrect or incomplete address',
  'Customer unavailable',
  'Damaged shipment',
  'Route or assignment issue',
])
const EXCEPTION_SEVERITIES = Object.freeze(['Low', 'Medium', 'High'])
const EXCEPTION_ROLES = Object.freeze(['admin', 'warehouseStaff', 'deliveryPartner'])

export function createDeliveryException(data, exception) {
  const order = data.orders.find((item) => item.id === exception.orderId)
  if (!order) return { ok: false, error: 'Order was not found.' }
  if (!EXCEPTION_TYPES.includes(exception.type)) {
    return { ok: false, error: 'Select a supported exception type.' }
  }
  if (!EXCEPTION_SEVERITIES.includes(exception.severity)) {
    return { ok: false, error: 'Select a valid exception severity.' }
  }
  if (typeof exception.description !== 'string' || !exception.description.trim()) {
    return { ok: false, error: 'A description is required.' }
  }
  if (exception.notes !== undefined && typeof exception.notes !== 'string') {
    return { ok: false, error: 'Exception notes must be text.' }
  }
  if (
    exception.responsibleRole &&
    !EXCEPTION_ROLES.includes(exception.responsibleRole)
  ) {
    return { ok: false, error: 'Select a supported responsible role.' }
  }

  const occurredAt = exception.createdAt ?? new Date().toISOString()
  const id = exception.id
  if (typeof id !== 'string' || !id.trim() || data.exceptions?.some((item) => item.id === id)) {
    return { ok: false, error: 'A unique exception ID is required.' }
  }
  const nextData = cloneData(data)
  nextData.exceptions ??= []
  const created = {
    id,
    orderId: order.id,
    type: exception.type,
    description: exception.description.trim(),
    notes: exception.notes?.trim() ?? '',
    severity: exception.severity,
    responsibleRole: exception.responsibleRole || null,
    status: 'Open',
    createdAt: occurredAt,
    updatedAt: occurredAt,
    history: [
      {
        status: 'Open',
        occurredAt,
        notes: exception.notes?.trim() ?? '',
      },
    ],
  }
  nextData.exceptions.push(created)
  if (created.severity === 'High') {
    appendEventNotifications(nextData, {
      type: NOTIFICATION_EVENT_TYPES.HIGH_EXCEPTION,
      eventId: `exception:${id}:created`,
      orderId: order.id,
      occurredAt,
    })
  }
  return { ok: true, data: nextData, exception: created }
}

export function updateDeliveryException(data, exceptionId, nextStatus, notes) {
  const exception = data.exceptions?.find((item) => item.id === exceptionId)
  if (!exception) return { ok: false, error: 'Exception was not found.' }
  const validTransition =
    (exception.status === 'Open' &&
      ['In Progress', 'Resolved'].includes(nextStatus)) ||
    (exception.status === 'In Progress' && nextStatus === 'Resolved')
  if (!validTransition) {
    return {
      ok: false,
      error: `Cannot change exception status from "${exception.status}" to "${nextStatus}".`,
    }
  }
  if (notes !== undefined && typeof notes !== 'string') {
    return { ok: false, error: 'Exception status notes must be text.' }
  }
  if (nextStatus === 'Resolved' && (typeof notes !== 'string' || !notes.trim())) {
    return { ok: false, error: 'Resolution notes are required to resolve an exception.' }
  }

  const occurredAt = new Date().toISOString()
  const nextData = cloneData(data)
  const updated = nextData.exceptions.find((item) => item.id === exceptionId)
  updated.status = nextStatus
  updated.updatedAt = occurredAt
  updated.history.push({
    status: nextStatus,
    occurredAt,
    notes: notes?.trim() ?? '',
  })
  if (nextStatus === 'Resolved') {
    appendEventNotifications(nextData, {
      type: NOTIFICATION_EVENT_TYPES.EXCEPTION_RESOLVED,
      eventId: `exception:${exceptionId}:resolved`,
      orderId: updated.orderId,
      occurredAt,
    })
  }
  return { ok: true, data: nextData, exception: updated }
}

export function markNotificationRead(data, notificationId, identity) {
  const notification = data.notifications.find(
    (item) =>
      item.id === notificationId &&
      item.role === identity.role &&
      item.userId === identity.userId,
  )
  if (!notification) {
    return { ok: false, error: 'Notification was not found for this demo identity.' }
  }
  if (notification.read) return { ok: true, data }

  const nextData = cloneData(data)
  const updatedNotification = nextData.notifications.find(
    (item) => item.id === notificationId,
  )
  updatedNotification.read = true
  return { ok: true, data: nextData }
}

export function markAllNotificationsRead(data, identity) {
  const unread = data.notifications.filter(
    (item) =>
      item.role === identity.role &&
      item.userId === identity.userId &&
      !item.read,
  )
  if (unread.length === 0) return { ok: true, data }

  const nextData = cloneData(data)
  for (const notification of nextData.notifications) {
    if (
      notification.role === identity.role &&
      notification.userId === identity.userId
    ) {
      notification.read = true
    }
  }
  return { ok: true, data: nextData }
}

export function setNotificationPreference(data, identity, category, enabled) {
  if (!NOTIFICATION_CATEGORIES.includes(category)) {
    return { ok: false, error: 'Unsupported notification category.' }
  }
  if (typeof enabled !== 'boolean') {
    return { ok: false, error: 'Notification preference must be enabled or disabled.' }
  }

  const nextData = cloneData(data)
  const preferenceKey = `${identity.role}:${identity.userId}`
  nextData.notificationPreferences[preferenceKey] ??= {}
  nextData.notificationPreferences[preferenceKey][category] = enabled
  return { ok: true, data: nextData }
}

function generateOverdueNotifications(data, now) {
  let created = 0
  for (const order of data.orders) {
    const event = evaluatePotentialDelay(order, now)
    if (!event) continue
    const previousCount = data.notificationEventIds.length
    appendEventNotifications(data, event)
    created += data.notificationEventIds.length - previousCount
  }
  return created
}

function generateHighRiskNotifications(data, now) {
  let created = 0
  const durationBaselines = getPartnerDurationBaselines(data.orders)
  for (const order of data.orders) {
    if (!['Dispatched', 'Out for delivery'].includes(order.status)) continue
    const risk = assessShipmentRisk(order, {
      notifications: data.notifications,
      durationBaselines,
      now,
    })
    if (risk.riskLevel !== 'High' || !risk.evidenceKey) continue
    const previousCount = data.notificationEventIds.length
    appendEventNotifications(data, {
      type: NOTIFICATION_EVENT_TYPES.SHIPMENT_HIGH_RISK,
      eventId: `high-risk:${order.id}:${risk.evidenceKey}`,
      orderId: order.id,
      occurredAt: new Date(now).toISOString(),
    })
    created += data.notificationEventIds.length - previousCount
  }
  return created
}

function generateDeliveryRiskNotifications(data, now) {
  return (
    generateOverdueNotifications(data, now) +
    generateHighRiskNotifications(data, now)
  )
}

export function createDeliveryDataStore(storage = window.localStorage) {
  let data = loadDeliveryData(storage)
  const listeners = new Set()
  let eventSequence = 0

  function createEventId(prefix, subjectId = '') {
    eventSequence += 1
    return `${prefix}:${subjectId}:${Date.now()}:${eventSequence}`
  }

  function persist(nextData, errorLabel) {
    try {
      storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(nextData))
    } catch (error) {
      return {
        ok: false,
        error: `${errorLabel}: ${error.message}`,
      }
    }

    data = nextData
    listeners.forEach((listener) => listener())
    return { ok: true }
  }

  function commit(result, errorLabel) {
    if (!result.ok) return result
    return persist(result.data, errorLabel)
  }

  const store = {
    getSnapshot: () => data,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    assign(orderId, partnerId, options) {
      const previousRoute = data.routes?.find((route) => route.partnerId === data.orders.find((order) => order.id === orderId)?.partnerId)
      const result = assignOrder(data, orderId, partnerId, options)
      if (!result.ok) {
        const partner = data.partners.find((item) => item.id === partnerId)
        const order = data.orders.find((item) => item.id === orderId)
        if (
          partner &&
          order &&
          /offline|capacity/i.test(result.error)
        ) {
          const nextData = cloneData(data)
          appendEventNotifications(nextData, {
            type: 'partner.assignment_issue',
            eventId: `assignment-issue:${orderId}:${partnerId}:${Math.floor(Date.now() / 60_000)}`,
            orderId,
            partnerId,
            occurredAt: new Date().toISOString(),
          })
          const saveResult = commit(
            { ok: true, data: nextData },
            'Could not save the assignment issue notification',
          )
          return saveResult.ok ? result : saveResult
        }
        return result
      }

      const order = result.data.orders.find((item) => item.id === orderId)
      const assignedAt = new Date().toISOString()
      result.data.orderEvents ??= []
      result.data.orderEvents.push({
        id: `assigned:${orderId}:${partnerId}:${assignedAt}`,
        orderId,
        type: 'assigned',
        occurredAt: assignedAt,
      })
      if (order.status === 'Out for delivery') {
        result.data.orderEvents.push({
          id: `status:${orderId}:Out for delivery:${assignedAt}`,
          orderId,
          type: 'status',
          status: 'Out for delivery',
          occurredAt: assignedAt,
        })
      }
      appendEventNotifications(result.data, {
        type: NOTIFICATION_EVENT_TYPES.ORDER_ASSIGNED,
        eventId: createEventId('assignment', `${orderId}:${partnerId}`),
        orderId,
        partnerId,
        occurredAt: assignedAt,
      })
      if (order.status === 'Out for delivery') {
        appendEventNotifications(result.data, {
          type: NOTIFICATION_EVENT_TYPES.ORDER_OUT_FOR_DELIVERY,
          eventId: createEventId('out-for-delivery', orderId),
          orderId,
          partnerId,
          occurredAt: assignedAt,
        })
      }
      const updatedRoute = result.data.routes?.find(
        (route) => route.partnerId === previousRoute?.partnerId,
      )
      if (
        previousRoute &&
        updatedRoute &&
        previousRoute.stopOrderIds.length !== updatedRoute.stopOrderIds.length
      ) {
        appendEventNotifications(result.data, {
          type: NOTIFICATION_EVENT_TYPES.ROUTE_CHANGED,
          eventId: createEventId('route-reassigned', orderId),
          partnerId: previousRoute.partnerId,
          occurredAt: new Date().toISOString(),
        })
      }
      generateDeliveryRiskNotifications(result.data, Date.now())
      return commit(
        { ok: true, data: result.data },
        'Could not save the assignment to this browser',
      )
    },
    saveRoute(partnerId, pickupLocation, orderIds) {
      return commit(
        saveRoutePlan(data, partnerId, pickupLocation, orderIds),
        'Could not save the route to this browser',
      )
    },
    updateLocation(orderId, location) {
      return commit(
        updateOrderLocation(data, orderId, location),
        'Could not save the delivery location to this browser',
      )
    },
    updateStatus(orderId, partnerId, nextStatus) {
      return commit(
        updateDeliveryStatus(data, orderId, partnerId, nextStatus),
        'Could not save the delivery status to this browser',
      )
    },
    updateOrderStatus(orderId, nextStatus) {
      const result = updateOrderStatus(data, orderId, nextStatus)
      if (!result.ok) return result
      generateDeliveryRiskNotifications(result.data, Date.now())
      return commit(result, 'Could not save the order status to this browser')
    },
    createOrder(order) {
      return commit(
        createOrder(data, order),
        'Could not save the new order to this browser',
      )
    },
    recordDeliveryAlert(orderId, alertType, occurredAt) {
      const result = recordDeliveryAlert(data, orderId, alertType, occurredAt)
      if (!result.ok) return result
      generateDeliveryRiskNotifications(result.data, Date.now())
      return commit(result, 'Could not save the delivery alert to this browser')
    },
    createException(orderId, exception) {
      const result = createDeliveryException(data, {
        ...exception,
        id: createEventId('exception', orderId),
        orderId,
      })
      if (!result.ok) return result
      const saved = commit(result, 'Could not save the delivery exception to this browser')
      return saved.ok ? { ...saved, exception: result.exception } : saved
    },
    updateException(exceptionId, nextStatus, notes) {
      return commit(
        updateDeliveryException(data, exceptionId, nextStatus, notes),
        'Could not update the delivery exception in this browser',
      )
    },
    markNotificationRead(notificationId, identity) {
      return commit(
        markNotificationRead(data, notificationId, identity),
        'Could not update the notification in this browser',
      )
    },
    markAllNotificationsRead(identity) {
      return commit(
        markAllNotificationsRead(data, identity),
        'Could not update notifications in this browser',
      )
    },
    setNotificationPreference(identity, category, enabled) {
      return commit(
        setNotificationPreference(data, identity, category, enabled),
        'Could not save notification preferences to this browser',
      )
    },
    evaluatePotentialDelays(now = Date.now()) {
      const nextData = cloneData(data)
      const count = generateDeliveryRiskNotifications(nextData, now)
      if (count === 0) return { ok: true, created: 0 }
      const result = persist(nextData, 'Could not save delay alerts to this browser')
      return { ...result, created: result.ok ? count : 0 }
    },
  }

  store.evaluatePotentialDelays()
  return store
}
