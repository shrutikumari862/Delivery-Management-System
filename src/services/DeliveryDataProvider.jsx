import { useEffect, useState, useSyncExternalStore } from 'react'
import { createDeliveryDataStore } from './deliveryData.js'
import { DeliveryDataContext } from './deliveryDataContext.js'

const emptyData = Object.freeze({ partners: [], orders: [] })
const unavailableStore = {
  getSnapshot: () => emptyData,
  subscribe: () => () => {},
  assign: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  saveRoute: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  updateLocation: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  updateStatus: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  updateOrderStatus: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  createOrder: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  recordDeliveryAlert: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  createException: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  updateException: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  markNotificationRead: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  markAllNotificationsRead: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  setNotificationPreference: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
  evaluatePotentialDelays: () => ({ ok: false, error: 'Demo data could not be loaded.' }),
}

function DeliveryDataProvider({ children }) {
  const [state] = useState(() => {
    try {
      const store = createDeliveryDataStore()
      const delayResult = store.evaluatePotentialDelays()
      if (!delayResult.ok) throw new Error(delayResult.error)
      return { store, error: null }
    } catch (error) {
      return {
        store: null,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })
  const store = state.store ?? unavailableStore
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [notificationIdentity, setNotificationIdentity] = useState({
    role: 'admin',
    userId: 'admin',
  })
  const [notificationError, setNotificationError] = useState(state.error)

  useEffect(() => {
    if (state.error) return undefined
    const checkDeadlines = () => {
      const result = store.evaluatePotentialDelays()
      if (!result.ok) setNotificationError(result.error)
      else setNotificationError(null)
    }
    const interval = window.setInterval(checkDeadlines, 60_000)
    return () => window.clearInterval(interval)
  }, [state.error, store])

  return (
    <DeliveryDataContext.Provider
      value={{
        ...data,
        ...(notificationError ? { error: notificationError } : {}),
        assign: store.assign,
        saveRoute: store.saveRoute,
        updateLocation: store.updateLocation,
        updateStatus: store.updateStatus,
        updateOrderStatus: store.updateOrderStatus,
        createOrder: store.createOrder,
        recordDeliveryAlert: store.recordDeliveryAlert,
        createException: store.createException,
        updateException: store.updateException,
        markNotificationRead: store.markNotificationRead,
        markAllNotificationsRead: store.markAllNotificationsRead,
        setNotificationPreference: store.setNotificationPreference,
        notificationIdentity,
        setNotificationIdentity,
      }}
    >
      {children}
    </DeliveryDataContext.Provider>
  )
}

export default DeliveryDataProvider
