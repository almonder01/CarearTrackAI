import { Database, UserCog } from 'lucide-react'
import { AdminToast, BulkCheckDialog, NotificationDialog, UserActionModal } from './admin/AdminOverlays.jsx'
import SharedDatabaseSection from './admin/SharedDatabaseSection.jsx'
import UserManagementSection from './admin/UserManagementSection.jsx'
import useAdminController from './admin/useAdminController.js'
import DismissibleNotice from '../components/DismissibleNotice.jsx'

function Admin() {
  const admin = useAdminController()

  if (!admin.isAdmin) {
    return (
      <div className="card">
        <p className="label">Restricted</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Admin access required</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Only administrators can manage users and shared database rows.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <UserActionModal confirmation={admin.pendingConfirmation} onCancel={() => admin.setPendingUserAction(null)} onConfirm={admin.confirmPendingUserAction} />
      <NotificationDialog
        dialog={admin.notificationDialog}
        workingId={admin.workingId}
        onCancel={() => admin.setNotificationDialog(null)}
        onRecheck={admin.checkNotificationTargets}
        onSend={admin.sendCheckedNotification}
      />
      <BulkCheckDialog dialog={admin.bulkCheckDialog} onClose={() => admin.setBulkCheckDialog(null)} />
      <AdminToast toast={admin.toast} onClose={() => admin.setToast(null)} />

      <section className="card">
        <p className="label">Admin console</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ['users', 'User management', UserCog],
            ['database', 'Shared database', Database],
          ].map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => admin.setSection(value)}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold transition ${
                admin.section === value
                  ? 'border-slate-950 bg-slate-950 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>
      </section>

      {admin.feedback && (
        <DismissibleNotice
          className={`rounded-lg border p-3 text-sm font-semibold ${
            admin.feedback.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
          }`}
          onDismiss={() => admin.setFeedback(null)}
        >
          {admin.feedback.text}
        </DismissibleNotice>
      )}

      {admin.section === 'users' && <UserManagementSection {...admin} />}
      {admin.section === 'database' && <SharedDatabaseSection {...admin} />}
    </div>
  )
}

export default Admin
