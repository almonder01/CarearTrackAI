function MetricCard({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-950 text-white',
    teal: 'bg-teal-600 text-white',
    amber: 'bg-amber-500 text-white',
    rose: 'bg-rose-500 text-white',
    emerald: 'bg-emerald-600 text-white',
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
          {hint && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}

export default MetricCard
