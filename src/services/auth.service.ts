import { apiConfig, apiRequest, getAccessToken, setAccessToken } from './api-client'
import type { AuthSession, AuthUser } from '../types'

export interface LoginCredentials {
  username: string
  password: string
}

const DEMO_SESSION_KEY = 'club-demo-session'
const DEMO_PASSWORD = 'club2029'
const DEMO_PASSWORDS_KEY = 'club-demo-passwords'

const demoAccounts: Record<string, AuthUser> = {
  leader: {
    id: 'demo-leader',
    name: '科技小组组长',
    initials: '组长',
    cohort: '全站',
    role: 'Leader',
    directions: ['全站内容', '成员与权限'],
  },
  owner2029: {
    id: 'demo-owner-2029',
    name: '2029 届负责人',
    initials: '29',
    cohort: '2029',
    role: 'Contributor',
    directions: ['算法组', '项目组', '网安组'],
  },
}

export const isDemoAuth = apiConfig.contentSource !== 'api'
export const demoCredentials = Object.freeze({ username: 'leader', password: DEMO_PASSWORD })
export const demoOwnerCredentials = Object.freeze({ username: 'owner2029', password: DEMO_PASSWORD })

function readDemoSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    return session?.user?.id && session.accessToken ? session : null
  } catch {
    return null
  }
}

function writeDemoSession(session: AuthSession | null) {
  try {
    if (session) window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session))
    else window.localStorage.removeItem(DEMO_SESSION_KEY)
  } catch {
    // Storage can be unavailable for file:// previews or strict privacy modes.
  }
}

/** Authentication boundary used by the login page and future admin console. */
export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  if (isDemoAuth) {
    const username = credentials.username.trim().toLowerCase()
    const user = demoAccounts[username]
    if (!user || credentials.password !== readDemoPassword(username)) throw new Error('账号或密码不正确')
    const session: AuthSession = {
      accessToken: `demo-token-${user.id}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      user,
    }
    writeDemoSession(session)
    setAccessToken(session.accessToken)
    return session
  }

  const session = await apiRequest<AuthSession>('/auth/login', { method: 'POST', body: credentials })
  setAccessToken(session.accessToken)
  return session
}

function readDemoPassword(username: string) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(DEMO_PASSWORDS_KEY) ?? '{}') as Record<string, string>
    return stored[username] || DEMO_PASSWORD
  } catch {
    return DEMO_PASSWORD
  }
}

function writeDemoPassword(username: string, password: string) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(DEMO_PASSWORDS_KEY) ?? '{}') as Record<string, string>
    stored[username] = password
    window.localStorage.setItem(DEMO_PASSWORDS_KEY, JSON.stringify(stored))
  } catch { /* Storage may be unavailable in strict file:// previews. */ }
}

export async function updateProfile(patch: Partial<Pick<AuthUser, 'name' | 'initials' | 'avatarUrl' | 'bio'>>) {
  if (!isDemoAuth) return apiRequest<AuthUser>('/auth/me', { method: 'PATCH', body: patch })
  const session = readDemoSession()
  if (!session) throw new Error('登录状态已失效，请重新登录')
  const user = { ...session.user, ...patch }
  writeDemoSession({ ...session, user })
  return user
}

export async function changePassword(currentPassword: string, newPassword: string) {
  if (!isDemoAuth) {
    await apiRequest<void>('/auth/me/password', { method: 'PATCH', body: { currentPassword, newPassword } })
    return
  }
  const session = readDemoSession()
  if (!session) throw new Error('登录状态已失效，请重新登录')
  const username = session.user.id === 'demo-leader' ? 'leader' : 'owner2029'
  if (currentPassword !== readDemoPassword(username)) throw new Error('当前密码不正确')
  writeDemoPassword(username, newPassword)
}
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isDemoAuth) return readDemoSession()?.user ?? null
  if (!getAccessToken()) return null
  try {
    return await apiRequest<AuthUser>('/auth/me')
  } catch {
    setAccessToken(null)
    return null
  }
}

export async function logout() {
  if (!isDemoAuth && getAccessToken()) {
    try { await apiRequest<void>('/auth/logout', { method: 'POST' }) } catch { /* local token is still cleared */ }
  }
  writeDemoSession(null)
  setAccessToken(null)
}

/** Frontend convenience check; the backend must enforce the same rules. */
export function canManageContent(user: AuthUser | null, contentCohort?: string) {
  if (!user) return false
  if (user.role === 'Admin' || user.role === 'Leader') return true
  return user.role === 'Contributor' && (!contentCohort || contentCohort === user.cohort)
}
