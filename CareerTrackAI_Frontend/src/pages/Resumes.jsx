import { useEffect, useRef, useState } from 'react'
import { Bot, FileUp, LoaderCircle, Sparkles, Trash2, X } from 'lucide-react'
import dayjs from 'dayjs'
import { careerApi } from '../lib/api.js'

const RESUME_ANALYSIS_STORAGE_KEY = 'careertrack_resume_analysis'

function readStoredResumeAnalysis() {
  try {
    return JSON.parse(localStorage.getItem(RESUME_ANALYSIS_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function Resumes() {
  const [resumes, setResumes] = useState([])
  const [label, setLabel] = useState('')
  const [file, setFile] = useState(null)
  const [analysisByResume, setAnalysisByResume] = useState(readStoredResumeAnalysis)
  const [analysisErrors, setAnalysisErrors] = useState({})
  const [analyzingIds, setAnalyzingIds] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [deletingIds, setDeletingIds] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    careerApi.resumes().then(setResumes)
  }, [])

  useEffect(() => {
    localStorage.setItem(RESUME_ANALYSIS_STORAGE_KEY, JSON.stringify(analysisByResume))
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

  async function deleteResume(id) {
    if (!window.confirm('Delete this resume?')) return
    setDeletingIds((ids) => [...new Set([...ids, id])])
    try {
      await careerApi.deleteResume(id)
      setResumes((items) => items.filter((resume) => resume.id !== id))
      closeAnalysis(id)
      setUploadMessage('Resume deleted.')
    } finally {
      setDeletingIds((ids) => ids.filter((item) => item !== id))
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

  return (
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
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            {uploadMessage}
          </div>
        )}
        {uploadError && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            {uploadError}
          </div>
        )}
      </section>

      <section className="space-y-4">
        {resumes.length === 0 && (
          <div className="card text-sm font-semibold text-slate-500 dark:text-slate-400">
            No resumes yet. Upload a PDF or DOCX to start AI analysis.
          </div>
        )}
        {resumes.map((resume) => (
          <article key={resume.id} className="card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">{resume.label}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {resume.fileType?.toUpperCase()} | Last used {resume.lastUsedAt ? dayjs(resume.lastUsedAt).format('MMM D, YYYY') : 'never'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => analyze(resume.id)} disabled={analyzingIds.includes(resume.id)} className="btn-secondary">
                  {analyzingIds.includes(resume.id) ? <LoaderCircle className="animate-spin" size={17} /> : <Bot size={17} />}
                  {analyzingIds.includes(resume.id) ? 'Analyzing...' : 'Analyze with AI'}
                </button>
                <button onClick={() => deleteResume(resume.id)} disabled={deletingIds.includes(resume.id)} className="btn-secondary">
                  {deletingIds.includes(resume.id) ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
                  {deletingIds.includes(resume.id) ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
            {analyzingIds.includes(resume.id) && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                Extracting resume text and asking AI to analyze it. This can take a few seconds for PDF files.
              </div>
            )}
            {analysisErrors[resume.id] && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {analysisErrors[resume.id]}
              </div>
            )}
            {analysisByResume[resume.id] && (
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
                          <li key={value}>{value}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {resume.versions?.length > 0 && (
              <div className="mt-5">
                <p className="label">Tailored versions</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {resume.versions.map((version) => (
                    <div key={version.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="font-bold text-slate-900 dark:text-white">{version.versionName}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {version.targetCompanyName} | {dayjs(version.createdAt).format('MMM D, YYYY')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  )
}

export default Resumes
