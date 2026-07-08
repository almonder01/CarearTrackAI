import { LoaderCircle, Search } from 'lucide-react'
import DismissibleNotice from '../../components/DismissibleNotice.jsx'
import PreviewPanel from './PreviewPanel.jsx'

function AdzunaImportTab({
  adzunaForm,
  setAdzunaForm,
  adzunaCountries,
  searchAdzuna,
  loadingAdzuna,
  adzunaResult,
  setAdzunaResult,
  previewPanelProps,
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
      <div className="card h-fit">
        <p className="label">External source</p>
        <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Adzuna jobs import</h3>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="label">Supported country</span>
            <select className="input mt-2" value={adzunaForm.country} onChange={(event) => setAdzunaForm({ ...adzunaForm, country: event.target.value })}>
              {adzunaCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">What</span>
            <input className="input mt-2" value={adzunaForm.what} onChange={(event) => setAdzunaForm({ ...adzunaForm, what: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Where</span>
            <input className="input mt-2" value={adzunaForm.where} onChange={(event) => setAdzunaForm({ ...adzunaForm, where: event.target.value })} placeholder="City or leave empty" />
          </label>
          <label className="block">
            <span className="label">Rows</span>
            <input className="input mt-2" type="number" min="1" max="50" value={adzunaForm.resultsPerPage} onChange={(event) => setAdzunaForm({ ...adzunaForm, resultsPerPage: Number(event.target.value) })} />
          </label>
          <button type="button" onClick={searchAdzuna} disabled={loadingAdzuna} className="btn-primary w-full">
            {loadingAdzuna ? <LoaderCircle className="animate-spin" size={17} /> : <Search size={17} />}
            {loadingAdzuna ? 'Searching Adzuna...' : 'Preview Adzuna rows'}
          </button>
          {loadingAdzuna && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Still fetching external results. Please keep this tab open.</p>}
        </div>
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          <p>Configured: {adzunaResult ? String(adzunaResult.configured) : 'not checked'}</p>
          <p>Country: {adzunaResult?.country?.toUpperCase() || adzunaForm.country.toUpperCase()}</p>
          <p>Matched jobs: {adzunaResult?.count ?? '-'}</p>
          {adzunaResult?.message && (
            <DismissibleNotice
              className="mt-3 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              onDismiss={() => setAdzunaResult({ ...adzunaResult, message: '' })}
            >
              {adzunaResult.message}
            </DismissibleNotice>
          )}
        </div>
      </div>
      <PreviewPanel {...previewPanelProps} dataset="opportunities" />
    </section>
  )
}

export default AdzunaImportTab
