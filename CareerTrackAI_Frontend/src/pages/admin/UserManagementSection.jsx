import dayjs from 'dayjs'
import { LoaderCircle, Search, ShieldCheck, Trash2, UserCog, UserPlus } from 'lucide-react'
import { roleLabel } from './adminUtils.js'

function UserManagementSection({
  form,
  setForm,
  creating,
  createAdmin,
  search,
  setSearch,
  loadUsers,
  loading,
  users,
  workingId,
  requestUserAction,
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(500px,560px)_minmax(0,1fr)]">
      <form onSubmit={createAdmin} className="card h-fit">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950">
            <UserPlus size={21} />
          </div>
          <div>
            <p className="label">Access control</p>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Create admin</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Full name</span>
            <input className="input mt-2" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input className="input mt-2" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Temporary password</span>
            <input
              className="input mt-2"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
              minLength={8}
              pattern="^(?=.*[A-Za-z])(?=.*\d).+$"
              title="Password must be at least 8 characters and include at least one letter and one number."
            />
            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">At least 8 characters with one letter and one number.</p>
          </label>
        </div>
        <button type="submit" disabled={creating} className="btn-primary mt-5 w-full">
          {creating ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
          {creating ? 'Creating...' : 'Create admin'}
        </button>
      </form>

      <section className="card min-w-0 overflow-hidden">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="label">Users</p>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Admin and user management</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The backend blocks deleting or demoting the last remaining admin.</p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              loadUsers(search)
            }}
            className="flex min-w-72 gap-2"
          >
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." />
            <button type="submit" className="btn-secondary px-3" title="Search">
              <Search size={17} />
            </button>
          </form>
        </div>

        <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Notifications</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : (
                users.map((targetUser) => (
                  <tr key={targetUser.id} className="bg-white dark:bg-slate-900">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-950 dark:text-white">{targetUser.fullName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{targetUser.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={targetUser.role === 'Admin' ? 'status-pill bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200' : 'status-pill bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}>
                        {roleLabel(targetUser.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <p>{targetUser.major || 'No major'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{targetUser.city || 'No city'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{targetUser.notificationsEnabled ? 'Allowed' : 'Off'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{targetUser.lastLoginAt ? dayjs(targetUser.lastLoginAt).format('MMM D, YYYY') : 'Never'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {targetUser.role === 'Admin' ? (
                          <button type="button" onClick={() => requestUserAction(targetUser, 'remove-admin')} disabled={workingId === `user-${targetUser.id}`} className="btn-secondary px-3 py-2">
                            {workingId === `user-${targetUser.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <UserCog size={15} />}
                            Remove admin
                          </button>
                        ) : (
                          <button type="button" onClick={() => requestUserAction(targetUser, 'make-admin')} disabled={workingId === `user-${targetUser.id}`} className="btn-secondary px-3 py-2">
                            {workingId === `user-${targetUser.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <ShieldCheck size={15} />}
                            Make admin
                          </button>
                        )}
                        <button type="button" onClick={() => requestUserAction(targetUser, 'delete')} disabled={workingId === `user-${targetUser.id}`} className="btn-secondary px-3 py-2 text-rose-700 dark:text-rose-200">
                          {workingId === `user-${targetUser.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}

export default UserManagementSection
