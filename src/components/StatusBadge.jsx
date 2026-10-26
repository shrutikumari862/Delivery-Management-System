const statusStyles = {
  Available: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15',
  Busy: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  Offline: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  'Ready for assignment': 'bg-sky-50 text-sky-800 ring-sky-600/15',
  'Out for delivery': 'bg-violet-50 text-violet-800 ring-violet-600/15',
  Delivered: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15',
  Cancelled: 'bg-rose-50 text-rose-800 ring-rose-600/15',
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status] ?? 'bg-slate-100 text-slate-700 ring-slate-500/15'}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          status === 'Available'
            ? 'bg-emerald-600'
            : status === 'Busy'
              ? 'bg-amber-500'
              : status === 'Offline'
                ? 'bg-slate-400'
                : 'bg-current'
        }`}
      />
      {status}
    </span>
  )
}

export default StatusBadge
