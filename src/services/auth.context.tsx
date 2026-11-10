import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { apiConfig } from './api-client'
import { changePassword, closeAccount as closeAccountService, getCurrentUser, login, loginWithCode, logout, redeemInviteCode as redeemInviteCodeService, register, requestLoginCode, requestRegistrationCode, updateProfile, type LoginCodeCredentials, type LoginCredentials, type RegistrationCodeResult, type RegistrationCredentials } from './auth.service'
import type { AuthSession, AuthUser } from '../types'

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isDemo: boolean
  signIn: (credentials: LoginCredentials) => Promise<AuthSession>
  signInWithCode: (credentials: LoginCodeCredentials) => Promise<AuthSession>
  register: (credentials: RegistrationCredentials) => Promise<void>
  requestRegistrationCode: (email: string, turnstileToken: string) => Promise<RegistrationCodeResult>
  requestLoginCode: (email: string, turnstileToken: string) => Promise<RegistrationCodeResult>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'initials' | 'avatarUrl' | 'bio'>>) => Promise<AuthUser>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  redeemInviteCode: (inviteCode: string, realName: string) => Promise<AuthUser>
  closeAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const revision = useRef(0)

  const refresh = useCallback(async () => {
    const requestRevision = ++revision.current
    setLoading(true)
    try {
      const nextUser = await getCurrentUser()
      if (requestRevision === revision.current) setUser(nextUser)
    } finally {
      if (requestRevision === revision.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    const session = await login(credentials)
    ++revision.current
    setUser(session.user)
    setLoading(false)
    return session
  }, [])

  const signInWithVerificationCode = useCallback(async (credentials: LoginCodeCredentials) => {
    const session = await loginWithCode(credentials)
    ++revision.current
    setUser(session.user)
    setLoading(false)
    return session
  }, [])

  const signUp = useCallback(async (credentials: RegistrationCredentials) => {
    await register(credentials)
  }, [])

  const signOut = useCallback(async () => {
    ++revision.current
    await logout()
    setUser(null)
    setLoading(false)
  }, [])

  const saveProfile = useCallback(async (patch: Partial<Pick<AuthUser, 'name' | 'initials' | 'avatarUrl' | 'bio'>>) => {
    const next = await updateProfile(patch)
    setUser(next)
    return next
  }, [])

  const savePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await changePassword(currentPassword, newPassword)
  }, [])

  const redeemInvite = useCallback(async (inviteCode: string, realName: string) => {
    const nextUser = await redeemInviteCodeService(inviteCode, realName)
    setUser(nextUser)
    return nextUser
  }, [])

  const closeCurrentAccount = useCallback(async () => {
    await closeAccountService()
    ++revision.current
    setUser(null)
    setLoading(false)
  }, [])

  const value = useMemo(() => ({ user, loading, isDemo: apiConfig.contentSource !== 'api', signIn, signInWithCode: signInWithVerificationCode, register: signUp, requestRegistrationCode, requestLoginCode, signOut, refresh, updateProfile: saveProfile, changePassword: savePassword, redeemInviteCode: redeemInvite, closeAccount: closeCurrentAccount }), [user, loading, signIn, signInWithVerificationCode, signUp, signOut, refresh, saveProfile, savePassword, redeemInvite, closeCurrentAccount])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return value
}
