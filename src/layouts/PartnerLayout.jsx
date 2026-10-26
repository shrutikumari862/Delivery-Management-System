import { Compass, MapPinned, PackageCheck } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import NotificationCenter from '../components/NotificationCenter.jsx'

function PartnerLayout() {
  return (
    <div className="min-h-screen bg-[#f7f9f8] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link aria-label="Routewise home" className="flex items-center gap-3" to="/">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <PackageCheck aria-hidden="true" size={21} />
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">Routewise</span>
              <span className="block text-xs text-slate-500">Delivery partner · demo</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              aria-label="Explore platform"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900"
              to="/explore"
            >
              <Compass aria-hidden="true" size={17} />
              <span className="hidden sm:inline">Explore</span>
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"
              to="/partner/my-route"
            >
              <MapPinned aria-hidden="true" size={17} />
              My Route
            </Link>
            <Link
              aria-label="Notification settings"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:inline-flex"
              to="/settings/notifications"
            >
              Settings
            </Link>
            <NotificationCenter />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Demo partner view: sign-in and partner authorization are not configured.
          This selector simulates a partner session and is not an access control.
        </div>
        <Outlet />
      </main>
    </div>
  )
}

export default PartnerLayout
