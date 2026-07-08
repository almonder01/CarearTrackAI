import { Database, FileDown, FileUp, LoaderCircle, Search, Wand2 } from 'lucide-react'
import DismissibleNotice from '../../components/DismissibleNotice.jsx'
import WorkspaceCompaniesTable from './WorkspaceCompaniesTable.jsx'
import WorkspaceOpportunitiesTable from './WorkspaceOpportunitiesTable.jsx'

function WorkspaceDatabaseTab({
  databaseView,
  setDatabaseView,
  exportFromBackend,
  includeSharedCompanies,
  setIncludeSharedCompanies,
  includeSharedOpportunities,
  setIncludeSharedOpportunities,
  setActiveDataset,
  setActiveTab,
  completeDatabaseRowsWithAi,
  loadingAi,
  companies,
  opportunities,
  operationMessage,
  setOperationMessage,
  databaseFilters,
  setDatabaseFilters,
  companyCountryOptions,
  opportunityTypeOptions,
  companySourceOptions,
  opportunitySourceOptions,
  filteredCompanies,
  filteredOpportunities,
  saveCompany,
  deleteCompany,
  savingSharedIds,
  companyValue,
  updateCompanyDraft,
  saveSharedOpportunity,
}) {
  return (
    <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="card min-w-0 overflow-hidden">
        <p className="label">Workspace database</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Companies and opportunities in your database</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Review the data already saved in your workspace, export it, or send it back to the review workspace for strict AI field completion.
        </p>
        <div className="mt-7">
          <span className="label">View</span>
          <div className="mt-2 grid w-full grid-cols-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
            {[
              ['companies', 'Companies'],
              ['opportunities', 'Opportunities'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDatabaseView(value)}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  databaseView === value ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => exportFromBackend(databaseView)} className="btn-primary">
            <FileDown size={17} />
            Export {databaseView}
          </button>
          {databaseView === 'companies' && (
            <button type="button" onClick={() => setIncludeSharedCompanies((value) => !value)} className="btn-secondary">
              <Database size={17} />
              {includeSharedCompanies ? 'Show my companies only' : 'Load shared Companies'}
            </button>
          )}
          {databaseView === 'opportunities' && (
            <button type="button" onClick={() => setIncludeSharedOpportunities((value) => !value)} className="btn-secondary">
              <Database size={17} />
              {includeSharedOpportunities ? 'Show my opportunities only' : 'Load shared Opportunities'}
            </button>
          )}
          <button
            onClick={() => {
              setActiveDataset(databaseView)
              setActiveTab('manual')
            }}
            className="btn-secondary"
          >
            <FileUp size={17} />
            Import CSV
          </button>
          <button onClick={completeDatabaseRowsWithAi} disabled={loadingAi || (databaseView === 'companies' ? companies.length === 0 : opportunities.length === 0)} className="btn-secondary">
            {loadingAi ? <LoaderCircle className="animate-spin" size={17} /> : <Wand2 size={17} />}
            {loadingAi ? 'Completing...' : 'Strict AI complete fields'}
          </button>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
          {databaseView === 'companies'
            ? 'Save to mine copies one shared company into your private workspace. Save updates your own company rows.'
            : 'Save to mine copies one shared opportunity and its company into your private workspace. Personal opportunities are managed from Opportunities.'}
        </p>
        {operationMessage && (
          <DismissibleNotice
            className="mt-5 border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            onDismiss={() => setOperationMessage('')}
          >
            {operationMessage}
          </DismissibleNotice>
        )}
        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(220px,1fr)_140px_170px_190px]">
          <label className="block">
            <span className="label">Search</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                className="input pl-10"
                value={databaseFilters.search}
                onChange={(event) => setDatabaseFilters({ ...databaseFilters, search: event.target.value })}
                placeholder={databaseView === 'companies' ? 'Company, industry, city, website' : 'Role, company, skills, location'}
              />
            </div>
          </label>
          <label className="block">
            <span className="label">Scope</span>
            <select className="input mt-2" value={databaseFilters.scope} onChange={(event) => setDatabaseFilters({ ...databaseFilters, scope: event.target.value })}>
              <option value="">All rows</option>
              <option value="mine">Mine</option>
              <option value="shared">Shared</option>
            </select>
          </label>
          {databaseView === 'companies' ? (
            <label className="block">
              <span className="label">Country</span>
              <select className="input mt-2" value={databaseFilters.country} onChange={(event) => setDatabaseFilters({ ...databaseFilters, country: event.target.value })}>
                <option value="">All countries</option>
                {companyCountryOptions.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block">
              <span className="label">Type</span>
              <select className="input mt-2" value={databaseFilters.type} onChange={(event) => setDatabaseFilters({ ...databaseFilters, type: event.target.value })}>
                <option value="">All types</option>
                {opportunityTypeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="label">Source</span>
            <select className="input mt-2" value={databaseFilters.source} onChange={(event) => setDatabaseFilters({ ...databaseFilters, source: event.target.value })}>
              <option value="">All sources</option>
              {(databaseView === 'companies' ? companySourceOptions : opportunitySourceOptions).map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </label>
        </div>
        {databaseView === 'companies' ? (
          <WorkspaceCompaniesTable
            companies={filteredCompanies}
            saveCompany={saveCompany}
            deleteCompany={deleteCompany}
            savingSharedIds={savingSharedIds}
            companyValue={companyValue}
            updateCompanyDraft={updateCompanyDraft}
          />
        ) : (
          <WorkspaceOpportunitiesTable opportunities={filteredOpportunities} saveSharedOpportunity={saveSharedOpportunity} savingSharedIds={savingSharedIds} />
        )}
      </div>

      <aside className="min-w-0 rounded-lg border border-teal-200 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-950/60">
        <p className="label">Database status</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-bold text-teal-950 dark:text-white">{companies.length}</p>
            <p className="text-sm text-teal-800 dark:text-teal-200">Companies</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-teal-950 dark:text-white">{opportunities.length}</p>
            <p className="text-sm text-teal-800 dark:text-teal-200">Opportunities</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-teal-800 dark:text-teal-200">
          Review rows here, then use strict AI completion to send them into the editable review workspace before importing updates.
        </p>
      </aside>
    </section>
  )
}

export default WorkspaceDatabaseTab
