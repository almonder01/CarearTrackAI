import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, ChevronDown, ChevronUp, Download, Eye, FileUp, LoaderCircle, Sparkles, Trash2, Wand2, X } from 'lucide-react'
import { careerApi, staticAssetUrl } from '../lib/api.js'
import { readScopedJson, writeScopedJson } from '../lib/userStorage.js'
import DismissibleNotice from '../components/DismissibleNotice.jsx'

const RESUME_ANALYSIS_STORAGE_KEY = 'careertrack_resume_analysis'

function readStoredResumeAnalysis() {
  return readScopedJson(RESUME_ANALYSIS_STORAGE_KEY, {})
}

function parseApiDate(value) {
  if (!value) return null
  const text = String(value)
  const normalized = /z$|[+-]\d{2}:\d{2}$/i.test(text) ? text : `${text}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatApiDateTime(value) {
  const date = parseApiDate(value)
  if (!date) return 'never'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function InlineMarkdown({ value }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <>{children}</>,
        strong: ({ children }) => <strong className="font-bold text-slate-950 dark:text-white">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">{children}</code>,
      }}
    >
      {String(value || '')}
    </ReactMarkdown>
  )
}

function canInlinePreview(item) {
  const value = `${item?.fileType || ''} ${item?.fileUrl || ''}`.toLowerCase()
  return value.includes('pdf')
}

function ResumePreviewModal({ item, onClose }) {
  const url = staticAssetUrl(item.fileUrl)
  const canPreview = canInlinePreview(item)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex h-[min(86vh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="label">Resume preview</p>
            <h3 className="mt-1 truncate text-lg font-bold text-slate-950 dark:text-white">{item.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={url} download className="btn-secondary">
              <Download size={16} />
              Download
            </a>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-800" title="Close preview">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-slate-100 p-3 dark:bg-slate-950">
          {canPreview ? (
            <iframe title={item.title} src={url} className="h-full w-full rounded-lg border border-slate-200 bg-white dark:border-slate-800" />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <div className="max-w-md">
                <FileUp className="mx-auto text-teal-600 dark:text-teal-300" size={34} />
                <h4 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">Preview is ready to open</h4>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  DOCX files usually need Word or the browser download viewer. Download the file to inspect the exact formatting.
                </p>
                <a href={url} download className="btn-primary mx-auto mt-5 w-fit">
                  <Download size={17} />
                  Download DOCX
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResumeDeleteDialog({ pendingDelete, working, onCancel, onConfirm }) {
  const isVersion = pendingDelete?.type === 'version'
  const title = isVersion ? pendingDelete.version.versionName : pendingDelete.resume.label

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">
              <Trash2 size={20} />
            </div>
            <div>
              <p className="label">Confirm delete</p>
              <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{isVersion ? 'Delete this AI version?' : 'Delete this resume?'}</h3>
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={working} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800" title="Cancel">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <p>
            You are about to delete <span className="font-bold text-slate-950 dark:text-white">{title}</span>.
          </p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {isVersion
              ? 'Applications that used this version will stay, but the version attachment will be removed.'
              : 'This will also remove its AI versions and unlink this resume from applications that used it.'}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={working} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={working}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65 dark:bg-rose-500 dark:hover:bg-rose-400"
          >
            {working ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
            {working ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Resumes() {
  const [resumes, setResumes] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [label, setLabel] = useState('')
  const [file, setFile] = useState(null)
  const [analysisByResume, setAnalysisByResume] = useState(readStoredResumeAnalysis)
  const [analysisErrors, setAnalysisErrors] = useState({})
  const [analyzingIds, setAnalyzingIds] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState([])
  const [versionForms, setVersionForms] = useState({})
  const [creatingVersionIds, setCreatingVersionIds] = useState([])
  const [versionMessages, setVersionMessages] = useState({})
  const [versionErrors, setVersionErrors] = useState({})
  const [collapsedResumeIds, setCollapsedResumeIds] = useState([])
  const [deletingVersionIds, setDeletingVersionIds] = useState([])
  const [previewItem, setPreviewItem] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    Promise.all([
      careerApi.resumes(),
      careerApi.opportunities().catch(() => []),
    ])
      .then(([resumeRows, opportunityRows]) => {
        setResumes(resumeRows)
        setOpportunities(opportunityRows)
      })
      .catch((error) => setLoadError(error.message || 'Could not load resumes.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    writeScopedJson(RESUME_ANALYSIS_STORAGE_KEY, analysisByResume)
  }, [analysisByResume])

  async function upload(event) {
    event.preventDefault()
    setUploadError('')
    setUploadMessage('')
    if (!file) {
      setUploadError('Choose a PDF or DOCX file first.')
      return
    }
    const formData = new FormData()
    formData.append('label', label)
    formData.append('file', file)
    setUploading(true)
    try {
      const created = await careerApi.uploadResume(formData)
      setResumes((items) => [created, ...items])
      setLabel('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setUploadMessage(`Uploaded ${created.label}. You can analyze it now.`)
    } catch (error) {
      setUploadError(error.message || 'Could not upload this resume.')
    } finally {
      setUploading(false)
    }
  }

  async function analyze(id) {
    setAnalysisErrors((items) => ({ ...items, [id]: '' }))
    setAnalyzingIds((ids) => [...new Set([...ids, id])])
    try {
      const result = await careerApi.analyzeResume(id)
      setResumes((items) => items.map((resume) => (resume.id === id ? { ...resume, lastUsedAt: new Date().toISOString() } : resume)))
      setAnalysisByResume((items) => ({ ...items, [id]: result }))
      const hasContent =
        result?.overallScore > 0 ||
        result?.strengths?.length ||
        result?.weaknesses?.length ||
        result?.missingSkills?.length ||
        result?.suggestions?.length
      if (!hasContent) {
        setAnalysisErrors((items) => ({ ...items, [id]: 'AI returned an empty analysis. Try re-uploading a text-readable PDF or DOCX.' }))
      }
    } catch (error) {
      setAnalysisErrors((items) => ({ ...items, [id]: error.message || 'Could not analyze this resume.' }))
    } finally {
      setAnalyzingIds((ids) => ids.filter((item) => item !== id))
    }
  }

  async function deleteResume(resume) {
    const id = resume.id
    setDeletingIds((ids) => [...new Set([...ids, id])])
    try {
      await careerApi.deleteResume(id)
      setResumes((items) => items.filter((resume) => resume.id !== id))
      closeAnalysis(id)
      setUploadMessage('Resume deleted.')
    } catch (error) {
      setUploadError(error.message || 'Could not delete this resume.')
    } finally {
      setDeletingIds((ids) => ids.filter((item) => item !== id))
    }
  }

  async function deleteResumeVersion(resume, version) {
    setDeletingVersionIds((ids) => [...new Set([...ids, version.id])])
    try {
      await careerApi.deleteResumeVersion(resume.id, version.id)
      setResumes((items) =>
        items.map((item) =>
          item.id === resume.id
            ? { ...item, versions: (item.versions || []).filter((existing) => existing.id !== version.id) }
            : item,
        ),
      )
      setVersionMessages((items) => ({ ...items, [resume.id]: 'Resume version deleted.' }))
    } catch (error) {
      setVersionErrors((items) => ({ ...items, [resume.id]: error.message || 'Could not delete this resume version.' }))
    } finally {
      setDeletingVersionIds((ids) => ids.filter((id) => id !== version.id))
    }
  }

  async function confirmPendingDelete() {
    const current = pendingDelete
    if (!current) return
    try {
      if (current.type === 'resume') {
        await deleteResume(current.resume)
      } else {
        await deleteResumeVersion(current.resume, current.version)
      }
    } finally {
      setPendingDelete(null)
    }
  }

  function versionFormFor(id) {
    return versionForms[id] || {
      open: false,
      jobOpportunityId: '',
      targetRole: '',
      versionName: '',
      additionalInstructions: '',
    }
  }

  function toggleVersionForm(resume) {
    setVersionForms((forms) => {
      const current = forms[resume.id] || versionFormFor(resume.id)
      return {
        ...forms,
        [resume.id]: {
          ...current,
          open: !current.open,
        },
      }
    })
  }

  function updateVersionForm(resumeId, field, value) {
    setVersionForms((forms) => ({
      ...forms,
      [resumeId]: {
        ...(forms[resumeId] || versionFormFor(resumeId)),
        [field]: value,
      },
    }))
  }

  async function createAiVersion(resume) {
    const form = versionFormFor(resume.id)
    setVersionErrors((items) => ({ ...items, [resume.id]: '' }))
    setVersionMessages((items) => ({ ...items, [resume.id]: '' }))
    setCreatingVersionIds((ids) => [...new Set([...ids, resume.id])])
    try {
      const payload = {
        jobOpportunityId: form.jobOpportunityId ? Number(form.jobOpportunityId) : null,
        targetRole: form.targetRole || null,
        versionName: form.versionName || null,
        additionalInstructions: form.additionalInstructions || null,
      }
      const result = await careerApi.createResumeVersion(resume.id, payload)
      if (!result.version) throw new Error(result.message || 'No resume version was returned.')
      setResumes((items) =>
        items.map((item) =>
          item.id === resume.id
            ? { ...item, lastUsedAt: new Date().toISOString(), versions: [result.version, ...(item.versions || [])] }
            : item,
        ),
      )
      setVersionMessages((items) => ({ ...items, [resume.id]: result.message || 'AI resume version created.' }))
      setVersionForms((forms) => ({
        ...forms,
        [resume.id]: {
          ...versionFormFor(resume.id),
          open: false,
          versionName: '',
          additionalInstructions: '',
        },
      }))
    } catch (error) {
      setVersionErrors((items) => ({ ...items, [resume.id]: error.message || 'Could not create this AI resume version.' }))
    } finally {
      setCreatingVersionIds((ids) => ids.filter((item) => item !== resume.id))
    }
  }

  function closeAnalysis(id) {
    setAnalysisByResume((items) => {
      const next = { ...items }
      delete next[id]
      return next
    })
    setAnalysisErrors((items) => {
      const next = { ...items }
      delete next[id]
      return next
    })
  }

  function clearResumeNotice(setter, id) {
    setter((items) => {
      const next = { ...items }
      delete next[id]
      return next
    })
  }

  function scoreBreakdownMax(label) {
    const lower = String(label).toLowerCase()
    if (lower.includes('role') || lower.includes('skill') || lower.includes('project')) return 20
    if (lower.includes('ats') || lower.includes('experience')) return 15
    if (lower.includes('polish')) return 10
    return 100
  }

  function toggleResumeCollapsed(id) {
    setCollapsedResumeIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]))
  }

  const deleteWorking = pendingDelete?.type === 'resume'
    ? deletingIds.includes(pendingDelete.resume.id)
    : pendingDelete?.type === 'version'
      ? deletingVersionIds.includes(pendingDelete.version.id)
      : false

  return (
    <>
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="card h-fit">
        <p className="label">Upload center</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Add a resume</h2>
        <form onSubmit={upload} className="mt-5 space-y-4">
          <label>
            <span className="label">Resume label</span>
            <input className="input mt-2" value={label} onChange={(event) => setLabel(event.target.value)} required />
          </label>
          <label>
            <span className="label">PDF or DOCX</span>
            <input
              ref={fileInputRef}
              className="input mt-2"
              type="file"
              accept=".pdf,.docx"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              required
            />
          </label>
          <button className="btn-primary w-full mt-2" disabled={uploading || !file || !label.trim()}>
            {uploading ? <LoaderCircle className="animate-spin" size={17} /> : <FileUp size={17} />}
            {uploading ? 'Uploading...' : 'Upload resume'}
          </button>
        </form>
        {uploadMessage && (
          <DismissibleNotice
            className="mt-4 border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            onDismiss={() => setUploadMessage('')}
          >
            {uploadMessage}
          </DismissibleNotice>
        )}
        {uploadError && (
          <DismissibleNotice
            className="mt-4 border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
            onDismiss={() => setUploadError('')}
          >
            {uploadError}
          </DismissibleNotice>
        )}
      </section>

      <section className="space-y-4">
        {loading && <div className="card text-sm font-semibold text-slate-500 dark:text-slate-400">Loading resumes...</div>}
        {loadError && (
          <DismissibleNotice
            className="border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
            onDismiss={() => setLoadError('')}
          >
            {loadError}
          </DismissibleNotice>
        )}
        {!loading && !loadError && resumes.length === 0 && (
          <div className="card text-sm font-semibold text-slate-500 dark:text-slate-400">
            No resumes yet. Upload a PDF or DOCX to start AI analysis.
          </div>
        )}
        {resumes.map((resume) => (
          <article key={resume.id} className="card relative">
            {(() => {
              const isCollapsed = collapsedResumeIds.includes(resume.id)
              return (
                <>
            <button
              type="button"
              onClick={() => toggleResumeCollapsed(resume.id)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              title={isCollapsed ? 'Expand resume details' : 'Collapse resume details'}
              aria-label={isCollapsed ? 'Expand resume details' : 'Collapse resume details'}
            >
              {isCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
            </button>
            <div className="flex flex-col gap-4 pr-12 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">{resume.label}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {resume.versions?.length || 0} versions
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {resume.fileType?.toUpperCase()} | Last used {formatApiDateTime(resume.lastUsedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {resume.fileUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewItem({ title: resume.label, fileUrl: resume.fileUrl, fileType: resume.fileType })}
                    className="btn-secondary"
                    title="Preview original resume"
                  >
                    <Eye size={17} />
                    Preview
                  </button>
                )}
                {!isCollapsed && <button onClick={() => analyze(resume.id)} disabled={analyzingIds.includes(resume.id)} className="btn-secondary">
                  {analyzingIds.includes(resume.id) ? <LoaderCircle className="animate-spin" size={17} /> : <Bot size={17} />}
                  {analyzingIds.includes(resume.id) ? 'Analyzing...' : 'Analyze with AI'}
                </button>}
                {!isCollapsed && <button onClick={() => toggleVersionForm(resume)} disabled={creatingVersionIds.includes(resume.id)} className="btn-secondary">
                  {creatingVersionIds.includes(resume.id) ? <LoaderCircle className="animate-spin" size={17} /> : <Wand2 size={17} />}
                  {creatingVersionIds.includes(resume.id) ? 'Creating...' : 'Create AI version'}
                </button>}
                <button onClick={() => setPendingDelete({ type: 'resume', resume })} disabled={deletingIds.includes(resume.id)} className="btn-secondary">
                  {deletingIds.includes(resume.id) ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
                  {deletingIds.includes(resume.id) ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
            {isCollapsed && (
              <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Details are collapsed. Expand to analyze this CV, generate tailored versions, preview versions, or delete a version.
              </p>
            )}
            {!isCollapsed && versionFormFor(resume.id).open && (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="label">AI resume version</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <label className="block lg:col-span-2">
                    <span className="label">Target opportunity</span>
                    <select
                      className="input mt-2"
                      value={versionFormFor(resume.id).jobOpportunityId}
                      onChange={(event) => {
                        const selected = opportunities.find((item) => String(item.id) === event.target.value)
                        updateVersionForm(resume.id, 'jobOpportunityId', event.target.value)
                        if (selected && !versionFormFor(resume.id).targetRole) updateVersionForm(resume.id, 'targetRole', selected.title)
                      }}
                    >
                      <option value="">No specific opportunity</option>
                      {opportunities.map((opportunity) => (
                        <option key={opportunity.id} value={opportunity.id}>
                          {opportunity.title} - {opportunity.company?.name || 'Unknown company'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="label">Target role</span>
                    <input
                      className="input mt-2"
                      value={versionFormFor(resume.id).targetRole}
                      onChange={(event) => updateVersionForm(resume.id, 'targetRole', event.target.value)}
                      placeholder="Software intern"
                    />
                  </label>
                  <label className="block">
                    <span className="label">Version name</span>
                    <input
                      className="input mt-2"
                      value={versionFormFor(resume.id).versionName}
                      onChange={(event) => updateVersionForm(resume.id, 'versionName', event.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="label">Instructions</span>
                    <textarea
                      className="input mt-2 min-h-20 resize-y"
                      value={versionFormFor(resume.id).additionalInstructions}
                      onChange={(event) => updateVersionForm(resume.id, 'additionalInstructions', event.target.value)}
                      placeholder="Optional: emphasize backend APIs, React projects, leadership, or internship fit."
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => createAiVersion(resume)} disabled={creatingVersionIds.includes(resume.id)} className="btn-primary">
                    {creatingVersionIds.includes(resume.id) ? <LoaderCircle className="animate-spin" size={17} /> : <Sparkles size={17} />}
                    {creatingVersionIds.includes(resume.id) ? 'Creating version...' : 'Generate version'}
                  </button>
                  <button type="button" onClick={() => toggleVersionForm(resume)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {!isCollapsed && versionMessages[resume.id] && (
              <DismissibleNotice
                className="mt-4 border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                onDismiss={() => clearResumeNotice(setVersionMessages, resume.id)}
              >
                {versionMessages[resume.id]}
              </DismissibleNotice>
            )}
            {!isCollapsed && versionErrors[resume.id] && (
              <DismissibleNotice
                className="mt-4 border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                onDismiss={() => clearResumeNotice(setVersionErrors, resume.id)}
              >
                {versionErrors[resume.id]}
              </DismissibleNotice>
            )}
            {!isCollapsed && analyzingIds.includes(resume.id) && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                Extracting resume text and asking AI to analyze it. This can take a few seconds for PDF files.
              </div>
            )}
            {!isCollapsed && analysisErrors[resume.id] && (
              <DismissibleNotice
                className="mt-4 border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                onDismiss={() => clearResumeNotice(setAnalysisErrors, resume.id)}
              >
                {analysisErrors[resume.id]}
              </DismissibleNotice>
            )}
            {!isCollapsed && analysisByResume[resume.id] && (
              <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-950/60">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-teal-950 dark:text-teal-100">AI resume score: {analysisByResume[resume.id].overallScore ?? 0}/100</h3>
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-500" />
                    <button type="button" onClick={() => closeAnalysis(resume.id)} className="rounded-lg p-1 text-teal-800 hover:bg-teal-100 dark:text-teal-100 dark:hover:bg-teal-900" title="Close analysis">
                      <X size={17} />
                    </button>
                  </div>
                </div>
                {analysisByResume[resume.id].scoreBreakdown && (
                  <div className="mb-4 rounded-lg bg-white/80 p-4 dark:bg-slate-900/80">
                    <p className="font-bold text-slate-950 dark:text-white">Employer-style score breakdown</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(analysisByResume[resume.id].scoreBreakdown).map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                            <span className="font-bold text-teal-700 dark:text-teal-300">{value}/{scoreBreakdownMax(label)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className="h-2 rounded-full bg-teal-600 dark:bg-teal-400"
                              style={{ width: `${Math.min(100, Math.max(0, ((Number(value) || 0) / scoreBreakdownMax(label)) * 100))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      The rubric weighs role alignment, skills evidence, project impact, ATS clarity, experience structure, and polish.
                    </p>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ['Strengths', analysisByResume[resume.id].strengths],
                    ['Missing skills', analysisByResume[resume.id].missingSkills],
                    ['Suggestions', analysisByResume[resume.id].suggestions],
                    ['Weaknesses', analysisByResume[resume.id].weaknesses],
                  ].map(([title, values]) => (
                    <div key={title} className="rounded-lg bg-white/80 p-4 dark:bg-slate-900/80">
                      <p className="font-bold text-slate-950 dark:text-white">{title}</p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        {(values?.length ? values : ['No items returned for this section.']).map((value) => (
                          <li key={value}>
                            <InlineMarkdown value={value} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!isCollapsed && resume.versions?.length > 0 && (
              <div className="mt-5">
                <p className="label">Tailored versions</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {resume.versions.map((version) => (
                    <div key={version.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{version.versionName}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {version.targetCompanyName || 'General version'} | {formatApiDateTime(version.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {version.fileUrl && (
                            <>
                              <button
                                type="button"
                                onClick={() => setPreviewItem({ title: version.versionName, fileUrl: version.fileUrl, fileType: version.fileType })}
                                className="btn-secondary px-3 py-2"
                                title="Preview AI resume version"
                              >
                                <Eye size={15} />
                              </button>
                              <a href={staticAssetUrl(version.fileUrl)} download className="btn-secondary px-3 py-2" title="Download AI resume version">
                                <Download size={15} />
                              </a>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingDelete({ type: 'version', resume, version })}
                            disabled={deletingVersionIds.includes(version.id)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950"
                            title="Delete this version"
                          >
                            {deletingVersionIds.includes(version.id) ? <LoaderCircle className="animate-spin" size={15} /> : <X size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
                </>
              )
            })()}
          </article>
        ))}
      </section>
    </div>
    {previewItem && <ResumePreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
    {pendingDelete && (
      <ResumeDeleteDialog
        pendingDelete={pendingDelete}
        working={deleteWorking}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmPendingDelete}
      />
    )}
    </>
  )
}

export default Resumes
