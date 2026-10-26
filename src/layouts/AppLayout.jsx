import { Outlet } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader.jsx'

function AppLayout() {
  return (
    <div className="min-h-screen bg-[#f7f9f8] text-slate-900">
      <SiteHeader />
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span className="font-semibold text-slate-700">Routewise</span>
          <span>Thoughtful delivery operations, from dispatch to doorstep.</span>
        </div>
      </footer>
    </div>
  )
}

export default AppLayout
