import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, DatabaseZap, Gauge, Layers3, RotateCcw, Sparkles } from 'lucide-react'
import { careerApi } from '../lib/api.js'

const FREE_TOKEN_LIMIT = 100000

const usageTabs = [
  ['overview', 'Overview'],
  ['gemini', 'Gemini'],
  ['adzuna', 'Adzuna'],
  ['jobdatalake', 'JobDataLake'],
]

function MetricCard({ label, value, Icon = Activity }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950">
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}

function UsageChart({ title, data, emptyText = 'No usage recorded yet.' }) {
  return (
    <div className="card">
      <div className="mb-5">
        <p className="label">Usage analysis</p>
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">{title}</h2>
      </div>
      <div className="h-72">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} className="text-slate-500 dark:text-slate-400" />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} className="text-slate-500 dark:text-slate-400" />
              <Tooltip
                cursor={{ fill: 'rgba(20, 184, 166, 0.08)' }}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid rgb(148 163 184 / 0.28)',
                  background: 'rgb(15 23 42)',
                  color: 'white',
                }}
              />
              <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  )
}

function ProviderPanel({ provider }) {
  const recent = provider?.recent || []
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <UsageChart
        title={`${provider?.provider || 'Provider'} requests and results`}
        data={[
          { name: 'Requests', value: provider?.requests || 0 },
          { name: 'Matched', value: provider?.matched || 0 },
          { name: 'Imported', value: provider?.imported || 0 },
          { name: 'Errors', value: provider?.errors || 0 },
        ].filter((item) => item.value > 0)}
      />
      <aside className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="label">Recent activity</p>
        <div className="mt-4 space-y-3">
          {recent.length ? (
            recent.map((entry) => (
              <div key={`${entry.provider}-${entry.createdAt}-${entry.operation}`} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-950 dark:text-white">{entry.operation}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  {entry.requests} request, {entry.matched} matched, {entry.imported} imported
                </p>
                {entry.message && <p className="mt-2 text-amber-700 dark:text-amber-300">{entry.message}</p>}
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">No activity has been recorded for this provider yet.</p>
          )}
        </div>
      </aside>
    </section>
  )
}

function Usage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [geminiUsage, setGeminiUsage] = useState(null)
  const [apiUsage, setApiUsage] = useState(null)
  const [loading, setLoading] = useState(true)

  const localUsage = useMemo(() => JSON.parse(localStorage.getItem('careertrack_ai_usage') || '[]'), [])
  const localTotals = localUsage.reduce(
    (acc, item) => {
      const total = (item.inputTokens || 0) + (item.outputTokens || 0)
      acc.tokens += total
      acc.calls += 1
      acc.byFeature[item.feature] = (acc.byFeature[item.feature] || 0) + total
      return acc
    },
    { tokens: 0, calls: 0, byFeature: {} },
  )

  const remaining = Math.max(0, FREE_TOKEN_LIMIT - localTotals.tokens)
  const providers = apiUsage?.providers || []
  const adzunaUsage = providers.find((provider) => provider.provider === 'Adzuna')
  const jobDataLakeUsage = providers.find((provider) => provider.provider === 'JobDataLake')

  const geminiChartData = (geminiUsage?.byFeature || []).map((item) => ({
    name: item.feature,
    value: item.totalTokens,
  }))

  useEffect(() => {
    let mounted = true
    Promise.all([careerApi.aiUsage().catch(() => null), careerApi.apiUsage().catch(() => null)])
      .then(([gemini, apis]) => {
        if (!mounted) return
        setGeminiUsage(gemini)
        setApiUsage(apis)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  function resetUsage() {
    localStorage.removeItem('careertrack_ai_usage')
    window.location.reload()
  }

  if (loading) {
    return <div className="card text-sm font-semibold text-slate-500 dark:text-slate-400">Loading usage...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
        {usageTabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-bold transition ${
              activeTab === id
                ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Gemini tokens" value={(geminiUsage?.totalTokens || 0).toLocaleString()} Icon={Sparkles} />
            <MetricCard label="API requests" value={(apiUsage?.requests || 0).toLocaleString()} Icon={DatabaseZap} />
            <MetricCard label="Matched jobs" value={(apiUsage?.matched || 0).toLocaleString()} Icon={Layers3} />
            <MetricCard label="Free estimate left" value={remaining.toLocaleString()} Icon={Gauge} />
          </section>
          <UsageChart
            title="Provider activity"
            data={[
              { name: 'Gemini tokens', value: geminiUsage?.totalTokens || 0 },
              { name: 'Adzuna requests', value: adzunaUsage?.requests || 0 },
              { name: 'JobDataLake requests', value: jobDataLakeUsage?.requests || 0 },
            ].filter((item) => item.value > 0)}
          />
        </>
      )}

      {activeTab === 'gemini' && (
        <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <UsageChart title="Gemini usage by feature" data={geminiChartData} emptyText="Run a live Gemini request to start metering tokens." />
          <aside className="rounded-lg border border-teal-200 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-950/60">
            <p className="label">Gemini metering</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-teal-800 dark:text-teal-200">Calls</dt>
                <dd className="font-bold text-teal-950 dark:text-white">{(geminiUsage?.calls || 0).toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-teal-800 dark:text-teal-200">Prompt tokens</dt>
                <dd className="font-bold text-teal-950 dark:text-white">{(geminiUsage?.promptTokens || 0).toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-teal-800 dark:text-teal-200">Output tokens</dt>
                <dd className="font-bold text-teal-950 dark:text-white">{(geminiUsage?.outputTokens || 0).toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-teal-800 dark:text-teal-200">Local estimate</dt>
                <dd className="font-bold text-teal-950 dark:text-white">{localTotals.tokens.toLocaleString()}</dd>
              </div>
            </dl>
            <button onClick={resetUsage} className="btn-secondary mt-5 w-full">
              <RotateCcw size={16} />
              Reset local estimate
            </button>
          </aside>
        </section>
      )}

      {activeTab === 'adzuna' && <ProviderPanel provider={adzunaUsage || { provider: 'Adzuna', requests: 0, matched: 0, imported: 0, errors: 0, recent: [] }} />}
      {activeTab === 'jobdatalake' && <ProviderPanel provider={jobDataLakeUsage || { provider: 'JobDataLake', requests: 0, matched: 0, imported: 0, errors: 0, recent: [] }} />}
    </div>
  )
}

export default Usage
