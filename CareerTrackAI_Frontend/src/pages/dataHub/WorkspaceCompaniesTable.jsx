import { Trash2 } from 'lucide-react'
import { visibleCompanyFields } from './dataHubUtils.js'

function CompaniesTable({ companies, saveCompany, deleteCompany, savingSharedIds, companyValue, updateCompanyDraft }) {
  return (
    <div className="mt-6 max-h-[min(62vh,560px)] w-full max-w-full overflow-auto overscroll-contain rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <table className="w-full min-w-[2140px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          <tr>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">Actions</th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">scope</th>
            {visibleCompanyFields.map((header) => (
              <th key={header} className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {companies.length === 0 ? (
            <tr>
              <td colSpan={visibleCompanyFields.length + 2} className="px-3 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                No companies match the current filters.
              </td>
            </tr>
          ) : companies.map((company) => (
            <tr key={company.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="px-3 py-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => saveCompany(company)} disabled={savingSharedIds.includes(company.id)} className="cursor-pointer rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-teal-950/70 dark:text-teal-200">
                    {savingSharedIds.includes(company.id) ? 'Saving...' : company.isShared ? 'Save to mine' : 'Save'}
                  </button>
                  <button type="button" onClick={() => deleteCompany(company.id)} disabled={company.isShared} className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300" title={company.isShared ? 'Shared rows cannot be edited here' : 'Delete company'}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
              <td className="px-3 py-3">
                <span className={company.isShared ? 'status-pill bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200' : 'status-pill bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200'}>
                  {company.isShared ? 'Shared' : 'Mine'}
                </span>
              </td>
              {visibleCompanyFields.map((header) => (
                <td key={header} className="min-w-40 px-3 py-3 text-slate-700 dark:text-slate-300">
                  <input
                    className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 outline-none transition focus:border-teal-300 focus:bg-white dark:focus:border-teal-700 dark:focus:bg-slate-900"
                    value={companyValue(company, header)}
                    onChange={(event) => updateCompanyDraft(company.id, header, event.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


export default CompaniesTable
