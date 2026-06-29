import { useMemo, useState } from 'react'
import { authApi, careerApi, clearAuth, saveAuth } from '../lib/api.js'
import { AuthContext } from './AuthContextCore.js'

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('careertrack_user'))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [loading, setLoading] = useState(false)
  const isAuthenticated = Boolean(localStorage.getItem('careertrack_access_token') && user)

  async function login(payload) {
    setLoading(true)
    try {
      const auth = await authApi.login(payload)
      saveAuth(auth)
      setUser(auth.user)
      return auth.user
    } finally {
      setLoading(false)
    }
  }

  async function register(payload) {
    setLoading(true)
    try {
      const auth = await authApi.register(payload)
      saveAuth(auth)
      setUser(auth.user)
      return auth.user
    } finally {
      setLoading(false)
    }
  }

  async function refreshProfile() {
    const profile = await careerApi.getMe()
    localStorage.setItem('careertrack_user', JSON.stringify(profile))
    setUser(profile)
    return profile
  }

  async function logout() {
    const refreshToken = localStorage.getItem('careertrack_refresh_token')
    if (refreshToken) await authApi.logout(refreshToken)
    clearAuth()
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, setUser, loading, isAuthenticated, login, register, logout, refreshProfile }),
    [user, loading, isAuthenticated],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
