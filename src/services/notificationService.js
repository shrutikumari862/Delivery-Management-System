export const NOTIFICATION_CATEGORIES = Object.freeze([
  'orders',
  'deliveries',
  'alerts',
])

export const NOTIFICATION_EVENT_TYPES = Object.freeze({
  ORDER_CREATED: 'order.created',
  ORDER_ASSIGNED: 'order.assigned',
  ORDER_PACKED: 'order.packed',
  ORDER_DISPATCHED: 'order.dispatched',
  ORDER_OUT_FOR_DELIVERY: 'order.out_for_delivery',
  ORDER_DELIVERED: 'order.delivered',
  DELIVERY_DELAYED: 'delivery.delayed',
  DELIVERY_ATTEMPT_FAILED: 'delivery.attempt_failed',
  SHIPMENT_HIGH_RISK: 'shipment.high_risk',
  HIGH_EXCEPTION: 'delivery.exception_high',
  EXCEPTION_RESOLVED: 'delivery.exception_resolved',
  ROUTE_ASSIGNED: 'route.assigned',
  ROUTE_CHANGED: 'route.changed',
})

const EVENT_DEFINITIONS = {
  [NOTIFICATION_EVENT_TYPES.ORDER_CREATED]: {
    category: 'orders',
    priority: 'informational',
    title: 'New order received',
    recipients: ['admin', 'warehouseStaff', 'customer'],
    message: (order) => `Order ${order.id} was received and is awaiting processing.`,
    linkFor: (role) => (role === 'customer' ? '/' : '/admin/assignments'),
  },
  [NOTIFICATION_EVENT_TYPES.ORDER_ASSIGNED]: {
    category: 'deliveries',
    priority: 'informational',
    title: 'Delivery partner assigned',
    recipients: ['admin', 'deliveryPartner', 'customer'],
    message: (order) => `A delivery partner has been assigned to order ${order.id}.`,
    linkFor: (role) =>
      role === 'deliveryPartner' ? '/partner/my-route' : '/admin/assignments',
  },
  [NOTIFICATION_EVENT_TYPES.ORDER_PACKED]: {
    category: 'orders',
    priority: 'informational',
    title: 'Order packed',
    recipients: ['admin', 'warehouseStaff', 'customer'],
    message: (order) => `Order ${order.id} has been packed and is ready for dispatch.`,
    linkFor: (role) => (role === 'customer' ? '/' : '/admin/assignments'),
  },
  [NOTIFICATION_EVENT_TYPES.ORDER_DISPATCHED]: {
    category: 'deliveries',
    priority: 'informational',
    title: 'Order dispatched',
    recipients: ['admin', 'warehouseStaff', 'deliveryPartner', 'customer'],
    message: (order) => `Order ${order.id} has left the warehouse.`,
    linkFor: (role) =>
      role === 'deliveryPartner' ? '/partner/my-route' : '/admin/route-planning',
  },
  [NOTIFICATION_EVENT_TYPES.ORDER_OUT_FOR_DELIVERY]: {
    category: 'deliveries',
    priority: 'informational',
    title: 'Out for delivery',
    recipients: ['admin', 'deliveryPartner', 'customer'],
    message: (order) => `Order ${order.id} is out for delivery.`,
    linkFor: (role) =>
      role === 'deliveryPartner' ? '/partner/my-route' : '/admin/route-planning',
  },
  [NOTIFICATION_EVENT_TYPES.ORDER_DELIVERED]: {
    category: 'deliveries',
    priority: 'informational',
    title: 'Delivery completed',
    recipients: ['admin', 'deliveryPartner', 'customer'],
    message: (order) => `Order ${order.id} was successfully delivered.`,
    linkFor: (role) =>
      role === 'deliveryPartner' ? '/partner/my-route' : '/',
  },
  [NOTIFICATION_EVENT_TYPES.DELIVERY_DELAYED]: {
    category: 'alerts',
    priority: 'warning',
    title: 'Delivery delay reported',
    recipients: ['admin', 'deliveryPartner', 'customer', 'warehouseStaff'],
    message: (order) => `A delay was reported for order ${order.id}.`,
    linkFor: (role) =>
      role === 'deliveryPartner' ? '/partner/my-route' : '/admin/route-planning',
  },
  [NOTIFICATION_EVENT_TYPES.DELIVERY_ATTEMPT_FAILED]: {
    category: 'alerts',
    priority: 'critical',
    title: 'Delivery attempt unsuccessful',
    recipients: ['admin', 'deliveryPartner', 'customer', 'warehouseStaff'],
    message: (order) => `A delivery attempt for order ${order.id} was unsuccessful.`,
    linkFor: (role) =>
      role === 'deliveryPartner' ? '/partner/my-route' : '/admin/assignments',
  },
  [NOTIFICATION_EVENT_TYPES.SHIPMENT_HIGH_RISK]: {
    category: 'alerts',
    priority: 'critical',
    title: 'High delivery risk detected',
    recipients: ['admin'],
    message: (order) =>
      `Order ${order.id} is high risk based on verified delivery information.`,
    linkFor: () => '/admin/analytics',
  },
  [NOTIFICATION_EVENT_TYPES.HIGH_EXCEPTION]: {
    category: 'alerts',
    priority: 'critical',
    title: 'High-severity delivery exception',
    recipients: ['admin', 'deliveryPartner'],
    message: (order) => `A high-severity delivery exception was recorded for order ${order.id}.`,
    linkFor: (role, order) =>
      role === 'deliveryPartner'
        ? '/partner/my-route'
        : order
          ? `/admin/monitoring/${encodeURIComponent(order.id)}`
          : '/admin/monitoring',
  },
  [NOTIFICATION_EVENT_TYPES.EXCEPTION_RESOLVED]: {
    category: 'alerts',
    priority: 'informational',
    title: 'Delivery exception resolved',
    recipients: ['admin', 'deliveryPartner'],
    message: (order) => `A delivery exception for order ${order.id} was resolved.`,
    linkFor: (role, order) =>
      role === 'deliveryPartner'
        ? '/partner/my-route'
        : order
          ? `/admin/monitoring/${encodeURIComponent(order.id)}`
          : '/admin/monitoring',
  },
  [NOTIFICATION_EVENT_TYPES.ROUTE_ASSIGNED]: {
    category: 'deliveries',
    priority: 'informational',
    title: 'Route assigned',
    recipients: ['admin', 'deliveryPartner'],
    message: (_order, partner) => `A route has been saved for ${partner.name}.`,
    linkFor: (role) =>
      role === 'deliveryPartner' ? '/partner/my-route' : '/admin/route-planning',
  },
  [NOTIFICATION_EVENT_TYPES.ROUTE_CHANGED]: {
    category: 'deliveries',
    priority: 'warning',
    title: 'Route updated',
    recipients: ['admin', 'deliveryPartner'],
    message: (_order, partner) => `The saved route for ${partner.name} has changed.`,
    linkFor: (role) =>
      role === 'deliveryPartner' ? '/partner/my-route' : '/admin/route-planning',
  },
  'partner.assignment_issue': {
    category: 'alerts',
    priority: 'warning',
    title: 'Assignment could not be completed',
    recipients: ['admin', 'deliveryPartner'],
    message: (order, partner) =>
      `Order ${order.id} could not be assigned to ${partner.name} because the partner is unavailable or at capacity.`,
    linkFor: (role) =>
      role === 'deliveryPartner' ? '/partner/my-route' : '/admin/assignments',
  },
}

