import { useMemo } from 'react'
import { Download, FileUp, LoaderCircle, Trash2 } from 'lucide-react'
import DismissibleNotice from '../../components/DismissibleNotice.jsx'
import { companyHeaders, opportunityHeaders } from './dataHubUtils.js'

function PreviewPanel({
  rows,
  dataset,
  source,
  importResult,
  operationMessage,
  importing,
  onRowChange,
  onRemove,
  onClear,
  onImport,
  onDownload,
  onDismissOperationMessage,
  onDismissImportResult,
}) {
  const headers = dataset === 'companies' ? companyHeaders : opportunityHeaders
  const summarizedErrors = useMemo(() => {
    const counts = new Map()
    ;(importResult?.errors || []).forEach((error) => counts.set(error, (counts.get(error) || 0) + 1))
    return [...counts.entries()].map(([error, count]) => (count > 1 ? `${error} (${count} rows)` : error))
  }, [importResult])

  return (
    <div className="card overflow-hidden">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="label">Review workspace</p>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
            {rows.length} {dataset} rows
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {source || 'Nothing loaded yet'} {rows.length > 0 ? `| Import selected sends these rows to ${dataset === 'companies' ? 'Companies' : 'Opportunities'}.` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onClear} disabled={rows.length === 0 && !source} className="btn-secondary">
            <Trash2 size={17} />
            Clear
          </button>
          <button type="button" onClick={onDownload} disabled={rows.length === 0} className="btn-secondary">
            <Download size={17} />
            Download CSV
          </button>
          <button type="button" onClick={onImport} disabled={rows.length === 0 || importing} className="btn-primary">
            {importing ? <LoaderCircle className="animate-spin" size={17} /> : <FileUp size={17} />}
            {importing ? 'Importing...' : 'Import selected'}
          </button>
        </div>
      </div>

      {operationMessage && (
        <DismissibleNotice
          className="mb-4 border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          onDismiss={onDismissOperationMessage}
        >
          {operationMessage}
        </DismissibleNotice>
      )}

      {importResult && (
        <DismissibleNotice
          className={`mb-4 text-sm ${
            importResult.created > 0 || importResult.updated > 0
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
          }`}
          onDismiss={onDismissImportResult}
        >
          Created {importResult.created}, updated {importResult.updated}, skipped {importResult.skipped}.
          {summarizedErrors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {summarizedErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </DismissibleNotice>
      )}

      <div className="max-h-[min(62vh,560px)] w-full overflow-auto overscroll-contain rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">Actions</th>
              {headers.map((header) => (
                <th key={header} className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.title || row.name || 'row'}-${index}`} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
                    title="Remove row"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
                {headers.map((header) => (
                  <td key={header} className="min-w-44 px-3 py-3">
                    <input
                      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-slate-700 outline-none transition focus:border-teal-300 focus:bg-white dark:text-slate-300 dark:focus:border-teal-700 dark:focus:bg-slate-900"
                      value={row[header] || ''}
                      onChange={(event) => onRowChange(index, header, event.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex min-h-44 items-center justify-center text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            Search, upload, or ask AI to create preview rows.
          </div>
        )}
      </div>
    </div>
  )
}

export default PreviewPanel
