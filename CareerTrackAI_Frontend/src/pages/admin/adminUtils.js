export const emptyCompanyForm = {
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

export const emptyOpportunityForm = {
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

export function roleLabel(role) {
  return role === 'Student' ? 'User' : role
}

export function cleanPayload(payload) {
  return Object.entries(payload).reduce((next, [key, value]) => {
    if (value === '') return next
    next[key] = value
    return next
  }, {})
}

export function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

export function includesText(value, term) {
  return normalizeText(value).includes(term)
}

export function uniqueValues(items, selector) {
  return [...new Set(items.map(selector).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
}

export function userActionConfirmation(targetUser, action) {
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
