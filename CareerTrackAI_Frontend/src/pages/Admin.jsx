import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, BriefcaseBusiness, Building2, Database, Edit3, LoaderCircle, Save, Search, Send, ShieldCheck, Trash2, UserCog, UserPlus, X } from 'lucide-react'
import dayjs from 'dayjs'
import { careerApi } from '../lib/api.js'
import { useAuth } from '../context/useAuth.js'

const emptyCompanyForm = {
  name: '',
  industry: '',
  description: '',
  city: '',
  country: '',
  website: '',
  email: '',
  phone: '',
  linkedInUrl: '',
  logoUrl: '',
  sourceUrl: '',
  sourceProvider: 'Admin Shared Database',
}

const emptyOpportunityForm = {
  title: '',
  companyId: '',
  type: 'Internship',
  employmentType: '',
  description: '',
  location: '',
  isRemote: false,
  salaryMin: '',
  salaryMax: '',
  applicationDeadline: '',
  requiredSkills: '',
  jobUrl: '',
  sourceUrl: '',
  sourceProvider: 'Admin Shared Database',
  isActive: true,
}

function roleLabel(role) {
  return role === 'Student' ? 'User' : role
}

function cleanPayload(payload) {
  return Object.entries(payload).reduce((next, [key, value]) => {
    if (value === '') return next
    next[key] = value
    return next
  }, {})
}

function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

function includesText(value, term) {
  return normalizeText(value).includes(term)
}

