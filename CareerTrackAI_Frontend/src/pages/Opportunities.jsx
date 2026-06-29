import { useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle2, CloudDownload, DatabaseZap, ExternalLink, LoaderCircle, MapPin, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react'
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

  useEffect(() => {
    careerApi.opportunities({ ...filters, includeShared }).then(setItems)
    careerApi.applications().then((applications) => setTrackedIds(applications.map((item) => item.jobOpportunity.id))).catch(() => null)
  }, [filters, includeShared])

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

  function primaryUrl(item) {
    return item.jobUrl || item.sourceUrl || item.company?.website || ''
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
    setActionMessage(`Deleted "${item.title}" from Opportunities.`)
  }

  async function verifyJobLink(item) {
    const url = primaryUrl(item)
    setCheckingLinks((ids) => [...new Set([...ids, item.id])])
    try {
      const response = await careerApi.aiChat({
        message:
          (url
            ? `Check this job posting URL for usefulness. Return exactly OK if it looks like a usable job/company application link. If it looks missing, expired, or too generic, return only one better URL if you can infer one. No explanation.`
            : `Find the most likely official application or careers URL for this role. Return only one URL if you can infer a reliable one. If you cannot, return exactly NO_LINK.`) +
          `\n\n` +
          `Role: ${item.title}\nCompany: ${item.company?.name}\nURL: ${url}`,
        history: [],
      })
      const text = response.reply?.trim() || ''
      const urlMatch = text.match(/https?:\/\/[^\s)]+/i)
      setLinkChecks((checks) => ({
        ...checks,
        [item.id]: urlMatch
          ? { status: url ? 'Alternative found' : 'Link found', alternativeUrl: urlMatch[0] }
          : { status: url ? 'Link looks usable' : 'AI could not find a reliable link' },
      }))
      setActionMessage(`AI finished checking "${item.title}".`)
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
        <div className="mt-5 flex flex-wrap gap-3">
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
        {actionMessage && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            {actionMessage}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="grid gap-4 md:grid-cols-2">
          {visibleItems.map((item) => (
            <article key={item.id} className="card">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="status-pill bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{item.type}</span>
                    <span className="status-pill bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200">
                      {sourceOf(item) === 'JobDataLake' ? <DatabaseZap size={13} /> : <CloudDownload size={13} />}
                      {sourceOf(item)}
                    </span>
                    {item.isShared && <span className="status-pill bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200">Shared</span>}
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <Building2 size={15} />
                    {item.company.name}
                  </p>
                </div>
                {primaryUrl(item) && (
                  <a
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    href={primaryUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    title="Open posting or company link"
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
                {item.description && <p className="line-clamp-2 leading-6">{cleanText(item.description, '')}</p>}
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
                    {item.jobUrl || item.sourceUrl ? 'Open posting' : 'Open company'}
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
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  AI alternative link:{' '}
                  <a className="font-bold underline" href={linkChecks[item.id].alternativeUrl} target="_blank" rel="noreferrer">
                    {linkChecks[item.id].alternativeUrl}
                  </a>
                </p>
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
    </div>
  )
}

export default Opportunities
