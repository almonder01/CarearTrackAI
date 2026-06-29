import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { careerApi } from '../lib/api.js'
import { useAuth } from '../context/useAuth.js'

function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState(user || {})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    careerApi.getMe().then((profile) => {
      setForm(profile)
      setUser(profile)
    })
  }, [setUser])

  async function submit(event) {
    event.preventDefault()
    const updated = await careerApi.updateMe({
      fullName: form.fullName,
      university: form.university,
      major: form.major,
      city: form.city,
      graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
    })
    setUser(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl card">
      <p className="label">Matching profile</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Your career signal</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
        AI recommendations become sharper when your university, major, city, and graduation year are accurate.
      </p>
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
      <div className="mt-6 flex items-center gap-3">
        <button className="btn-primary">
          <Save size={17} />
          Save profile
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Saved successfully</span>}
      </div>
    </form>
  )
}

export default Profile