function getEventTargets(definition, order, partner) {
  return definition.recipients.flatMap((role) => {
    if (role === 'deliveryPartner') {
      return partner ? [{ role, userId: partner.id }] : []
    }
    if (role === 'customer') {
      return order
        ? [{ role, userId: order.customerId ?? `customer:${order.id}` }]
        : []
    }
    if (role === 'admin') return [{ role, userId: 'admin' }]
    if (role === 'warehouseStaff') return [{ role, userId: 'warehouse' }]
    return []
  })
}

export function appendEventNotifications(data, event) {
  const definition = EVENT_DEFINITIONS[event.type]
  if (!definition) {
    throw new Error(`Unsupported delivery notification event "${event.type}".`)
  }

  data.notifications ??= []
  data.notificationEventIds ??= data.notifications.map((item) => item.id)
  data.notificationPreferences ??= {}
  const order = event.orderId
    ? data.orders.find((item) => item.id === event.orderId)
    : null
  const partner = event.partnerId
    ? data.partners.find((item) => item.id === event.partnerId)
    : order?.partnerId
      ? data.partners.find((item) => item.id === order.partnerId)
      : null

  for (const target of getEventTargets(definition, order, partner)) {
    const eventId = `${event.eventId}:${target.role}:${target.userId}`
    if (data.notificationEventIds.includes(eventId)) {
      continue
    }

    data.notificationEventIds.push(eventId)
    const preferenceKey = `${target.role}:${target.userId}`
    const preference = data.notificationPreferences[preferenceKey]
    if (preference?.[definition.category] === false) continue

    data.notifications.unshift({
      id: eventId,
      eventId: event.eventId,
      eventType: event.type,
      role: target.role,
      userId: target.userId,
      category: definition.category,
      priority: definition.priority,
      title: definition.title,
      message: definition.message(order ?? {}, partner ?? {}),
      createdAt: event.occurredAt,
      read: false,
      orderId: order?.id ?? event.orderId ?? null,
      route: definition.linkFor(target.role, order),
    })
  }

  data.notifications = data.notifications.slice(0, 500)
}

