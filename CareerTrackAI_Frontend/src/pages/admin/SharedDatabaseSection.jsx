import { BriefcaseBusiness, Building2, Database, LoaderCircle } from 'lucide-react'
import SharedCompaniesPanel from './SharedCompaniesPanel.jsx'
import SharedOpportunitiesPanel from './SharedOpportunitiesPanel.jsx'

function SharedDatabaseSection({
  databaseLoading,
  loadSharedDatabase,
  databaseMode,
  setDatabaseMode,
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
  saveSharedOpportunity,
  editingOpportunityId,
  opportunityForm,
  setOpportunityForm,
  sharedCompanyOptions,
  setEditingOpportunityId,
  opportunityFilters,
  setOpportunityFilters,
  opportunityTypeOptions,
  opportunitySourceOptions,
  checkAllNotificationTargets,
  checkingAll,
  sharedOpportunities,
  filteredSharedOpportunities,
  notificationChecks,
  openNotificationDialog,
  editOpportunity,
  deleteSharedOpportunity,
}) {
  return (
    <section className="space-y-6">
      <div className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="label">Shared database</p>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Shared Companies and Shared Opportunities</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Rows here are visible only when users choose to load shared data.</p>
          </div>
          <button type="button" onClick={() => loadSharedDatabase()} className="btn-secondary">
            {databaseLoading ? <LoaderCircle className="animate-spin" size={17} /> : <Database size={17} />}
            Refresh
          </button>
        </div>
        <div className="mt-5 flex max-w-lg rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
          {[
            ['companies', 'Shared Companies', Building2],
            ['opportunities', 'Shared Opportunities', BriefcaseBusiness],
          ].map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDatabaseMode(value)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
                databaseMode === value ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Icon size={16} />
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {databaseMode === 'companies' ? (
        <SharedCompaniesPanel
          saveSharedCompany={saveSharedCompany}
          editingCompanyId={editingCompanyId}
          companyForm={companyForm}
          setCompanyForm={setCompanyForm}
          workingId={workingId}
          setEditingCompanyId={setEditingCompanyId}
          companyFilters={companyFilters}
          setCompanyFilters={setCompanyFilters}
          companyCountryOptions={companyCountryOptions}
          companySourceOptions={companySourceOptions}
          filteredSharedCompanies={filteredSharedCompanies}
          editCompany={editCompany}
          deleteSharedCompany={deleteSharedCompany}
        />
      ) : (
        <SharedOpportunitiesPanel
          saveSharedOpportunity={saveSharedOpportunity}
          editingOpportunityId={editingOpportunityId}
          opportunityForm={opportunityForm}
          setOpportunityForm={setOpportunityForm}
          sharedCompanyOptions={sharedCompanyOptions}
          workingId={workingId}
          setEditingOpportunityId={setEditingOpportunityId}
          opportunityFilters={opportunityFilters}
          setOpportunityFilters={setOpportunityFilters}
          opportunityTypeOptions={opportunityTypeOptions}
          opportunitySourceOptions={opportunitySourceOptions}
          checkAllNotificationTargets={checkAllNotificationTargets}
          checkingAll={checkingAll}
          sharedOpportunities={sharedOpportunities}
          filteredSharedOpportunities={filteredSharedOpportunities}
          notificationChecks={notificationChecks}
          openNotificationDialog={openNotificationDialog}
          editOpportunity={editOpportunity}
          deleteSharedOpportunity={deleteSharedOpportunity}
        />
      )}
    </section>
  )
}

export default SharedDatabaseSection
