import { ArrowUpRight, PackageCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import NotificationCenter from './NotificationCenter.jsx'

function SiteHeader() {
  return (
    <header className="border-b border-slate-200/70 bg-white/85">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <Link aria-label="Routewise home" className="flex items-center gap-3" to="/">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm shadow-emerald-900/15">
            <PackageCheck aria-hidden="true" size={21} strokeWidth={2.2} />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Routewise
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          <a className="text-sm font-medium text-slate-600 transition hover:text-emerald-800" href="/#platform">
            Platform
          </a>
          <a className="text-sm font-medium text-slate-600 transition hover:text-emerald-800" href="/#workflow">
            How it works
          </a>
          <a className="text-sm font-medium text-slate-600 transition hover:text-emerald-800" href="/#roles">
            For every team
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <NotificationCenter />
          <Link
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            to="/explore"
          >
            <span className="hidden sm:inline">Explore Platform</span>
            <span className="sm:hidden">Explore</span>
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>
    </header>
  )
}

export default SiteHeader
