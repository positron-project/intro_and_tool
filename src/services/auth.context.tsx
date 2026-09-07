import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiConfig } from './api-client'
import { changePassword, getCurrentUser, login, logout, updateProfile, type LoginCredentials } from './auth.service'
import type { AuthSession, AuthUser } from '../types'

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isDemo: boolean
  signIn: (credentials: LoginCredentials) => Promise<AuthSession>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'initials' | 'avatarUrl' | 'bio'>>) => Promise<AuthUser>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setUser(await getCurrentUser())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    const session = await login(credentials)
    setUser(session.user)
    return session
  }, [])

  const signOut = useCallback(async () => {
    await logout()
    setUser(null)
  }, [])

  const saveProfile = useCallback(async (patch: Partial<Pick<AuthUser, 'name' | 'initials' | 'avatarUrl' | 'bio'>>) => {
    const next = await updateProfile(patch)
    setUser(next)
    return next
  }, [])

  const savePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await changePassword(currentPassword, newPassword)
  }, [])

  const value = useMemo(() => ({ user, loading, isDemo: apiConfig.contentSource !== 'api', signIn, signOut, refresh, updateProfile: saveProfile, changePassword: savePassword }), [user, loading, signIn, signOut, refresh, saveProfile, savePassword])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return value
}
