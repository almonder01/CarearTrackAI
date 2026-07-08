import dayjs from 'dayjs'
import { AlertTriangle, Bell, LoaderCircle, Search, Send, ShieldCheck, X } from 'lucide-react'

function UserActionModal({ confirmation, onCancel, onConfirm }) {
  if (!confirmation) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
              confirmation.danger
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
            }`}
          >
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0">
            <p className="label">Confirmation required</p>
            <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{confirmation.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{confirmation.message}</p>
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {confirmation.note}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary justify-center">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
              confirmation.danger
                ? 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400'
                : 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300'
            }`}
          >
            {confirmation.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function NotificationDialog({ dialog, workingId, onCancel, onRecheck, onSend }) {
  if (!dialog) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200">
            {dialog.status === 'checking' || dialog.status === 'sending' ? <LoaderCircle className="animate-spin" size={22} /> : <Bell size={22} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="label">Opportunity notification</p>
            <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{dialog.opportunity?.title || 'Shared opportunity'}</h3>
            {dialog.status === 'checking' && (
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Checking interested users with the latest profile signals and AI matching score.
              </p>
            )}
            {dialog.status === 'sending' && (
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Sending the notification to the checked users.</p>
            )}
            {dialog.status === 'error' && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {dialog.error}
              </p>
            )}
            {dialog.status === 'ready' && dialog.check && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Matched recipients</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">{dialog.check.matchedUsers || 0}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{dialog.check.message}</p>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Checked {dayjs(dialog.check.checkedAt).format('MMM D, YYYY h:mm A')}.
                  {dialog.cached ? ' You can send directly using this check or recheck before sending.' : ' Review the result before sending.'}
                </p>
                {dialog.error && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                    {dialog.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary justify-center">
            Cancel
          </button>
          {dialog.status === 'ready' && (
            <button type="button" onClick={() => onRecheck(dialog.opportunity)} className="btn-secondary justify-center">
              <Search size={16} />
              Recheck
            </button>
          )}
          {dialog.status === 'ready' && (
            <button
              type="button"
              onClick={onSend}
              disabled={workingId === `notify-${dialog.opportunity?.id}` || Number(dialog.check?.matchedUsers || 0) === 0}
              className="btn-primary justify-center"
            >
              {workingId === `notify-${dialog.opportunity?.id}` ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={17} />}
              Confirm send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function BulkCheckDialog({ dialog, onClose }) {
  if (!dialog) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200">
            {dialog.status === 'checking' ? <LoaderCircle className="animate-spin" size={22} /> : <ShieldCheck size={22} />}
          </div>
          <div>
            <p className="label">Bulk notification check</p>
            <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              {dialog.status === 'checking' ? 'Checking all opportunities' : 'Check completed'}
            </h3>
            {dialog.status === 'checking' && (
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">AI is scoring notification-enabled users for each shared opportunity.</p>
            )}
            {dialog.status === 'ready' && (
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Checked {dialog.checkedRows || 0} opportunities and found {dialog.totalMatched || 0} total matched recipients.
                Notify buttons now use these checks until the shared database is refreshed.
              </p>
            )}
            {dialog.status === 'error' && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {dialog.error}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} disabled={dialog.status === 'checking'} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminToast({ toast, onClose }) {
  if (!toast) return null

  return (
    <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div
        className={`flex w-full max-w-xl items-start gap-3 rounded-lg border p-4 shadow-2xl backdrop-blur ${
          toast.type === 'error'
            ? 'border-rose-200 bg-rose-50/95 text-rose-900 dark:border-rose-800 dark:bg-rose-950/95 dark:text-rose-100'
            : 'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-100'
        }`}
      >
        <Bell size={18} className="mt-0.5 shrink-0" />
        <p className="flex-1 text-sm font-semibold leading-6">{toast.text}</p>
        <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10" title="Close">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export { AdminToast, BulkCheckDialog, NotificationDialog, UserActionModal }
