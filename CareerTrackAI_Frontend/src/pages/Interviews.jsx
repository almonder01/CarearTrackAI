import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CalendarClock, LoaderCircle, MapPin, Maximize2, Minimize2, Save, Trash2, Video, Wand2 } from 'lucide-react'
import dayjs from 'dayjs'
import { careerApi } from '../lib/api.js'
import AiActionPanel from '../components/AiActionPanel.jsx'

const interviewTypes = ['Online', 'OnSite', 'Phone']

function MarkdownNotes({ value }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
        strong: ({ children }) => <strong className="font-bold text-slate-950 dark:text-white">{children}</strong>,
        h1: ({ children }) => <h3 className="mb-2 text-base font-bold text-slate-950 dark:text-white">{children}</h3>,
        h2: ({ children }) => <h3 className="mb-2 text-base font-bold text-slate-950 dark:text-white">{children}</h3>,
        h3: ({ children }) => <h3 className="mb-2 text-sm font-bold text-slate-950 dark:text-white">{children}</h3>,
        code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">{children}</code>,
      }}
    >
      {value}
    </ReactMarkdown>
  )
}

function toDateTimeInput(value) {
  if (!value) return ''
  return dayjs(value).format('YYYY-MM-DDTHH:mm')
}

function defaultScheduleValue() {
  return dayjs().add(2, 'day').hour(10).minute(0).second(0).format('YYYY-MM-DDTHH:mm')
}

function formFromInterview(interview) {
  return {
    title: interview.title === 'Interview stage' ? 'Interview' : interview.title || 'Interview',
    scheduledAt: toDateTimeInput(interview.scheduledAt) || defaultScheduleValue(),
    durationMinutes: interview.durationMinutes || 60,
    type: interview.type === 'Pending' ? 'Online' : interview.type || 'Online',
    location: interview.location || '',
    notes: interview.isPlaceholder ? '' : interview.notes || '',
  }
}

function mergeInterviewRows(scheduledInterviews, interviewApplications) {
  const scheduledApplicationIds = new Set(scheduledInterviews.map((interview) => interview.applicationId).filter(Boolean))
  const stageOnlyRows = interviewApplications
    .filter((application) => !scheduledApplicationIds.has(application.id))
    .map((application) => {
      const opportunity = application.jobOpportunity || {}
      const company = opportunity.company || {}
      return {
        id: `application-${application.id}`,
        applicationId: application.id,
        companyName: company.name || 'Company not provided',
        title: 'Interview stage',
        jobTitle: opportunity.title || 'Tracked application',
        scheduledAt: null,
        durationMinutes: null,
        type: 'Pending',
        location: opportunity.location || company.city || company.country || '',
        notes: 'This application is marked as Interview. Add the exact date, meeting link, and prep notes when the interview is scheduled.',
        isPlaceholder: true,
      }
    })

  return [
    ...scheduledInterviews.map((interview) => ({ ...interview, isPlaceholder: false })),
    ...stageOnlyRows,
  ].sort((first, second) => {
    if (!first.scheduledAt && !second.scheduledAt) return 0
    if (!first.scheduledAt) return 1
    if (!second.scheduledAt) return -1
    return new Date(first.scheduledAt) - new Date(second.scheduledAt)
  })
}

function schedulePayload(form) {
  return {
    title: form.title.trim() || 'Interview',
    scheduledAt: form.scheduledAt,
    durationMinutes: Number(form.durationMinutes) || 60,
    type: form.type || 'Online',
    location: form.location.trim(),
    notes: form.notes.trim(),
  }
}

