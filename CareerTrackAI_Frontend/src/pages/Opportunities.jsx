import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, CloudDownload, DatabaseZap, Download, ExternalLink, LoaderCircle, MapPin, ShieldCheck, SlidersHorizontal, Trash2, X } from 'lucide-react'
import dayjs from 'dayjs'
import { careerApi } from '../lib/api.js'
import AiActionPanel from '../components/AiActionPanel.jsx'

function Opportunities() {
  const [items, setItems] = useState([])
  const [filters, setFilters] = useState({ type: '', employmentType: '' })
  const [showAdzuna, setShowAdzuna] = useState(() => localStorage.getItem('careertrack_show_adzuna_opportunities') !== 'false')
  const [showJobDataLake, setShowJobDataLake] = useState(() => localStorage.getItem('careertrack_show_jobdatalake_opportunities') !== 'false')
  const [includeShared, setIncludeShared] = useState(false)
  const [trackedIds, setTrackedIds] = useState([])
  const [linkChecks, setLinkChecks] = useState({})
  const [checkingLinks, setCheckingLinks] = useState([])
  const [actionMessage, setActionMessage] = useState('')
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  const refreshData = useCallback(async () => {
    const [opportunities, applications] = await Promise.all([
      careerApi.opportunities({ ...filters, includeShared }),
      careerApi.applications().catch(() => []),
    ])
    setItems(opportunities)
    setTrackedIds(applications.map((item) => item.jobOpportunity.id))
  }, [filters, includeShared])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  function sourceText(item) {
    return [
      item.sourceProvider,
      item.company?.sourceProvider,
      item.sourceUrl,
      item.jobUrl,
      item.description,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  }

  function sourceOf(item) {
    const source = sourceText(item)
    if (source.includes('adzuna')) return 'Adzuna'
    if (source.includes('jobdatalake') || source.includes('job data lake')) return 'JobDataLake'
    if (source.includes('linkedin')) return 'LinkedIn Scout'
    if (source.includes('google')) return 'Google Search'
    return item.isImported ? 'Imported' : 'Manual'
  }

  function cleanText(value, fallback = '-') {
    const text = String(value || '').replace(/\btrue\b|\bfalse\b/gi, '').replace(/\s*,\s*,+/g, ', ').trim()
    return text || fallback
  }

  function normalizeUrl(value) {
    const text = String(value || '').trim()
    if (!text || ['false', 'true', 'null', 'undefined', 'no_link', 'n/a', '-'].includes(text.toLowerCase())) return ''
    const match = text.match(/https?:\/\/[^\s),\]}>"']+/i) || text.match(/\b(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s),\]}>"']*)?/i)
    if (!match) return ''
    const url = match[0].replace(/[.,;:]+$/, '')
    return /^https?:\/\//i.test(url) ? url : `https://${url}`
  }

  function primaryUrl(item) {
    return (
      normalizeUrl(item.jobUrl) ||
      normalizeUrl(item.sourceUrl) ||
      normalizeUrl(item.company?.website) ||
      normalizeUrl(item.description) ||
      ''
    )
  }

  function postingUrl(item) {
    return normalizeUrl(item.jobUrl) || normalizeUrl(item.sourceUrl) || ''
  }

  function urlHost(value) {
    try {
      return new URL(value).hostname.replace(/^www\./, '')
    } catch {
      return 'link'
    }
  }

  function sameUrl(first, second) {
    const normalize = (value) => {
      try {
        const url = new URL(normalizeUrl(value))
        return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`.toLowerCase()
      } catch {
        return ''
      }
    }
    return normalize(first) && normalize(first) === normalize(second)
  }

  function skillList(value) {
    return String(value || '')
      .split(/[,|]/)
      .map((skill) => skill.trim())
      .filter((skill) => skill && !['true', 'false', 'null'].includes(skill.toLowerCase()))
      .slice(0, 8)
  }

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        const source = sourceOf(item)
        if (!showAdzuna && source === 'Adzuna') return false
        if (!showJobDataLake && source === 'JobDataLake') return false
        return true
      }),
    [items, showAdzuna, showJobDataLake],
  )
  const industries = useMemo(() => [...new Set(visibleItems.map((item) => item.company.industry).filter(Boolean))], [visibleItems])

  function updateShowAdzuna(value) {
    setShowAdzuna(value)
    localStorage.setItem('careertrack_show_adzuna_opportunities', String(value))
  }

  function updateShowJobDataLake(value) {
    setShowJobDataLake(value)
    localStorage.setItem('careertrack_show_jobdatalake_opportunities', String(value))
  }

  async function trackOpportunity(item) {
    try {
      await careerApi.createApplication({ jobOpportunityId: item.id, notes: `Tracked from Opportunities: ${sourceOf(item)}` })
      setTrackedIds((ids) => [...new Set([...ids, item.id])])
      setActionMessage(`Tracked "${item.title}" in Applications.`)
    } catch (error) {
      if (String(error.message || '').includes('already')) {
        setTrackedIds((ids) => [...new Set([...ids, item.id])])
        setActionMessage(`"${item.title}" is already tracked in Applications.`)
      } else {
        setActionMessage(`Could not track "${item.title}".`)
      }
    }
  }

  async function deleteOpportunity(item) {
    if (!window.confirm(`Delete "${item.title}" from opportunities?`)) return
    await careerApi.deleteOpportunity(item.id)
    setItems((current) => current.filter((entry) => entry.id !== item.id))
    setTrackedIds((ids) => ids.filter((id) => id !== item.id))
    setActionMessage(`Deleted "${item.title}" from Opportunities.`)
  }

  async function exportOpportunitiesCsv() {
    setExportingCsv(true)
    try {
      const blob = await careerApi.exportOpportunitiesCsv()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `careertrack-opportunities-${dayjs().format('YYYY-MM-DD-HHmm')}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
      setActionMessage('Opportunities CSV exported. You can re-import it from Data Hub later.')
    } catch (error) {
      setActionMessage(error.message || 'Could not export Opportunities CSV right now.')
    } finally {
      setExportingCsv(false)
    }
  }

  async function deleteAllOpportunities() {
    setDeletingAll(true)
    try {
      const result = await careerApi.deleteAllOpportunities()
      await refreshData()
      setLinkChecks({})
      setShowDeleteAllDialog(false)
      setActionMessage(
        `Deleted ${result.opportunitiesDeleted || 0} opportunities, ${result.applicationsDeleted || 0} linked applications, and ${result.interviewsDeleted || 0} linked interviews.`,
      )
    } catch (error) {
      setActionMessage(error.message || 'Could not delete all opportunities right now.')
    } finally {
      setDeletingAll(false)
    }
  }

  async function verifyJobLink(item) {
    const url = primaryUrl(item)
    const hasExistingUrl = Boolean(url)
    setCheckingLinks((ids) => [...new Set([...ids, item.id])])
    try {
      const status = await careerApi.aiStatus().catch(() => null)
      if (status && !status.configured) {
        setLinkChecks((checks) => ({
          ...checks,
          [item.id]: { status: 'AI link checking is unavailable because Gemini is not configured.' },
        }))
        setActionMessage('AI link checking is unavailable because Gemini is not configured.')
        return
      }

      const response = await careerApi.aiChat({
        message:
          (hasExistingUrl
            ? `Check this job posting URL for usefulness. Return exactly OK if it looks like a usable job/company application link. If it looks missing, expired, or too generic, return only one better URL if you can infer one. If you cannot verify it, return exactly UNAVAILABLE. No explanation.`
            : `Find the most likely official application or careers URL for this role. Return only one URL if you can infer a reliable one. If you cannot, return exactly NO_LINK.`) +
          `\n\n` +
          `Role: ${item.title}\nCompany: ${item.company?.name}\nURL: ${url}`,
        history: [],
      })
      const text = response.reply?.trim() || ''
      const urlMatch = text.match(/https?:\/\/[^\s)]+/i)
      const normalizedSuggestion = normalizeUrl(urlMatch?.[0])
      const exact = text.replace(/[.!]/g, '').trim().toUpperCase()

      let result
      if (normalizedSuggestion) {
        result =
          hasExistingUrl && sameUrl(normalizedSuggestion, url)
            ? { status: 'Link looks usable' }
            : { status: hasExistingUrl ? 'Alternative found' : 'Link found', alternativeUrl: normalizedSuggestion }
      } else if (exact === 'OK') {
        result = { status: 'Link looks usable' }
      } else if (exact === 'NO_LINK') {
        result = { status: 'AI could not find a reliable link' }
      } else {
        result = { status: 'AI link checking is unavailable or could not verify this link right now.' }
      }

      setLinkChecks((checks) => ({
        ...checks,
        [item.id]: result,
      }))
      setActionMessage(result.status)
    } catch (error) {
      setLinkChecks((checks) => ({
        ...checks,
        [item.id]: { status: error.message || 'AI link checking is unavailable right now. You can still open the posting manually.' },
      }))
      setActionMessage(error.message || `Could not check "${item.title}" with AI right now.`)
    } finally {
      setCheckingLinks((ids) => ids.filter((id) => id !== item.id))
    }
  }

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
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            {actionMessage}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="grid gap-4 md:grid-cols-2">
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
                  {checkingLinks.includes(item.id) ? 'Checking link...' : primaryUrl(item) ? 'AI verify link' : 'AI find link'}
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
                <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{linkChecks[item.id].status}</p>
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
