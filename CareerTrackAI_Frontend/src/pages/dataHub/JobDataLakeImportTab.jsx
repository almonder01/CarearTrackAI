import { LoaderCircle, Search } from 'lucide-react'
import DismissibleNotice from '../../components/DismissibleNotice.jsx'
import PreviewPanel from './PreviewPanel.jsx'

function JobDataLakeImportTab({
  jdlForm,
  setJdlForm,
  searchJobDataLake,
  loadingJdl,
  jdlResult,
  setJdlResult,
  previewPanelProps,
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
      <div className="card h-fit">
        <p className="label">External source</p>
        <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">JobDataLake enriched jobs</h3>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="label">Query</span>
            <input className="input mt-2" value={jdlForm.query} onChange={(event) => setJdlForm({ ...jdlForm, query: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Semantic query</span>
            <textarea className="input mt-2 min-h-24 resize-y" value={jdlForm.semanticQuery} onChange={(event) => setJdlForm({ ...jdlForm, semanticQuery: event.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="label">Country</span>
              <input className="input mt-2" value={jdlForm.country} onChange={(event) => setJdlForm({ ...jdlForm, country: event.target.value.toUpperCase() })} placeholder="MY, SG, US" />
            </label>
            <label>
              <span className="label">Rows</span>
              <input className="input mt-2" type="number" min="1" max="50" value={jdlForm.perPage} onChange={(event) => setJdlForm({ ...jdlForm, perPage: Number(event.target.value) })} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="label">Remote type</span>
              <input className="input mt-2" value={jdlForm.remoteType} onChange={(event) => setJdlForm({ ...jdlForm, remoteType: event.target.value })} placeholder="fully_remote" />
            </label>
            <label>
              <span className="label">Employment</span>
              <input className="input mt-2" value={jdlForm.employmentType} onChange={(event) => setJdlForm({ ...jdlForm, employmentType: event.target.value })} placeholder="internship" />
            </label>
          </div>
          <button type="button" onClick={searchJobDataLake} disabled={loadingJdl} className="btn-primary w-full">
            {loadingJdl ? <LoaderCircle className="animate-spin" size={17} /> : <Search size={17} />}
            {loadingJdl ? 'Searching JobDataLake...' : 'Preview JobDataLake rows'}
          </button>
          {loadingJdl && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">JobDataLake is still returning matches for this query.</p>}
        </div>
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          <p>Configured: {jdlResult ? String(jdlResult.configured) : 'not checked'}</p>
          <p>Matched jobs: {jdlResult?.count ?? '-'}</p>
          {jdlResult?.message && (
            <DismissibleNotice
              className="mt-3 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              onDismiss={() => setJdlResult({ ...jdlResult, message: '' })}
            >
              {jdlResult.message}
            </DismissibleNotice>
          )}
        </div>
      </div>
      <PreviewPanel {...previewPanelProps} dataset="opportunities" />
    </section>
  )
}

export default JobDataLakeImportTab
