import { X } from 'lucide-react'

function DismissibleNotice({ children, className = '', onDismiss, title = 'Dismiss message' }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 rounded-md p-1 transition hover:bg-black/5 dark:hover:bg-white/10" title={title}>
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export default DismissibleNotice
