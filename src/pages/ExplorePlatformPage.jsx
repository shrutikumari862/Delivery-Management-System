import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Activity,
  BellRing,
  ChartNoAxesCombined,
  ClipboardCheck,
  Compass,
  MapPinned,
  PackageCheck,
  Route,
  Search,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const features = [
  {
    name: 'Smart delivery assignment',
    description:
      'Compare eligible partners by service area, workload, capacity, and distance, then assign or reassign active orders.',
    categories: ['Assignment', 'Role-Specific Tools'],
    role: 'Admin demo',
    route: '/admin/assignments',
    icon: ClipboardCheck,
  },
  {
    name: 'Delivery partner management',
    description:
      'Review partner availability, remaining capacity, service areas, and recorded delivery performance.',
    categories: ['Role-Specific Tools'],
    role: 'Admin demo',
    route: '/admin/delivery-partners',
    icon: UsersRound,
  },
  {
    name: 'Route planning',
    description:
      'Choose a partner’s active deliveries, preview a stop sequence, optimize it by straight-line distance, and save the route.',
    categories: ['Route Planning', 'Role-Specific Tools'],
    role: 'Admin demo',
    route: '/admin/route-planning',
    icon: Route,
  },
  {
    name: 'My delivery route',
    description:
      'View a partner’s assigned active stops and saved route, and mark an eligible delivery as delivered.',
    categories: ['Route Planning', 'Role-Specific Tools'],
    role: 'Delivery partner demo',
    route: '/partner/my-route',
    icon: MapPinned,
  },
  {
    name: 'Delivery monitoring and exception management',
    description:
      'Filter browser-local shipment records, review recorded timelines, and create, track, or resolve delivery exceptions.',
    categories: ['Monitoring', 'Exception Management', 'Role-Specific Tools'],
    role: 'Admin demo',
    route: '/admin/monitoring',
    icon: Activity,
  },
  {
    name: 'Delivery analytics',
    description:
      'Explore delivery KPIs, order and outcome charts, partner performance, and evidence-based delay-risk indicators.',
    categories: ['Analytics', 'Role-Specific Tools'],
    role: 'Admin demo',
    route: '/admin/analytics',
    icon: ChartNoAxesCombined,
  },
  {
    name: 'In-app notification preferences',
    description:
      'Configure role-scoped alert categories and read status. Open the header bell to browse notifications and shipment updates.',
    categories: ['Notifications'],
    route: '/settings/notifications',
    icon: BellRing,
  },
]

const categoryLabels = {
  Assignment: 'Assignment',
  'Route Planning': 'Route Planning',
  Monitoring: 'Monitoring',
  'Exception Management': 'Exception Management',
  Notifications: 'Notifications',
  Analytics: 'Analytics',
  'Role-Specific Tools': 'Role-Specific Tools',
}

const categories = [
  ...new Set(features.flatMap((feature) => feature.categories)),
]

function ExplorePlatformPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All Features')

  const filteredFeatures = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return features.filter((feature) => {
      const searchableText = [
        feature.name,
        feature.description,
        ...feature.categories,
      ]
        .join(' ')
        .toLocaleLowerCase()
      const matchesSearch = !query || searchableText.includes(query)
      const matchesCategory =
        activeCategory === 'All Features' ||
        feature.categories.includes(activeCategory)
      return matchesSearch && matchesCategory
    })
  }, [search, activeCategory])

  const hasActiveFilters = search !== '' || activeCategory !== 'All Features'

  function clearFilters() {
    setSearch('')
    setActiveCategory('All Features')
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
      <Link
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        to="/"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Back to dashboard
      </Link>

      <header className="mt-8 max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-900">
          <Compass aria-hidden="true" size={15} />
          Platform guide
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
          Explore Our Platform
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Discover the tools that make delivery management smarter, faster, and
          more reliable.
        </p>
      </header>

      <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label className="relative block">
          <span className="sr-only">Search platform features</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by feature, description, or category"
            type="search"
            value={search}
          />
        </label>
        <div
          aria-label="Filter features by category"
          className="mt-4 flex gap-2 overflow-x-auto pb-1"
          role="group"
        >
          {['All Features', ...categories].map((category) => (
            <button
              aria-pressed={activeCategory === category}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                activeCategory === category
                  ? 'bg-emerald-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
              }`}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category === 'All Features'
                ? category
                : categoryLabels[category]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm font-medium text-slate-600">
          {filteredFeatures.length} feature
          {filteredFeatures.length === 1 ? '' : 's'} available
        </p>
        {hasActiveFilters && (
          <button
            className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-900 underline decoration-emerald-300 underline-offset-4 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            onClick={clearFilters}
            type="button"
          >
            Clear filters
          </button>
        )}
      </div>

      {filteredFeatures.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                className="group flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/5 sm:p-6"
                key={feature.route}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition group-hover:bg-emerald-800 group-hover:text-white">
                    <Icon aria-hidden="true" size={21} />
                  </span>
                  {feature.role && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {feature.role}
                    </span>
                  )}
                </div>
                <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">
                  {feature.name}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {feature.categories.map((category) => (
                    <span
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500"
                      key={category}
                    >
                      {categoryLabels[category]}
                    </span>
                  ))}
                </div>
                <Link
                  className="mt-5 inline-flex min-h-10 items-center justify-between gap-2 rounded-lg border border-emerald-800 px-3.5 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  to={feature.route}
                >
                  Open Feature
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <Search aria-hidden="true" className="mx-auto text-slate-300" size={28} />
          <h2 className="mt-3 font-semibold text-slate-900">No matching features</h2>
          <p className="mt-1 text-sm text-slate-500">
            Try another search or clear the category and search filters.
          </p>
          <button
            className="mt-4 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            onClick={clearFilters}
            type="button"
          >
            Clear filters
          </button>
        </div>
      )}

      <aside className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <PackageCheck
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-amber-800"
            size={20}
          />
          <div>
            <h2 className="font-semibold text-amber-950">
              Demo access and features not yet available
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              This prototype has no sign-in or role-based access control. Role
              labels identify demo workspaces and are not enforced permissions.
              Dedicated order management, customer shipment tracking, and
              warehouse dashboards are not implemented, so they are not listed
              as available features. Delay-risk indicators appear only when
              delivery records contain sufficient evidence.
            </p>
          </div>
        </div>
      </aside>
    </section>
  )
}

export default ExplorePlatformPage
