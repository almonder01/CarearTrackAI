import axios from 'axios'
import { readScopedJson, removeScopedStorage, writeScopedJson } from './userStorage.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5185/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('careertrack_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('careertrack_refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken })
          const payload = unwrap(response.data)
          saveAuth(payload)
          originalRequest.headers.Authorization = `Bearer ${payload.accessToken}`
          return api(originalRequest)
        } catch {
          clearAuth()
        }
      }
    }
    return Promise.reject(error)
  },
)

export function unwrap(response) {
  if (response && typeof response === 'object' && 'success' in response) {
    if (!response.success) {
      throw new Error(friendlyUserMessage(response.message || response.errors?.[0] || 'Request failed'))
    }
    return response.data
  }
  return response
}

export function friendlyUserMessage(value, fallback = 'The request could not be completed. Please try again.') {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  const lower = text.toLowerCase()

  if (!text || text === '{}') return fallback
  if (lower.includes('too many requests')) return 'Too many requests. Please wait a moment and try again.'
  if (lower.includes('password') && lower.includes('8')) return 'Password must be at least 8 characters. Use a mix of letters and numbers for a safer account.'
  if (lower.includes('password') && (lower.includes('required') || lower.includes('invalid'))) return 'Enter a valid password before creating your account.'
  if (lower.includes('email already exists') || lower.includes('already exists') || lower.includes('conflict')) return 'An account with this email already exists. Sign in instead or use another email.'
  if (lower.includes('quota') || lower.includes('resource_exhausted') || lower.includes('rate limit') || lower.includes('429')) return 'The AI quota or daily limit has been reached. Try again later or switch to another API key.'
  if (lower.includes('api key') || lower.includes('apikey') || lower.includes('gemini') || lower.includes('ai provider')) return 'The AI provider rejected the request. Check the API key permissions and model access.'
  if (lower.includes('forbidden') || lower.includes('unauthorized') || lower.includes('not authorized') || lower.includes('401') || lower.includes('403')) return 'You do not have permission to perform this action. Sign in with an admin account and try again.'
  if (lower.includes('not configured') || lower.includes('local-fallback')) return 'The AI provider is not configured yet. Connect a Gemini API key in the backend settings.'
  if (lower.includes('model') && (lower.includes('not found') || lower.includes('404'))) return 'The configured AI model could not be found. Check the backend AI model setting.'
  if (lower.includes('socket') || lower.includes('network') || lower.includes('timeout') || lower.includes('timed out') || lower.includes('dns')) return 'The app could not reach the service right now. Check the connection and try again.'
  if (
    lower.includes('request failed with status code') ||
    lower.includes('response status code') ||
    lower.includes('internal server error') ||
    lower.includes('500') ||
    lower.includes('system.') ||
    lower.includes('microsoft.') ||
    lower.includes(' at ') ||
    text.trim().startsWith('{') ||
    text.trim().startsWith('<')
  ) {
    return 'The requested service is temporarily unavailable. Please try again in a moment.'
  }

  return text.length > 180 ? fallback : text
}

function friendlyErrorMessage(error, fallback) {
  const responseData = error?.response?.data
  const validationErrors = responseData?.errors && !Array.isArray(responseData.errors) && typeof responseData.errors === 'object'
    ? Object.values(responseData.errors).flat().join(' ')
    : ''
  const responseMessage =
    responseData?.message ||
    responseData?.errors?.[0] ||
    validationErrors ||
    responseData?.title ||
    (typeof responseData === 'string' ? responseData : '')
  const status = error?.response?.status
  const combined = [responseMessage, status ? `status ${status}` : '', error?.message || ''].filter(Boolean).join(' ')
  return friendlyUserMessage(combined, fallback)
}

async function requestApi(request, fallback = 'The request could not be completed. Please try again.') {
  try {
    return unwrap((await request()).data)
  } catch (error) {
    throw new Error(friendlyErrorMessage(error, fallback))
  }
}

async function requestBlob(request, fallback = 'The file could not be downloaded right now.') {
  try {
    return (await request()).data
  } catch (error) {
    throw new Error(friendlyErrorMessage(error, fallback))
  }
}

export function saveAuth(auth) {
  localStorage.setItem('careertrack_access_token', auth.accessToken)
  localStorage.setItem('careertrack_refresh_token', auth.refreshToken)
  localStorage.setItem('careertrack_user', JSON.stringify(auth.user))
}

export function clearAuth() {
  localStorage.removeItem('careertrack_access_token')
  localStorage.removeItem('careertrack_refresh_token')
  localStorage.removeItem('careertrack_user')
}

function estimateTokens(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  return Math.max(1, Math.ceil(text.length / 4))
}

