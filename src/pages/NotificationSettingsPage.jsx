import { useMemo, useState } from 'react'
import { Bell, Check, Info, Settings2 } from 'lucide-react'
import DemoDataError from '../components/DemoDataError.jsx'
import {
  getNotificationPreference,
  NOTIFICATION_CATEGORIES,
} from '../services/notificationService.js'
import { useDeliveryData } from '../services/useDeliveryData.js'

const categories = [
  {
    id: 'orders',
    label: 'Order updates',
    description: 'Order creation and packing notifications.',
  },
  {
    id: 'deliveries',
    label: 'Delivery and route updates',
    description: 'Assignment, dispatch, stop, and saved-route updates.',
  },
  {
    id: 'alerts',
    label: 'Delivery alerts',
    description: 'Explicitly reported delays and unsuccessful attempts.',
  },
]

function NotificationSettingsPage() {
  const {
    partners,
    orders,
    notifications,
    notificationPreferences,
    error,
    notificationIdentity,
    setNotificationIdentity,
    setNotificationPreference,
    markAllNotificationsRead,
  } = useDeliveryData()
  const [feedback, setFeedback] = useState('')

  const identityOptions = useMemo(
    () => [
      { role: 'admin', userId: 'admin', label: 'Admin' },
      { role: 'warehouseStaff', userId: 'warehouse', label: 'Warehouse staff' },
      ...partners.map((partner) => ({
        role: 'deliveryPartner',
        userId: partner.id,
        label: `Delivery partner · ${partner.id}`,
      })),
      ...orders.map((order) => ({
        role: 'customer',
        userId: order.customerId ?? `customer:${order.id}`,
        label: `Customer · ${order.id}`,
      })),
    ],
    [partners, orders],
  )

  const identityKey = `${notificationIdentity.role}:${notificationIdentity.userId}`
  const ownNotifications = notifications.filter(
    (notification) =>
      notification.role === notificationIdentity.role &&
      notification.userId === notificationIdentity.userId,
  )
  const unreadCount = ownNotifications.filter((item) => !item.read).length

  if (error) return <DemoDataError message={error} />

  function updatePreference(category, enabled) {
    const result = setNotificationPreference(notificationIdentity, category, enabled)
    setFeedback(result.ok ? 'Preference saved in this browser.' : result.error)
  }

  function markAllRead() {
    const result = markAllNotificationsRead(notificationIdentity)
    setFeedback(result.ok ? 'All notifications for this identity are marked read.' : result.error)
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
          <Settings2 aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Preferences
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Notification settings
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Choose which in-app notification categories this demo identity receives.
            Email, SMS, and push delivery are not implemented.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
        <div className="flex items-start gap-2">
          <Info aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
          <p>
            Demo identity selection is only for previewing role-specific notification
            scoping. It is not authentication or access control.
          </p>
        </div>
      </div>

      {feedback && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {feedback}
        </p>
      )}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-800">
            Configure preferences for
          </span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10 sm:max-w-sm"
            onChange={(event) => {
              const identity = identityOptions.find(
                (item) => `${item.role}:${item.userId}` === event.target.value,
              )
              if (identity) {
                setNotificationIdentity(identity)
                setFeedback('')
              }
            }}
            value={identityKey}
          >
            {identityOptions.map((identity) => (
              <option
                key={`${identity.role}:${identity.userId}`}
                value={`${identity.role}:${identity.userId}`}
              >
                {identity.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 divide-y divide-slate-100">
          {categories.map((category) => {
            const enabled = getNotificationPreference(
              { notificationPreferences },
              notificationIdentity,
              category.id,
            )
            return (
              <label
                className="flex cursor-pointer items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                key={category.id}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {category.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {category.description}
                  </span>
                </span>
                <input
                  aria-label={`${category.label} notifications`}
                  checked={enabled}
                  className="size-5 shrink-0 accent-emerald-800"
                  onChange={(event) => updatePreference(category.id, event.target.checked)}
                  type="checkbox"
                />
              </label>
            )
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Disabled categories do not create future in-app notifications for this
          identity. Existing notifications remain available to read.
        </p>
      </section>

      <section className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-semibold text-slate-900">Read status</h2>
          <p className="mt-1 text-sm text-slate-600">
            {unreadCount} unread notification{unreadCount === 1 ? '' : 's'} for this identity.
          </p>
        </div>
        <button
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={unreadCount === 0}
          onClick={markAllRead}
          type="button"
        >
          <Check aria-hidden="true" size={16} />
          Mark all as read
        </button>
      </section>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Bell aria-hidden="true" size={14} />
        In-app notification preferences only · supported categories: {NOTIFICATION_CATEGORIES.join(', ')}.
      </p>
    </section>
  )
}

export default NotificationSettingsPage
