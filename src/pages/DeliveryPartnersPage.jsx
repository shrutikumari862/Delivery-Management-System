import { useMemo, useState } from 'react'
import { Search, UsersRound } from 'lucide-react'
import DemoDataError from '../components/DemoDataError.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useDeliveryData } from '../services/useDeliveryData.js'

function DeliveryPartnersPage() {
  const { partners, error } = useDeliveryData()
  const [search, setSearch] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('All statuses')
  const [areaFilter, setAreaFilter] = useState('All service areas')

  const serviceAreas = useMemo(
    () => [...new Set(partners.flatMap((partner) => partner.serviceAreas))].sort(),
    [partners],
  )
  const filteredPartners = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return partners.filter((partner) => {
      const matchesSearch =
        query === '' ||
        partner.name.toLocaleLowerCase().includes(query) ||
        partner.id.toLocaleLowerCase().includes(query)
      const matchesAvailability =
        availabilityFilter === 'All statuses' ||
        partner.availability === availabilityFilter
      const matchesArea =
        areaFilter === 'All service areas' ||
        partner.serviceAreas.includes(areaFilter)
      return matchesSearch && matchesAvailability && matchesArea
    })
  }, [partners, search, availabilityFilter, areaFilter])

  if (error) return <DemoDataError message={error} />

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Delivery partners
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review partner availability, delivery capacity, service areas, and
            delivery performance.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <UsersRound aria-hidden="true" className="text-emerald-800" size={19} />
          <span className="text-sm font-semibold text-slate-800">
            {partners.length} partners
          </span>
        </div>
      </div>

      <div className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_12rem_14rem]">
        <label className="relative block">
          <span className="sr-only">Search by partner name or ID</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={17}
          />
          <input
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or partner ID"
            type="search"
            value={search}
          />
        </label>
        <label>
          <span className="sr-only">Filter by availability</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            onChange={(event) => setAvailabilityFilter(event.target.value)}
            value={availabilityFilter}
          >
            {['All statuses', 'Available', 'Busy', 'Offline'].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Filter by service area</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            onChange={(event) => setAreaFilter(event.target.value)}
            value={areaFilter}
          >
            <option>All service areas</option>
            {serviceAreas.map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Partner roster</h2>
          <span className="text-sm text-slate-500">
            {filteredPartners.length} shown
          </span>
        </div>
        {filteredPartners.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <UsersRound aria-hidden="true" className="mx-auto text-slate-300" size={28} />
            <p className="mt-3 font-semibold text-slate-800">No partners found</p>
            <p className="mt-1 text-sm text-slate-500">
              Try a different search term or filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Partner</th>
                  <th className="px-4 py-3 font-semibold">Availability</th>
                  <th className="px-4 py-3 font-semibold">Active / capacity</th>
                  <th className="px-4 py-3 font-semibold">Service area</th>
                  <th className="px-4 py-3 font-semibold">Completed</th>
                  <th className="px-5 py-3 font-semibold">On time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPartners.map((partner) => (
                  <tr className="align-top" key={partner.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{partner.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{partner.id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={partner.availability} />
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-slate-800">
                        {partner.activeDeliveries}
                      </span>
                      <span className="text-slate-500"> / {partner.maxCapacity}</span>
                      <div
                        aria-label={`${partner.maxCapacity - partner.activeDeliveries} of ${partner.maxCapacity} delivery slots remaining`}
                        className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"
                        role="img"
                      >
                        <span
                          className="block h-full rounded-full bg-emerald-600"
                          style={{
                            width: `${Math.min(100, (partner.activeDeliveries / partner.maxCapacity) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="max-w-64 px-4 py-4 text-sm leading-6 text-slate-600">
                      {partner.serviceAreas.join(', ')}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-700">
                      {partner.completedDeliveries.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-800">
                        {partner.onTimePercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Partner roster and performance figures are illustrative demo data.
      </p>
    </section>
  )
}

export default DeliveryPartnersPage
