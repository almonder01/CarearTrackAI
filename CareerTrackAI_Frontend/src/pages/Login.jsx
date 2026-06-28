import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BrainCircuit, BriefcaseBusiness, Eye, EyeOff, LockKeyhole, Sparkles } from 'lucide-react'
import { useAuth } from '../context/useAuth.js'

function Login() {
  const navigate = useNavigate()
  const { login, loading } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      await login(form)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Unable to sign in')
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative flex min-h-[42rem] flex-col justify-between overflow-hidden bg-slate-950 p-8 text-white lg:min-h-screen lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(20,184,166,0.34),transparent_28%),radial-gradient(circle_at_82%_58%,rgba(245,158,11,0.20),transparent_30%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-950">
            <BrainCircuit size={25} />
          </div>
          <div>
            <p className="text-xl font-bold">CareerTrack AI</p>
            <p className="text-sm text-slate-300">AI-powered job search operations</p>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl py-16">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-teal-100">
            <BriefcaseBusiness size={15} />
            Built for students and new graduates
          </p>
          <h1 className="max-w-xl text-5xl font-bold tracking-normal sm:text-6xl">
            Track every application. Improve every next move.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            A focused workspace for applications, resumes, interviews, reminders, and live AI guidance.
          </p>
        </div>

        <div className="relative z-10 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          {['Kanban pipeline', 'Resume AI', 'Smart reminders'].map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-white/8 p-4">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30"
        >
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950">
              <LockKeyhole size={22} />
            </div>
            <h2 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use your CareerTrack AI account to continue.</p>
          </div>

          {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}

          <label className="label">Email</label>
          <input
            className="input mt-2"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />

          <label className="label mt-4 block">Password</label>
          <div className="mt-2 flex gap-2">
            <input
              className="input [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={() => setShowPassword((value) => !value)}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button className="btn-primary mt-6 w-full" disabled={loading}>
            Sign in
            <ArrowRight size={17} />
          </button>

          <div className="mt-5 flex flex-col gap-3 text-center text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center justify-center gap-2">
              <Sparkles size={15} />
              Live AI connects after sign in
            </span>
            <span>
              New here?{' '}
              <Link className="font-bold text-slate-950 dark:text-white" to="/register">
                Create an account
              </Link>
            </span>
          </div>
        </form>
      </section>
    </main>
  )
}

export default Login