export function getNotificationIdentities(data) {
  return [
    { role: 'admin', userId: 'admin', label: 'Admin' },
    { role: 'warehouseStaff', userId: 'warehouse', label: 'Warehouse staff' },
    ...data.partners.map((partner) => ({
      role: 'deliveryPartner',
      userId: partner.id,
      label: `Delivery partner · ${partner.id}`,
    })),
    ...data.orders.map((order) => ({
      role: 'customer',
      userId: order.customerId ?? `customer:${order.id}`,
      label: `Customer · ${order.id}`,
    })),
  ]
}

export function getNotificationIdentityLabel(identity, partners, orders) {
  if (identity.role === 'admin') return 'Admin'
  if (identity.role === 'warehouseStaff') return 'Warehouse staff'
  if (identity.role === 'deliveryPartner') {
    const partner = partners.find((item) => item.id === identity.userId)
    return partner ? `Delivery partner · ${partner.name}` : 'Delivery partner'
  }
  const order = orders.find(
    (item) => (item.customerId ?? `customer:${item.id}`) === identity.userId,
  )
  return order ? `Customer · ${order.id}` : 'Customer'
}

export function getNotificationsForIdentity(data, identity) {
  return data.notifications.filter(
    (notification) =>
      notification.role === identity.role &&
      notification.userId === identity.userId,
  )
}

export function getNotificationPreference(data, identity, category) {
  return data.notificationPreferences?.[`${identity.role}:${identity.userId}`]?.[
    category
  ] !== false
}

export function getPriorityLabel(priority) {
  return (
    {
      informational: 'Informational',
      warning: 'Warning',
      critical: 'Critical',
    }[priority] ?? 'Informational'
  )
}

export function evaluatePotentialDelay(order, now = Date.now()) {
  const deadlineValue = order.promisedDeliveryAt ?? order.estimatedDeliveryAt
  if (!deadlineValue) return null

  const deadline = Date.parse(deadlineValue)
  if (
    !Number.isFinite(deadline) ||
    !Number.isFinite(now) ||
    now <= deadline ||
    !['Dispatched', 'Out for delivery'].includes(order.status)
  ) {
    return null
  }

  return {
    type: NOTIFICATION_EVENT_TYPES.DELIVERY_DELAYED,
    eventId: `delay:${order.id}:${new Date(deadline).toISOString()}`,
    orderId: order.id,
    occurredAt: new Date(now).toISOString(),
  }
}
