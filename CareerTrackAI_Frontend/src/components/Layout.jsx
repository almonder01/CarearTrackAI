import { NavLink, Outlet } from 'react-router-dom'
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Database,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Activity,
  UserRound,
  Workflow,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import BrandMark from './BrandMark.jsx'
import FloatingAiAgent from './FloatingAiAgent.jsx'
import useLayoutController from './layout/useLayoutController.js'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/applications', label: 'Applications', icon: Workflow },
  { to: '/opportunities', label: 'Opportunities', icon: BriefcaseBusiness },
  { to: '/resumes', label: 'Resumes', icon: FileText },
  { to: '/interviews', label: 'Interviews', icon: CalendarDays },
  { to: '/ai-studio', label: 'AI Studio', icon: Bot },
  { to: '/data-hub', label: 'Data Hub', icon: Database },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/usage', label: 'Usage', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, adminOnly: true },
  { to: '/help', label: 'Help', icon: CircleHelp },
]

function roleLabel(role) {
  return role === 'Student' ? 'User' : role || 'User'
}

function Layout() {
  const {
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
  } = useLayoutController()
  return (
    <div
      className={clsx(
        'min-h-screen bg-[radial-gradient(circle_at_top_left,#d7f6ef_0,#f6f8fb_34%,#eef2f7_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,#123b36_0,#0f172a_34%,#020617_100%)] dark:text-slate-100',
        density === 'Compact' && 'density-compact',
        density === 'Spacious' && 'density-spacious',
      )}
    >
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/70 bg-white/82 px-4 py-4 shadow-xl shadow-slate-900/5 backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/88 lg:flex',
          isSidebarCollapsed ? 'w-24' : 'w-72',
        )}
      >
        <div className="mb-5 shrink-0 px-2">
          <BrandMark compact={isSidebarCollapsed} />
        </div>

        <button
          onClick={toggleSidebar}
          className="mb-3 flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          {!isSidebarCollapsed && 'Collapse'}
        </button>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.filter((item) => !item.adminOnly || isAdmin).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition',
                  isSidebarCollapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-teal-400 dark:text-slate-950 dark:shadow-teal-950/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                )
              }
              title={isSidebarCollapsed ? label : undefined}
            >
              <Icon size={18} />
              {!isSidebarCollapsed && label}
            </NavLink>
          ))}
        </nav>

        {showCopilot && !isSidebarCollapsed && (
          <div className="mt-4 shrink-0 rounded-lg border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-950/60">
            <div className="mb-3 flex items-center justify-between gap-2 text-sm font-bold text-teal-900 dark:text-teal-100">
              <span className="flex items-center gap-2">
                <Bot size={17} />
                AI Copilot
              </span>
              <button onClick={closeCopilot} className="rounded-md p-1 text-teal-700 hover:bg-teal-100 dark:text-teal-200 dark:hover:bg-teal-900">
                <X size={15} />
              </button>
            </div>
            <p className="text-sm leading-5 text-teal-800 dark:text-teal-200">
              Embedded across your pipeline to suggest follow-ups, resume tailoring, and next actions.
            </p>
          </div>
        )}
      </aside>

      <main className={clsx('transition-all duration-300', isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72')}>
        <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 px-4 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="label">Career workspace</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative hidden min-w-72 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900 md:flex">
                <Search size={17} className="text-slate-400" />
                <div className="flex-1">
                  <input
                    className="w-full border-0 bg-transparent text-sm outline-none dark:text-slate-100"
                    placeholder="Search companies, roles, notes..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                  />
                </div>
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/15 dark:border-slate-800 dark:bg-slate-900">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => {
                          navigate(result.to)
                          setSearchOpen(false)
                          setSearchTerm('')
                        }}
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                      >
                        <span className="block text-sm font-bold text-slate-950 dark:text-white">{result.label}</span>
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{result.meta}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen((value) => !value)}
                  className="relative rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {notifications.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                      {notifications.unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/15 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <div>
                        <p className="text-sm font-bold text-slate-950 dark:text-white">Notifications</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{notifications.unreadCount} unread</p>
                      </div>
                      <button onClick={markAllNotificationsRead} className="text-xs font-bold text-teal-700 dark:text-teal-300">
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.notifications.length === 0 && (
                        <div className="p-5 text-sm text-slate-500 dark:text-slate-400">No notifications yet.</div>
                      )}
                      {notifications.notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => markNotificationRead(notification)}
                          className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                        >
                          <span
                            className={clsx(
                              'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                              notification.isRead ? 'bg-slate-300 dark:bg-slate-700' : 'bg-teal-500',
                            )}
                          />
                          <span>
                            <span className="block text-sm font-bold text-slate-950 dark:text-white">{notification.title}</span>
                            <span className="mt-1 block text-sm leading-5 text-slate-500 dark:text-slate-400">{notification.message}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white">
                  {user?.fullName?.slice(0, 1) || 'U'}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel(user?.role)}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-secondary" title="Log out">
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <FloatingAiAgent />
    </div>
  )
}

export default Layout
