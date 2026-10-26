import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Check,
  CircleAlert,
  Info,
  Settings2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getNotificationIdentities,
  getNotificationIdentityLabel,
  getNotificationsForIdentity,
  getPriorityLabel,
} from '../services/notificationService.js'
import { useDeliveryData } from '../services/useDeliveryData.js'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'orders', label: 'Orders' },
  { id: 'deliveries', label: 'Deliveries' },
  { id: 'alerts', label: 'Alerts' },
]

function formatTimestamp(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
}

function NotificationCenter() {
  const {
    partners,
    orders,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    notificationIdentity,
    setNotificationIdentity,
  } = useDeliveryData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [actionError, setActionError] = useState('')

  const identities = useMemo(
    () => getNotificationIdentities({ partners, orders }),
    [partners, orders],
  )
  const personalNotifications = getNotificationsForIdentity(
    { notifications },
    notificationIdentity,
  )
  const unreadCount = personalNotifications.filter((item) => !item.read).length
  const visibleNotifications = personalNotifications.filter((notification) => {
    if (filter === 'unread') return !notification.read
    return filter === 'all' || notification.category === filter
  })

  function openNotification(notification) {
    if (!notification.read) {
      const result = markNotificationRead(notification.id, notificationIdentity)
      if (!result.ok) {
        setActionError(result.error)
        return
      }
    }
    setOpen(false)
    navigate(notification.route || '/')
  }

  function markAllRead() {
    const result = markAllNotificationsRead(notificationIdentity)
    setActionError(result.ok ? '' : result.error)
  }

  const identityValue = `${notificationIdentity.role}:${notificationIdentity.userId}`

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        className="relative inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        onClick={() => {
          setOpen((value) => !value)
          setActionError('')
        }}
        type="button"
      >
        <Bell aria-hidden="true" size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Notification center"
          className="absolute right-0 z-[1000] mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 sm:w-[26rem]"
        >
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Notifications</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {unreadCount} unread for this demo identity
                </p>
              </div>
              <button
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={unreadCount === 0}
                onClick={markAllRead}
                type="button"
              >
                <Check aria-hidden="true" size={14} />
                Mark all read
              </button>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Preview as · demo only
              </span>
              <select
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-700"
                onChange={(event) => {
                  const nextIdentity = identities.find(
                    (identity) =>
                      `${identity.role}:${identity.userId}` === event.target.value,
                  )
                  if (nextIdentity) setNotificationIdentity(nextIdentity)
                }}
                value={identityValue}
              >
                {identities.map((identity) => (
                  <option
                    key={`${identity.role}:${identity.userId}`}
                    value={`${identity.role}:${identity.userId}`}
                  >
                    {getNotificationIdentityLabel(identity, partners, orders)}
                  </option>
                ))}
              </select>
            </label>
            <div aria-label="Filter notifications" className="mt-3 flex gap-1 overflow-x-auto pb-1">
              {filters.map((item) => (
                <button
                  aria-pressed={filter === item.id}
                  className={`shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    filter === item.id
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            {actionError && (
              <p className="mt-2 text-xs text-rose-700" role="alert">
                {actionError}
              </p>
            )}
          </div>

          <div className="max-h-[min(28rem,65vh)] overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell aria-hidden="true" className="mx-auto text-slate-300" size={24} />
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  No notifications
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  New delivery updates for this identity will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visibleNotifications.map((notification) => {
                  const PriorityIcon =
                    notification.priority === 'critical'
                      ? CircleAlert
                      : notification.priority === 'warning'
                        ? AlertTriangle
                        : Info
                  const priorityColor =
                    notification.priority === 'critical'
                      ? 'text-rose-700'
                      : notification.priority === 'warning'
                        ? 'text-amber-700'
                        : 'text-sky-700'

                  return (
                    <li
                      className={`relative ${notification.read ? 'bg-white' : 'bg-emerald-50/40'}`}
                      key={notification.id}
                    >
                      <button
                        className="w-full px-4 py-3.5 pr-12 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-700"
                        onClick={() => openNotification(notification)}
                        type="button"
                      >
                        <span className="flex items-start gap-2.5">
                          <PriorityIcon
                            aria-label={getPriorityLabel(notification.priority)}
                            className={`mt-0.5 shrink-0 ${priorityColor}`}
                            size={16}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-900">
                                {notification.title}
                              </span>
                              {!notification.read && (
                                <span
                                  aria-label="Unread"
                                  className="size-2 shrink-0 rounded-full bg-emerald-600"
                                />
                              )}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-600">
                              {notification.message}
                            </span>
                            <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500">
                              <span className="capitalize">{notification.category}</span>
                              <span aria-hidden="true">·</span>
                              <span>{formatTimestamp(notification.createdAt)}</span>
                              <span aria-hidden="true">·</span>
                              <span>{getPriorityLabel(notification.priority)}</span>
                            </span>
                          </span>
                        </span>
                      </button>
                      {!notification.read && (
                        <button
                          aria-label={`Mark ${notification.title} as read`}
                          className="absolute right-2 top-3 rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-emerald-800"
                          onClick={() => {
                            const result = markNotificationRead(
                              notification.id,
                              notificationIdentity,
                            )
                            setActionError(result.ok ? '' : result.error)
                          }}
                          type="button"
                        >
                          <Check aria-hidden="true" size={15} />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <span className="text-[11px] text-slate-500">In-app notifications only</span>
            <button
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => {
                setOpen(false)
                navigate('/settings/notifications')
              }}
              type="button"
            >
              <Settings2 aria-hidden="true" size={14} />
              Settings
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

export default NotificationCenter
