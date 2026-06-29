import axios from 'axios'
import {
  mockApplications,
  mockDashboard,
  mockInterviews,
  mockNotifications,
  mockOpportunities,
  mockResumes,
  mockUser,
} from '../data/mockData.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:5001/api'
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('careertrack_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
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
      throw new Error(response.message || response.errors?.[0] || 'Request failed')
    }
    return response.data
  }
  return response
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

async function requestWithMock(request, fallback) {
  try {
    return unwrap((await request()).data)
  } catch (error) {
    if (!USE_MOCKS) throw error
    await new Promise((resolve) => setTimeout(resolve, 220))
    return typeof fallback === 'function' ? fallback() : fallback
  }
}

function estimateTokens(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  return Math.max(1, Math.ceil(text.length / 4))
}

function recordAiUsage(feature, input, output) {
  const current = JSON.parse(localStorage.getItem('careertrack_ai_usage') || '[]')
  current.push({
    id: crypto.randomUUID?.() || String(Date.now()),
    feature,
    inputTokens: estimateTokens(input),
    outputTokens: estimateTokens(output),
    createdAt: new Date().toISOString(),
  })
  localStorage.setItem('careertrack_ai_usage', JSON.stringify(current.slice(-300)))
}

export const authApi = {
  login: (payload) =>
    requestWithMock(
      () => api.post('/auth/login', payload),
      {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        user: mockUser,
      },
    ),
  register: (payload) =>
    requestWithMock(
      () => api.post('/auth/register', payload),
      {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        user: { ...mockUser, fullName: payload.fullName, email: payload.email },
      },
    ),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }).catch(() => null),
}