function recordAiUsage(feature, input, output) {
  const current = readScopedJson('careertrack_ai_usage', [])
  current.push({
    id: crypto.randomUUID?.() || String(Date.now()),
    feature,
    inputTokens: estimateTokens(input),
    outputTokens: estimateTokens(output),
    createdAt: new Date().toISOString(),
  })
  writeScopedJson('careertrack_ai_usage', current.slice(-300))
}

export const authApi = {
  login: (payload) => requestApi(() => api.post('/auth/login', payload), 'Unable to sign in. Check your email and password.'),
  register: (payload) => requestApi(() => api.post('/auth/register', payload), 'Unable to create account. Check the form and try again.'),
  refreshToken: (refreshToken) => requestApi(() => axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken }), 'Could not refresh your session. Please sign in again.'),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }).catch(() => null),
}

export const careerApi = {
  getMe: () => requestApi(() => api.get('/users/me')),
  updateMe: (payload) => requestApi(() => api.put('/users/me', payload), 'Could not update your profile right now.'),
  dashboard: (params = {}) => requestApi(() => api.get('/dashboard/stats', { params }), 'Could not load dashboard stats.'),
  dashboardChecklist: () => requestApi(() => api.get('/dashboard/first-run-checklist'), 'Could not load setup checklist.'),

  applications: (status) => requestApi(() => api.get('/applications', { params: { status } }), 'Could not load applications.'),
  updateApplicationStatus: (id, status) => requestApi(() => api.patch(`/applications/${id}/status`, { status }), 'Could not update application status.'),
  deleteApplication: (id) => requestApi(() => api.delete(`/applications/${id}`), 'Could not delete this application.'),
  createApplication: (payload) => requestApi(() => api.post('/applications', payload), 'Could not track this opportunity.'),

  opportunities: (params = {}) => requestApi(() => api.get('/job-opportunities', { params }), 'Could not load opportunities.'),
  saveSharedOpportunity: (id) => requestApi(() => api.post(`/job-opportunities/${id}/save-to-workspace`), 'Could not save this shared opportunity.'),
  updateOpportunity: (id, payload) => requestApi(() => api.put(`/job-opportunities/${id}`, payload), 'Could not update this opportunity.'),
  deleteOpportunity: (id) => requestApi(() => api.delete(`/job-opportunities/${id}`), 'Could not delete this opportunity.'),
  deleteAllOpportunities: () => requestApi(() => api.delete('/job-opportunities/clear'), 'Could not delete opportunities.'),
  exportOpportunitiesCsv: () => requestBlob(() => api.get('/job-opportunities/export-csv', { responseType: 'blob' }), 'Could not export Opportunities CSV.'),
  importOpportunitiesCsv: (formData) =>
    requestApi(() => api.post('/job-opportunities/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } }), 'Could not import opportunities CSV.'),

  companies: (params = {}) => requestApi(() => api.get('/companies', { params }), 'Could not load companies.'),
  saveSharedCompany: (id) => requestApi(() => api.post(`/companies/${id}/save-to-workspace`), 'Could not save this shared company.'),
  updateCompany: (id, payload) => requestApi(() => api.put(`/companies/${id}`, payload), 'Could not update this company.'),
  deleteCompany: (id) => requestApi(() => api.delete(`/companies/${id}`), 'Could not delete this company.'),
  exportCompaniesCsv: () => requestBlob(() => api.get('/companies/export-csv', { responseType: 'blob' }), 'Could not export Companies CSV.'),
  importCompaniesCsv: (formData) =>
    requestApi(() => api.post('/companies/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } }), 'Could not import companies CSV.'),

  adzunaCountries: () => requestApi(() => api.get('/job-opportunities/adzuna/countries'), 'Could not load Adzuna countries.'),
  searchAdzunaOpportunities: (params) => requestApi(() => api.get('/job-opportunities/adzuna/search', { params }), 'Could not search Adzuna right now.'),
  importAdzunaOpportunities: (payload) => requestApi(() => api.post('/job-opportunities/adzuna/import', payload), 'Could not import Adzuna opportunities.'),
  searchJobDataLakeOpportunities: (params) => requestApi(() => api.get('/job-opportunities/jobdatalake/search', { params }), 'Could not search JobDataLake right now.'),
  importJobDataLakeOpportunities: (payload) => requestApi(() => api.post('/job-opportunities/jobdatalake/import', payload), 'Could not import JobDataLake opportunities.'),
  aiSourceOpportunities: (payload) => requestApi(() => api.post('/job-opportunities/ai-source/search', payload), 'Could not run AI sourcing right now.'),
  aiSourceCompanies: (payload) => requestApi(() => api.post('/companies/ai-source/search', payload), 'Could not run AI company sourcing right now.'),
  importAiSourcedOpportunities: (payload) => requestApi(() => api.post('/job-opportunities/ai-source/import', payload), 'Could not import AI-sourced opportunities.'),
  verifyOpportunityLink: (payload) => requestApi(() => api.post('/job-opportunities/verify-link', payload), 'Could not verify this link right now.'),

  resumes: () => requestApi(() => api.get('/resumes'), 'Could not load resumes.'),
  uploadResume: (formData) => requestApi(() => api.post('/resumes', formData, { headers: { 'Content-Type': 'multipart/form-data' } }), 'Could not upload this resume.'),
  deleteResume: (id) => requestApi(() => api.delete(`/resumes/${id}`), 'Could not delete this resume.'),

  interviews: () => requestApi(() => api.get('/interviews'), 'Could not load interviews.'),
  createInterview: (applicationId, payload) => requestApi(() => api.post(`/applications/${applicationId}/interviews`, payload), 'Could not create this interview.'),
  updateInterview: (id, payload) => requestApi(() => api.put(`/interviews/${id}`, payload), 'Could not update this interview.'),
  deleteInterview: (id) => requestApi(() => api.delete(`/interviews/${id}`), 'Could not delete this interview.'),

  notifications: () => requestApi(() => api.get('/notifications'), 'Could not load notifications.'),
  markNotificationRead: (id) => requestApi(() => api.patch(`/notifications/${id}/read`), 'Could not mark this notification as read.'),
  markAllNotificationsRead: () => requestApi(() => api.patch('/notifications/read-all'), 'Could not mark notifications as read.'),

  aiStatus: () => requestApi(() => api.get('/ai/status'), 'Could not load AI status.'),
  aiPing: () => requestApi(() => api.get('/ai/ping'), 'Could not test Gemini right now.'),
  aiUsage: (params = {}) => requestApi(() => api.get('/ai/usage', { params }), 'Could not load Gemini usage.'),
  apiUsage: (params = {}) => requestApi(() => api.get('/usage/apis', { params }), 'Could not load external API usage.'),
  aiChat: async (payload) => {
    const result = await requestApi(() => api.post('/ai/chat', payload), 'AI chat is unavailable right now.')
    recordAiUsage('Career chat', payload, result)
    return result
  },
  analyzeResume: async (id) => {
    const result = await requestApi(() => api.post(`/ai/analyze-resume/${id}`), 'Could not analyze this resume right now.')
    recordAiUsage('Resume analysis', { resumeId: id }, result)
    return result
  },
  coverLetter: async (payload) => {
    const result = await requestApi(() => api.post('/ai/generate-cover-letter', payload), 'Could not generate a cover letter right now.')
    recordAiUsage('Cover letter', payload, result)
    return result
  },
  recommendations: async () => {
    const result = await requestApi(() => api.get('/ai/recommendations'), 'Could not refresh recommendations right now.')
    recordAiUsage('Recommendations', 'profile context', result)
    return result
  },

  adminUsers: (params = {}) => requestApi(() => api.get('/admin/users', { params }), 'Could not load users.'),
  createAdmin: (payload) => requestApi(() => api.post('/admin/admins', payload), 'Could not create admin account.'),
  makeAdmin: (id) => requestApi(() => api.post(`/admin/users/${id}/make-admin`), 'Could not grant admin role.'),
  removeAdmin: (id) => requestApi(() => api.post(`/admin/users/${id}/remove-admin`), 'Could not remove admin role.'),
  deleteUser: (id) => requestApi(() => api.delete(`/admin/users/${id}`), 'Could not delete this user.'),
  adminSharedDatabase: () => requestApi(() => api.get('/admin/shared-database'), 'Could not load shared database.'),
  createSharedCompany: (payload) => requestApi(() => api.post('/admin/shared-companies', payload), 'Could not create shared company.'),
  updateSharedCompany: (id, payload) => requestApi(() => api.put(`/admin/shared-companies/${id}`, payload), 'Could not update shared company.'),
  deleteSharedCompany: (id) => requestApi(() => api.delete(`/admin/shared-companies/${id}`), 'Could not delete shared company.'),
  createSharedOpportunity: (payload) => requestApi(() => api.post('/admin/shared-opportunities', payload), 'Could not create shared opportunity.'),
  updateSharedOpportunity: (id, payload) => requestApi(() => api.put(`/admin/shared-opportunities/${id}`, payload), 'Could not update shared opportunity.'),
  deleteSharedOpportunity: (id) => requestApi(() => api.delete(`/admin/shared-opportunities/${id}`), 'Could not delete shared opportunity.'),
  previewSharedOpportunityNotification: (id) =>
    requestApi(() => api.post(`/admin/shared-opportunities/${id}/notification-preview`), 'Could not check notification matches.'),
  previewAllSharedOpportunityNotifications: () =>
    requestApi(() => api.post('/admin/shared-opportunities/notification-preview-all'), 'Could not check all notification matches.'),
  notifySharedOpportunity: (id, payload = {}) =>
    requestApi(() => api.post(`/admin/shared-opportunities/${id}/notify`, payload), 'Could not send opportunity notifications.'),

  resetLocalAiUsage: () => removeScopedStorage('careertrack_ai_usage'),
}
