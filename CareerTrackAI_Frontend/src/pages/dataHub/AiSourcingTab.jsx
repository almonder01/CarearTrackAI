import { ExternalLink, LoaderCircle, Sparkles } from 'lucide-react'
import DismissibleNotice from '../../components/DismissibleNotice.jsx'
import { friendlyUserMessage } from '../../lib/api.js'
import PreviewPanel from './PreviewPanel.jsx'

function AiSourcingTab({
  aiForm,
  setAiForm,
  adzunaForm,
  setAdzunaForm,
  adzunaCountries,
  adzunaResult,
  setAdzunaResult,
  loadingAdzuna,
  jdlForm,
  setJdlForm,
  jdlResult,
  setJdlResult,
  loadingJdl,
  setActiveDataset,
  setPreviewRows,
  setPreviewSource,
  setImportResult,
  setOperationMessage,
  setAiSourceResult,
  searchWithAiSource,
  loadingAiSource,
  linkedInScoutUrl,
  aiSourceResult,
  previewPanelProps,
}) {
  const apiProviderSelected = aiForm.target === 'opportunities' && ['jobdatalake', 'adzuna'].includes(aiForm.provider)
  const directApiMode = apiProviderSelected && !aiForm.useAi
  const loadingSourcing = loadingAiSource || loadingAdzuna || loadingJdl
  const directResult = aiForm.provider === 'adzuna' ? adzunaResult : jdlResult
  const directProviderLabel = aiForm.provider === 'adzuna' ? 'Adzuna' : 'JobDataLake'

  function updateProvider(provider) {
    const nextIsApiProvider = aiForm.target === 'opportunities' && ['jobdatalake', 'adzuna'].includes(provider)
    setAiForm({
      ...aiForm,
      provider,
      useAi: nextIsApiProvider ? aiForm.useAi : true,
    })
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
      <div className="card h-fit">
        <p className="label">Sourcing</p>
        <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Company and opportunity discovery</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Choose a source, then decide whether AI should improve the search or the selected API should run with your exact fields.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <span className="label">Target</span>
            <div className="mt-2 flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
              {[
                ['companies', 'Companies'],
                ['opportunities', 'Opportunities'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAiForm({
                      ...aiForm,
                      target: value,
                      provider: value === 'companies' ? 'google' : 'jobdatalake',
                      useAi: true,
                      prompt: value === 'companies' ? 'Find software and AI companies in Kuala Lumpur for student outreach' : 'Find software internships in Kuala Lumpur for students',
                    })
                    setActiveDataset(value)
                    setPreviewRows([])
                    setPreviewSource('')
                    setImportResult(null)
                    setOperationMessage('')
                    setAiSourceResult(null)
                  }}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
                    aiForm.target === value ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label>
              <span className="label">Provider</span>
              <select className="input mt-2" value={aiForm.provider} onChange={(event) => updateProvider(event.target.value)}>
                {aiForm.target === 'companies' ? (
                  <>
                    <option value="google">Google Company Scout</option>
                    <option value="linkedin">LinkedIn Company Scout</option>
                  </>
                ) : (
                  <>
                    <option value="jobdatalake">JobDataLake</option>
                    <option value="adzuna">Adzuna</option>
                    <option value="google">Google Search Scout</option>
                    <option value="linkedin">LinkedIn Search Scout</option>
                  </>
                )}
              </select>
            </label>
          </div>

          {apiProviderSelected && (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <input
                type="checkbox"
                checked={aiForm.useAi}
                onChange={(event) => setAiForm({ ...aiForm, useAi: event.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900"
              />
              <span className="text-sm font-bold text-slate-950 dark:text-white">Use AI to improve this API search</span>
            </label>
          )}

          {!directApiMode && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="label">AI-assisted fields</p>
              <label className="block">
                <span className="label">Request</span>
                <textarea className="input mt-2 min-h-28 resize-y" value={aiForm.prompt} onChange={(event) => setAiForm({ ...aiForm, prompt: event.target.value })} />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label>
                  <span className="label">Country</span>
                  <input className="input mt-2" value={aiForm.country} onChange={(event) => setAiForm({ ...aiForm, country: event.target.value.toUpperCase() })} />
                </label>
                <label>
                  <span className="label">Rows</span>
                  <input className="input mt-2" type="number" min="1" max="50" value={aiForm.resultsPerPage} onChange={(event) => setAiForm({ ...aiForm, resultsPerPage: Number(event.target.value) })} />
                </label>
              </div>
            </div>
          )}

          {directApiMode && aiForm.provider === 'adzuna' && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="label">Direct Adzuna fields</p>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="label">What</span>
                    <input className="input mt-2" value={adzunaForm.what} onChange={(event) => setAdzunaForm({ ...adzunaForm, what: event.target.value })} />
                  </label>
                  <label>
                    <span className="label">Where</span>
                    <input className="input mt-2" value={adzunaForm.where} onChange={(event) => setAdzunaForm({ ...adzunaForm, where: event.target.value })} placeholder="City or leave empty" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="label">API country</span>
                    <select className="input mt-2" value={adzunaForm.country} onChange={(event) => setAdzunaForm({ ...adzunaForm, country: event.target.value })}>
                      {adzunaCountries.length === 0 && <option value={adzunaForm.country}>{adzunaForm.country.toUpperCase()}</option>}
                      {adzunaCountries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="label">Rows</span>
                    <input className="input mt-2" type="number" min="1" max="50" value={adzunaForm.resultsPerPage} onChange={(event) => setAdzunaForm({ ...adzunaForm, resultsPerPage: Number(event.target.value) })} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {directApiMode && aiForm.provider === 'jobdatalake' && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="label">Direct JobDataLake fields</p>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="label">Query</span>
                  <input className="input mt-2" value={jdlForm.query} onChange={(event) => setJdlForm({ ...jdlForm, query: event.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Semantic query</span>
                  <textarea className="input mt-2 min-h-20 resize-y" value={jdlForm.semanticQuery} onChange={(event) => setJdlForm({ ...jdlForm, semanticQuery: event.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="label">Country</span>
                    <input className="input mt-2" value={jdlForm.country} onChange={(event) => setJdlForm({ ...jdlForm, country: event.target.value.toUpperCase() })} />
                  </label>
                  <label>
                    <span className="label">Rows</span>
                    <input className="input mt-2" type="number" min="1" max="50" value={jdlForm.perPage} onChange={(event) => setJdlForm({ ...jdlForm, perPage: Number(event.target.value) })} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="label">Employment</span>
                    <select className="input mt-2" value={jdlForm.employmentType} onChange={(event) => setJdlForm({ ...jdlForm, employmentType: event.target.value })}>
                      <option value="">Any</option>
                      <option value="internship">Internship</option>
                      <option value="fulltime">Full-time</option>
                      <option value="parttime">Part-time</option>
                      <option value="contract">Contract</option>
                    </select>
                  </label>
                  <label>
                    <span className="label">Remote</span>
                    <select className="input mt-2" value={jdlForm.remoteType} onChange={(event) => setJdlForm({ ...jdlForm, remoteType: event.target.value })}>
                      <option value="">Any</option>
                      <option value="remote">Remote</option>
                      <option value="onsite">On-site</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          )}

          <button type="button" onClick={searchWithAiSource} disabled={loadingSourcing} className="btn-primary w-full">
            {loadingSourcing ? <LoaderCircle className="animate-spin" size={17} /> : <Sparkles size={17} />}
            {loadingSourcing ? (directApiMode ? `Searching ${directProviderLabel}...` : 'AI is scouting...') : directApiMode ? `Search ${directProviderLabel} directly` : `AI preview ${aiForm.target}`}
          </button>
          {loadingSourcing && (
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {directApiMode ? `The ${directProviderLabel} API is collecting reviewable rows.` : 'AI is building a sourcing plan and collecting reviewable rows.'}
            </p>
          )}
          {!directApiMode && (
            <a href={linkedInScoutUrl} target="_blank" rel="noreferrer" className="btn-secondary w-full justify-center">
              <ExternalLink size={17} />
              Open LinkedIn {aiForm.target === 'companies' ? 'company' : 'job'} scout search
            </a>
          )}
        </div>
        {!directApiMode && aiSourceResult?.plan && (
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            <p className="font-bold text-slate-950 dark:text-white">AI plan</p>
            <p className="mt-2">Provider: {aiSourceResult.plan.provider}</p>
            <p>What: {aiSourceResult.plan.what}</p>
            <p>Country: {aiSourceResult.plan.country || aiForm.country || 'Any'}</p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">{friendlyUserMessage(aiSourceResult.plan.reason)}</p>
            {aiSourceResult.search?.message && (
              <DismissibleNotice
                className="mt-3 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                onDismiss={() => setAiSourceResult({ ...aiSourceResult, search: { ...aiSourceResult.search, message: '' } })}
              >
                {friendlyUserMessage(aiSourceResult.search.message, 'AI sourcing is unavailable right now. Try again later or use another provider.')}
              </DismissibleNotice>
            )}
          </div>
        )}
        {directApiMode && directResult && (
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            <p className="font-bold text-slate-950 dark:text-white">Direct API status</p>
            <p className="mt-2">Provider: {directProviderLabel}</p>
            <p>Configured: {String(directResult.configured)}</p>
            <p>Matched jobs: {directResult.count ?? '-'}</p>
            <p>Preview rows: {previewPanelProps.rows.length}</p>
            {directResult.message && (
              <DismissibleNotice
                className="mt-3 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                onDismiss={() => {
                  if (aiForm.provider === 'adzuna') setAdzunaResult({ ...directResult, message: '' })
                  else setJdlResult({ ...directResult, message: '' })
                }}
              >
                {friendlyUserMessage(directResult.message, `${directProviderLabel} is unavailable right now. Try again later or use AI-assisted search.`)}
              </DismissibleNotice>
            )}
          </div>
        )}
      </div>
      <PreviewPanel {...previewPanelProps} />
    </section>
  )
}

export default AiSourcingTab
