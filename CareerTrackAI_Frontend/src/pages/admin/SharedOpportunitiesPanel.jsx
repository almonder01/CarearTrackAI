import dayjs from 'dayjs'
import { Bell, Edit3, LoaderCircle, Save, Search, Send, ShieldCheck, Trash2, X } from 'lucide-react'
import { emptyOpportunityForm } from './adminUtils.js'

function SharedOpportunitiesPanel({
  saveSharedOpportunity,
  editingOpportunityId,
  opportunityForm,
  setOpportunityForm,
  sharedCompanyOptions,
  workingId,
  setEditingOpportunityId,
  opportunityFilters,
  setOpportunityFilters,
  opportunityTypeOptions,
  opportunitySourceOptions,
  checkAllNotificationTargets,
  checkingAll,
  sharedOpportunities,
  filteredSharedOpportunities,
  notificationChecks,
  openNotificationDialog,
  editOpportunity,
  deleteSharedOpportunity,
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(560px,640px)_minmax(0,1fr)]">
      <form onSubmit={saveSharedOpportunity} className="card h-fit">
        <p className="label">Shared opportunity</p>
        <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{editingOpportunityId ? 'Edit opportunity' : 'Add opportunity'}</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">Company</span>
            <select className="input mt-2" value={opportunityForm.companyId} onChange={(event) => setOpportunityForm({ ...opportunityForm, companyId: event.target.value })} required>
              <option value="">Select shared company</option>
              {sharedCompanyOptions.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Title</span>
            <input className="input mt-2" value={opportunityForm.title} onChange={(event) => setOpportunityForm({ ...opportunityForm, title: event.target.value })} required />
          </label>
          <label>
            <span className="label">Type</span>
            <select className="input mt-2" value={opportunityForm.type} onChange={(event) => setOpportunityForm({ ...opportunityForm, type: event.target.value })}>
              <option value="Internship">Internship</option>
              <option value="Job">Job</option>
            </select>
          </label>
          <label>
            <span className="label">Employment</span>
            <select className="input mt-2" value={opportunityForm.employmentType} onChange={(event) => setOpportunityForm({ ...opportunityForm, employmentType: event.target.value })}>
              <option value="">Not specified</option>
              <option value="FullTime">Full-time</option>
              <option value="PartTime">Part-time</option>
              <option value="Contract">Contract</option>
            </select>
          </label>
          <label>
            <span className="label">Location</span>
            <input className="input mt-2" value={opportunityForm.location} onChange={(event) => setOpportunityForm({ ...opportunityForm, location: event.target.value })} />
          </label>
          <label>
            <span className="label">Deadline</span>
            <input className="input mt-2" type="date" value={opportunityForm.applicationDeadline} onChange={(event) => setOpportunityForm({ ...opportunityForm, applicationDeadline: event.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Job URL</span>
            <input className="input mt-2" value={opportunityForm.jobUrl} onChange={(event) => setOpportunityForm({ ...opportunityForm, jobUrl: event.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Required skills</span>
            <input className="input mt-2" value={opportunityForm.requiredSkills} onChange={(event) => setOpportunityForm({ ...opportunityForm, requiredSkills: event.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Description</span>
            <textarea className="input mt-2 min-h-24 resize-y" value={opportunityForm.description} onChange={(event) => setOpportunityForm({ ...opportunityForm, description: event.target.value })} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="font-bold text-slate-950 dark:text-white">Remote</span>
            <input type="checkbox" checked={opportunityForm.isRemote} onChange={(event) => setOpportunityForm({ ...opportunityForm, isRemote: event.target.checked })} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="font-bold text-slate-950 dark:text-white">Active</span>
            <input type="checkbox" checked={opportunityForm.isActive} onChange={(event) => setOpportunityForm({ ...opportunityForm, isActive: event.target.checked })} />
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="submit" disabled={workingId === 'opportunity-form'} className="btn-primary flex-1">
            {workingId === 'opportunity-form' ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
            {editingOpportunityId ? 'Update' : 'Add'}
          </button>
          {editingOpportunityId && (
            <button type="button" onClick={() => { setEditingOpportunityId(null); setOpportunityForm(emptyOpportunityForm) }} className="btn-secondary px-3">
              <X size={17} />
            </button>
          )}
        </div>
      </form>

      <section className="card min-w-0 overflow-hidden">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 lg:grid-cols-[1fr_170px_220px]">
            <label className="block">
              <span className="label">Search opportunities</span>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  className="input pl-10"
                  value={opportunityFilters.search}
                  onChange={(event) => setOpportunityFilters({ ...opportunityFilters, search: event.target.value })}
                  placeholder="Title, company, skills, location"
                />
              </div>
            </label>
            <label className="block">
              <span className="label">Type</span>
              <select className="input mt-2" value={opportunityFilters.type} onChange={(event) => setOpportunityFilters({ ...opportunityFilters, type: event.target.value })}>
                <option value="">All types</option>
                {opportunityTypeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Source</span>
              <select className="input mt-2" value={opportunityFilters.source} onChange={(event) => setOpportunityFilters({ ...opportunityFilters, source: event.target.value })}>
                <option value="">All sources</option>
                {opportunitySourceOptions.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="button" onClick={checkAllNotificationTargets} disabled={checkingAll || sharedOpportunities.length === 0} className="btn-secondary justify-center">
            {checkingAll ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
            {checkingAll ? 'Checking...' : 'Check all'}
          </button>
        </div>
        <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Opportunity</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSharedOpportunities.length === 0 ? (
                <tr className="bg-white dark:bg-slate-900">
                  <td colSpan={5} className="px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                    No shared opportunities match the current filters.
                  </td>
                </tr>
              ) : filteredSharedOpportunities.map((opportunity) => {
                const check = notificationChecks[opportunity.id]
                return (
                  <tr key={opportunity.id} className="bg-white dark:bg-slate-900">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-950 dark:text-white">{opportunity.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{opportunity.type} {opportunity.employmentType ? `| ${opportunity.employmentType}` : ''}</p>
                      {check && (
                        <p className="mt-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                          Checked {dayjs(check.checkedAt).format('MMM D, h:mm A')} | {check.matchedUsers || 0} matched
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{opportunity.company?.name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{opportunity.location || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{opportunity.applicationDeadline ? dayjs(opportunity.applicationDeadline).format('MMM D, YYYY') : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => editOpportunity(opportunity)} className="btn-secondary px-3 py-2">
                          <Edit3 size={15} />
                          Edit
                        </button>
                        <button type="button" onClick={() => openNotificationDialog(opportunity)} disabled={workingId === `check-${opportunity.id}` || workingId === `notify-${opportunity.id}`} className="btn-secondary px-3 py-2">
                          {workingId === `check-${opportunity.id}` || workingId === `notify-${opportunity.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Send size={15} />}
                          {check ? `Notify (${check.matchedUsers || 0})` : 'Notify'}
                        </button>
                        <button type="button" onClick={() => deleteSharedOpportunity(opportunity)} disabled={workingId === `opportunity-${opportunity.id}`} className="btn-secondary px-3 py-2 text-rose-700 dark:text-rose-200">
                          {workingId === `opportunity-${opportunity.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <Bell size={17} className="mt-0.5" />
            <p>Notify checks one opportunity at a time. Check all precomputes recipient counts, and each Notify button can send directly or recheck before sending.</p>
          </div>
        </div>
      </section>
    </section>
  )
}


export default SharedOpportunitiesPanel