function Interviews() {
  const [scheduledInterviews, setScheduledInterviews] = useState([])
  const [interviewApplications, setInterviewApplications] = useState([])
  const [forms, setForms] = useState({})
  const [savingIds, setSavingIds] = useState([])
  const [deletingIds, setDeletingIds] = useState([])
  const [preppingIds, setPreppingIds] = useState([])
  const [editingNotesIds, setEditingNotesIds] = useState([])
  const [expandedNotesIds, setExpandedNotesIds] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const interviews = useMemo(() => mergeInterviewRows(scheduledInterviews, interviewApplications), [scheduledInterviews, interviewApplications])

  useEffect(() => {
    loadInterviews()
  }, [])

  async function loadInterviews() {
    setLoading(true)
    setError('')
    try {
      const [scheduledRows, applicationRows] = await Promise.all([careerApi.interviews(), careerApi.applications('Interview')])
      setScheduledInterviews(scheduledRows || [])
      setInterviewApplications(applicationRows || [])
    } catch (err) {
      setError(err.message || 'Could not load interviews.')
    } finally {
      setLoading(false)
    }
  }

  function updateForm(interview, field, value) {
    setForms((current) => ({
      ...current,
      [interview.id]: {
        ...(current[interview.id] || formFromInterview(interview)),
        [field]: value,
      },
    }))
  }

  function currentForm(interview) {
    return forms[interview.id] || formFromInterview(interview)
  }

  async function saveInterview(interview) {
    const form = currentForm(interview)
    if (!form.scheduledAt) {
      setMessage('Choose a date and time before saving the interview.')
      return
    }

    setSavingIds((ids) => [...new Set([...ids, interview.id])])
    setMessage('')
    try {
      const payload = schedulePayload(form)
      if (interview.isPlaceholder) {
        const created = await careerApi.createInterview(interview.applicationId, payload)
        setScheduledInterviews((items) => [...items, created])
        setForms((items) => {
          const next = { ...items }
          delete next[interview.id]
          return next
        })
        setMessage(`Interview scheduled for ${created.companyName || interview.companyName}.`)
      } else {
        const updated = await careerApi.updateInterview(interview.id, payload)
        setScheduledInterviews((items) => items.map((item) => (item.id === interview.id ? { ...item, ...updated } : item)))
        setMessage(`Interview updated for ${updated.companyName || interview.companyName}.`)
      }
    } catch (err) {
      setMessage(err.message || 'Could not save this interview.')
    } finally {
      setSavingIds((ids) => ids.filter((id) => id !== interview.id))
    }
  }

  async function deleteInterview(interview) {
    if (interview.isPlaceholder || !window.confirm(`Delete the scheduled interview for ${interview.companyName}?`)) return
    setDeletingIds((ids) => [...new Set([...ids, interview.id])])
    try {
      await careerApi.deleteInterview(interview.id)
      setScheduledInterviews((items) => items.filter((item) => item.id !== interview.id))
      setMessage(`Deleted the interview for ${interview.companyName}. The application will stay in Interview stage.`)
    } catch (err) {
      setMessage(err.message || 'Could not delete this interview.')
    } finally {
      setDeletingIds((ids) => ids.filter((id) => id !== interview.id))
    }
  }

  async function generatePrepNotes(interview) {
    setPreppingIds((ids) => [...new Set([...ids, interview.id])])
    try {
      const form = currentForm(interview)
      const response = await careerApi.aiChat({
        message:
          `Create concise interview prep notes for ${interview.jobTitle} at ${interview.companyName}. ` +
          `Interview type: ${form.type}. Location or meeting link: ${form.location || 'not provided'}. ` +
          'Return practical notes only: likely questions, STAR story angles, company research, and follow-up reminders.',
        history: [],
      })
      updateForm(interview, 'notes', response.reply)
      setEditingNotesIds((ids) => ids.filter((id) => id !== interview.id))
      setMessage('AI prep notes added. Review them, then save the interview.')
    } catch (err) {
      setMessage(err.message || 'Could not generate prep notes.')
    } finally {
      setPreppingIds((ids) => ids.filter((id) => id !== interview.id))
    }
  }

  return (
    <div className="space-y-6">
      <AiActionPanel
        title="Interview prep engine"
        prompt={`Review ${interviews.length} interview-stage items and suggest what the user should schedule, prepare, or follow up on next. Keep it practical and concise.`}
      />

      {message && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-800 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-100">
          {message}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {loading && <div className="card text-sm font-semibold text-slate-500 dark:text-slate-400">Loading interviews...</div>}
        {!loading && error && <div className="card text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</div>}
        {!loading && !error && interviews.length === 0 && (
          <div className="card text-sm font-semibold text-slate-500 dark:text-slate-400">
            No interviews yet. Move an application to Interview when one is scheduled.
          </div>
        )}
        {interviews.map((interview) => {
          const form = currentForm(interview)
          const isSaving = savingIds.includes(interview.id)
          const isDeleting = deletingIds.includes(interview.id)
          const isPrepping = preppingIds.includes(interview.id)
          const isEditingNotes = editingNotesIds.includes(interview.id) || !form.notes
          const isExpandedNotes = expandedNotesIds.includes(interview.id)

          return (
            <article key={interview.id} className="card">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950">
                  {form.type === 'Online' ? <Video /> : <CalendarClock />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="label">{interview.companyName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-950 dark:text-white">{interview.title}</h2>
                    {interview.isPlaceholder && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/70 dark:text-amber-200">
                        Stage only
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{interview.jobTitle}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="font-bold text-slate-950 dark:text-white">Scheduled</p>
                  <p>{interview.scheduledAt ? dayjs(interview.scheduledAt).format('MMM D, YYYY | h:mm A') : 'Not scheduled yet'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="font-bold text-slate-950 dark:text-white">Duration</p>
                  <p>{interview.durationMinutes ? `${interview.durationMinutes} minutes` : 'Add details below'}</p>
                </div>
              </div>

              <p className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <MapPin size={16} className="text-teal-600 dark:text-teal-300" />
                {interview.location || 'Location not provided'}
              </p>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="label">Title</span>
                    <input className="input mt-2" value={form.title} onChange={(event) => updateForm(interview, 'title', event.target.value)} />
                  </label>
                  <label>
                    <span className="label">Date and time</span>
                    <input
                      className="input mt-2"
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(event) => updateForm(interview, 'scheduledAt', event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="label">Duration</span>
                    <input
                      className="input mt-2"
                      type="number"
                      min="15"
                      max="480"
                      value={form.durationMinutes}
                      onChange={(event) => updateForm(interview, 'durationMinutes', event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="label">Type</span>
                    <select className="input mt-2" value={form.type} onChange={(event) => updateForm(interview, 'type', event.target.value)}>
                      {interviewTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="label">Meeting link or location</span>
                  <input
                    className="input mt-2"
                    value={form.location}
                    onChange={(event) => updateForm(interview, 'location', event.target.value)}
                    placeholder="Zoom, Google Meet, phone number, or office address"
                  />
                </label>
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="label">Prep notes</span>
                    {form.notes && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedNotesIds((ids) =>
                              ids.includes(interview.id) ? ids.filter((id) => id !== interview.id) : [...ids, interview.id],
                            )
                          }
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                          title={isExpandedNotes ? 'Shrink notes' : 'Expand notes'}
                        >
                          {isExpandedNotes ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingNotesIds((ids) =>
                              ids.includes(interview.id) ? ids.filter((id) => id !== interview.id) : [...ids, interview.id],
                            )
                          }
                          className="text-xs font-bold text-teal-700 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
                        >
                          {isEditingNotes ? 'Preview notes' : 'Edit notes'}
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditingNotes ? (
                    <textarea
                      className={`input mt-2 resize-y ${isExpandedNotes ? 'h-[min(70vh,720px)]' : 'h-36'}`}
                      value={form.notes}
                      onChange={(event) => updateForm(interview, 'notes', event.target.value)}
                      placeholder="Questions, STAR stories, company research, follow-up plan..."
                    />
                  ) : (
                    <div
                      className={`mt-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 ${
                        isExpandedNotes ? 'max-h-[min(70vh,720px)]' : 'max-h-56'
                      }`}
                    >
                      <MarkdownNotes value={form.notes} />
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => saveInterview(interview)} disabled={isSaving} className="btn-primary">
                    {isSaving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
                    {interview.isPlaceholder ? 'Schedule interview' : 'Save changes'}
                  </button>
                  <button type="button" onClick={() => generatePrepNotes(interview)} disabled={isPrepping} className="btn-secondary">
                    {isPrepping ? <LoaderCircle className="animate-spin" size={17} /> : <Wand2 size={17} />}
                    {isPrepping ? 'Preparing...' : 'AI prep notes'}
                  </button>
                  {!interview.isPlaceholder && (
                    <button type="button" onClick={() => deleteInterview(interview)} disabled={isDeleting} className="btn-secondary text-rose-700 dark:text-rose-200">
                      {isDeleting ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}

export default Interviews
