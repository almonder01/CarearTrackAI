import { useEffect, useMemo, useRef, useState } from 'react'
import { careerApi, friendlyUserMessage } from '../../lib/api.js'
import { writeScopedJson } from '../../lib/userStorage.js'
import {
  DATA_HUB_PREVIEW_STORAGE_KEY,
  buildFallbackFilledRow,
  companyHeaders,
  companyToRow,
  downloadCsv,
  mergeMissingFields,
  matchesText,
  normalizeRowForDataset,
  normalizeSearchText,
  opportunityHeaders,
  opportunityToRow,
  parseAiFilledRows,
  parseCsv,
  readStoredDataHubPreview,
  toCsv,
  uniqueValues,
} from './dataHubUtils.js'

function useDataHubController() {
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
    useAi: true,
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
    const directApiMode = aiForm.target === 'opportunities' && !aiForm.useAi && ['adzuna', 'jobdatalake'].includes(aiForm.provider)
    if (directApiMode) {
      if (aiForm.provider === 'adzuna') {
        await searchAdzuna()
      } else {
        await searchJobDataLake()
      }
      return
    }

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

  const previewPanelProps = {
    rows: previewRows,
    dataset: activeDataset,
    source: previewSource,
    importResult,
    operationMessage,
    importing: importingPreview,
    onRowChange: updatePreviewRow,
    onRemove: removePreviewRow,
    onClear: clearPreview,
    onImport: importPreviewToBackend,
    onDownload: downloadPreview,
    onDismissOperationMessage: () => setOperationMessage(''),
    onDismissImportResult: () => setImportResult(null),
  }


  return {
    activeTab,
    setActiveTab,
    companies,
    opportunities,
    databaseView,
    setDatabaseView,
    includeSharedCompanies,
    setIncludeSharedCompanies,
    includeSharedOpportunities,
    setIncludeSharedOpportunities,
    databaseFilters,
    setDatabaseFilters,
    resumes,
    activeDataset,
    setActiveDataset,
    previewRows,
    setPreviewRows,
    setPreviewSource,
    setImportResult,
    operationMessage,
    setOperationMessage,
    savingSharedIds,
    loadError,
    setLoadError,
    aiNote,
    setAiNote,
    loadingAi,
    adzunaCountries,
    adzunaForm,
    setAdzunaForm,
    adzunaResult,
    setAdzunaResult,
    loadingAdzuna,
    jdlForm,
    setJdlForm,
    jdlResult,
    setJdlResult,
    loadingJdl,
    aiForm,
    setAiForm,
    aiSourceResult,
    setAiSourceResult,
    loadingAiSource,
    companyCountryOptions,
    companySourceOptions,
    opportunityTypeOptions,
    opportunitySourceOptions,
    filteredCompanies,
    filteredOpportunities,
    aiResumeVersions,
    linkedInScoutUrl,
    previewPanelProps,
    saveCompany,
    deleteCompany,
    companyValue,
    updateCompanyDraft,
    saveSharedOpportunity,
    handleFile,
    aiFillRows,
    completeDatabaseRowsWithAi,
    exportFromBackend,
    searchAdzuna,
    searchJobDataLake,
    searchWithAiSource,
    downloadTemplate,
  }
}

export default useDataHubController
