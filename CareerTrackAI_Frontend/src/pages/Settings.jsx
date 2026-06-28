import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Coffee, Eye, EyeOff, KeyRound, Moon, ShieldCheck, Sparkles, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { careerApi } from '../lib/api.js'
import { plans } from '../data/plans.js'

function maskKey(value = '') {
  if (!value) return 'No key saved'
  if (value.length <= 10) return 'Saved key'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function Settings() {
  const navigate = useNavigate()
  const [aiStatus, setAiStatus] = useState(null)
  const [theme, setTheme] = useState(localStorage.getItem('careertrack_theme') || 'System')
  const [preferences, setPreferences] = useState(() => ({
    showDashboardCharts: localStorage.getItem('careertrack_show_dashboard_charts') !== 'false',
    showAiPanels: localStorage.getItem('careertrack_show_ai_panels') !== 'false',
    showCopilot: localStorage.getItem('careertrack_show_copilot') !== 'false',
    density: localStorage.getItem('careertrack_density') || 'Comfortable',
  }))
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState(localStorage.getItem('careertrack_user_gemini_key') || '')
  const [showKey, setShowKey] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(localStorage.getItem('careertrack_plan') || 'Free AI Credits')
  const [saved, setSaved] = useState(false)

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
    if (key === 'showCopilot' && value) localStorage.removeItem('careertrack_copilot_closed')
    localStorage.setItem('careertrack_density', next.density)
    window.dispatchEvent(new Event('careertrack_preferences_changed'))
    setSaved(true)
    setTimeout(() => setSaved(false), 1400)
  }

  function choosePlan(plan) {
    if (plan.id === 'free') {
      setSelectedPlan(plan.name)
      localStorage.setItem('careertrack_plan', plan.name)
      return
    }
    navigate(`/checkout/${plan.id}`)
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="card">
          <p className="label">Personal</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Display settings</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            These settings only affect your own workspace experience.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ['System', Sparkles],
              ['Light', Sun],
              ['Dark', Moon],
            ].map(([mode, Icon]) => (
              <button
                key={mode}
                type="button"
                onClick={() => applyTheme(mode)}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold transition ${
                  theme === mode
                    ? 'border-slate-950 bg-slate-950 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
                }`}
              >
                <Icon size={17} />
                {mode}
              </button>
            ))}
          </div>
          {saved && <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Saved</p>}
        </section>

        <aside className="rounded-lg border border-teal-200 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-950/60">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="text-teal-700 dark:text-teal-300" />
            <h3 className="font-bold text-teal-950 dark:text-teal-100">AI provider</h3>
          </div>
          <p className="text-sm leading-6 text-teal-800 dark:text-teal-200">
            Server status: <strong>{aiStatus?.mode || 'checking'}</strong>
          </p>
          <div className="mt-4 rounded-lg bg-white/75 p-3 text-sm text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
            <p className="font-bold text-slate-950 dark:text-white">{aiStatus?.provider || 'Gemini'}</p>
            <p>{aiStatus?.model || 'gemini-2.5-flash'}</p>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={saveUserApiKey} className="card">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="text-amber-500" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Personal Gemini API key</h2>
          </div>
          {canUsePersonalApiKey ? (
            <>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                This prepares the Bring Your Own Key flow. Production storage should move this to an encrypted backend vault.
              </p>
              <label className="mt-5 block">
                <span className="label">API key</span>
                <div className="mt-2 flex gap-2">
                  <input
                    className="input [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="Paste a Gemini key"
                  />
                  <button type="button" className="btn-secondary px-3" onClick={() => setShowKey((value) => !value)}>
                    {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                Saved key: <strong>{maskKey(savedKey)}</strong>
              </div>
              <button className="btn-primary mt-5 w-full">Save API key</button>
            </>
          ) : (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Personal API keys are available only on the Bring Your Own Key plan. Paid plans open a checkout draft first and do not change your
              current plan until payment is connected and confirmed.
              <button type="button" onClick={() => navigate('/checkout/bring-your-own-key')} className="mt-4 inline-flex items-center gap-2 font-bold">
                Review BYOK plan
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </form>

        <section className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => choosePlan(plan)}
                className={`rounded-lg border p-5 text-left transition ${plan.tone} ${
                  selectedPlan === plan.name ? 'ring-4 ring-slate-950/10 dark:ring-teal-400/20' : 'hover:-translate-y-0.5'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950 dark:text-white">{plan.name}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{plan.price}</p>
                  </div>
                  {selectedPlan === plan.name && <Sparkles className="text-amber-500" size={20} />}
                </div>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{plan.note}</p>
                <div className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Check size={15} className="text-teal-600 dark:text-teal-300" />
                      {feature}
                    </p>
                  ))}
                </div>
                <div className="mt-5">
                  {plan.id === 'free' ? (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                      <Coffee size={16} />
                      Buy me a coffee
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white dark:bg-teal-400 dark:text-slate-950">
                      Continue
                      <ArrowRight size={16} />
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="label">Current plan</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{selectedPlanDetails?.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{selectedPlanDetails?.note}</p>
              </div>
              <button type="button" onClick={() => navigate('/checkout/managed-ai')} className="btn-secondary">
                Review paid plans
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </section>

      <section className="card">
        <p className="label">Interface preferences</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Workspace behavior</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <span>
              <span className="block font-bold text-slate-950 dark:text-white">Dashboard charts</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">Show visual charts on the dashboard.</span>
            </span>
            <input
              type="checkbox"
              checked={preferences.showDashboardCharts}
              onChange={(event) => updatePreference('showDashboardCharts', event.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <span>
              <span className="block font-bold text-slate-950 dark:text-white">AI panels</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">Show embedded AI guidance blocks.</span>
            </span>
            <input type="checkbox" checked={preferences.showAiPanels} onChange={(event) => updatePreference('showAiPanels', event.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <span>
              <span className="block font-bold text-slate-950 dark:text-white">Sidebar copilot</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">Show the small AI Copilot panel in the sidebar.</span>
            </span>
            <input type="checkbox" checked={preferences.showCopilot} onChange={(event) => updatePreference('showCopilot', event.target.checked)} />
          </label>
          <label>
            <span className="label">Density</span>
            <select className="input mt-2" value={preferences.density} onChange={(event) => updatePreference('density', event.target.value)}>
              <option>Comfortable</option>
              <option>Compact</option>
              <option>Spacious</option>
            </select>
          </label>
        </div>
      </section>
    </div>
  )
}

export default Settings
