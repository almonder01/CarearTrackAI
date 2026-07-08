import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { careerApi } from '../../lib/api.js'
import { plans } from '../../data/plans.js'
import { useAuth } from '../../context/useAuth.js'

function useSettingsController() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [aiStatus, setAiStatus] = useState(null)
  const [theme, setTheme] = useState(localStorage.getItem('careertrack_theme') || 'System')
  const [preferences, setPreferences] = useState(() => ({
    showDashboardCharts: localStorage.getItem('careertrack_show_dashboard_charts') !== 'false',
    showAiPanels: localStorage.getItem('careertrack_show_ai_panels') !== 'false',
    showCopilot: localStorage.getItem('careertrack_show_copilot') !== 'false',
    showFloatingAgent: localStorage.getItem('careertrack_show_floating_agent') !== 'false',
    density: localStorage.getItem('careertrack_density') || 'Comfortable',
  }))
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState(localStorage.getItem('careertrack_user_gemini_key') || '')
  const [showKey, setShowKey] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(localStorage.getItem('careertrack_plan') || 'Free AI Credits')
  const [saved, setSaved] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)

  useEffect(() => {
    careerApi.aiStatus().then(setAiStatus).catch(() => null)
  }, [])

  const selectedPlanDetails = useMemo(() => plans.find((plan) => plan.name === selectedPlan), [selectedPlan])
  const canUsePersonalApiKey = selectedPlanDetails?.id === 'bring-your-own-key'

  function applyTheme(nextTheme) {
    setTheme(nextTheme)
    localStorage.setItem('careertrack_theme', nextTheme)
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', nextTheme === 'Dark' || (nextTheme === 'System' && prefersDark))
    window.dispatchEvent(new Event('careertrack_preferences_changed'))
    setSaved(true)
    setTimeout(() => setSaved(false), 1400)
  }

  function saveUserApiKey(event) {
    event.preventDefault()
    if (!apiKey.trim()) return
    localStorage.setItem('careertrack_user_gemini_key', apiKey.trim())
    setSavedKey(apiKey.trim())
    setApiKey('')
  }

  function updatePreference(key, value) {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    localStorage.setItem('careertrack_show_dashboard_charts', String(next.showDashboardCharts))
    localStorage.setItem('careertrack_show_ai_panels', String(next.showAiPanels))
    localStorage.setItem('careertrack_show_copilot', String(next.showCopilot))
    localStorage.setItem('careertrack_show_floating_agent', String(next.showFloatingAgent))
    if (key === 'showCopilot' && value) localStorage.removeItem('careertrack_copilot_closed')
    localStorage.setItem('careertrack_density', next.density)
    window.dispatchEvent(new Event('careertrack_preferences_changed'))
    setSaved(true)
    setTimeout(() => setSaved(false), 1400)
  }

  async function updateNotificationPreference(value) {
    if (!user) return
    setSavingNotifications(true)
    try {
      await careerApi.updateMe({
        fullName: user.fullName,
        university: user.university,
        major: user.major,
        city: user.city,
        graduationYear: user.graduationYear,
        careerObjective: user.careerObjective || '',
        notificationsEnabled: value,
      })
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 1400)
    } finally {
      setSavingNotifications(false)
    }
  }

  function choosePlan(plan) {
    if (plan.id === 'free') {
      setSelectedPlan(plan.name)
      localStorage.setItem('careertrack_plan', plan.name)
      return
    }
    navigate(`/checkout/${plan.id}`)
  }


  return {
    navigate,
    user,
    aiStatus,
    theme,
    preferences,
    apiKey,
    setApiKey,
    savedKey,
    showKey,
    setShowKey,
    selectedPlan,
    saved,
    savingNotifications,
    selectedPlanDetails,
    canUsePersonalApiKey,
    applyTheme,
    saveUserApiKey,
    updatePreference,
    updateNotificationPreference,
    choosePlan,
  }
}

export default useSettingsController
