import { BrainCircuit } from 'lucide-react'
import clsx from 'clsx'

function BrandMark({ dark = false, compact = false }) {
  return (
    <div className={clsx('flex items-center gap-3', compact && 'justify-center')}>
      <div
        className={clsx(
          'flex h-11 w-11 items-center justify-center rounded-xl',
          dark ? 'bg-white text-slate-950' : 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950',
        )}
      >
        <BrainCircuit size={22} />
      </div>
      {!compact && (
        <div>
          <p className={clsx('text-base font-bold tracking-tight', dark ? 'text-white' : 'text-slate-950 dark:text-white')}>CareerTrack AI</p>
          <p className={clsx('text-xs', dark ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400')}>Smart career operating system</p>
        </div>
      )}
    </div>
  )
}

export default BrandMark
