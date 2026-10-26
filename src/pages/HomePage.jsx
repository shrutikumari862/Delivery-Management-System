import {
  ArrowDown,
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from 'lucide-react'

const highlights = [
  { label: 'Clear delivery visibility', icon: MapPin },
  { label: 'Smoother team handoffs', icon: Package },
  { label: 'More reliable arrivals', icon: Clock3 },
]

const roles = [
  {
    title: 'Admins',
    description: 'Keep operations coordinated with a clear view of the whole delivery journey.',
    icon: ShieldCheck,
  },
  {
    title: 'Customers',
    description: 'Know what is happening with an order and when it is expected to arrive.',
    icon: Package,
  },
  {
    title: 'Delivery partners',
    description: 'Stay focused on the next stop with organized routes and delivery details.',
    icon: Truck,
  },
  {
    title: 'Warehouse teams',
    description: 'Prepare and hand off orders with fewer missed steps along the way.',
    icon: Check,
  },
]

function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute -right-24 -top-32 size-[30rem] rounded-full bg-emerald-100/65 blur-3xl" />
          <div className="absolute -left-40 bottom-0 size-96 rounded-full bg-amber-100/50 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-10 lg:py-24">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-emerald-800 shadow-sm shadow-emerald-900/5">
              <span className="size-2 rounded-full bg-emerald-600" />
              Delivery operations, made clearer
            </div>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-6xl">
              Every delivery,
              <br />
              <span className="text-emerald-800">moving in sync.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              A calmer way to coordinate orders, warehouse handoffs, and
              last-mile delivery—so your whole team knows what comes next.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                href="#platform"
              >
                Discover the platform
                <ArrowRight aria-hidden="true" size={17} />
              </a>
              <a
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white/75 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                href="#workflow"
              >
                See how it works
                <ArrowDown aria-hidden="true" size={16} />
              </a>
            </div>

            <ul className="mt-9 flex flex-col gap-3 text-sm font-medium text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {highlights.map(({ label, icon: Icon }) => (
                <li className="inline-flex items-center gap-2" key={label}>
                  <Icon aria-hidden="true" className="text-emerald-700" size={17} />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div
            aria-label="Illustration of an order moving from warehouse to delivery"
            className="relative mx-auto w-full max-w-[35rem]"
            role="img"
          >
            <div className="absolute -inset-5 rounded-[2.25rem] bg-emerald-200/35 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_28px_80px_-35px_rgba(15,45,36,0.38)] sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Delivery overview
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">A smooth handoff</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                  <span className="size-1.5 rounded-full bg-emerald-600" />
                  On schedule
                </span>
              </div>

              <div className="relative my-6 flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-[#f3f7f5] sm:h-72">
                <svg
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full"
                  fill="none"
                  preserveAspectRatio="xMidYMid slice"
                  viewBox="0 0 560 330"
                >
                  <path d="M25 74h104l30 36h91l40-45h88l40 41h117" stroke="#e2eae5" strokeWidth="2" />
                  <path d="M-15 223h120l48-45h82l38 44h94l43-39h165" stroke="#e2eae5" strokeWidth="2" />
                  <path d="M113 0v87l38 42v70l-31 34v97" stroke="#e2eae5" strokeWidth="2" />
                  <path d="M383-8v65l-45 48v72l43 40v125" stroke="#e2eae5" strokeWidth="2" />
                  <path d="M152 227c38 0 45-86 91-86h88c48 0 36 75 87 75h42" stroke="#07815f" strokeDasharray="5 7" strokeLinecap="round" strokeWidth="3" />
                </svg>

                <div className="absolute left-[16%] top-[23%] flex size-12 items-center justify-center rounded-2xl border border-white bg-white text-emerald-800 shadow-md shadow-slate-900/10">
                  <Package aria-hidden="true" size={21} />
                </div>
                <div className="absolute right-[16%] top-[53%] flex size-12 items-center justify-center rounded-2xl border border-white bg-emerald-800 text-white shadow-lg shadow-emerald-900/20">
                  <Truck aria-hidden="true" size={21} />
                </div>
                <span className="absolute bottom-[20%] left-[44%] size-3 rounded-full border-[3px] border-white bg-emerald-600 shadow-md" />

                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-slate-100 bg-white/95 p-4 shadow-lg shadow-slate-900/5 backdrop-blur sm:bottom-5 sm:left-5 sm:right-auto sm:w-64">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                        <MapPin aria-hidden="true" size={18} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Order #RW-2048</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">Out for delivery</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-800">10:42 AM</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs text-slate-500">From warehouse to doorstep</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">Every step, connected</p>
                </div>
                <div aria-hidden="true" className="flex -space-x-2">
                  <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-[10px] font-bold text-emerald-900">WH</span>
                  <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-amber-100 text-[10px] font-bold text-amber-900">DP</span>
                  <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-700">+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white" id="platform">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              One connected operation
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Less chasing updates. More deliveries that just work.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Bring each part of the delivery journey into focus, with a shared
              view built around the people doing the work.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map(({ title, description, icon: Icon }, index) => (
              <article
                className="group rounded-2xl border border-slate-200 bg-[#fbfcfb] p-5 transition hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-xl hover:shadow-emerald-950/5"
                id={index === 0 ? 'roles' : undefined}
                key={title}
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition group-hover:bg-emerald-800 group-hover:text-white">
                  <Icon aria-hidden="true" size={20} />
                </span>
                <h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:px-10" id="workflow">
        <div className="flex flex-col justify-center rounded-2xl bg-emerald-900 p-7 text-white sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
            Made for the real world
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
            A clearer path from order to arrival.
          </h2>
          <p className="mt-4 text-sm leading-6 text-emerald-100/85">
            The work moves forward in practical steps, with the right people in
            the loop at every handoff.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['01', 'Prepare', 'Orders are organized and ready for the next handoff.'],
            ['02', 'Dispatch', 'Delivery details and ownership stay easy to follow.'],
            ['03', 'Deliver', 'Teams can stay aligned through the final mile.'],
          ].map(([number, title, description]) => (
            <article className="rounded-2xl border border-slate-200 bg-white p-6" key={number}>
              <p className="text-xs font-bold tracking-[0.14em] text-emerald-800">{number}</p>
              <h3 className="mt-8 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

export default HomePage
