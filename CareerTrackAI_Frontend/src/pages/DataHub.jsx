import DismissibleNotice from '../components/DismissibleNotice.jsx'
import AiSourcingTab from './dataHub/AiSourcingTab.jsx'
import ManualImportTab from './dataHub/ManualImportTab.jsx'
import ResumeVaultTab from './dataHub/ResumeVaultTab.jsx'
import WorkspaceDatabaseTab from './dataHub/WorkspaceDatabaseTab.jsx'
import { tabs } from './dataHub/dataHubUtils.js'
import useDataHubController from './dataHub/useDataHubController.js'

function DataHub() {
  const hub = useDataHubController()

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => hub.setActiveTab(id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${
              hub.activeTab === id
                ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {hub.loadError && (
        <DismissibleNotice
          className="border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          onDismiss={() => hub.setLoadError('')}
        >
          {hub.loadError}
        </DismissibleNotice>
      )}

      {hub.activeTab === 'companies' && <WorkspaceDatabaseTab {...hub} />}
      {hub.activeTab === 'resumes' && <ResumeVaultTab {...hub} />}
      {hub.activeTab === 'manual' && <ManualImportTab {...hub} />}
      {hub.activeTab === 'ai' && <AiSourcingTab {...hub} />}
    </div>
  )
}

export default DataHub
