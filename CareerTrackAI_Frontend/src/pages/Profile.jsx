import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { careerApi } from '../lib/api.js'
import { useAuth } from '../context/useAuth.js'

function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState(user || {})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    careerApi
      .getMe()
      .then((profile) => {
        setForm(profile)
        setUser(profile)
      })
      .catch((err) => setError(err.message || 'Could not load profile.'))
  }, [setUser])

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const updated = await careerApi.updateMe({
        fullName: form.fullName,
        university: form.university,
        major: form.major,
        city: form.city,
        graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
        careerObjective: form.careerObjective || '',
      })
      setUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (err) {
      setError(err.message || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl card">
      <p className="label">Matching profile</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Your career signal</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
        AI recommendations become sharper when your university, major, city, graduation year, and career focus are accurate.
      </p>
      {error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          ['fullName', 'Full name', 'text'],
          ['email', 'Email', 'email'],
          ['university', 'University', 'text'],
          ['major', 'Major', 'text'],
          ['city', 'City', 'text'],
          ['graduationYear', 'Graduation year', 'number'],
        ].map(([name, label, type]) => (
          <label key={name}>
            <span className="label">{label}</span>
            <input
              className="input mt-2"
              type={type}
              value={form[name] || ''}
              disabled={name === 'email'}
              onChange={(event) => setForm({ ...form, [name]: event.target.value })}
            />
          </label>
        ))}
      </div>
      <label className="mt-5 block">
        <span className="label">Career focus</span>
        <textarea
          className="input mt-2 min-h-32 resize-y"
          value={form.careerObjective || ''}
          onChange={(event) => setForm({ ...form, careerObjective: event.target.value })}
          maxLength={1000}
          placeholder="Example: I am looking for software engineering internships in Kuala Lumpur, especially backend, AI, APIs, and cloud projects."
        />
        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Used by AI recommendations, sourcing, chat context, cover letters, and admin opportunity matching.
        </p>
      </label>
      <div className="mt-6 flex items-center gap-3">
        <button className="btn-primary" disabled={saving}>
          <Save size={17} />
          {saving ? 'Saving...' : 'Save profile'}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Saved successfully</span>}
      </div>
    </form>
  )
}

export default Profile
