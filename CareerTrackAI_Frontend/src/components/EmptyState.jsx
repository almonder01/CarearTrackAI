import { Inbox } from 'lucide-react'

function EmptyState({ title, description }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-8 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Inbox size={22} />
      </div>
      <h3 className="font-bold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

export default EmptyState
