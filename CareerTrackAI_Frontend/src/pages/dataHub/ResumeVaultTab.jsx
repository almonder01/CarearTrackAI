import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'

function ResumeVaultTab({ resumes, aiResumeVersions }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label">Resume vault</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Uploaded CVs and AI-generated versions</h3>
          </div>
          <Link to="/resumes" className="btn-secondary">
            <FileText size={17} />
            Open Resumes
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {resumes.map((resume) => (
            <div key={resume.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="font-bold text-slate-950 dark:text-white">{resume.label}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {resume.fileType?.toUpperCase() || 'CV'} | {(resume.versions || []).length} AI versions
              </p>
            </div>
          ))}
        </div>
      </div>
      <aside className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/50">
        <p className="label">CV inventory</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-3xl font-bold text-amber-950 dark:text-amber-100">{resumes.length}</p>
            <p className="text-sm text-amber-800 dark:text-amber-200">Original CVs</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-amber-950 dark:text-amber-100">{aiResumeVersions.length}</p>
            <p className="text-sm text-amber-800 dark:text-amber-200">AI versions</p>
          </div>
        </div>
      </aside>
    </section>
  )
}

export default ResumeVaultTab
