import { useEffect, useRef, useState } from 'react'
import { careerApi } from '../../lib/api.js'
import { readScopedJson, removeScopedStorage, writeScopedJson } from '../../lib/userStorage.js'

const CHAT_HISTORY_STORAGE_KEY = 'careertrack_ai_chat_history'
const RECOMMENDATIONS_STORAGE_KEY = 'careertrack_ai_recommendations'
const COVER_LETTER_STORAGE_KEY = 'careertrack_ai_cover_letter'

function useAiStudioController() {
  const [message, setMessage] = useState('How can I improve my chances this week?')
  const [history, setHistory] = useState(() => readScopedJson(CHAT_HISTORY_STORAGE_KEY, []))
  const [recommendations, setRecommendations] = useState(() => readScopedJson(RECOMMENDATIONS_STORAGE_KEY, null))
  const [coverLetter, setCoverLetter] = useState(() => readScopedJson(COVER_LETTER_STORAGE_KEY, null))
  const [aiStatus, setAiStatus] = useState(null)
  const [pingResult, setPingResult] = useState(null)
  const [applications, setApplications] = useState([])
  const [resumes, setResumes] = useState([])
  const [selectedApplicationId, setSelectedApplicationId] = useState('')
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [coverNotes, setCoverNotes] = useState('Make it concise and confident.')
  const [coverLoading, setCoverLoading] = useState(false)
  const [coverMessage, setCoverMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [pinging, setPinging] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    careerApi.aiStatus().then(setAiStatus).catch(() => null)
    Promise.all([careerApi.applications().catch(() => []), careerApi.resumes().catch(() => [])]).then(([applicationRows, resumeRows]) => {
      setApplications(applicationRows)
      setResumes(resumeRows)
      if (applicationRows[0]?.id) setSelectedApplicationId(String(applicationRows[0].id))
      if (resumeRows[0]?.id) setSelectedResumeId(String(resumeRows[0].id))
    })
  }, [])

  useEffect(() => {
    writeScopedJson(CHAT_HISTORY_STORAGE_KEY, history)
  }, [history])

  useEffect(() => {
    if (recommendations) writeScopedJson(RECOMMENDATIONS_STORAGE_KEY, recommendations)
  }, [recommendations])

  useEffect(() => {
    if (coverLetter) writeScopedJson(COVER_LETTER_STORAGE_KEY, coverLetter)
  }, [coverLetter])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [history, loading])

  async function refreshRecommendations() {
    setLoadingRecommendations(true)
    try {
      const result = await careerApi.recommendations()
      setRecommendations(result)
    } catch (error) {
      setRecommendations({
        summary: error.message || 'AI recommendations are unavailable right now. Please try again later.',
        companiesToFollow: [],
        skillsToLearn: [],
        applicationTips: [],
      })
    } finally {
      setLoadingRecommendations(false)
    }
  }

  function clearChat() {
    setHistory([])
    removeScopedStorage(CHAT_HISTORY_STORAGE_KEY)
  }

  async function sendMessage(event) {
    event.preventDefault()
    if (!message.trim()) return
    const nextHistory = [...history, { role: 'user', content: message }]
    setHistory(nextHistory)
    setMessage('')
    setLoading(true)
    try {
      const response = await careerApi.aiChat({ message, history: nextHistory })
      setHistory([...nextHistory, { role: 'model', content: response.reply }])
    } catch (error) {
      setHistory([...nextHistory, { role: 'model', content: error.message || 'AI chat is unavailable right now. Please try again later.' }])
    } finally {
      setLoading(false)
    }
  }

  async function generateCoverLetter() {
    const selectedApplication = applications.find((item) => String(item.id) === String(selectedApplicationId))
    const jobOpportunityId = selectedApplication?.jobOpportunity?.id
    if (!jobOpportunityId) {
      setCoverMessage('Track at least one opportunity in Applications before generating a cover letter.')
      return
    }

    setCoverLoading(true)
    setCoverMessage('')
    try {
      setCoverLetter(
        await careerApi.coverLetter({
          jobOpportunityId,
          resumeId: selectedResumeId ? Number(selectedResumeId) : null,
          additionalNotes: coverNotes,
        }),
      )
      setCoverMessage(`Generated for ${selectedApplication.jobOpportunity.title}.`)
    } catch (error) {
      setCoverLetter({
        subject: 'AI draft unavailable',
        coverLetter: error.message || 'The cover letter generator is unavailable right now. Please try again later.',
      })
    } finally {
      setCoverLoading(false)
    }
  }

  async function copyCoverLetter() {
    if (!coverLetter?.coverLetter) return
    const text = `${coverLetter.subject || 'Cover letter'}\n\n${coverLetter.coverLetter}`
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  async function pingGemini() {
    setPinging(true)
    setPingResult(null)
    try {
      setPingResult(await careerApi.aiPing())
    } catch (error) {
      setPingResult({
        success: false,
        provider: 'Gemini',
        model: aiStatus?.model || 'Gemini',
        mode: 'error',
        message: error.message || 'Gemini could not be checked right now.',
        reply: null,
      })
    } finally {
      setPinging(false)
    }
  }


  return {
    message,
    setMessage,
    history,
    recommendations,
    coverLetter,
    aiStatus,
    pingResult,
    applications,
    resumes,
    selectedApplicationId,
    setSelectedApplicationId,
    selectedResumeId,
    setSelectedResumeId,
    coverNotes,
    setCoverNotes,
    coverLoading,
    coverMessage,
    clearCoverMessage: () => setCoverMessage(''),
    copied,
    loading,
    loadingRecommendations,
    pinging,
    clearPingResult: () => setPingResult(null),
    messagesEndRef,
    refreshRecommendations,
    clearChat,
    sendMessage,
    generateCoverLetter,
    copyCoverLetter,
    pingGemini,
  }
}

export default useAiStudioController
