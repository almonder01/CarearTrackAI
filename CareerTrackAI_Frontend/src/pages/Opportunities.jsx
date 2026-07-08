import { AlertTriangle, Building2, CheckCircle2, CloudDownload, DatabaseZap, Download, ExternalLink, LoaderCircle, MapPin, ShieldCheck, SlidersHorizontal, Trash2, X } from 'lucide-react'
import dayjs from 'dayjs'
import AiActionPanel from '../components/AiActionPanel.jsx'
import DismissibleNotice from '../components/DismissibleNotice.jsx'
import useOpportunitiesController from './opportunities/useOpportunitiesController.js'

function Opportunities() {
  const {
    items,
    filters,
    setFilters,
    showAdzuna,
    showJobDataLake,
    includeShared,
    setIncludeShared,
    trackedIds,
    linkChecks,
    checkingLinks,
    actionMessage,
    clearActionMessage,
    loading,
    error,
    clearError,
    showDeleteAllDialog,
    setShowDeleteAllDialog,
    deletingAll,
    exportingCsv,
    visibleItems,
    industries,
    sourceOf,
    cleanText,
    primaryUrl,
    postingUrl,
    urlHost,
    skillList,
    updateShowAdzuna,
    updateShowJobDataLake,
    trackOpportunity,
    deleteOpportunity,
    exportOpportunitiesCsv,
    deleteAllOpportunities,
    verifyJobLink,
  } = useOpportunitiesController()
  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label">Opportunity radar</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Find roles worth tracking</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Filter by opportunity type and let AI surface why a role fits your profile.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label">Type</span>
              <select className="input mt-2" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
                <option value="">All</option>
                <option value="Internship">Internship</option>
                <option value="Job">Job</option>
              </select>
            </label>
            <label>
              <span className="label">Employment</span>
              <select
                className="input mt-2"
                value={filters.employmentType}
                onChange={(event) => setFilters({ ...filters, employmentType: event.target.value })}
              >
                <option value="">Any</option>
                <option value="FullTime">Full time</option>
                <option value="PartTime">Part time</option>
                <option value="Contract">Contract</option>
              </select>
            </label>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-3">
            <label className="flex w-fit items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              <input type="checkbox" checked={showAdzuna} onChange={(event) => updateShowAdzuna(event.target.checked)} />
              Show Adzuna
            </label>
            <label className="flex w-fit items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              <input type="checkbox" checked={showJobDataLake} onChange={(event) => updateShowJobDataLake(event.target.checked)} />
              Show JobDataLake
            </label>
            <label className="flex w-fit items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              <input type="checkbox" checked={includeShared} onChange={(event) => setIncludeShared(event.target.checked)} />
              Include shared database
            </label>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteAllDialog(true)}
            disabled={!items.some((item) => !item.isShared)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950"
          >
            <Trash2 size={17} />
            Delete all
          </button>
        </div>
        {actionMessage && (
          <DismissibleNotice
            className="mt-4 border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            onDismiss={clearActionMessage}
          >
            {actionMessage}
          </DismissibleNotice>
        )}
        {loading && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">Loading opportunities...</div>}
        {error && (
          <DismissibleNotice
            className="mt-4 border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
            onDismiss={clearError}
          >
            {error}
          </DismissibleNotice>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="grid gap-4 md:grid-cols-2">
          {!loading && !error && visibleItems.length === 0 && (
            <div className="card md:col-span-2">
              <p className="label">No opportunities</p>
              <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Your opportunity list is empty</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Import real rows from Data Hub, save companies from the shared database, or search external sources.
              </p>
            </div>
          )}
          {visibleItems.map((item) => (
            <article key={item.id} className="card overflow-hidden">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="status-pill bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{item.type}</span>
                    <span className="status-pill bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200">
                      {sourceOf(item) === 'JobDataLake' ? <DatabaseZap size={13} /> : <CloudDownload size={13} />}
                      {sourceOf(item)}
                    </span>
                    {item.isShared && <span className="status-pill bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200">Shared</span>}
                  </div>
                  <h3 className="mt-3 break-words text-lg font-bold text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <Building2 size={15} />
                    <span className="min-w-0 break-words">{item.company.name}</span>
                  </p>
                </div>
                {primaryUrl(item) && (
                  <a
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    href={primaryUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    title={`Open ${postingUrl(item) ? 'posting' : 'company'} link`}
                  >
                    <ExternalLink size={17} />
                  </a>
                )}
              </div>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <MapPin size={16} className="text-teal-600 dark:text-teal-300" />
                  {item.isRemote ? 'Remote friendly' : cleanText(item.location, 'Location not specified')}
                </p>
                {item.description && <p className="line-clamp-2 break-words leading-6">{cleanText(item.description, '')}</p>}
                {item.applicationDeadline && <p>Deadline: {dayjs(item.applicationDeadline).format('MMM D, YYYY')}</p>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {skillList(item.requiredSkills).map((skill) => (
                    <span key={skill} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/70 dark:text-teal-200">
                      {skill}
                    </span>
                  ))}
              </div>
              <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <span className="font-bold">AI fit angle:</span> tailor your resume around{' '}
                {(skillList(item.requiredSkills).slice(0, 2).join(' and ') || 'role requirements')}.
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {primaryUrl(item) && (
                  <a href={primaryUrl(item)} target="_blank" rel="noreferrer" className="btn-secondary">
                    <ExternalLink size={17} />
                    {postingUrl(item) ? 'Open posting' : 'Open company'}
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => trackOpportunity(item)}
                  disabled={trackedIds.includes(item.id)}
                  className={trackedIds.includes(item.id) ? 'btn-secondary opacity-70' : 'btn-primary'}
                >
                  <CheckCircle2 size={17} />
                  {trackedIds.includes(item.id) ? 'Tracked' : 'Track application'}
                </button>
                <button type="button" onClick={() => verifyJobLink(item)} disabled={checkingLinks.includes(item.id)} className="btn-secondary">
                  {checkingLinks.includes(item.id) ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                  {checkingLinks.includes(item.id) ? 'Checking link...' : primaryUrl(item) ? 'Verify link' : 'AI find link'}
                </button>
                <button type="button" onClick={() => deleteOpportunity(item)} disabled={item.isShared} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-45">
                  <Trash2 size={17} />
                  Delete
                </button>
              </div>
              {linkChecks[item.id]?.alternativeUrl && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <span className="font-semibold">{linkChecks[item.id].status || 'AI suggested another link'}</span>
                  <a className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900" href={linkChecks[item.id].alternativeUrl} target="_blank" rel="noreferrer" title={linkChecks[item.id].alternativeUrl}>
                    <ExternalLink size={16} />
                    Open {urlHost(linkChecks[item.id].alternativeUrl)}
                  </a>
                </div>
              )}
              {linkChecks[item.id]?.status && !linkChecks[item.id]?.alternativeUrl && (
                <p className={`mt-3 text-sm font-semibold ${linkChecks[item.id]?.isProblem ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {linkChecks[item.id].status}
                </p>
              )}
            </article>
          ))}
        </section>

        <aside className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-teal-600 dark:text-teal-300" />
              <h3 className="font-bold text-slate-950 dark:text-white">Market signals</h3>
            </div>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Industries currently visible in your opportunity feed.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {industries.map((industry) => (
                <span key={industry} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {industry}
                </span>
              ))}
            </div>
          </div>
          <AiActionPanel
            title="AI sourcing idea"
            prompt={`Review ${visibleItems.length} visible opportunities and suggest how the user should prioritize them by fit, source quality, deadline urgency, and application readiness. Keep it concise.`}
          />
        </aside>
      </div>

      {showDeleteAllDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-200">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="label">Danger zone</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Delete all opportunities?</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteAllDialog(false)}
                disabled={deletingAll}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>
                This will delete all personal opportunities in your workspace. Shared database rows will stay untouched.
              </p>
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                If an opportunity is already linked in Applications, the linked application and interview records will also be removed from your workspace.
              </p>
              <p>
                Export a CSV first if you may want to restore these rows later through Data Hub.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={exportOpportunitiesCsv} disabled={exportingCsv || deletingAll} className="btn-secondary">
                {exportingCsv ? <LoaderCircle className="animate-spin" size={17} /> : <Download size={17} />}
                {exportingCsv ? 'Exporting...' : 'Export CSV first'}
              </button>
              <button type="button" onClick={() => setShowDeleteAllDialog(false)} disabled={deletingAll} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteAllOpportunities}
                disabled={deletingAll}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400"
              >
                {deletingAll ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
                {deletingAll ? 'Deleting...' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Opportunities