export const careerApi = {
  getMe: () => requestWithMock(() => api.get('/users/me'), mockUser),
  updateMe: (payload) => requestWithMock(() => api.put('/users/me', payload), { ...mockUser, ...payload }),
  dashboard: () => requestWithMock(() => api.get('/dashboard/stats'), mockDashboard),
  dashboardChecklist: () =>
    requestWithMock(() => api.get('/dashboard/first-run-checklist'), {
      completed: 0,
      total: 1,
      isComplete: false,
      items: [
        {
          id: 'profile',
          title: 'Complete your profile',
          description: 'Connect to the backend to check your real setup progress.',
          route: '/profile',
          actionLabel: 'Complete profile',
          completed: false,
        },
      ],
    }),
  applications: (status) =>
    requestWithMock(
      () => api.get('/applications', { params: { status } }),
      () => (status ? mockApplications.filter((item) => item.status === status) : mockApplications),
    ),
  updateApplicationStatus: (id, status) =>
    requestWithMock(
      () => api.patch(`/applications/${id}/status`, { status }),
      () => mockApplications.find((item) => item.id === id) || mockApplications[0],
    ),
  deleteApplication: (id) => requestWithMock(() => api.delete(`/applications/${id}`), null),
  createApplication: (payload) =>
    requestWithMock(
      () => api.post('/applications', payload),
      () => ({ ...mockApplications[0], id: Date.now(), jobOpportunity: mockOpportunities.find((item) => item.id === payload.jobOpportunityId) || mockOpportunities[0] }),
    ),
  opportunities: (params = {}) =>
    requestWithMock(
      () => api.get('/job-opportunities', { params }),
      () =>
        mockOpportunities.filter((item) => {
          if (params.type && item.type !== params.type) return false
          if (params.employmentType && item.employmentType !== params.employmentType) return false
          return true
        }),
    ),
  companies: (params = {}) => requestWithMock(() => api.get('/companies', { params }), []),
  saveSharedCompany: (id) =>
    requestWithMock(() => api.post(`/companies/${id}/save-to-workspace`), {
      company: { id, name: 'Saved company', isShared: false },
      opportunitiesCreated: 0,
      opportunitiesUpdated: 0,
    }),
  updateCompany: (id, payload) => requestWithMock(() => api.put(`/companies/${id}`, payload), { id, ...payload }),
  deleteCompany: (id) => requestWithMock(() => api.delete(`/companies/${id}`), null),
  exportCompaniesCsv: async () => (await api.get('/companies/export-csv', { responseType: 'blob' })).data,
  importCompaniesCsv: (formData) =>
    requestWithMock(() => api.post('/companies/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } }), {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    }),
  exportOpportunitiesCsv: async () => (await api.get('/job-opportunities/export-csv', { responseType: 'blob' })).data,
  updateOpportunity: (id, payload) => requestWithMock(() => api.put(`/job-opportunities/${id}`, payload), { id, ...payload }),
  deleteOpportunity: (id) => requestWithMock(() => api.delete(`/job-opportunities/${id}`), null),
  importOpportunitiesCsv: (formData) =>
    requestWithMock(() => api.post('/job-opportunities/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } }), {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    }),
  searchAdzunaOpportunities: (params) =>
    requestWithMock(() => api.get('/job-opportunities/adzuna/search', { params }), {
      count: 0,
      country: 'sg',
      query: params?.what || '',
      location: params?.where || 'Malaysia',
      configured: false,
      message: 'Adzuna is unavailable in mock mode.',
      opportunities: [],
    }),
  adzunaCountries: () =>
    requestWithMock(() => api.get('/job-opportunities/adzuna/countries'), [
      { code: 'sg', name: 'Singapore' },
      { code: 'us', name: 'United States' },
      { code: 'gb', name: 'United Kingdom' },
    ]),
  importAdzunaOpportunities: (payload) =>
    requestWithMock(() => api.post('/job-opportunities/adzuna/import', payload), {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    }),
  searchJobDataLakeOpportunities: (params) =>
    requestWithMock(() => api.get('/job-opportunities/jobdatalake/search', { params }), {
      count: 0,
      page: params?.page || 1,
      perPage: params?.perPage || 20,
      query: params?.query || '*',
      country: params?.country || '',
      configured: false,
      message: 'JobDataLake is unavailable in mock mode.',
      opportunities: [],
    }),
  importJobDataLakeOpportunities: (payload) =>
    requestWithMock(() => api.post('/job-opportunities/jobdatalake/import', payload), {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    }),
  aiSourceOpportunities: (payload) =>
    requestWithMock(() => api.post('/job-opportunities/ai-source/search', payload), {
      plan: {
        what: payload?.prompt || 'intern',
        where: payload?.country || 'Malaysia',
        provider: payload?.provider || 'jobdatalake',
        country: payload?.country || 'MY',
        reason: 'AI sourcing is unavailable in mock mode.',
      },
      search: {
        count: 0,
        provider: payload?.provider || 'JobDataLake',
        country: payload?.country || 'MY',
        query: payload?.prompt || '',
        location: 'Malaysia',
        configured: false,
        message: 'AI sourcing is unavailable in mock mode.',
        opportunities: [],
      },
      importResult: null,
    }),
  importAiSourcedOpportunities: (payload) =>
    requestWithMock(() => api.post('/job-opportunities/ai-source/import', payload), {
      plan: {
        what: payload?.prompt || 'intern',
        where: payload?.country || 'Malaysia',
        provider: payload?.provider || 'jobdatalake',
        country: payload?.country || 'MY',
        reason: 'AI sourcing is unavailable in mock mode.',
      },
      search: {
        count: 0,
        provider: payload?.provider || 'JobDataLake',
        country: payload?.country || 'MY',
        query: payload?.prompt || '',
        location: 'Malaysia',
        configured: false,
        message: 'AI sourcing is unavailable in mock mode.',
        opportunities: [],
      },
      importResult: { created: 0, updated: 0, skipped: 0, errors: ['AI sourcing is unavailable in mock mode.'] },
    }),
  resumes: () => requestWithMock(() => api.get('/resumes'), mockResumes),
  uploadResume: (formData) =>
    requestWithMock(
      () => api.post('/resumes', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
      () => ({ id: Date.now(), label: formData.get('label'), fileType: 'pdf', versions: [] }),
    ),
  deleteResume: (id) => requestWithMock(() => api.delete(`/resumes/${id}`), null),
  interviews: () => requestWithMock(() => api.get('/interviews'), mockInterviews),
  createInterview: (applicationId, payload) =>
    requestWithMock(() => api.post(`/applications/${applicationId}/interviews`, payload), {
      id: Date.now(),
      applicationId,
      ...payload,
      type: payload.type || 'Online',
      createdAt: new Date().toISOString(),
    }),
  updateInterview: (id, payload) =>
    requestWithMock(() => api.put(`/interviews/${id}`, payload), {
      id,
      ...payload,
      type: payload.type || 'Online',
    }),
  deleteInterview: (id) => requestWithMock(() => api.delete(`/interviews/${id}`), null),
  notifications: () => requestWithMock(() => api.get('/notifications'), mockNotifications),
  aiStatus: () =>
    requestWithMock(() => api.get('/ai/status'), {
      provider: 'Gemini',
      model: 'gemini-2.5-flash',
      configured: false,
      mode: 'local-fallback',
    }),
  aiPing: () =>
    requestWithMock(() => api.get('/ai/ping'), {
      success: false,
      provider: 'Gemini',
      model: 'gemini-2.5-flash',
      mode: 'local-fallback',
      message: 'Gemini ping is unavailable in mock mode.',
      reply: null,
    }),
  aiUsage: () =>
    requestWithMock(() => api.get('/ai/usage'), {
      calls: 0,
      promptTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      byFeature: [],
      recent: [],
    }),
  apiUsage: () =>
    requestWithMock(() => api.get('/usage/apis'), {
      requests: 0,
      matched: 0,
      imported: 0,
      errors: 0,
      providers: [],
    }),
  aiChat: async (payload) => {
    const result = await requestWithMock(() => api.post('/ai/chat', payload), {
      reply:
        'Your strongest next move is to tailor the resume around measurable React work, then follow up with two companies before their deadlines.',
    })
    recordAiUsage('Career chat', payload, result)
    return result
  },
  analyzeResume: async (id) => {
    const result = await requestWithMock(() => api.post(`/ai/analyze-resume/${id}`), {
      strengths: ['Clear project experience', 'Strong API integration background', 'Good fit for frontend internships'],
      weaknesses: ['Few measurable outcomes', 'Skills section could be more targeted'],
      missingSkills: ['Testing Library', 'Accessibility basics', 'Performance profiling'],
      suggestions: ['Add metrics to each project', 'Create one AI-tailored version per target company'],
      overallScore: 82,
    })
    recordAiUsage('Resume analysis', { resumeId: id }, result)
    return result
  },
  coverLetter: async (payload) => {
    const result = await requestWithMock(() => api.post('/ai/generate-cover-letter', payload), {
      subject: 'Application for Frontend Developer Intern',
      coverLetter:
        'Dear Hiring Team,\n\nI am excited to apply for this opportunity. My experience building React interfaces, integrating REST APIs, and shipping polished student projects aligns well with your team needs.\n\nBest regards,\nAva Mitchell',
    })
    recordAiUsage('Cover letter', payload, result)
    return result
  },
  recommendations: async () => {
    const result = await requestWithMock(() => api.get('/ai/recommendations'), {
      summary: 'Your profile is trending toward frontend and AI product roles in Riyadh.',
      companiesToFollow: ['Mozn', 'STC', 'Tamara'],
      skillsToLearn: ['Testing Library', 'Dashboard analytics', 'Prompt engineering'],
      applicationTips: ['Follow up after 5 business days', 'Tailor the first project bullet to each company'],
    })
    recordAiUsage('Recommendations', 'profile context', result)
    return result
  },
  markNotificationRead: (id) => requestWithMock(() => api.patch(`/notifications/${id}/read`), null),
  markAllNotificationsRead: () => requestWithMock(() => api.patch('/notifications/read-all'), null),
}
