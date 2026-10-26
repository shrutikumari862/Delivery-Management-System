import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AdminAssignmentPage from './pages/AdminAssignmentPage.jsx'
import DeliveryPartnersPage from './pages/DeliveryPartnersPage.jsx'
import NotificationSettingsPage from './pages/NotificationSettingsPage.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import PartnerLayout from './layouts/PartnerLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import ExplorePlatformPage from './pages/ExplorePlatformPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import DeliveryDataProvider from './services/DeliveryDataProvider.jsx'

const RoutePlanningPage = lazy(() => import('./pages/RoutePlanningPage.jsx'))
const PartnerMyRoutePage = lazy(() => import('./pages/PartnerMyRoutePage.jsx'))
const DeliveryAnalyticsPage = lazy(() => import('./pages/DeliveryAnalyticsPage.jsx'))
const DeliveryMonitoringPage = lazy(() => import('./pages/DeliveryMonitoringPage.jsx'))
const ShipmentMonitoringDetailsPage = lazy(
  () => import('./pages/ShipmentMonitoringDetailsPage.jsx'),
)

function RoutePageFallback() {
  return (
    <div
      aria-label="Loading page"
      className="min-h-64 animate-pulse rounded-2xl bg-white"
      role="status"
    />
  )
}

function App() {
  return (
    <DeliveryDataProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePlatformPage />} />
          <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="assignments" element={<AdminAssignmentPage />} />
          <Route path="delivery-partners" element={<DeliveryPartnersPage />} />
          <Route
            path="monitoring"
            element={
              <Suspense fallback={<RoutePageFallback />}>
                <DeliveryMonitoringPage />
              </Suspense>
            }
          />
          <Route
            path="monitoring/:orderId"
            element={
              <Suspense fallback={<RoutePageFallback />}>
                <ShipmentMonitoringDetailsPage />
              </Suspense>
            }
          />
          <Route
            path="analytics"
            element={
              <Suspense fallback={<RoutePageFallback />}>
                <DeliveryAnalyticsPage />
              </Suspense>
            }
          />
          <Route
            path="route-planning"
            element={
              <Suspense fallback={<RoutePageFallback />}>
                <RoutePlanningPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="/partner" element={<PartnerLayout />}>
          <Route
            path="my-route"
            element={
              <Suspense fallback={<RoutePageFallback />}>
                <PartnerMyRoutePage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </DeliveryDataProvider>
  )
}

export default App
