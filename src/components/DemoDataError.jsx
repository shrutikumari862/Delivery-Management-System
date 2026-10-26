import { AlertCircle } from 'lucide-react'

function DemoDataError({ message }) {
  return (
    <div
      className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-10 text-center"
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="mx-auto text-rose-700" size={28} />
      <h1 className="mt-3 text-xl font-semibold text-rose-950">
        Demo data could not be loaded
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-rose-800">
        {message} The saved browser data may be invalid. No assignment was
        changed; correct or clear the saved Routewise demo data and reload.
      </p>
    </div>
  )
}

export default DemoDataError
