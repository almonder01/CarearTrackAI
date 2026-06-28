import { useEffect, useMemo, useState } from 'react'
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
} from 'lucide-react'
import { careerApi } from '../lib/api.js'

const companyHeaders = ['name', 'industry', 'city', 'country', 'website', 'email', 'phone', 'linkedInUrl', 'notes', 'sourceProvider']
const visibleCompanyFields = ['name', 'industry', 'city', 'country', 'website', 'email', 'sourceProvider']
const opportunityHeaders = [
  'title',
  'companyName',
  'type',
  'employmentType',
  'description',
  'location',
  'isRemote',
  'applicationDeadline',
  'requiredSkills',
  'jobUrl',
  'sourceUrl',
  'sourceProvider',
]

const tabs = [
  ['companies', 'Companies', Building2],
  ['resumes', 'CVs', FileText],
  ['manual', 'Manual CSV', FileUp],
  ['adzuna', 'Adzuna', CloudDownload],
  ['jobdatalake', 'JobDataLake', Globe2],
  ['ai', 'AI Sourcing', Bot],
]

const DATA_HUB_PREVIEW_STORAGE_KEY = 'careertrack_data_hub_preview'

function readStoredDataHubPreview() {
  try {
    return JSON.parse(localStorage.getItem(DATA_HUB_PREVIEW_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
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
    applicationDeadline: item.applicationDeadline || '',
    requiredSkills: item.requiredSkills || '',
    jobUrl: item.jobUrl || '',
    sourceUrl: item.sourceUrl || item.jobUrl || '',
    sourceProvider: item.sourceProvider || item.company?.sourceProvider || '',
  }
}

function PreviewPanel({ rows, dataset, source, importResult, operationMessage, importing, onRowChange, onRemove, onClear, onImport, onDownload }) {
  const headers = dataset === 'companies' ? companyHeaders : opportunityHeaders

  return (
    <div className="card overflow-hidden">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="label">Review workspace</p>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
            {rows.length} {dataset} rows
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{source || 'Nothing loaded yet'}</p>
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
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {operationMessage}
        </div>
      )}

      {importResult && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
            importResult.created > 0 || importResult.updated > 0
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
          }`}
        >
          Created {importResult.created}, updated {importResult.updated}, skipped {importResult.skipped}.
          {importResult.errors?.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {importResult.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
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
                    className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
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
  const [activeTab, setActiveTab] = useState('companies')
  const [companies, setCompanies] = useState([])
  const [includeSharedCompanies, setIncludeSharedCompanies] = useState(false)
  const [companyDrafts, setCompanyDrafts] = useState({})
  const [resumes, setResumes] = useState([])
  const [activeDataset, setActiveDataset] = useState(storedPreview.activeDataset || 'companies')
  const [previewRows, setPreviewRows] = useState(storedPreview.previewRows || [])
  const [previewSource, setPreviewSource] = useState(storedPreview.previewSource || '')
  const [importResult, setImportResult] = useState(storedPreview.importResult || null)
  const [operationMessage, setOperationMessage] = useState(storedPreview.operationMessage || '')
  const [importingPreview, setImportingPreview] = useState(false)
  const [savingSharedIds, setSavingSharedIds] = useState([])
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
    prompt: 'Find software internships in Kuala Lumpur for students',
    provider: 'jobdatalake',
    country: 'MY',
    resultsPerPage: 20,
  })
  const [aiSourceResult, setAiSourceResult] = useState(storedPreview.aiSourceResult || null)
  const [loadingAiSource, setLoadingAiSource] = useState(false)

  useEffect(() => {
    careerApi.companies({ includeShared: includeSharedCompanies }).then(setCompanies)
    careerApi.resumes().then(setResumes)
    careerApi.adzunaCountries().then(setAdzunaCountries).catch(() => null)
  }, [includeSharedCompanies])

  useEffect(() => {
    localStorage.setItem(
      DATA_HUB_PREVIEW_STORAGE_KEY,
      JSON.stringify({
        activeDataset,
        previewRows,
        previewSource,
        importResult,
        operationMessage,
        aiNote,
        adzunaResult,
        jdlResult,
        aiSourceResult,
      }),
    )
  }, [activeDataset, previewRows, previewSource, importResult, operationMessage, aiNote, adzunaResult, jdlResult, aiSourceResult])

  const aiResumeVersions = useMemo(() => resumes.flatMap((resume) => resume.versions || []).filter((version) => version.isAiGenerated), [resumes])

  const linkedInScoutUrl = useMemo(() => {
    const query = `${aiForm.prompt} careers jobs LinkedIn`
    return `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`
  }, [aiForm.prompt])

  function setProviderPreview(source, rows) {
    setActiveDataset('opportunities')
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
      setIncludeSharedCompanies(false)
      setCompanies(await careerApi.companies({ includeShared: false }))
      setOperationMessage(
        `Saved ${result.company?.name || company.name} to your workspace. ${result.opportunitiesCreated || 0} opportunities copied to Opportunities.`,
      )
    } finally {
      setSavingSharedIds((ids) => ids.filter((id) => id !== company.id))
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
    setPreviewRows(parseCsv(text))
    setPreviewSource(`${file.name} upload`)
    setImportResult(null)
    setOperationMessage('')
    setAiNote('')
  }

  async function aiFillRows() {
    if (previewRows.length === 0) return
    setLoadingAi(true)
    try {
      const response = await careerApi.aiChat({
        message:
          'Review these CSV rows and suggest missing fields. Keep the answer concise and practical: ' +
          JSON.stringify(previewRows.slice(0, 8)),
        history: [],
      })
      setAiNote(response.reply)
      setPreviewRows((rows) =>
        rows.map((row) =>
          activeDataset === 'companies'
            ? {
                ...row,
                industry: row.industry || guessIndustry(row.name, row.website),
                city: row.city || '',
                country: row.country || '',
                notes: row.notes || `AI-filled lead for ${row.name || 'this company'}. Verify details before importing.`,
                sourceProvider: row.sourceProvider || 'Manual CSV',
              }
            : {
                ...row,
                type: row.type || 'Internship',
                employmentType: row.employmentType || 'FullTime',
                isRemote: row.isRemote || 'false',
                requiredSkills: row.requiredSkills || row.skills || 'Communication,Problem Solving',
                description: row.description || `AI-filled opportunity draft for ${row.title || 'this role'}. Verify details before importing.`,
                sourceProvider: row.sourceProvider || 'Manual CSV',
              },
        ),
      )
    } finally {
      setLoadingAi(false)
    }
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
    if (previewRows.length === 0) return
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
      if (activeDataset === 'companies') careerApi.companies({ includeShared: includeSharedCompanies }).then(setCompanies)
    } finally {
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
    } finally {
      setLoadingJdl(false)
    }
  }

  async function searchWithAiSource() {
    setLoadingAiSource(true)
    try {
      const result = await careerApi.aiSourceOpportunities({
        prompt: aiForm.prompt,
        provider: aiForm.provider,
        country: aiForm.country,
        resultsPerPage: aiForm.resultsPerPage,
      })
      setAiSourceResult(result)
      setProviderPreview(`AI + ${result.search?.provider || result.plan?.provider || 'provider'} preview`, (result.search?.opportunities || []).map(opportunityToRow))
    } finally {
      setLoadingAiSource(false)
    }
  }

  function downloadTemplate() {
    if (activeDataset === 'companies') {
      downloadCsv('careertrack-company-template.csv', [
        {
          name: 'Example Company',
          industry: 'Technology',
          city: 'Kuala Lumpur',
          country: 'Malaysia',
          website: 'https://example.com',
          email: 'careers@example.com',
          phone: '',
          linkedInUrl: '',
          notes: 'Hiring interns this summer',
          sourceProvider: 'Manual CSV',
        },
      ])
      return
    }

    downloadCsv(
      'careertrack-opportunity-template.csv',
      [
        {
          title: 'Frontend Developer Intern',
          companyName: 'Example Company',
          type: 'Internship',
          employmentType: 'FullTime',
          description: 'Build React interfaces and integrate APIs.',
          location: 'Kuala Lumpur',
          isRemote: 'false',
          applicationDeadline: '2026-08-01',
          requiredSkills: 'React,JavaScript,CSS',
          jobUrl: 'https://example.com/careers',
          sourceUrl: 'https://example.com/careers',
          sourceProvider: 'Manual CSV',
        },
      ],
      opportunityHeaders,
    )
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

      {activeTab === 'companies' && (
        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="card">
            <p className="label">Company intelligence</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Companies in the database</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Keep this as the clean source of truth. Imported companies from CSV, Adzuna, JobDataLake, and AI review can all land here after approval.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => exportFromBackend('companies')} className="btn-primary">
                <FileDown size={17} />
                Export companies
              </button>
              <button type="button" onClick={() => setIncludeSharedCompanies((value) => !value)} className="btn-secondary">
                <Database size={17} />
                {includeSharedCompanies ? 'Show my companies only' : 'Load shared database'}
              </button>
              <button onClick={() => setActiveTab('manual')} className="btn-secondary">
                <FileUp size={17} />
                Import CSV
              </button>
            </div>
            {operationMessage && (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                {operationMessage}
              </div>
            )}
            <div className="mt-6 max-h-[min(62vh,560px)] w-full overflow-auto overscroll-contain rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
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
                  {companies.map((company) => (
                    <tr key={company.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => saveCompany(company)} disabled={savingSharedIds.includes(company.id)} className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-teal-950/70 dark:text-teal-200">
                            {savingSharedIds.includes(company.id) ? 'Saving...' : company.isShared ? 'Save to mine' : 'Save'}
                          </button>
                          <button type="button" onClick={() => deleteCompany(company.id)} disabled={company.isShared} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300" title={company.isShared ? 'Shared rows cannot be edited here' : 'Delete company'}>
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
          </div>

          <aside className="rounded-lg border border-teal-200 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-950/60">
            <p className="label">Database status</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-bold text-teal-950 dark:text-white">{companies.length}</p>
                <p className="text-sm text-teal-800 dark:text-teal-200">Companies</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-teal-950 dark:text-white">{previewRows.length}</p>
                <p className="text-sm text-teal-800 dark:text-teal-200">Preview rows</p>
              </div>
            </div>
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
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {aiNote}
              </div>
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
              {adzunaResult?.message && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{adzunaResult.message}</p>}
            </div>
          </div>
            <PreviewPanel rows={previewRows} dataset="opportunities" source={previewSource} importResult={importResult} operationMessage={operationMessage} importing={importingPreview} onRowChange={updatePreviewRow} onRemove={removePreviewRow} onClear={clearPreview} onImport={importPreviewToBackend} onDownload={downloadPreview} />
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
              {jdlResult?.message && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{jdlResult.message}</p>}
            </div>
          </div>
          <PreviewPanel rows={previewRows} dataset="opportunities" source={previewSource} importResult={importResult} operationMessage={operationMessage} importing={importingPreview} onRowChange={updatePreviewRow} onRemove={removePreviewRow} onClear={clearPreview} onImport={importPreviewToBackend} onDownload={downloadPreview} />
        </section>
      )}

      {activeTab === 'ai' && (
        <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
          <div className="card h-fit">
            <p className="label">AI sourcing agent</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">AI-assisted opportunity discovery</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              AI creates the sourcing plan, then searches the selected provider. Google and LinkedIn scout use Gemini search grounding and return reviewable rows before import.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="label">Request</span>
                <textarea className="input mt-2 min-h-28 resize-y" value={aiForm.prompt} onChange={(event) => setAiForm({ ...aiForm, prompt: event.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label">Provider</span>
                  <select className="input mt-2" value={aiForm.provider} onChange={(event) => setAiForm({ ...aiForm, provider: event.target.value })}>
                    <option value="jobdatalake">JobDataLake</option>
                    <option value="adzuna">Adzuna</option>
                    <option value="google">Google Search Scout</option>
                    <option value="linkedin">LinkedIn Search Scout</option>
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
                {loadingAiSource ? 'AI is scouting...' : 'AI preview rows'}
              </button>
              {loadingAiSource && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">AI is building a sourcing plan and collecting reviewable rows.</p>}
              <a href={linkedInScoutUrl} target="_blank" rel="noreferrer" className="btn-secondary w-full justify-center">
                <ExternalLink size={17} />
                Open LinkedIn scout search
              </a>
            </div>
            {aiSourceResult?.plan && (
              <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                <p className="font-bold text-slate-950 dark:text-white">AI plan</p>
                <p className="mt-2">Provider: {aiSourceResult.plan.provider}</p>
                <p>What: {aiSourceResult.plan.what}</p>
                <p>Country: {aiSourceResult.plan.country || aiForm.country || 'Any'}</p>
                <p className="mt-2 text-slate-500 dark:text-slate-400">{aiSourceResult.plan.reason}</p>
                {aiSourceResult.search?.message && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{aiSourceResult.search.message}</p>}
              </div>
            )}
          </div>
          <PreviewPanel rows={previewRows} dataset="opportunities" source={previewSource} importResult={importResult} operationMessage={operationMessage} importing={importingPreview} onRowChange={updatePreviewRow} onRemove={removePreviewRow} onClear={clearPreview} onImport={importPreviewToBackend} onDownload={downloadPreview} />
        </section>
      )}
    </div>
  )
}

export default DataHub
