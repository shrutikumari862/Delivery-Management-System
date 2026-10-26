import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-5 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
        Page not found
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        This route is off the map.
      </h1>
      <p className="mt-3 max-w-md text-slate-600">
        The page you are looking for does not exist. Head back to the home page to continue.
      </p>
      <Link
        className="mt-7 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        to="/"
      >
        Return home
      </Link>
    </section>
  )
}

export default NotFoundPage
