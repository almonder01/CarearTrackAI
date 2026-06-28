import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CheckCircle2, Circle, Clock3, Target, TrendingUp } from 'lucide-react'
import dayjs from 'dayjs'
import MetricCard from '../components/MetricCard.jsx'
import AiActionPanel from '../components/AiActionPanel.jsx'
import { careerApi } from '../lib/api.js'
import { statusMeta } from '../data/mockData.js'

function GettingStarted({ checklist }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('careertrack_getting_started_collapsed') === 'true')
  if (!checklist?.items?.length) return null

  const completed = checklist.completed || 0
  const total = checklist.total || checklist.items.length
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100)
  const canCollapse = checklist.isComplete

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('careertrack_getting_started_collapsed', String(next))
  }

  return (
    <section className="card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="label">Getting started</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            {checklist.isComplete ? 'Your workspace is ready' : 'Set up your real workflow'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            These steps use your actual account data. Nothing fake is added, and each item disappears only after you complete the real action.
          </p>
        </div>
        <div className="min-w-44 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            {completed} of {total} complete
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-teal-600 transition-all dark:bg-teal-400" style={{ width: `${progress}%` }} />
          </div>
          {canCollapse && (
            <button type="button" onClick={toggleCollapsed} className="mt-3 text-xs font-bold text-teal-700 dark:text-teal-300">
              {collapsed ? 'Show checklist' : 'Collapse checklist'}
            </button>
          )}
        </div>
      </div>

      {(!collapsed || !canCollapse) && <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checklist.items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-4 transition ${
              item.completed
                ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {item.completed ? (
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" size={19} />
              ) : (
                <Circle className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" size={19} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-950 dark:text-white">{item.title}</h3>
                  {item.count !== null && item.count !== undefined && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {item.count}
                    </span>
                  )}
                  {item.status && (
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-950/70 dark:text-teal-200">
                      {item.status}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.description}</p>
                <Link to={item.route} className={item.completed ? 'btn-secondary mt-4 w-fit' : 'btn-primary mt-4 w-fit'}>
                  {item.actionLabel}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>}
    </section>
  )
}

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [checklist, setChecklist] = useState(null)

  useEffect(() => {
    careerApi.dashboard().then(setStats)
    careerApi.dashboardChecklist().then(setChecklist).catch(() => null)
  }, [])

  if (!stats) return <div className="card animate-pulse">Loading dashboard...</div>

  const showCharts = localStorage.getItem('careertrack_show_dashboard_charts') !== 'false'
  const showAiPanels = localStorage.getItem('careertrack_show_ai_panels') !== 'false'
  const statusData = Object.entries(stats.byStatus || {}).map(([name, value]) => ({ name, value }))
  const trendData = [
    { week: 'W1', applications: 3, replies: 1 },
    { week: 'W2', applications: 7, replies: 2 },
    { week: 'W3', applications: 11, replies: 5 },
    { week: 'W4', applications: stats.totalApplications, replies: stats.accepted + stats.rejected },
  ]

  return (
    <div className="space-y-6">
      <GettingStarted checklist={checklist} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={BriefcaseBusiness} label="Total applications" value={stats.totalApplications} hint="Across all statuses" />
        <MetricCard icon={BadgeCheck} label="Accepted" value={stats.accepted} hint={`${stats.successRate}% success rate`} tone="emerald" />
        <MetricCard icon={Clock3} label="Pending" value={stats.pending} hint="Planning, applied, interview" tone="amber" />
        <MetricCard icon={Target} label="Rejected" value={stats.rejected} hint="Learning signals captured" tone="rose" />
      </section>

      {showCharts && (
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="card">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="label">Pipeline health</p>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Applications by stage</h2>
            </div>
            <TrendingUp className="text-teal-600 dark:text-teal-300" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {showAiPanels && (
          <AiActionPanel
            title="AI priority brief"
            prompt={`Create a concise priority brief for today. Total applications: ${stats.totalApplications}. Accepted: ${stats.accepted}. Rejected: ${stats.rejected}. Pending: ${stats.pending}. Deadline alerts: ${stats.deadlineAlerts?.length || 0}. Upcoming interviews: ${stats.upcomingInterviews?.length || 0}. Recommend what to do next.`}
          />
        )}
      </section>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        {showCharts ? (
          <div className="card">
            <p className="label">Momentum</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Application activity</h2>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="activity" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area dataKey="applications" stroke="#0f766e" fill="url(#activity)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="card flex min-h-64 items-center justify-center text-center">
            <div>
              <p className="label">Momentum</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Charts are hidden</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">You can turn dashboard charts back on from Settings.</p>
            </div>
          </div>
        )}

        <div className="card">
          <p className="label">Recent movement</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Latest applications</h2>
          <div className="mt-5 space-y-3">
            {stats.recentApplications?.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <p className="font-bold text-slate-950 dark:text-white">{item.jobTitle}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.companyName} | {dayjs(item.createdAt).format('MMM D, YYYY')}
                  </p>
                </div>
                <span className={`status-pill ${statusMeta[item.status]?.color || statusMeta.Planning.color}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
