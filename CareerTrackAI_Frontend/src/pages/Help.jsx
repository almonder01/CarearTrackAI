import { useState } from 'react'
import {
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleHelp,
  Database,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'

const tabs = [
  ['about', 'About'],
  ['how-to-use', 'How to use'],
]

const workflowSteps = [
  {
    title: 'Complete your profile',
    icon: UserRound,
    text: 'Open Profile and add your major, city, graduation year, and career focus. This gives the AI and recommendations better context.',
  },
  {
    title: 'Build your company list',
    icon: Database,
    text: 'Go to Data Hub to import companies or opportunities from CSV, Adzuna, JobDataLake, AI sourcing, or the shared database.',
  },
  {
    title: 'Review before importing',
    icon: Building2,
    text: 'Use the preview table to edit rows, remove weak matches, and import only the companies or opportunities you actually want to track.',
  },
  {
    title: 'Explore opportunities',
    icon: BriefcaseBusiness,
    text: 'Open Opportunities to filter roles, open posting links, verify links with AI, and track selected roles into Applications.',
  },
  {
    title: 'Move applications through the pipeline',
    icon: LayoutDashboard,
    text: 'Use Applications as your Kanban board. Move each card from Planning to Applied, Interview, Accepted, or Rejected as your status changes.',
  },
  {
    title: 'Upload and analyze resumes',
    icon: FileText,
    text: 'Upload PDF or DOCX resumes in Resumes, then run AI analysis to identify strengths, weaknesses, missing skills, and suggestions.',
  },
  {
    title: 'Prepare for interviews',
    icon: MessageSquareText,
    text: 'When an application reaches Interview, open Interviews to add the date, meeting link, location, and AI-generated preparation notes.',
  },
  {
    title: 'Use AI only when needed',
    icon: Bot,
    text: 'AI panels do not run automatically. Click refresh when you want an insight, and clear it when it is no longer useful.',
  },
  {
    title: 'Monitor settings and usage',
    icon: Settings,
    text: 'Use Settings for theme, density, AI panels, and provider information. Use Usage to monitor Gemini, Adzuna, and JobDataLake consumption.',
  },
]

function Help() {
  const [activeTab, setActiveTab] = useState('about')

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-teal-200 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-950/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-600 text-white">
              <CircleHelp size={22} />
            </div>
            <div>
              <p className="label">Help center</p>
              <h2 className="mt-1 text-2xl font-bold text-teal-950 dark:text-teal-100">CareerTrackAI guide</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-teal-800 dark:text-teal-200">
                Learn what the platform does and how to use it step by step after signing in.
              </p>
            </div>
          </div>
          <div className="flex rounded-lg border border-teal-200 bg-white/70 p-1 dark:border-teal-800 dark:bg-slate-950/60">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                  activeTab === id
                    ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeTab === 'about' && (
        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <article className="card space-y-5">
            <div>
              <p className="label">About the platform</p>
              <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">A career search operating system</h3>
            </div>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              CareerTrackAI helps students and early-career applicants manage the full job and internship search process in one workspace. It
              brings together companies, opportunities, applications, resumes, interviews, reminders, AI guidance, and external job data sources.
            </p>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              The platform is designed around a practical workflow: discover opportunities, review the data, track selected roles, move each
              application through a clear pipeline, analyze resumes, prepare for interviews, and monitor AI/API usage. Instead of keeping links,
              notes, and statuses scattered across spreadsheets or browser tabs, the user gets a structured workspace built for repeated career
              search activity.
            </p>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              AI is embedded as an assistant rather than an automatic background process. It can help analyze resumes, generate career guidance,
              prepare interview notes, verify job links, enrich imported rows, and explain what the user should do next. Most AI panels run only
              when the user clicks refresh, so the user stays in control of quota and timing.
            </p>
          </article>

          <aside className="space-y-4">
            <div className="card">
              <Sparkles className="mb-3 text-amber-500" />
              <h3 className="font-bold text-slate-950 dark:text-white">Best for</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>University students looking for internships.</p>
                <p>Fresh graduates tracking entry-level jobs.</p>
                <p>Career-focused users who want a cleaner application pipeline.</p>
              </div>
            </div>
            <div className="card">
              <CheckCircle2 className="mb-3 text-teal-600 dark:text-teal-300" />
              <h3 className="font-bold text-slate-950 dark:text-white">Core promise</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Keep every opportunity, resume, application status, interview detail, and AI insight organized in one place.
              </p>
            </div>
          </aside>
        </section>
      )}

      {activeTab === 'how-to-use' && (
        <section className="space-y-4">
          <div className="card">
            <p className="label">After sign in</p>
            <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Recommended workflow</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Follow these steps when starting with a new account or when preparing a new job search cycle.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {workflowSteps.map(({ title, icon: Icon, text }, index) => (
              <article key={title} className="card">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="label">Step {index + 1}</p>
                    <h3 className="mt-1 font-bold text-slate-950 dark:text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default Help
