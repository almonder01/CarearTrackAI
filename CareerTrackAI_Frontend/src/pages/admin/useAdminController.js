import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { careerApi } from '../../lib/api.js'
import { useAuth } from '../../context/useAuth.js'
import { cleanPayload, emptyCompanyForm, emptyOpportunityForm, includesText, normalizeText, uniqueValues, userActionConfirmation } from './adminUtils.js'

function useAdminController() {
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


  return {
    isAdmin,
    section,
    setSection,
    databaseMode,
    setDatabaseMode,
    users,
    search,
    setSearch,
    loading,
    databaseLoading,
    workingId,
    feedback,
    setFeedback,
    toast,
    setToast,
    form,
    setForm,
    creating,
    companyForm,
    setCompanyForm,
    opportunityForm,
    setOpportunityForm,
    editingCompanyId,
    setEditingCompanyId,
    editingOpportunityId,
    setEditingOpportunityId,
    notificationDialog,
    setNotificationDialog,
    bulkCheckDialog,
    setBulkCheckDialog,
    checkingAll,
    companyFilters,
    setCompanyFilters,
    opportunityFilters,
    setOpportunityFilters,
    sharedCompanyOptions,
    companyCountryOptions,
    companySourceOptions,
    opportunityTypeOptions,
    opportunitySourceOptions,
    filteredSharedCompanies,
    filteredSharedOpportunities,
    sharedOpportunities,
    notificationChecks,
    pendingConfirmation,
    setPendingUserAction,
    confirmPendingUserAction,
    createAdmin,
    loadUsers,
    requestUserAction,
    loadSharedDatabase,
    saveSharedCompany,
    deleteSharedCompany,
    saveSharedOpportunity,
    deleteSharedOpportunity,
    checkNotificationTargets,
    openNotificationDialog,
    sendCheckedNotification,
    checkAllNotificationTargets,
    editCompany,
    editOpportunity,
  }
}

export default useAdminController
