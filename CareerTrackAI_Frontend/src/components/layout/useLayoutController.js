import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import { careerApi } from '../../lib/api.js'

const pageTitles = {
  '/': ['Dashboard', 'Your career search command center'],
  '/applications': ['Applications', 'Move every opportunity through a focused pipeline'],
  '/opportunities': ['Opportunities', 'Explore internships and jobs with AI-ready context'],
  '/resumes': ['Resumes', 'Manage original CVs and tailored AI versions'],
  '/interviews': ['Interviews', 'Keep preparation, links, and timing in one place'],
  '/ai-studio': ['AI Studio', 'Turn your data into tailored career actions'],
  '/data-hub': ['Data Hub', 'Import, enrich, and export company intelligence'],
  '/profile': ['Profile', 'Keep your matching signals fresh'],
  '/usage': ['Usage', 'Track AI consumption and remaining credits'],
  '/settings': ['Settings', 'Plan, payments, and AI provider configuration'],
  '/admin': ['Admin', 'Manage users and administrator access'],
  '/help': ['Help', 'Learn the platform and recommended workflow'],
  '/checkout': ['Checkout', 'Complete plan and payment setup'],
}

function useLayoutController() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [notifications, setNotifications] = useState({ notifications: [], unreadCount: 0 })
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('careertrack_sidebar_collapsed') === 'true')
  const [showCopilot, setShowCopilot] = useState(
    () => localStorage.getItem('careertrack_show_copilot') !== 'false' && localStorage.getItem('careertrack_copilot_closed') !== 'true',
  )
  const [density, setDensity] = useState(() => localStorage.getItem('careertrack_density') || 'Comfortable')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const isAdmin = user?.role?.toLowerCase() === 'admin'

  useEffect(() => {
    careerApi.notifications().then(setNotifications).catch(() => null)
  }, [])

  useEffect(() => {
    const query = searchTerm.trim().toLowerCase()
    if (query.length < 2) {
      setSearchResults([])
      setSearchOpen(false)
      return undefined
    }

    const timer = setTimeout(async () => {
      const [companies, opportunities, applications] = await Promise.all([
        careerApi.companies().catch(() => []),
        careerApi.opportunities().catch(() => []),
        careerApi.applications().catch(() => []),
      ])
      const companyMatches = companies
        .filter((item) => `${item.name} ${item.industry} ${item.city} ${item.country}`.toLowerCase().includes(query))
        .slice(0, 4)
        .map((item) => ({ id: `company-${item.id}`, label: item.name, meta: item.industry || item.city || 'Company', to: '/data-hub' }))
      const opportunityMatches = opportunities
        .filter((item) => `${item.title} ${item.company?.name} ${item.location} ${item.requiredSkills}`.toLowerCase().includes(query))
        .slice(0, 4)
        .map((item) => ({ id: `opportunity-${item.id}`, label: item.title, meta: item.company?.name || 'Opportunity', to: '/opportunities' }))
      const applicationMatches = applications
        .filter((item) => `${item.jobOpportunity?.title} ${item.jobOpportunity?.company?.name} ${item.status} ${item.notes}`.toLowerCase().includes(query))
        .slice(0, 4)
        .map((item) => ({ id: `application-${item.id}`, label: item.jobOpportunity?.title || 'Application', meta: `Application ${item.status}`, to: '/applications' }))
      const helpMatches = ['help guide how to use about workflow steps support']
        .filter((item) => item.includes(query))
        .map(() => ({ id: 'help', label: 'Help guide', meta: 'How to use CareerTrackAI', to: '/help' }))
      setSearchResults([...helpMatches, ...companyMatches, ...opportunityMatches, ...applicationMatches].slice(0, 8))
      setSearchOpen(true)
    }, 250)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const theme = localStorage.getItem('careertrack_theme') || 'System'
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', theme === 'Dark' || (theme === 'System' && prefersDark))
  }, [location.pathname])

  useEffect(() => {
    function syncPreferences() {
      setDensity(localStorage.getItem('careertrack_density') || 'Comfortable')
      setShowCopilot(localStorage.getItem('careertrack_show_copilot') !== 'false' && localStorage.getItem('careertrack_copilot_closed') !== 'true')
    }

    window.addEventListener('storage', syncPreferences)
    window.addEventListener('careertrack_preferences_changed', syncPreferences)
    return () => {
      window.removeEventListener('storage', syncPreferences)
      window.removeEventListener('careertrack_preferences_changed', syncPreferences)
    }
  }, [])

  const titleKey = location.pathname.startsWith('/checkout') ? '/checkout' : location.pathname
  const [title, subtitle] = pageTitles[titleKey] || pageTitles['/']

  function toggleSidebar() {
    const next = !isSidebarCollapsed
    setIsSidebarCollapsed(next)
    localStorage.setItem('careertrack_sidebar_collapsed', String(next))
  }

  function closeCopilot() {
    setShowCopilot(false)
    localStorage.setItem('careertrack_copilot_closed', 'true')
  }

  async function markNotificationRead(notification) {
    setNotifications((current) => ({
      unreadCount: Math.max(0, current.unreadCount - (notification.isRead ? 0 : 1)),
      notifications: current.notifications.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
    }))
    await careerApi.markNotificationRead(notification.id).catch(() => null)
    setNotificationsOpen(false)
    if (notification.link) navigate(notification.link)
  }

  async function markAllNotificationsRead() {
    setNotifications((current) => ({
      unreadCount: 0,
      notifications: current.notifications.map((item) => ({ ...item, isRead: true })),
    }))
    await careerApi.markAllNotificationsRead().catch(() => null)
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }


  return {
    user,
    navigate,
    notifications,
    notificationsOpen,
    setNotificationsOpen,
    isSidebarCollapsed,
    showCopilot,
    density,
    searchTerm,
    setSearchTerm,
    searchResults,
    searchOpen,
    setSearchOpen,
    isAdmin,
    title,
    subtitle,
    toggleSidebar,
    closeCopilot,
    markNotificationRead,
    markAllNotificationsRead,
    handleLogout,
  }
}

export default useLayoutController
