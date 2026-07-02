import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bot,
  Building2,
  CloudDownload,
  Database,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  FileUp,
  Globe2,
  LoaderCircle,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import { careerApi, friendlyUserMessage } from '../lib/api.js'
import { readScopedJson, writeScopedJson } from '../lib/userStorage.js'

const companyHeaders = ['name', 'industry', 'description', 'city', 'country', 'website', 'email', 'phone', 'linkedInUrl', 'logoUrl', 'sourceUrl', 'sourceProvider']
const visibleCompanyFields = companyHeaders
const opportunityHeaders = [
  'title',
  'companyName',
  'type',
  'employmentType',
  'description',
  'location',
  'isRemote',
  'salaryMin',
  'salaryMax',
  'applicationDeadline',
  'requiredSkills',
  'jobUrl',
  'sourceUrl',
  'sourceProvider',
]

const tabs = [
  ['companies', 'Database', Building2],
  ['resumes', 'CVs', FileText],
  ['manual', 'Manual CSV', FileUp],
  ['adzuna', 'Adzuna', CloudDownload],
  ['jobdatalake', 'JobDataLake', Globe2],
  ['ai', 'AI Sourcing', Bot],
]

const visibleOpportunityFields = ['title', 'companyName', 'type', 'employmentType', 'location', 'jobUrl', 'sourceProvider']

const DATA_HUB_PREVIEW_STORAGE_KEY = 'careertrack_data_hub_preview_v2'

function readStoredDataHubPreview() {
  return readScopedJson(DATA_HUB_PREVIEW_STORAGE_KEY, {})
}

function escapeCsv(value = '') {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

function toCsv(rows, headers = companyHeaders) {
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','))].join('\n')
}

function downloadCsv(filename, rows, headers = companyHeaders) {
  const blob = new Blob([toCsv(rows, headers)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function parseCsvLine(line) {
  const values = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"' && line[index + 1] === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map((item) => item.trim())
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce((row, header, index) => ({ ...row, [header]: values[index] || '' }), {})
  })
}

function guessIndustry(name = '', website = '') {
  const source = `${name} ${website}`.toLowerCase()
  if (source.includes('bank') || source.includes('pay') || source.includes('stripe')) return 'Fintech'
  if (source.includes('health') || source.includes('medical')) return 'Healthcare'
  if (source.includes('ai') || source.includes('data')) return 'Artificial Intelligence'
  if (source.includes('telecom')) return 'Telecommunications'
  if (source.includes('energy')) return 'Energy Technology'
  return 'Technology'
}

function opportunityToRow(item) {
  return {
    title: item.title,
    companyName: item.company?.name || 'Unknown company',
    type: item.type || 'Job',
    employmentType: item.employmentType || 'FullTime',
    description: item.description || '',
    location: item.location || item.company?.city || '',
    isRemote: String(Boolean(item.isRemote)),
    salaryMin: item.salaryMin || '',
    salaryMax: item.salaryMax || '',
    applicationDeadline: item.applicationDeadline || '',
    requiredSkills: item.requiredSkills || '',
    jobUrl: item.jobUrl || '',
    sourceUrl: item.sourceUrl || item.jobUrl || '',
    sourceProvider: item.sourceProvider || item.company?.sourceProvider || '',
  }
}

function companyToRow(item) {
  return {
    name: item.name || '',
    industry: item.industry || '',
    description: item.description || '',
    city: item.city || '',
    country: item.country || '',
    website: item.website || '',
    email: item.email || '',
    phone: item.phone || '',
    linkedInUrl: item.linkedInUrl || '',
    logoUrl: item.logoUrl || '',
    sourceUrl: item.sourceUrl || '',
    sourceProvider: item.sourceProvider || '',
  }
}

function normalizeKey(value = '') {
  return value.trim().replace(/\s+/g, '').toLowerCase()
}

function normalizeSearchText(value = '') {
  return String(value || '').toLowerCase().trim()
}

function matchesText(value, term) {
  return normalizeSearchText(value).includes(term)
}

function uniqueValues(items, selector) {
  return [...new Set(items.map(selector).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
}

function getRowValue(row, ...keys) {
  const entries = Object.entries(row || {}).reduce((acc, [key, value]) => {
    acc[normalizeKey(key)] = value
    return acc
  }, {})

  for (const key of keys) {
    const value = entries[normalizeKey(key)]
    if (value !== undefined && String(value).trim() !== '') return value
  }
  return ''
}

function normalizeRowForDataset(row, dataset) {
  if (dataset === 'companies') {
    return {
      name: getRowValue(row, 'name', 'companyName', 'company'),
      industry: getRowValue(row, 'industry', 'sector'),
      description: getRowValue(row, 'description', 'notes'),
      city: getRowValue(row, 'city', 'location'),
      country: getRowValue(row, 'country'),
      website: getRowValue(row, 'website', 'url'),
      email: getRowValue(row, 'email'),
      phone: getRowValue(row, 'phone'),
      linkedInUrl: getRowValue(row, 'linkedInUrl', 'linkedinurl', 'linkedin'),
      logoUrl: getRowValue(row, 'logoUrl', 'logourl'),
      sourceUrl: getRowValue(row, 'sourceUrl', 'sourceurl'),
      sourceProvider: getRowValue(row, 'sourceProvider', 'source'),
    }
  }

  return {
    title: getRowValue(row, 'title', 'role', 'position'),
    companyName: getRowValue(row, 'companyName', 'company', 'name'),
    type: getRowValue(row, 'type'),
    employmentType: getRowValue(row, 'employmentType', 'employment'),
    description: getRowValue(row, 'description', 'notes'),
    location: getRowValue(row, 'location', 'city'),
    isRemote: getRowValue(row, 'isRemote', 'remote'),
    salaryMin: getRowValue(row, 'salaryMin', 'minimumSalary', 'minSalary'),
    salaryMax: getRowValue(row, 'salaryMax', 'maximumSalary', 'maxSalary'),
    applicationDeadline: getRowValue(row, 'applicationDeadline', 'deadline'),
    requiredSkills: getRowValue(row, 'requiredSkills', 'skills'),
    jobUrl: getRowValue(row, 'jobUrl', 'url', 'applyUrl', 'applicationUrl'),
    sourceUrl: getRowValue(row, 'sourceUrl', 'sourceurl'),
    sourceProvider: getRowValue(row, 'sourceProvider', 'source'),
  }
}

function buildFallbackFilledRow(row, dataset) {
  const normalized = normalizeRowForDataset(row, dataset)
  if (dataset === 'companies') {
    return {
      ...normalized,
      industry: normalized.industry || guessIndustry(normalized.name, normalized.website),
      description: normalized.description || `Lead for ${normalized.name || 'this company'}. Verify details before importing.`,
      sourceProvider: normalized.sourceProvider || 'Manual CSV',
    }
  }

  return {
    ...normalized,
    type: normalized.type || 'Internship',
    employmentType: normalized.employmentType || 'FullTime',
    isRemote: normalized.isRemote || 'false',
    requiredSkills: normalized.requiredSkills || 'Communication, Problem Solving',
    description: normalized.description || `Opportunity draft for ${normalized.title || 'this role'}. Verify details before importing.`,
    sourceProvider: normalized.sourceProvider || 'Manual CSV',
  }
}

function parseAiFilledRows(reply = '') {
  const cleaned = reply.replace(/```json/gi, '').replace(/```/g, '').trim()
  const candidates = [cleaned]
  const arrayStart = cleaned.indexOf('[')
  const arrayEnd = cleaned.lastIndexOf(']')
  if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(cleaned.slice(arrayStart, arrayEnd + 1))
  const objectStart = cleaned.indexOf('{')
  const objectEnd = cleaned.lastIndexOf('}')
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(cleaned.slice(objectStart, objectEnd + 1))

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (Array.isArray(parsed)) return parsed
      if (Array.isArray(parsed.rows)) return parsed.rows
    } catch {
      // Try the next JSON candidate.
    }
  }

  return []
}

function mergeMissingFields(row, suggestion, dataset) {
  const headers = dataset === 'companies' ? companyHeaders : opportunityHeaders
  const current = normalizeRowForDataset(row, dataset)
  const fallback = buildFallbackFilledRow(row, dataset)
  const suggested = normalizeRowForDataset(suggestion || {}, dataset)

  return headers.reduce((next, header) => {
    next[header] = current[header] || suggested[header] || fallback[header] || ''
    return next
  }, {})
}

function DismissibleNotice({ children, className = '', onDismiss, title = 'Dismiss message' }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 rounded-md p-1 transition hover:bg-black/5 dark:hover:bg-white/10" title={title}>
          <X size={16} />
        </button>
      )}
    </div>
  )
}

