import { opportunityToRow, visibleOpportunityFields } from './dataHubUtils.js'

function OpportunitiesTable({ opportunities, saveSharedOpportunity, savingSharedIds }) {
  return (
    <div className="mt-6 max-h-[min(62vh,560px)] w-full max-w-full overflow-auto overscroll-contain rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <table className="w-full min-w-[1220px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          <tr>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">Actions</th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">scope</th>
            {visibleOpportunityFields.map((header) => (
              <th key={header} className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {opportunities.length === 0 ? (
            <tr>
              <td colSpan={visibleOpportunityFields.length + 2} className="px-3 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                No opportunities match the current filters.
              </td>
            </tr>
          ) : opportunities.map((opportunity) => {
            const row = opportunityToRow(opportunity)
            return (
              <tr key={opportunity.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => saveSharedOpportunity(opportunity)}
                    disabled={!opportunity.isShared || savingSharedIds.includes(opportunity.id)}
                    className="cursor-pointer rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-teal-950/70 dark:text-teal-200"
                  >
                    {savingSharedIds.includes(opportunity.id) ? 'Saving...' : opportunity.isShared ? 'Save to mine' : 'Saved'}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <span className={opportunity.isShared ? 'status-pill bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200' : 'status-pill bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200'}>
                    {opportunity.isShared ? 'Shared' : 'Mine'}
                  </span>
                </td>
                {visibleOpportunityFields.map((header) => (
                  <td key={header} className="min-w-40 px-3 py-3 text-slate-700 dark:text-slate-300">
                    {header === 'jobUrl' && row[header] ? (
                      <a href={row[header]} target="_blank" rel="noreferrer" className="font-semibold text-teal-700 hover:underline dark:text-teal-300">
                        Open link
                      </a>
                    ) : (
                      row[header] || '-'
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}


export default OpportunitiesTable
