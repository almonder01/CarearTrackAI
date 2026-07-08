import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { careerApi } from '../../lib/api.js'

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

function useInterviewsController() {
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


  return {
    interviews,
    savingIds,
    deletingIds,
    preppingIds,
    editingNotesIds,
    setEditingNotesIds,
    expandedNotesIds,
    setExpandedNotesIds,
    message,
    clearMessage: () => setMessage(''),
    loading,
    error,
    clearError: () => setError(''),
    updateForm,
    currentForm,
    saveInterview,
    deleteInterview,
    generatePrepNotes,
  }
}

export default useInterviewsController