function uniqueValues(items, selector) {
  return [...new Set(items.map(selector).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
}

function userActionConfirmation(targetUser, action) {
  if (action === 'make-admin') {
    return {
      title: 'Grant admin access?',
      message: `${targetUser.fullName} will be able to manage users, shared companies, shared opportunities, and send notifications.`,
      note: 'Use this only for trusted project administrators.',
      confirmLabel: 'Make admin',
      danger: false,
    }
  }

  if (action === 'remove-admin') {
    return {
      title: 'Remove admin access?',
      message: `${targetUser.fullName} will no longer be able to manage users or the shared database.`,
      note: 'The backend will block this if this account is the last remaining admin.',
      confirmLabel: 'Remove admin',
      danger: true,
    }
  }

  if (action === 'delete') {
    return {
      title: 'Delete this user?',
      message: `${targetUser.fullName}'s account will be deleted from the system.`,
      note: 'If this is the only admin, the backend will block the action. Continue only if the account is no longer needed.',
      confirmLabel: 'Delete user',
      danger: true,
    }
  }

  return null
}

function Admin() {
  const { user } = useAuth()
  const [section, setSection] = useState('users')
  const [databaseMode, setDatabaseMode] = useState('companies')
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [databaseLoading, setDatabaseLoading] = useState(false)
  const [workingId, setWorkingId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [sharedCompanies, setSharedCompanies] = useState([])
  const [sharedOpportunities, setSharedOpportunities] = useState([])
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm)
  const [opportunityForm, setOpportunityForm] = useState(emptyOpportunityForm)
  const [editingCompanyId, setEditingCompanyId] = useState(null)
  const [editingOpportunityId, setEditingOpportunityId] = useState(null)
  const [pendingUserAction, setPendingUserAction] = useState(null)
  const [notificationChecks, setNotificationChecks] = useState({})
  const [notificationDialog, setNotificationDialog] = useState(null)
  const [bulkCheckDialog, setBulkCheckDialog] = useState(null)
  const [checkingAll, setCheckingAll] = useState(false)
  const [companyFilters, setCompanyFilters] = useState({ search: '', country: '', source: '' })
  const [opportunityFilters, setOpportunityFilters] = useState({ search: '', type: '', source: '' })
  const isAdmin = user?.role?.toLowerCase() === 'admin'

  const sharedCompanyOptions = useMemo(() => sharedCompanies.map((company) => [company.id, company.name]), [sharedCompanies])
  const companyCountryOptions = useMemo(() => uniqueValues(sharedCompanies, (company) => company.country), [sharedCompanies])
  const companySourceOptions = useMemo(() => uniqueValues(sharedCompanies, (company) => company.sourceProvider || 'Shared Database'), [sharedCompanies])
  const opportunityTypeOptions = useMemo(() => uniqueValues(sharedOpportunities, (opportunity) => opportunity.type), [sharedOpportunities])
  const opportunitySourceOptions = useMemo(() => uniqueValues(sharedOpportunities, (opportunity) => opportunity.sourceProvider || 'Shared Database'), [sharedOpportunities])
  const filteredSharedCompanies = useMemo(() => {
    const term = normalizeText(companyFilters.search)
    return sharedCompanies.filter((company) => {
      const matchesTerm =
        !term ||
        [company.name, company.industry, company.city, company.country, company.website, company.sourceProvider]
          .some((value) => includesText(value, term))
      const matchesCountry = !companyFilters.country || company.country === companyFilters.country
      const source = company.sourceProvider || 'Shared Database'
      const matchesSource = !companyFilters.source || source === companyFilters.source
      return matchesTerm && matchesCountry && matchesSource
    })
  }, [companyFilters, sharedCompanies])
  const filteredSharedOpportunities = useMemo(() => {
    const term = normalizeText(opportunityFilters.search)
    return sharedOpportunities.filter((opportunity) => {
      const matchesTerm =
        !term ||
        [
          opportunity.title,
          opportunity.description,
          opportunity.requiredSkills,
          opportunity.location,
          opportunity.company?.name,
          opportunity.company?.industry,
          opportunity.sourceProvider,
        ].some((value) => includesText(value, term))
      const matchesType = !opportunityFilters.type || opportunity.type === opportunityFilters.type
      const source = opportunity.sourceProvider || 'Shared Database'
      const matchesSource = !opportunityFilters.source || source === opportunityFilters.source
      return matchesTerm && matchesType && matchesSource
    })
  }, [opportunityFilters, sharedOpportunities])

  async function loadUsers(nextSearch = search, { clearFeedback = true } = {}) {
    setLoading(true)
    if (clearFeedback) setFeedback(null)
    try {
      setUsers(await careerApi.adminUsers({ search: nextSearch || undefined }))
    } catch (error) {
      setUsers([])
      setFeedback({ type: 'error', text: error.message || 'Could not load users.' })
    } finally {
      setLoading(false)
    }
  }

  async function loadSharedDatabase({ clearFeedback = true } = {}) {
    setDatabaseLoading(true)
    if (clearFeedback) setFeedback(null)
    try {
      const result = await careerApi.adminSharedDatabase()
      setSharedCompanies(result.sharedCompanies || [])
      setSharedOpportunities(result.sharedOpportunities || [])
      setNotificationChecks({})
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not load shared database.' })
    } finally {
      setDatabaseLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    loadUsers('')
    loadSharedDatabase({ clearFeedback: false })
  }, [isAdmin])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 4600)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (!isAdmin) {
    return (
      <div className="card">
        <p className="label">Restricted</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Admin access required</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Only administrators can manage users and shared database rows.</p>
      </div>
    )
  }

  async function createAdmin(event) {
    event.preventDefault()
    setCreating(true)
    setFeedback(null)
    try {
      await careerApi.createAdmin(form)
      setForm({ fullName: '', email: '', password: '' })
      await loadUsers(search, { clearFeedback: false })
      setFeedback({ type: 'success', text: 'Admin account created. The new admin should sign in again to receive admin access.' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not create admin account.' })
    } finally {
      setCreating(false)
    }
  }

  function requestUserAction(targetUser, action) {
    setPendingUserAction({ targetUser, action })
  }

  async function runUserAction(targetUser, action) {
    setWorkingId(`user-${targetUser.id}`)
    setFeedback(null)
    try {
      if (action === 'make-admin') {
        await careerApi.makeAdmin(targetUser.id)
        await loadUsers(search, { clearFeedback: false })
        setFeedback({ type: 'success', text: `${targetUser.fullName} is now an admin. They should sign in again to receive admin access.` })
        return
      }
      if (action === 'remove-admin') {
        await careerApi.removeAdmin(targetUser.id)
        await loadUsers(search, { clearFeedback: false })
        setFeedback({ type: 'success', text: `Admin role removed from ${targetUser.fullName}.` })
        return
      }
      if (action === 'delete') {
        await careerApi.deleteUser(targetUser.id)
        await loadUsers(search, { clearFeedback: false })
        setFeedback({ type: 'success', text: `${targetUser.fullName} was deleted.` })
      }
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Admin action could not be completed.' })
    } finally {
      setWorkingId(null)
    }
  }

  async function confirmPendingUserAction() {
    if (!pendingUserAction) return
    const { targetUser, action } = pendingUserAction
    setPendingUserAction(null)
    await runUserAction(targetUser, action)
  }

  async function saveSharedCompany(event) {
    event.preventDefault()
    setWorkingId('company-form')
    setFeedback(null)
    try {
      if (editingCompanyId) await careerApi.updateSharedCompany(editingCompanyId, cleanPayload(companyForm))
      else await careerApi.createSharedCompany(cleanPayload(companyForm))
      setCompanyForm(emptyCompanyForm)
      setEditingCompanyId(null)
      await loadSharedDatabase({ clearFeedback: false })
      setFeedback({ type: 'success', text: editingCompanyId ? 'Shared company updated.' : 'Shared company created.' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not save shared company.' })
    } finally {
      setWorkingId(null)
    }
  }

  async function saveSharedOpportunity(event) {
    event.preventDefault()
    setWorkingId('opportunity-form')
    setFeedback(null)
    try {
      const payload = cleanPayload({
        ...opportunityForm,
        companyId: Number(opportunityForm.companyId),
        salaryMin: opportunityForm.salaryMin === '' ? '' : Number(opportunityForm.salaryMin),
        salaryMax: opportunityForm.salaryMax === '' ? '' : Number(opportunityForm.salaryMax),
        employmentType: opportunityForm.employmentType || '',
      })
      if (editingOpportunityId) await careerApi.updateSharedOpportunity(editingOpportunityId, payload)
      else await careerApi.createSharedOpportunity(payload)
      setOpportunityForm(emptyOpportunityForm)
      setEditingOpportunityId(null)
      await loadSharedDatabase({ clearFeedback: false })
      setFeedback({ type: 'success', text: editingOpportunityId ? 'Shared opportunity updated.' : 'Shared opportunity created.' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not save shared opportunity.' })
    } finally {
      setWorkingId(null)
    }
  }

  async function deleteSharedCompany(company) {
    if (!window.confirm(`Delete shared company "${company.name}"? Linked shared opportunities will also be removed.`)) return
    setWorkingId(`company-${company.id}`)
    try {
      await careerApi.deleteSharedCompany(company.id)
      await loadSharedDatabase({ clearFeedback: false })
      setFeedback({ type: 'success', text: 'Shared company deleted.' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not delete shared company.' })
    } finally {
      setWorkingId(null)
    }
  }

  async function deleteSharedOpportunity(opportunity) {
    if (!window.confirm(`Delete shared opportunity "${opportunity.title}"?`)) return
    setWorkingId(`opportunity-${opportunity.id}`)
    try {
      await careerApi.deleteSharedOpportunity(opportunity.id)
      await loadSharedDatabase({ clearFeedback: false })
      setFeedback({ type: 'success', text: 'Shared opportunity deleted.' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not delete shared opportunity.' })
    } finally {
      setWorkingId(null)
    }
  }

  function storeNotificationCheck(check) {
    setNotificationChecks((current) => ({ ...current, [check.opportunityId]: check }))
  }

  async function checkNotificationTargets(opportunity) {
    setWorkingId(`check-${opportunity.id}`)
    setNotificationDialog({ opportunity, status: 'checking' })
    try {
      const check = await careerApi.previewSharedOpportunityNotification(opportunity.id)
      storeNotificationCheck(check)
      setNotificationDialog({ opportunity, status: 'ready', check })
    } catch (error) {
      setNotificationDialog({ opportunity, status: 'error', error: error.message || 'Could not check notification matches.' })
    } finally {
      setWorkingId(null)
    }
  }

  function openNotificationDialog(opportunity) {
    const check = notificationChecks[opportunity.id]
    if (check) {
      setNotificationDialog({ opportunity, status: 'ready', check, cached: true })
      return
    }

    checkNotificationTargets(opportunity)
  }

  async function sendCheckedNotification() {
    if (!notificationDialog?.opportunity || !notificationDialog?.check) return
    const { opportunity, check } = notificationDialog
    setWorkingId(`notify-${opportunity.id}`)
    setNotificationDialog({ ...notificationDialog, status: 'sending' })
    setToast(null)
    try {
      const result = await careerApi.notifySharedOpportunity(opportunity.id, { targetUserIds: check.targetUserIds || [] })
      setToast({ type: result.sent > 0 ? 'success' : 'error', text: result.message || `Notifications sent: ${result.sent || 0}.` })
      setNotificationDialog(null)
    } catch (error) {
      setNotificationDialog({ opportunity, status: 'ready', check, cached: Boolean(notificationDialog.cached), error: error.message || 'Could not send notifications.' })
    } finally {
      setWorkingId(null)
    }
  }

  async function checkAllNotificationTargets() {
    setCheckingAll(true)
    setBulkCheckDialog({ status: 'checking' })
    try {
      const result = await careerApi.previewAllSharedOpportunityNotifications()
      const nextChecks = {}
      for (const check of result.results || []) nextChecks[check.opportunityId] = check
      setNotificationChecks((current) => ({ ...current, ...nextChecks }))
      const checkedRows = (result.results || []).length
      const totalMatched = (result.results || []).reduce((sum, check) => sum + Number(check.matchedUsers || 0), 0)
      setBulkCheckDialog({ status: 'ready', checkedAt: result.checkedAt, checkedRows, totalMatched })
    } catch (error) {
      setBulkCheckDialog({ status: 'error', error: error.message || 'Could not check all shared opportunities.' })
    } finally {
      setCheckingAll(false)
    }
  }

  function editCompany(company) {
    setEditingCompanyId(company.id)
    setCompanyForm({ ...emptyCompanyForm, ...company })
    setDatabaseMode('companies')
  }

  function editOpportunity(opportunity) {
    setEditingOpportunityId(opportunity.id)
    setOpportunityForm({
      ...emptyOpportunityForm,
      ...opportunity,
      companyId: opportunity.company?.id || '',
      applicationDeadline: opportunity.applicationDeadline ? dayjs(opportunity.applicationDeadline).format('YYYY-MM-DD') : '',
      salaryMin: opportunity.salaryMin ?? '',
      salaryMax: opportunity.salaryMax ?? '',
      employmentType: opportunity.employmentType || '',
    })
    setDatabaseMode('opportunities')
  }

  const pendingConfirmation = pendingUserAction ? userActionConfirmation(pendingUserAction.targetUser, pendingUserAction.action) : null

  return (
    <div className="space-y-6">
      {pendingConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                  pendingConfirmation.danger
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
                }`}
              >
                <AlertTriangle size={22} />
              </div>
              <div className="min-w-0">
                <p className="label">Confirmation required</p>
                <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{pendingConfirmation.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{pendingConfirmation.message}</p>
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  {pendingConfirmation.note}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPendingUserAction(null)} className="btn-secondary justify-center">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPendingUserAction}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                  pendingConfirmation.danger
                    ? 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400'
                    : 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300'
                }`}
              >
                {pendingConfirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {notificationDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200">
                {notificationDialog.status === 'checking' || notificationDialog.status === 'sending' ? <LoaderCircle className="animate-spin" size={22} /> : <Bell size={22} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="label">Opportunity notification</p>
                <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{notificationDialog.opportunity?.title || 'Shared opportunity'}</h3>
                {notificationDialog.status === 'checking' && (
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Checking interested users with the latest profile signals and AI matching score.
                  </p>
                )}
                {notificationDialog.status === 'sending' && (
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Sending the notification to the checked users.</p>
                )}
                {notificationDialog.status === 'error' && (
                  <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                    {notificationDialog.error}
                  </p>
                )}
                {notificationDialog.status === 'ready' && notificationDialog.check && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Matched recipients</p>
                      <p className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">{notificationDialog.check.matchedUsers || 0}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{notificationDialog.check.message}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Checked {dayjs(notificationDialog.check.checkedAt).format('MMM D, YYYY h:mm A')}.
                      {notificationDialog.cached ? ' You can send directly using this check or recheck before sending.' : ' Review the result before sending.'}
                    </p>
                    {notificationDialog.error && (
                      <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                        {notificationDialog.error}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setNotificationDialog(null)} className="btn-secondary justify-center">
                Cancel
              </button>
              {notificationDialog.status === 'ready' && (
                <button type="button" onClick={() => checkNotificationTargets(notificationDialog.opportunity)} className="btn-secondary justify-center">
                  <Search size={16} />
                  Recheck
                </button>
              )}
              {notificationDialog.status === 'ready' && (
                <button
                  type="button"
                  onClick={sendCheckedNotification}
                  disabled={workingId === `notify-${notificationDialog.opportunity?.id}` || Number(notificationDialog.check?.matchedUsers || 0) === 0}
                  className="btn-primary justify-center"
                >
                  {workingId === `notify-${notificationDialog.opportunity?.id}` ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={17} />}
                  Confirm send
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {bulkCheckDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200">
                {bulkCheckDialog.status === 'checking' ? <LoaderCircle className="animate-spin" size={22} /> : <ShieldCheck size={22} />}
              </div>
              <div>
                <p className="label">Bulk notification check</p>
                <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {bulkCheckDialog.status === 'checking' ? 'Checking all opportunities' : 'Check completed'}
                </h3>
                {bulkCheckDialog.status === 'checking' && (
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">AI is scoring notification-enabled users for each shared opportunity.</p>
                )}
                {bulkCheckDialog.status === 'ready' && (
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Checked {bulkCheckDialog.checkedRows || 0} opportunities and found {bulkCheckDialog.totalMatched || 0} total matched recipients.
                    Notify buttons now use these checks until the shared database is refreshed.
                  </p>
                )}
                {bulkCheckDialog.status === 'error' && (
                  <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                    {bulkCheckDialog.error}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setBulkCheckDialog(null)} disabled={bulkCheckDialog.status === 'checking'} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
          <div
            className={`flex w-full max-w-xl items-start gap-3 rounded-lg border p-4 shadow-2xl backdrop-blur ${
              toast.type === 'error'
                ? 'border-rose-200 bg-rose-50/95 text-rose-900 dark:border-rose-800 dark:bg-rose-950/95 dark:text-rose-100'
                : 'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-100'
            }`}
          >
            <Bell size={18} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-sm font-semibold leading-6">{toast.text}</p>
            <button type="button" onClick={() => setToast(null)} className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <section className="card">
        <p className="label">Admin console</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ['users', 'User management', UserCog],
            ['database', 'Shared database', Database],
          ].map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSection(value)}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold transition ${
                section === value
                  ? 'border-slate-950 bg-slate-950 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>
      </section>

      {feedback && (
        <div
          className={`rounded-lg border p-3 text-sm font-semibold ${
            feedback.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {section === 'users' && (
        <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <form onSubmit={createAdmin} className="card h-fit">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950">
                <UserPlus size={21} />
              </div>
              <div>
                <p className="label">Access control</p>
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">Create admin</h2>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="label">Full name</span>
                <input className="input mt-2" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
              </label>
              <label className="block">
                <span className="label">Email</span>
                <input className="input mt-2" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
              </label>
              <label className="block">
                <span className="label">Temporary password</span>
                <input
                  className="input mt-2"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                  minLength={8}
                  pattern="^(?=.*[A-Za-z])(?=.*\d).+$"
                  title="Password must be at least 8 characters and include at least one letter and one number."
                />
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">At least 8 characters with one letter and one number.</p>
              </label>
            </div>
            <button type="submit" disabled={creating} className="btn-primary mt-5 w-full">
              {creating ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
              {creating ? 'Creating...' : 'Create admin'}
            </button>
          </form>

          <section className="card overflow-hidden">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="label">Users</p>
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">Admin and user management</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The backend blocks deleting or demoting the last remaining admin.</p>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  loadUsers(search)
                }}
                className="flex min-w-72 gap-2"
              >
                <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." />
                <button type="submit" className="btn-secondary px-3" title="Search">
                  <Search size={17} />
                </button>
              </form>
            </div>

            <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Profile</th>
                    <th className="px-4 py-3">Notifications</th>
                    <th className="px-4 py-3">Last login</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Loading users...
                      </td>
                    </tr>
                  ) : (
                    users.map((targetUser) => (
                      <tr key={targetUser.id} className="bg-white dark:bg-slate-900">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-950 dark:text-white">{targetUser.fullName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{targetUser.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={targetUser.role === 'Admin' ? 'status-pill bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200' : 'status-pill bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}>
                            {roleLabel(targetUser.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          <p>{targetUser.major || 'No major'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{targetUser.city || 'No city'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{targetUser.notificationsEnabled ? 'Allowed' : 'Off'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{targetUser.lastLoginAt ? dayjs(targetUser.lastLoginAt).format('MMM D, YYYY') : 'Never'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {targetUser.role === 'Admin' ? (
                              <button type="button" onClick={() => requestUserAction(targetUser, 'remove-admin')} disabled={workingId === `user-${targetUser.id}`} className="btn-secondary px-3 py-2">
                                {workingId === `user-${targetUser.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <UserCog size={15} />}
                                Remove admin
                              </button>
                            ) : (
                              <button type="button" onClick={() => requestUserAction(targetUser, 'make-admin')} disabled={workingId === `user-${targetUser.id}`} className="btn-secondary px-3 py-2">
                                {workingId === `user-${targetUser.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <ShieldCheck size={15} />}
                                Make admin
                              </button>
                            )}
                            <button type="button" onClick={() => requestUserAction(targetUser, 'delete')} disabled={workingId === `user-${targetUser.id}`} className="btn-secondary px-3 py-2 text-rose-700 dark:text-rose-200">
                              {workingId === `user-${targetUser.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {section === 'database' && (
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
            <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
              <form onSubmit={saveSharedCompany} className="card h-fit">
                <p className="label">Shared company</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{editingCompanyId ? 'Edit company' : 'Add company'}</h3>
                <div className="mt-5 space-y-3">
                  {[
                    ['name', 'Name', true],
                    ['industry', 'Industry'],
                    ['city', 'City'],
                    ['country', 'Country'],
                    ['website', 'Website'],
                    ['email', 'Email'],
                    ['sourceUrl', 'Source URL'],
                    ['sourceProvider', 'Source provider'],
                  ].map(([key, label, required]) => (
                    <label key={key} className="block">
                      <span className="label">{label}</span>
                      <input className="input mt-2" value={companyForm[key] || ''} onChange={(event) => setCompanyForm({ ...companyForm, [key]: event.target.value })} required={Boolean(required)} />
                    </label>
                  ))}
                  <label className="block">
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

              <section className="card overflow-hidden">
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
          ) : (
            <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <form onSubmit={saveSharedOpportunity} className="card h-fit">
                <p className="label">Shared opportunity</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{editingOpportunityId ? 'Edit opportunity' : 'Add opportunity'}</h3>
                <div className="mt-5 space-y-3">
                  <label className="block">
                    <span className="label">Company</span>
                    <select className="input mt-2" value={opportunityForm.companyId} onChange={(event) => setOpportunityForm({ ...opportunityForm, companyId: event.target.value })} required>
                      <option value="">Select shared company</option>
                      {sharedCompanyOptions.map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="label">Title</span>
                    <input className="input mt-2" value={opportunityForm.title} onChange={(event) => setOpportunityForm({ ...opportunityForm, title: event.target.value })} required />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="label">Type</span>
                      <select className="input mt-2" value={opportunityForm.type} onChange={(event) => setOpportunityForm({ ...opportunityForm, type: event.target.value })}>
                        <option value="Internship">Internship</option>
                        <option value="Job">Job</option>
                      </select>
                    </label>
                    <label>
                      <span className="label">Employment</span>
                      <select className="input mt-2" value={opportunityForm.employmentType} onChange={(event) => setOpportunityForm({ ...opportunityForm, employmentType: event.target.value })}>
                        <option value="">Not specified</option>
                        <option value="FullTime">Full-time</option>
                        <option value="PartTime">Part-time</option>
                        <option value="Contract">Contract</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="label">Location</span>
                      <input className="input mt-2" value={opportunityForm.location} onChange={(event) => setOpportunityForm({ ...opportunityForm, location: event.target.value })} />
                    </label>
                    <label>
                      <span className="label">Deadline</span>
                      <input className="input mt-2" type="date" value={opportunityForm.applicationDeadline} onChange={(event) => setOpportunityForm({ ...opportunityForm, applicationDeadline: event.target.value })} />
                    </label>
                  </div>
                  <label className="block">
                    <span className="label">Job URL</span>
                    <input className="input mt-2" value={opportunityForm.jobUrl} onChange={(event) => setOpportunityForm({ ...opportunityForm, jobUrl: event.target.value })} />
                  </label>
                  <label className="block">
                    <span className="label">Required skills</span>
                    <input className="input mt-2" value={opportunityForm.requiredSkills} onChange={(event) => setOpportunityForm({ ...opportunityForm, requiredSkills: event.target.value })} />
                  </label>
                  <label className="block">
                    <span className="label">Description</span>
                    <textarea className="input mt-2 min-h-24 resize-y" value={opportunityForm.description} onChange={(event) => setOpportunityForm({ ...opportunityForm, description: event.target.value })} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <span className="font-bold text-slate-950 dark:text-white">Remote</span>
                      <input type="checkbox" checked={opportunityForm.isRemote} onChange={(event) => setOpportunityForm({ ...opportunityForm, isRemote: event.target.checked })} />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <span className="font-bold text-slate-950 dark:text-white">Active</span>
                      <input type="checkbox" checked={opportunityForm.isActive} onChange={(event) => setOpportunityForm({ ...opportunityForm, isActive: event.target.checked })} />
                    </label>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button type="submit" disabled={workingId === 'opportunity-form'} className="btn-primary flex-1">
                    {workingId === 'opportunity-form' ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
                    {editingOpportunityId ? 'Update' : 'Add'}
                  </button>
                  {editingOpportunityId && (
                    <button type="button" onClick={() => { setEditingOpportunityId(null); setOpportunityForm(emptyOpportunityForm) }} className="btn-secondary px-3">
                      <X size={17} />
                    </button>
                  )}
                </div>
              </form>

              <section className="card overflow-hidden">
                <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div className="grid flex-1 gap-3 lg:grid-cols-[1fr_170px_220px]">
                    <label className="block">
                      <span className="label">Search opportunities</span>
                      <div className="relative mt-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input
                          className="input pl-10"
                          value={opportunityFilters.search}
                          onChange={(event) => setOpportunityFilters({ ...opportunityFilters, search: event.target.value })}
                          placeholder="Title, company, skills, location"
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="label">Type</span>
                      <select className="input mt-2" value={opportunityFilters.type} onChange={(event) => setOpportunityFilters({ ...opportunityFilters, type: event.target.value })}>
                        <option value="">All types</option>
                        {opportunityTypeOptions.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="label">Source</span>
                      <select className="input mt-2" value={opportunityFilters.source} onChange={(event) => setOpportunityFilters({ ...opportunityFilters, source: event.target.value })}>
                        <option value="">All sources</option>
                        {opportunitySourceOptions.map((source) => (
                          <option key={source} value={source}>{source}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button type="button" onClick={checkAllNotificationTargets} disabled={checkingAll || sharedOpportunities.length === 0} className="btn-secondary justify-center">
                    {checkingAll ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                    {checkingAll ? 'Checking...' : 'Check all'}
                  </button>
                </div>
                <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[1180px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Opportunity</th>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Deadline</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSharedOpportunities.length === 0 ? (
                        <tr className="bg-white dark:bg-slate-900">
                          <td colSpan={5} className="px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                            No shared opportunities match the current filters.
                          </td>
                        </tr>
                      ) : filteredSharedOpportunities.map((opportunity) => {
                        const check = notificationChecks[opportunity.id]
                        return (
                          <tr key={opportunity.id} className="bg-white dark:bg-slate-900">
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-950 dark:text-white">{opportunity.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{opportunity.type} {opportunity.employmentType ? `| ${opportunity.employmentType}` : ''}</p>
                              {check && (
                                <p className="mt-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                                  Checked {dayjs(check.checkedAt).format('MMM D, h:mm A')} | {check.matchedUsers || 0} matched
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{opportunity.company?.name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{opportunity.location || '-'}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{opportunity.applicationDeadline ? dayjs(opportunity.applicationDeadline).format('MMM D, YYYY') : '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => editOpportunity(opportunity)} className="btn-secondary px-3 py-2">
                                  <Edit3 size={15} />
                                  Edit
                                </button>
                                <button type="button" onClick={() => openNotificationDialog(opportunity)} disabled={workingId === `check-${opportunity.id}` || workingId === `notify-${opportunity.id}`} className="btn-secondary px-3 py-2">
                                  {workingId === `check-${opportunity.id}` || workingId === `notify-${opportunity.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Send size={15} />}
                                  {check ? `Notify (${check.matchedUsers || 0})` : 'Notify'}
                                </button>
                                <button type="button" onClick={() => deleteSharedOpportunity(opportunity)} disabled={workingId === `opportunity-${opportunity.id}`} className="btn-secondary px-3 py-2 text-rose-700 dark:text-rose-200">
                                  {workingId === `opportunity-${opportunity.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <Bell size={17} className="mt-0.5" />
                    <p>Notify checks one opportunity at a time. Check all precomputes recipient counts, and each Notify button can send directly or recheck before sending.</p>
                  </div>
                </div>
              </section>
            </section>
          )}
        </section>
      )}
    </div>
  )
}

export default Admin