function PreviewPanel({
  rows,
  dataset,
  source,
  importResult,
  operationMessage,
  importing,
  onRowChange,
  onRemove,
  onClear,
  onImport,
  onDownload,
  onDismissOperationMessage,
  onDismissImportResult,
}) {
  const headers = dataset === 'companies' ? companyHeaders : opportunityHeaders
  const summarizedErrors = useMemo(() => {
    const counts = new Map()
    ;(importResult?.errors || []).forEach((error) => counts.set(error, (counts.get(error) || 0) + 1))
    return [...counts.entries()].map(([error, count]) => (count > 1 ? `${error} (${count} rows)` : error))
  }, [importResult])

  return (
    <div className="card overflow-hidden">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="label">Review workspace</p>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
            {rows.length} {dataset} rows
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {source || 'Nothing loaded yet'} {rows.length > 0 ? `| Import selected sends these rows to ${dataset === 'companies' ? 'Companies' : 'Opportunities'}.` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onClear} disabled={rows.length === 0 && !source} className="btn-secondary">
            <Trash2 size={17} />
            Clear
          </button>
          <button type="button" onClick={onDownload} disabled={rows.length === 0} className="btn-secondary">
            <Download size={17} />
            Download CSV
          </button>
          <button type="button" onClick={onImport} disabled={rows.length === 0 || importing} className="btn-primary">
            {importing ? <LoaderCircle className="animate-spin" size={17} /> : <FileUp size={17} />}
            {importing ? 'Importing...' : 'Import selected'}
          </button>
        </div>
      </div>

      {operationMessage && (
        <DismissibleNotice
          className="mb-4 border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          onDismiss={onDismissOperationMessage}
        >
          {operationMessage}
        </DismissibleNotice>
      )}

      {importResult && (
        <DismissibleNotice
          className={`mb-4 text-sm ${
            importResult.created > 0 || importResult.updated > 0
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
          }`}
          onDismiss={onDismissImportResult}
        >
          Created {importResult.created}, updated {importResult.updated}, skipped {importResult.skipped}.
          {summarizedErrors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {summarizedErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </DismissibleNotice>
      )}

      <div className="max-h-[min(62vh,560px)] w-full overflow-auto overscroll-contain rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">Actions</th>
              {headers.map((header) => (
                <th key={header} className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.title || row.name || 'row'}-${index}`} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
                    title="Remove row"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
                {headers.map((header) => (
                  <td key={header} className="min-w-44 px-3 py-3">
                    <input
                      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-slate-700 outline-none transition focus:border-teal-300 focus:bg-white dark:text-slate-300 dark:focus:border-teal-700 dark:focus:bg-slate-900"
                      value={row[header] || ''}
                      onChange={(event) => onRowChange(index, header, event.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex min-h-44 items-center justify-center text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            Search, upload, or ask AI to create preview rows.
          </div>
        )}
      </div>
    </div>
  )
}

function DataHub() {
  const storedPreview = useMemo(readStoredDataHubPreview, [])
  const initialAiTarget = storedPreview.activeDataset === 'companies' ? 'companies' : 'opportunities'
  const [activeTab, setActiveTab] = useState('companies')
  const [companies, setCompanies] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [databaseView, setDatabaseView] = useState('companies')
  const [includeSharedCompanies, setIncludeSharedCompanies] = useState(false)
  const [includeSharedOpportunities, setIncludeSharedOpportunities] = useState(false)
  const [databaseFilters, setDatabaseFilters] = useState({ search: '', scope: '', country: '', type: '', source: '' })
  const [companyDrafts, setCompanyDrafts] = useState({})
  const [resumes, setResumes] = useState([])
  const [activeDataset, setActiveDataset] = useState(storedPreview.activeDataset || 'companies')
  const [previewRows, setPreviewRows] = useState(storedPreview.previewRows || [])
  const [previewSource, setPreviewSource] = useState(storedPreview.previewSource || '')
  const [importResult, setImportResult] = useState(storedPreview.importResult || null)
  const [operationMessage, setOperationMessage] = useState(storedPreview.operationMessage || '')
  const [importingPreview, setImportingPreview] = useState(false)
  const [savingSharedIds, setSavingSharedIds] = useState([])
  const [loadError, setLoadError] = useState('')
  const [aiNote, setAiNote] = useState(storedPreview.aiNote || '')
  const [loadingAi, setLoadingAi] = useState(false)
  const [adzunaCountries, setAdzunaCountries] = useState([])
  const [adzunaForm, setAdzunaForm] = useState({ what: 'software intern', where: '', country: 'sg', resultsPerPage: 20 })
  const [adzunaResult, setAdzunaResult] = useState(storedPreview.adzunaResult || null)
  const [loadingAdzuna, setLoadingAdzuna] = useState(false)
  const [jdlForm, setJdlForm] = useState({
    query: 'software intern',
    semanticQuery: 'student internship for software engineering fresh graduates',
    country: 'MY',
    remoteType: '',
    employmentType: 'internship',
    perPage: 20,
  })
  const [jdlResult, setJdlResult] = useState(storedPreview.jdlResult || null)
  const [loadingJdl, setLoadingJdl] = useState(false)
  const [aiForm, setAiForm] = useState({
    target: initialAiTarget,
    prompt: initialAiTarget === 'companies' ? 'Find software and AI companies in Kuala Lumpur for student outreach' : 'Find software internships in Kuala Lumpur for students',
    provider: initialAiTarget === 'companies' ? 'google' : 'jobdatalake',
    country: 'MY',
    resultsPerPage: 20,
  })
  const [aiSourceResult, setAiSourceResult] = useState(storedPreview.aiSourceResult || null)
  const [loadingAiSource, setLoadingAiSource] = useState(false)
  const importLockRef = useRef(false)
  const companyCountryOptions = useMemo(() => uniqueValues(companies, (company) => company.country), [companies])
  const companySourceOptions = useMemo(() => uniqueValues(companies, (company) => company.sourceProvider || 'Manual'), [companies])
  const opportunityTypeOptions = useMemo(() => uniqueValues(opportunities, (opportunity) => opportunity.type), [opportunities])
  const opportunitySourceOptions = useMemo(() => uniqueValues(opportunities, (opportunity) => opportunity.sourceProvider || 'Manual'), [opportunities])
  const filteredCompanies = useMemo(() => {
    const term = normalizeSearchText(databaseFilters.search)
    return companies.filter((company) => {
      const row = companyToRow(company)
      const matchesTerm = !term || Object.values(row).some((value) => matchesText(value, term))
      const matchesScope = !databaseFilters.scope || (databaseFilters.scope === 'shared' ? company.isShared : !company.isShared)
      const matchesCountry = !databaseFilters.country || company.country === databaseFilters.country
      const source = company.sourceProvider || 'Manual'
      const matchesSource = !databaseFilters.source || source === databaseFilters.source
      return matchesTerm && matchesScope && matchesCountry && matchesSource
    })
  }, [companies, databaseFilters])
  const filteredOpportunities = useMemo(() => {
    const term = normalizeSearchText(databaseFilters.search)
    return opportunities.filter((opportunity) => {
      const row = opportunityToRow(opportunity)
      const matchesTerm =
        !term ||
        Object.values(row).some((value) => matchesText(value, term)) ||
        matchesText(opportunity.company?.industry, term)
      const matchesScope = !databaseFilters.scope || (databaseFilters.scope === 'shared' ? opportunity.isShared : !opportunity.isShared)
      const matchesType = !databaseFilters.type || opportunity.type === databaseFilters.type
      const source = opportunity.sourceProvider || 'Manual'
      const matchesSource = !databaseFilters.source || source === databaseFilters.source
      return matchesTerm && matchesScope && matchesType && matchesSource
    })
  }, [databaseFilters, opportunities])

  useEffect(() => {
    let mounted = true
    setLoadError('')
    Promise.all([
      careerApi.companies({ includeShared: includeSharedCompanies }).catch((error) => {
        if (mounted) setLoadError(error.message || 'Could not load companies.')
        return []
      }),
      careerApi.resumes().catch(() => []),
      careerApi.adzunaCountries().catch(() => []),
      careerApi.opportunities({ includeShared: includeSharedOpportunities }).catch(() => []),
    ]).then(([companyRows, resumeRows, countryRows, opportunityRows]) => {
      if (!mounted) return
      setCompanies(companyRows)
      setResumes(resumeRows)
      setAdzunaCountries(countryRows)
      setOpportunities(opportunityRows)
    })

    return () => {
      mounted = false
    }
  }, [includeSharedCompanies, includeSharedOpportunities])

  useEffect(() => {
    writeScopedJson(
      DATA_HUB_PREVIEW_STORAGE_KEY,
      {
        activeDataset,
        previewRows,
        previewSource,
        importResult,
        operationMessage,
        aiNote,
        adzunaResult,
        jdlResult,
        aiSourceResult,
      },
    )
  }, [activeDataset, previewRows, previewSource, importResult, operationMessage, aiNote, adzunaResult, jdlResult, aiSourceResult])

  const aiResumeVersions = useMemo(() => resumes.flatMap((resume) => resume.versions || []).filter((version) => version.isAiGenerated), [resumes])

  const linkedInScoutUrl = useMemo(() => {
    const query = aiForm.target === 'companies'
      ? `${aiForm.prompt} companies LinkedIn`
      : `${aiForm.prompt} careers jobs LinkedIn`
    return `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`
  }, [aiForm.prompt, aiForm.target])

  function setProviderPreview(source, rows, dataset = 'opportunities') {
    setActiveDataset(dataset)
    setPreviewSource(source)
    setPreviewRows(rows)
    setImportResult(null)
    setOperationMessage('')
    setAiNote('')
  }

  function updatePreviewRow(index, field, value) {
    setPreviewRows((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)))
  }

  function removePreviewRow(index) {
    setPreviewRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))
  }

  function clearPreview() {
    setPreviewRows([])
    setPreviewSource('')
    setImportResult(null)
    setOperationMessage('')
    setAiNote('')
  }

  function updateCompanyDraft(companyId, field, value) {
    setCompanyDrafts((drafts) => ({
      ...drafts,
      [companyId]: {
        ...drafts[companyId],
        [field]: value,
      },
    }))
  }

  function companyValue(company, field) {
    return companyDrafts[company.id]?.[field] ?? company[field] ?? ''
  }

  async function saveCompany(company) {
    if (company.isShared) {
      await saveSharedCompany(company)
      return
    }
    const payload = companyHeaders.reduce((acc, field) => {
      if (field === 'notes') acc.description = companyValue(company, field)
      else acc[field] = companyValue(company, field)
      return acc
    }, {})
    const updated = await careerApi.updateCompany(company.id, payload)
    setCompanies((items) => items.map((item) => (item.id === company.id ? updated : item)))
    setCompanyDrafts((drafts) => {
      const next = { ...drafts }
      delete next[company.id]
      return next
    })
    setOperationMessage(`Saved ${updated.name} to your company database.`)
  }

  async function saveSharedCompany(company) {
    setSavingSharedIds((ids) => [...new Set([...ids, company.id])])
    try {
      const result = await careerApi.saveSharedCompany(company.id)
      setCompanies((items) =>
        items.map((item) =>
          item.id === company.id
            ? {
                ...item,
                ...(result.company || {}),
                isShared: false,
              }
            : item,
        ),
      )
      setOperationMessage(
        `Saved only ${result.company?.name || company.name} to your workspace. ${result.opportunitiesCreated || 0} linked opportunities copied to Opportunities.`,
      )
    } finally {
      setSavingSharedIds((ids) => ids.filter((id) => id !== company.id))
    }
  }

  async function saveSharedOpportunity(opportunity) {
    setSavingSharedIds((ids) => [...new Set([...ids, opportunity.id])])
    try {
      const result = await careerApi.saveSharedOpportunity(opportunity.id)
      await Promise.all([
        careerApi.opportunities({ includeShared: includeSharedOpportunities }).then(setOpportunities),
        careerApi.companies({ includeShared: includeSharedCompanies }).then(setCompanies),
      ])
      setOperationMessage(
        `Saved ${result.opportunity?.title || opportunity.title} to your Opportunities page. ${
          result.companyCreated ? 'The linked company was also added to your company database.' : 'The linked company already existed in your workspace.'
        }`,
      )
    } finally {
      setSavingSharedIds((ids) => ids.filter((id) => id !== opportunity.id))
    }
  }

  async function deleteCompany(companyId) {
    if (!window.confirm('Delete this company from CareerTrackAI?')) return
    await careerApi.deleteCompany(companyId)
    setCompanies((items) => items.filter((company) => company.id !== companyId))
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setPreviewRows(parseCsv(text).map((row) => normalizeRowForDataset(row, activeDataset)))
    setPreviewSource(`${file.name} upload`)
    setImportResult(null)
    setOperationMessage('')
    setAiNote('')
  }

  async function completeRowsWithAi(rowsToComplete, dataset) {
    if (rowsToComplete.length === 0) return
    setLoadingAi(true)
    try {
      const response = await careerApi.aiChat({
        message:
          `Strictly complete missing ${dataset} CSV fields. Return only valid JSON in this shape: {"rows":[...]} with exactly ${Math.min(rowsToComplete.length, 8)} rows and these fields: ` +
          `${(dataset === 'companies' ? companyHeaders : opportunityHeaders).join(', ')}. ` +
          'Keep existing values unchanged. For unknown factual fields such as emails, salaries, deadlines, or job URLs, leave the field empty instead of inventing data. Rows: ' +
          JSON.stringify(rowsToComplete.slice(0, 8).map((row) => normalizeRowForDataset(row, dataset))),
        history: [],
      })
      const aiRows = parseAiFilledRows(response.reply)
      setAiNote(
        aiRows.length
          ? `AI completed missing ${dataset} fields. Review the preview before importing.`
          : response.reply || 'AI responded, but no structured rows were returned. Safe local defaults were applied.',
      )
      setPreviewRows(rowsToComplete.map((row, index) => mergeMissingFields(row, aiRows[index], dataset)))
    } catch (error) {
      setPreviewRows(rowsToComplete.map((row) => buildFallbackFilledRow(row, dataset)))
      setAiNote(error.message || 'AI field filling is unavailable right now. Safe local defaults were applied where possible.')
    } finally {
      setLoadingAi(false)
    }
  }

  async function aiFillRows() {
    await completeRowsWithAi(previewRows, activeDataset)
  }

  async function completeDatabaseRowsWithAi() {
    const dataset = databaseView
    const rows = dataset === 'companies' ? companies.map(companyToRow) : opportunities.map(opportunityToRow)
    if (rows.length === 0) {
      setOperationMessage(`No ${dataset} rows are available to complete.`)
      return
    }

    setActiveDataset(dataset)
    setPreviewSource(`${dataset === 'companies' ? 'Companies' : 'Opportunities'} database rows`)
    setImportResult(null)
    setOperationMessage('')
    setActiveTab('manual')
    await completeRowsWithAi(rows, dataset)
  }

  async function exportFromBackend(dataset = activeDataset) {
    const blob = dataset === 'companies' ? await careerApi.exportCompaniesCsv() : await careerApi.exportOpportunitiesCsv()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = dataset === 'companies' ? 'careertrack-companies.csv' : 'careertrack-opportunities.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function importPreviewToBackend() {
    if (previewRows.length === 0 || importLockRef.current) return
    importLockRef.current = true
    setImportingPreview(true)
    setOperationMessage('')
    const headers = activeDataset === 'companies' ? companyHeaders : opportunityHeaders
    const formData = new FormData()
    formData.append('file', new Blob([toCsv(previewRows, headers)], { type: 'text/csv;charset=utf-8' }), `${activeDataset}.csv`)
    try {
      const result = activeDataset === 'companies' ? await careerApi.importCompaniesCsv(formData) : await careerApi.importOpportunitiesCsv(formData)
      setImportResult(result)
      setOperationMessage(
        `Imported to ${activeDataset === 'companies' ? 'your company database' : 'your Opportunities page'}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`,
      )
      if (activeDataset === 'companies') {
        careerApi.companies({ includeShared: includeSharedCompanies }).then(setCompanies).catch((error) => setLoadError(error.message || 'Could not refresh companies.'))
      } else {
        careerApi.opportunities({ includeShared: includeSharedOpportunities }).then(setOpportunities).catch((error) => setLoadError(error.message || 'Could not refresh opportunities.'))
      }
    } catch (error) {
      setImportResult({ created: 0, updated: 0, skipped: previewRows.length, errors: [friendlyUserMessage(error.message)] })
      setOperationMessage('Import could not complete. Review the rows and try again.')
    } finally {
      importLockRef.current = false
      setImportingPreview(false)
    }
  }

  function downloadPreview() {
    const headers = activeDataset === 'companies' ? companyHeaders : opportunityHeaders
    downloadCsv(`careertrack-${activeDataset}-preview.csv`, previewRows, headers)
  }

  async function searchAdzuna() {
    setLoadingAdzuna(true)
    try {
      const result = await careerApi.searchAdzunaOpportunities(adzunaForm)
      setAdzunaResult(result)
      setProviderPreview('Adzuna preview', (result.opportunities || []).map(opportunityToRow))
    } catch (error) {
      setAdzunaResult({
        configured: false,
        country: adzunaForm.country,
        count: 0,
        message: friendlyUserMessage(error.message, 'Adzuna search is unavailable right now. Try again later or use another source.'),
        opportunities: [],
      })
      setProviderPreview('Adzuna unavailable', [])
    } finally {
      setLoadingAdzuna(false)
    }
  }

  async function searchJobDataLake() {
    setLoadingJdl(true)
    try {
      const result = await careerApi.searchJobDataLakeOpportunities(jdlForm)
      setJdlResult(result)
      setProviderPreview('JobDataLake preview', (result.opportunities || []).map(opportunityToRow))
    } catch (error) {
      setJdlResult({
        configured: false,
        count: 0,
        message: friendlyUserMessage(error.message, 'JobDataLake search is unavailable right now. Try again later or use another source.'),
        opportunities: [],
      })
      setProviderPreview('JobDataLake unavailable', [])
    } finally {
      setLoadingJdl(false)
    }
  }

  async function searchWithAiSource() {
    setLoadingAiSource(true)
    try {
      const payload = {
        prompt: aiForm.prompt,
        provider: aiForm.provider,
        country: aiForm.country,
        resultsPerPage: aiForm.resultsPerPage,
      }
      const result = aiForm.target === 'companies'
        ? await careerApi.aiSourceCompanies(payload)
        : await careerApi.aiSourceOpportunities(payload)
      setAiSourceResult(result)
      if (aiForm.target === 'companies') {
        setProviderPreview(`AI + ${result.search?.provider || result.plan?.provider || 'company scout'} preview`, (result.search?.companies || []).map(companyToRow), 'companies')
      } else {
        setProviderPreview(`AI + ${result.search?.provider || result.plan?.provider || 'provider'} preview`, (result.search?.opportunities || []).map(opportunityToRow), 'opportunities')
      }
    } catch (error) {
      setAiSourceResult({
        plan: {
          provider: aiForm.provider,
          what: aiForm.prompt,
          country: aiForm.country,
          reason: 'AI sourcing could not complete this request.',
        },
        search: {
          provider: aiForm.provider,
          count: 0,
          country: aiForm.country,
          query: aiForm.prompt,
          configured: false,
          message: error.message || 'AI sourcing is unavailable right now. Try again later or use another source.',
          opportunities: [],
          companies: [],
        },
        importResult: null,
      })
      setProviderPreview('AI sourcing unavailable', [], aiForm.target === 'companies' ? 'companies' : 'opportunities')
    } finally {
      setLoadingAiSource(false)
    }
  }

  function downloadTemplate() {
    if (activeDataset === 'companies') {
      downloadCsv('careertrack-company-template.csv', [], companyHeaders)
      return
    }

    downloadCsv('careertrack-opportunity-template.csv', [], opportunityHeaders)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${
              activeTab === id
                ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      {loadError && (
        <DismissibleNotice
          className="border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          onDismiss={() => setLoadError('')}
        >
          {loadError}
        </DismissibleNotice>
      )}

      {activeTab === 'companies' && (
        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="card min-w-0 overflow-hidden">
            <p className="label">Workspace database</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Companies and opportunities in your database</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Review the data already saved in your workspace, export it, or send it back to the review workspace for strict AI field completion.
            </p>
            <div className="mt-5 flex w-full max-w-md rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
              {[
                ['companies', 'Companies'],
                ['opportunities', 'Opportunities'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDatabaseView(value)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
                    databaseView === value ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => exportFromBackend(databaseView)} className="btn-primary">
                <FileDown size={17} />
                Export {databaseView}
              </button>
              {databaseView === 'companies' && (
                <button type="button" onClick={() => setIncludeSharedCompanies((value) => !value)} className="btn-secondary">
                  <Database size={17} />
                  {includeSharedCompanies ? 'Show my companies only' : 'Load shared Companies'}
                </button>
              )}
              {databaseView === 'opportunities' && (
                <button type="button" onClick={() => setIncludeSharedOpportunities((value) => !value)} className="btn-secondary">
                  <Database size={17} />
                  {includeSharedOpportunities ? 'Show my opportunities only' : 'Load shared Opportunities'}
                </button>
              )}
              <button
                onClick={() => {
                  setActiveDataset(databaseView)
                  setActiveTab('manual')
                }}
                className="btn-secondary"
              >
                <FileUp size={17} />
                Import CSV
              </button>
              <button onClick={completeDatabaseRowsWithAi} disabled={loadingAi || (databaseView === 'companies' ? companies.length === 0 : opportunities.length === 0)} className="btn-secondary">
                {loadingAi ? <LoaderCircle className="animate-spin" size={17} /> : <Wand2 size={17} />}
                {loadingAi ? 'Completing...' : 'Strict AI complete fields'}
              </button>
            </div>
            <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
              {databaseView === 'companies'
                ? 'Save to mine copies one shared company into your private workspace. Save updates your own company rows.'
                : 'Save to mine copies one shared opportunity and its company into your private workspace. Personal opportunities are managed from Opportunities.'}
            </p>
            {operationMessage && (
              <DismissibleNotice
                className="mt-5 border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                onDismiss={() => setOperationMessage('')}
              >
                {operationMessage}
              </DismissibleNotice>
            )}
            <div className="mt-6 grid gap-3 md:grid-cols-[minmax(220px,1fr)_140px_170px_190px]">
              <label className="block">
                <span className="label">Search</span>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    className="input pl-10"
                    value={databaseFilters.search}
                    onChange={(event) => setDatabaseFilters({ ...databaseFilters, search: event.target.value })}
                    placeholder={databaseView === 'companies' ? 'Company, industry, city, website' : 'Role, company, skills, location'}
                  />
                </div>
              </label>
              <label className="block">
                <span className="label">Scope</span>
                <select className="input mt-2" value={databaseFilters.scope} onChange={(event) => setDatabaseFilters({ ...databaseFilters, scope: event.target.value })}>
                  <option value="">All rows</option>
                  <option value="mine">Mine</option>
                  <option value="shared">Shared</option>
                </select>
              </label>
              {databaseView === 'companies' ? (
                <label className="block">
                  <span className="label">Country</span>
                  <select className="input mt-2" value={databaseFilters.country} onChange={(event) => setDatabaseFilters({ ...databaseFilters, country: event.target.value })}>
                    <option value="">All countries</option>
                    {companyCountryOptions.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block">
                  <span className="label">Type</span>
                  <select className="input mt-2" value={databaseFilters.type} onChange={(event) => setDatabaseFilters({ ...databaseFilters, type: event.target.value })}>
                    <option value="">All types</option>
                    {opportunityTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="label">Source</span>
                <select className="input mt-2" value={databaseFilters.source} onChange={(event) => setDatabaseFilters({ ...databaseFilters, source: event.target.value })}>
                  <option value="">All sources</option>
                  {(databaseView === 'companies' ? companySourceOptions : opportunitySourceOptions).map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </label>
            </div>
            {databaseView === 'companies' ? (
              <div className="mt-6 max-h-[min(62vh,560px)] w-full max-w-full overflow-auto overscroll-contain rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <table className="w-full min-w-[2140px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">Actions</th>
                      <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">scope</th>
                      {visibleCompanyFields.map((header) => (
                        <th key={header} className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={visibleCompanyFields.length + 2} className="px-3 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                          No companies match the current filters.
                        </td>
                      </tr>
                    ) : filteredCompanies.map((company) => (
                      <tr key={company.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => saveCompany(company)} disabled={savingSharedIds.includes(company.id)} className="cursor-pointer rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-teal-950/70 dark:text-teal-200">
                              {savingSharedIds.includes(company.id) ? 'Saving...' : company.isShared ? 'Save to mine' : 'Save'}
                            </button>
                            <button type="button" onClick={() => deleteCompany(company.id)} disabled={company.isShared} className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300" title={company.isShared ? 'Shared rows cannot be edited here' : 'Delete company'}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={company.isShared ? 'status-pill bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200' : 'status-pill bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200'}>
                            {company.isShared ? 'Shared' : 'Mine'}
                          </span>
                        </td>
                        {visibleCompanyFields.map((header) => (
                          <td key={header} className="min-w-40 px-3 py-3 text-slate-700 dark:text-slate-300">
                            <input
                              className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 outline-none transition focus:border-teal-300 focus:bg-white dark:focus:border-teal-700 dark:focus:bg-slate-900"
                              value={companyValue(company, header)}
                              onChange={(event) => updateCompanyDraft(company.id, header, event.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-6 max-h-[min(62vh,560px)] w-full max-w-full overflow-auto overscroll-contain rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <table className="w-full min-w-[1220px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">Actions</th>
                      <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">scope</th>
                      {visibleOpportunityFields.map((header) => (
                        <th key={header} className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpportunities.length === 0 ? (
                      <tr>
                        <td colSpan={visibleOpportunityFields.length + 2} className="px-3 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                          No opportunities match the current filters.
                        </td>
                      </tr>
                    ) : filteredOpportunities.map((opportunity) => {
                      const row = opportunityToRow(opportunity)
                      return (
                        <tr key={opportunity.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => saveSharedOpportunity(opportunity)}
                              disabled={!opportunity.isShared || savingSharedIds.includes(opportunity.id)}
                              className="cursor-pointer rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-teal-950/70 dark:text-teal-200"
                            >
                              {savingSharedIds.includes(opportunity.id) ? 'Saving...' : opportunity.isShared ? 'Save to mine' : 'Saved'}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <span className={opportunity.isShared ? 'status-pill bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200' : 'status-pill bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200'}>
                              {opportunity.isShared ? 'Shared' : 'Mine'}
                            </span>
                          </td>
                          {visibleOpportunityFields.map((header) => (
                            <td key={header} className="min-w-40 px-3 py-3 text-slate-700 dark:text-slate-300">
                              {header === 'jobUrl' && row[header] ? (
                                <a href={row[header]} target="_blank" rel="noreferrer" className="font-semibold text-teal-700 hover:underline dark:text-teal-300">
                                  Open link
                                </a>
                              ) : (
                                row[header] || '-'
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="min-w-0 rounded-lg border border-teal-200 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-950/60">
            <p className="label">Database status</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-bold text-teal-950 dark:text-white">{companies.length}</p>
                <p className="text-sm text-teal-800 dark:text-teal-200">Companies</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-teal-950 dark:text-white">{opportunities.length}</p>
                <p className="text-sm text-teal-800 dark:text-teal-200">Opportunities</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-teal-800 dark:text-teal-200">
              Review rows here, then use strict AI completion to send them into the editable review workspace before importing updates.
            </p>
          </aside>
        </section>
      )}

      {activeTab === 'resumes' && (
        <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="label">Resume vault</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Uploaded CVs and AI-generated versions</h3>
              </div>
              <Link to="/resumes" className="btn-secondary">
                <FileText size={17} />
                Open Resumes
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {resumes.map((resume) => (
                <div key={resume.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-slate-950 dark:text-white">{resume.label}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {resume.fileType?.toUpperCase() || 'CV'} | {(resume.versions || []).length} AI versions
                  </p>
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/50">
            <p className="label">CV inventory</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-3xl font-bold text-amber-950 dark:text-amber-100">{resumes.length}</p>
                <p className="text-sm text-amber-800 dark:text-amber-200">Original CVs</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-950 dark:text-amber-100">{aiResumeVersions.length}</p>
                <p className="text-sm text-amber-800 dark:text-amber-200">AI versions</p>
              </div>
            </div>
          </aside>
        </section>
      )}

      {activeTab === 'manual' && (
        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="card h-fit">
            <p className="label">Manual import</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Upload and enrich CSV rows</h3>
            <div className="mt-5 flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
              {[
                ['companies', 'Companies'],
                ['opportunities', 'Opportunities'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    setActiveDataset(value)
                    setPreviewRows([])
                    setPreviewSource('')
                    setImportResult(null)
                  }}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
                    activeDataset === value ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900">
              <FileUp className="mb-3 text-slate-500 dark:text-slate-400" />
              <span className="font-bold text-slate-950 dark:text-white">Choose CSV file</span>
              <span className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use the template headers for best results.</span>
              <input className="hidden" type="file" accept=".csv" onChange={handleFile} />
            </label>
            <button onClick={downloadTemplate} className="btn-secondary mt-4 w-full">
              <Download size={17} />
              Download template
            </button>
            <button onClick={aiFillRows} className="btn-secondary mt-3 w-full" disabled={previewRows.length === 0 || loadingAi}>
              {loadingAi ? <LoaderCircle className="animate-spin" size={17} /> : <Wand2 size={17} />}
              {loadingAi ? 'Filling fields...' : 'Fill missing fields with AI'}
            </button>
            {loadingAi && <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">AI is still reviewing the preview rows.</p>}
            {aiNote && (
              <DismissibleNotice
                className="mt-4 border-amber-200 bg-amber-50 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                onDismiss={() => setAiNote('')}
              >
                {aiNote}
              </DismissibleNotice>
            )}
          </div>
          <PreviewPanel
            rows={previewRows}
            dataset={activeDataset}
            source={previewSource}
            importResult={importResult}
            operationMessage={operationMessage}
            importing={importingPreview}
            onRowChange={updatePreviewRow}
            onRemove={removePreviewRow}
            onClear={clearPreview}
            onImport={importPreviewToBackend}
            onDownload={downloadPreview}
            onDismissOperationMessage={() => setOperationMessage('')}
            onDismissImportResult={() => setImportResult(null)}
          />
        </section>
      )}

      {activeTab === 'adzuna' && (
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
            <PreviewPanel rows={previewRows} dataset="opportunities" source={previewSource} importResult={importResult} operationMessage={operationMessage} importing={importingPreview} onRowChange={updatePreviewRow} onRemove={removePreviewRow} onClear={clearPreview} onImport={importPreviewToBackend} onDownload={downloadPreview} onDismissOperationMessage={() => setOperationMessage('')} onDismissImportResult={() => setImportResult(null)} />
        </section>
      )}

      {activeTab === 'jobdatalake' && (
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
          <PreviewPanel rows={previewRows} dataset="opportunities" source={previewSource} importResult={importResult} operationMessage={operationMessage} importing={importingPreview} onRowChange={updatePreviewRow} onRemove={removePreviewRow} onClear={clearPreview} onImport={importPreviewToBackend} onDownload={downloadPreview} onDismissOperationMessage={() => setOperationMessage('')} onDismissImportResult={() => setImportResult(null)} />
        </section>
      )}

      {activeTab === 'ai' && (
        <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
          <div className="card h-fit">
            <p className="label">AI sourcing agent</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">AI-assisted company and opportunity discovery</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Choose whether AI should return companies or job opportunities. Results always go to the review workspace before anything is imported.
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <span className="label">Target</span>
                <div className="mt-2 flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
                  {[
                    ['opportunities', 'Opportunities'],
                    ['companies', 'Companies'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAiForm({
                          ...aiForm,
                          target: value,
                          provider: value === 'companies' ? 'google' : 'jobdatalake',
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
              <label className="block">
                <span className="label">Request</span>
                <textarea className="input mt-2 min-h-28 resize-y" value={aiForm.prompt} onChange={(event) => setAiForm({ ...aiForm, prompt: event.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label">Provider</span>
                  <select className="input mt-2" value={aiForm.provider} onChange={(event) => setAiForm({ ...aiForm, provider: event.target.value })}>
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
                <label>
                  <span className="label">Country</span>
                  <input className="input mt-2" value={aiForm.country} onChange={(event) => setAiForm({ ...aiForm, country: event.target.value.toUpperCase() })} />
                </label>
              </div>
              <label className="block">
                <span className="label">Rows</span>
                <input className="input mt-2" type="number" min="1" max="50" value={aiForm.resultsPerPage} onChange={(event) => setAiForm({ ...aiForm, resultsPerPage: Number(event.target.value) })} />
              </label>
              <button type="button" onClick={searchWithAiSource} disabled={loadingAiSource} className="btn-primary w-full">
                {loadingAiSource ? <LoaderCircle className="animate-spin" size={17} /> : <Sparkles size={17} />}
                {loadingAiSource ? 'AI is scouting...' : `AI preview ${aiForm.target}`}
              </button>
              {loadingAiSource && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">AI is building a sourcing plan and collecting reviewable rows.</p>}
              <a href={linkedInScoutUrl} target="_blank" rel="noreferrer" className="btn-secondary w-full justify-center">
                <ExternalLink size={17} />
                Open LinkedIn {aiForm.target === 'companies' ? 'company' : 'job'} scout search
              </a>
            </div>
            {aiSourceResult?.plan && (
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
          </div>
          <PreviewPanel rows={previewRows} dataset={activeDataset} source={previewSource} importResult={importResult} operationMessage={operationMessage} importing={importingPreview} onRowChange={updatePreviewRow} onRemove={removePreviewRow} onClear={clearPreview} onImport={importPreviewToBackend} onDownload={downloadPreview} onDismissOperationMessage={() => setOperationMessage('')} onDismissImportResult={() => setImportResult(null)} />
        </section>
      )}
    </div>
  )
}

export default DataHub
