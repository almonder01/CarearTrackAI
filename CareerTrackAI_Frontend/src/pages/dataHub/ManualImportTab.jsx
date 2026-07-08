import { Download, FileUp, LoaderCircle, Wand2 } from 'lucide-react'
import DismissibleNotice from '../../components/DismissibleNotice.jsx'
import PreviewPanel from './PreviewPanel.jsx'

function ManualImportTab({
  activeDataset,
  setActiveDataset,
  setPreviewRows,
  setPreviewSource,
  setImportResult,
  handleFile,
  downloadTemplate,
  aiFillRows,
  loadingAi,
  previewRows,
  aiNote,
  setAiNote,
  previewPanelProps,
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <div className="card h-fit">
        <p className="label">Manual import</p>
        <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Upload and enrich CSV rows</h3>
        <div className="mt-5">
          <span className="label">Target</span>
          <div className="mt-2 flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
            {[
              ['companies', 'Companies'],
              ['opportunities', 'Opportunities'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setActiveDataset(value)
                  setPreviewRows([])
                  setPreviewSource('')
                  setImportResult(null)
                }}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
                  activeDataset === value ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900">
          <FileUp className="mb-3 text-slate-500 dark:text-slate-400" />
          <span className="font-bold text-slate-950 dark:text-white">Choose CSV file</span>
          <span className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use the template headers for best results.</span>
          <input className="hidden" type="file" accept=".csv" onChange={handleFile} />
        </label>
        <button onClick={downloadTemplate} className="btn-secondary mt-4 w-full">
          <Download size={17} />
          Download template
        </button>
        <button onClick={aiFillRows} className="btn-secondary mt-3 w-full" disabled={previewRows.length === 0 || loadingAi}>
          {loadingAi ? <LoaderCircle className="animate-spin" size={17} /> : <Wand2 size={17} />}
          {loadingAi ? 'Filling fields...' : 'Fill missing fields with AI'}
        </button>
        {loadingAi && <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">AI is still reviewing the preview rows.</p>}
        {aiNote && (
          <DismissibleNotice
            className="mt-4 border-amber-200 bg-amber-50 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            onDismiss={() => setAiNote('')}
          >
            {aiNote}
          </DismissibleNotice>
        )}
      </div>
      <PreviewPanel {...previewPanelProps} />
    </section>
  )
}

export default ManualImportTab
