import {
  Activity,
  ChartNoAxesCombined,
  Compass,
  LayoutDashboard,
  MapPinned,
  PackageCheck,
  Route,
  UsersRound,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import NotificationCenter from '../components/NotificationCenter.jsx'

const navigation = [
  { to: '/explore', label: 'Explore platform', icon: Compass },
  { to: '/admin/assignments', label: 'Smart assignment', icon: LayoutDashboard },
  { to: '/admin/delivery-partners', label: 'Delivery partners', icon: UsersRound },
  { to: '/admin/monitoring', label: 'Delivery monitoring', icon: Activity },
  { to: '/admin/route-planning', label: 'Route planning', icon: Route },
  { to: '/admin/analytics', label: 'Delivery analytics', icon: ChartNoAxesCombined },
  { to: '/partner/my-route', label: 'Partner route · demo', icon: MapPinned },
  { to: '/settings/notifications', label: 'Settings', icon: UsersRound },
]

function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#f7f9f8] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <a aria-label="Routewise home" className="flex w-fit items-center gap-3" href="/">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <PackageCheck aria-hidden="true" size={21} />
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">Routewise</span>
              <span className="block text-xs text-slate-500">Admin workspace · demo</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <nav aria-label="Admin navigation" className="flex flex-wrap gap-2">
              {navigation.map(({ to, label, icon: Icon }) => (
                <NavLink
                  aria-label={label}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                  key={to}
                  to={to}
                >
                  <Icon aria-hidden="true" size={17} />
                  <span className="hidden xl:inline">{label}</span>
                </NavLink>
              ))}
            </nav>
            <NotificationCenter />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Demo workspace: orders and partner updates are saved in this browser
          only. Authentication, role permissions, and a production backend are not configured.
        </div>
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
