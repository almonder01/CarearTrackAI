import { Edit3, LoaderCircle, Save, Search, Trash2, X } from 'lucide-react'
import { emptyCompanyForm } from './adminUtils.js'

function SharedCompaniesPanel({
  saveSharedCompany,
  editingCompanyId,
  companyForm,
  setCompanyForm,
  workingId,
  setEditingCompanyId,
  companyFilters,
  setCompanyFilters,
  companyCountryOptions,
  companySourceOptions,
  filteredSharedCompanies,
  editCompany,
  deleteSharedCompany,
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(520px,600px)_minmax(0,1fr)]">
      <form onSubmit={saveSharedCompany} className="card h-fit">
        <p className="label">Shared company</p>
        <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{editingCompanyId ? 'Edit company' : 'Add company'}</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">Name</span>
            <input className="input mt-2" value={companyForm.name || ''} onChange={(event) => setCompanyForm({ ...companyForm, name: event.target.value })} required />
          </label>
          <label className="block">
            <span className="label">Industry</span>
            <input className="input mt-2" value={companyForm.industry || ''} onChange={(event) => setCompanyForm({ ...companyForm, industry: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Source provider</span>
            <input className="input mt-2" value={companyForm.sourceProvider || ''} onChange={(event) => setCompanyForm({ ...companyForm, sourceProvider: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">City</span>
            <input className="input mt-2" value={companyForm.city || ''} onChange={(event) => setCompanyForm({ ...companyForm, city: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Country</span>
            <input className="input mt-2" value={companyForm.country || ''} onChange={(event) => setCompanyForm({ ...companyForm, country: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Website</span>
            <input className="input mt-2" value={companyForm.website || ''} onChange={(event) => setCompanyForm({ ...companyForm, website: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input className="input mt-2" value={companyForm.email || ''} onChange={(event) => setCompanyForm({ ...companyForm, email: event.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Source URL</span>
            <input className="input mt-2" value={companyForm.sourceUrl || ''} onChange={(event) => setCompanyForm({ ...companyForm, sourceUrl: event.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Description</span>
            <textarea className="input mt-2 min-h-24 resize-y" value={companyForm.description || ''} onChange={(event) => setCompanyForm({ ...companyForm, description: event.target.value })} />
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="submit" disabled={workingId === 'company-form'} className="btn-primary flex-1">
            {workingId === 'company-form' ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
            {editingCompanyId ? 'Update' : 'Add'}
          </button>
          {editingCompanyId && (
            <button type="button" onClick={() => { setEditingCompanyId(null); setCompanyForm(emptyCompanyForm) }} className="btn-secondary px-3">
              <X size={17} />
            </button>
          )}
        </div>
      </form>

      <section className="card min-w-0 overflow-hidden">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_220px]">
          <label className="block">
            <span className="label">Search companies</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                className="input pl-10"
                value={companyFilters.search}
                onChange={(event) => setCompanyFilters({ ...companyFilters, search: event.target.value })}
                placeholder="Name, industry, city, website"
              />
            </div>
          </label>
          <label className="block">
            <span className="label">Country</span>
            <select className="input mt-2" value={companyFilters.country} onChange={(event) => setCompanyFilters({ ...companyFilters, country: event.target.value })}>
              <option value="">All countries</option>
              {companyCountryOptions.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Source</span>
            <select className="input mt-2" value={companyFilters.source} onChange={(event) => setCompanyFilters({ ...companyFilters, source: event.target.value })}>
              <option value="">All sources</option>
              {companySourceOptions.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSharedCompanies.length === 0 ? (
                <tr className="bg-white dark:bg-slate-900">
                  <td colSpan={4} className="px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                    No shared companies match the current filters.
                  </td>
                </tr>
              ) : filteredSharedCompanies.map((company) => (
                <tr key={company.id} className="bg-white dark:bg-slate-900">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-950 dark:text-white">{company.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{company.industry || 'No industry'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{[company.city, company.country].filter(Boolean).join(', ') || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{company.sourceProvider || 'Shared Database'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => editCompany(company)} className="btn-secondary px-3 py-2">
                        <Edit3 size={15} />
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteSharedCompany(company)} disabled={workingId === `company-${company.id}`} className="btn-secondary px-3 py-2 text-rose-700 dark:text-rose-200">
                        {workingId === `company-${company.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}


export default SharedCompaniesPanel
