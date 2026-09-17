import { apiConfig, apiRequest, getAccessToken, setAccessToken } from './api-client'
import type { AccountStatus, AuthSession, AuthUser, ContentVisibility } from '../types'
import { redeemInviteCodeValue } from './invite.service'

export interface LoginCredentials {
  email: string
  password: string
  turnstileToken: string
  rememberMe: boolean
}

export interface LoginCodeCredentials {
  email: string
  verificationCode: string
  turnstileToken: string
  rememberMe: boolean
}

export interface RegistrationCredentials {
  username: string
  email: string
  verificationCode: string
  password: string
  turnstileToken: string
}

export interface RegistrationCodeResult {
  expiresInSeconds: number
  demoCode?: string
}

interface BackendUserResponse {
  id: number | string
  username: string
  email: string
  name?: string | null
  nickname?: string | null
  avatarUrl?: string | null
  avatar_url?: string | null
  bio?: string | null
  initials?: string | null
  cohort?: string | null
  role?: AuthUser['role'] | null
  directions?: string[] | null
  status?: AccountStatus | null
}

interface BackendAuthResponse {
  accessToken: string
  refreshToken?: string
  expiresAt?: string
  user: BackendUserResponse
}

const DEMO_SESSION_KEY = 'club-demo-session'
const DEMO_PASSWORD = 'club2029'
const DEMO_PASSWORDS_KEY = 'club-demo-passwords'
const DEMO_REGISTRATIONS_KEY = 'club-demo-registrations'
const DEMO_VERIFICATION_CODES_KEY = 'club-demo-verification-codes'
const DEMO_ACCOUNT_STATUSES_KEY = 'club-demo-account-statuses'

const demoAccounts: Record<string, AuthUser> = {
  leader: {
    id: 'demo-leader',
    name: '科技小组组长',
    email: 'leader@example.com',
    initials: '组长',
    cohort: '全站',
    role: 'Leader',
    directions: ['全站内容', '成员与权限'],
    status: 'active',
  },
  owner2029: {
    id: 'demo-owner-2029',
    name: '2029 届负责人',
    email: 'owner2029@example.com',
    initials: '29',
    cohort: '2029',
    role: 'Contributor',
    directions: ['算法组', '项目组', '网安组'],
    status: 'active',
  },
}

export const isDemoAuth = apiConfig.contentSource !== 'api'
export const demoCredentials = Object.freeze({ email: 'leader@example.com', password: DEMO_PASSWORD })
export const demoOwnerCredentials = Object.freeze({ email: 'owner2029@example.com', password: DEMO_PASSWORD })

function readDemoSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY) ?? window.sessionStorage.getItem(DEMO_SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    return session?.user?.id && session.accessToken ? session : null
  } catch {
    return null
  }
}

function writeDemoSession(session: AuthSession | null, remember = true) {
  try {
    window.localStorage.removeItem(DEMO_SESSION_KEY)
    window.sessionStorage.removeItem(DEMO_SESSION_KEY)
    if (session) (remember ? window.localStorage : window.sessionStorage).setItem(DEMO_SESSION_KEY, JSON.stringify(session))
  } catch {
    // Storage can be unavailable for file:// previews or strict privacy modes.
  }
}

function normalizeBackendUser(user: BackendUserResponse): AuthUser {
  const name = user.name?.trim() || user.nickname?.trim() || user.username

  return {
    id: String(user.id),
    name,
    email: user.email,
    initials: user.initials?.trim() || name.slice(0, 2).toUpperCase(),
    cohort: user.cohort?.trim() || '待分配',
    role: user.role ?? 'Member',
    directions: Array.isArray(user.directions) ? user.directions : [],
    avatarUrl: user.avatarUrl ?? user.avatar_url ?? undefined,
    bio: user.bio ?? undefined,
    status: user.status ?? 'active',
  }
}

function normalizeBackendSession(session: BackendAuthResponse): AuthSession {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    user: normalizeBackendUser(session.user),
  }
}

/** Authentication boundary used by the login page and future admin console. */
export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  if (isDemoAuth) {
    const email = credentials.email.trim().toLowerCase()
    const accounts = readDemoAccounts()
    const username = Object.entries(accounts).find(([, account]) => account.email?.toLowerCase() === email)?.[0]
    const user = username ? accounts[username] : undefined
    if (!isValidEmail(email) || !username || !user || user.status === 'disabled' || user.status === 'closed' || credentials.password !== readDemoPassword(username)) throw new Error(user?.status === 'disabled' ? '账号已被管理员禁用' : user?.status === 'closed' ? '账号已注销' : '邮箱或密码不正确')
    const session = createSession(user)
    writeDemoSession(session, credentials.rememberMe)
    persistSessionToken(session, credentials.rememberMe)
    return session
  }

  const response = await apiRequest<BackendAuthResponse>('/auth/login', { method: 'POST', body: { email: credentials.email.trim().toLowerCase(), password: credentials.password, turnstileToken: credentials.turnstileToken, rememberMe: credentials.rememberMe }, expectedStatus: 200, withAuth: false })
  const session = normalizeBackendSession(response)
  persistSessionToken(session, credentials.rememberMe)
  return session
}

function createSession(user: AuthUser): AuthSession {
  return {
    accessToken: `demo-token-${user.id}`,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    user,
  }
}

function persistSessionToken(session: AuthSession, remember: boolean) {
  if (!session.accessToken || typeof session.accessToken !== 'string') throw new Error('登录响应缺少有效 token')
  setAccessToken(session.accessToken, remember)
}

export async function loginWithCode(credentials: LoginCodeCredentials): Promise<AuthSession> {
  const email = credentials.email.trim().toLowerCase()
  if (!isValidEmail(email)) throw new Error('请输入合法的邮箱地址')
  if (!credentials.verificationCode.trim()) throw new Error('请输入邮箱验证码')
  if (!credentials.turnstileToken) throw new Error('请先完成验证码校验')

  if (!isDemoAuth) {
    const response = await apiRequest<BackendAuthResponse>('/auth/login/code', { method: 'POST', body: { email, verificationCode: credentials.verificationCode.trim(), turnstileToken: credentials.turnstileToken, rememberMe: credentials.rememberMe }, expectedStatus: 200, withAuth: false })
    const session = normalizeBackendSession(response)
    persistSessionToken(session, credentials.rememberMe)
    return session
  }

  const storedCode = readDemoVerificationCode(email)
  const account = Object.values(readDemoAccounts()).find((item) => item.email?.toLowerCase() === email)
  if (!account || !storedCode || storedCode.code !== credentials.verificationCode.trim() || storedCode.expiresAt < Date.now()) throw new Error('邮箱或验证码不正确')
  const session = createSession(account)
  writeDemoSession(session, credentials.rememberMe)
  persistSessionToken(session, credentials.rememberMe)
  return session
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())
}

export async function requestRegistrationCode(email: string, turnstileToken: string): Promise<RegistrationCodeResult> {
  if (!isValidEmail(email)) throw new Error('请输入合法的邮箱地址')
  if (!turnstileToken) throw new Error('请先完成验证码校验')
  if (!isDemoAuth) return apiRequest<RegistrationCodeResult>('/auth/register/send-code', { method: 'POST', body: { email: email.trim().toLowerCase(), turnstileToken }, withAuth: false })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  try {
    const stored = JSON.parse(window.localStorage.getItem(DEMO_VERIFICATION_CODES_KEY) ?? '{}') as Record<string, { code: string; expiresAt: number }>
    stored[email.trim().toLowerCase()] = { code, expiresAt: Date.now() + 10 * 60 * 1000 }
    window.localStorage.setItem(DEMO_VERIFICATION_CODES_KEY, JSON.stringify(stored))
  } catch { /* Storage may be unavailable in strict file:// previews. */ }
  return { expiresInSeconds: 600, demoCode: code }
}

export async function requestLoginCode(email: string, turnstileToken: string): Promise<RegistrationCodeResult> {
  if (!isValidEmail(email)) throw new Error('请输入合法的邮箱地址')
  if (!turnstileToken) throw new Error('请先完成验证码校验')
  if (!isDemoAuth) return apiRequest<RegistrationCodeResult>('/auth/login/send-code', { method: 'POST', body: { email: email.trim().toLowerCase(), turnstileToken }, withAuth: false })

  const account = Object.values(readDemoAccounts()).find((item) => item.email?.toLowerCase() === email.trim().toLowerCase())
  if (!account) throw new Error('该邮箱尚未注册')
  const code = String(Math.floor(100000 + Math.random() * 900000))
  try {
    const stored = JSON.parse(window.localStorage.getItem(DEMO_VERIFICATION_CODES_KEY) ?? '{}') as Record<string, { code: string; expiresAt: number }>
    stored[email.trim().toLowerCase()] = { code, expiresAt: Date.now() + 10 * 60 * 1000 }
    window.localStorage.setItem(DEMO_VERIFICATION_CODES_KEY, JSON.stringify(stored))
  } catch { /* Storage may be unavailable in strict file:// previews. */ }
  return { expiresInSeconds: 600, demoCode: code }
}

export async function register(credentials: RegistrationCredentials): Promise<void> {
  const username = credentials.username.trim().toLowerCase()
  const email = credentials.email.trim().toLowerCase()
  if (!username) throw new Error('请填写账号名')
  if (username.length < 2 || username.length > 32) throw new Error('账号名长度应为 2–32 个字符')
  if (!isValidEmail(email)) throw new Error('请输入合法的邮箱地址')
  if (credentials.password.length < 8) throw new Error('密码至少需要 8 位')
  if (!credentials.turnstileToken) throw new Error('请先完成验证码校验')

  if (!isDemoAuth) {
    await apiRequest('/auth/register', { method: 'POST', body: { verificationCode: credentials.verificationCode.trim(), username, email, password: credentials.password, turnstileToken: credentials.turnstileToken }, expectedStatus: 201, withAuth: false })
    return
  }

  const storedCode = readDemoVerificationCode(email)
  if (!storedCode || storedCode.code !== credentials.verificationCode.trim() || storedCode.expiresAt < Date.now()) throw new Error('邮箱验证码不正确或已过期')
  const registrations = readDemoRegistrations()
  if (readDemoAccounts()[username]) throw new Error('该账号已存在，请换一个账号')
  if (Object.values(readDemoAccounts()).some((account) => account.email?.toLowerCase() === email)) throw new Error('该邮箱已注册，请直接登录或换一个邮箱')
  const user: AuthUser = { id: `demo-member-${email}`, name: username, email, initials: username.slice(0, 2).toUpperCase(), cohort: '待分配', role: 'Member', directions: [], status: 'active' }
  registrations[username] = { user, email, password: credentials.password }
  writeDemoRegistrations(registrations)
  try {
    const stored = JSON.parse(window.localStorage.getItem(DEMO_VERIFICATION_CODES_KEY) ?? '{}') as Record<string, unknown>
    delete stored[email]
    window.localStorage.setItem(DEMO_VERIFICATION_CODES_KEY, JSON.stringify(stored))
  } catch { /* Storage may be unavailable in strict file:// previews. */ }
}

function readDemoRegistrations() {
  try {
    const value = JSON.parse(window.localStorage.getItem(DEMO_REGISTRATIONS_KEY) ?? '{}') as Record<string, { user: AuthUser; email: string; password: string }>
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

function writeDemoRegistrations(value: Record<string, { user: AuthUser; email: string; password: string }>) {
  try { window.localStorage.setItem(DEMO_REGISTRATIONS_KEY, JSON.stringify(value)) } catch { /* Storage may be unavailable in strict file:// previews. */ }
}

function readDemoAccountStatuses(): Record<string, AccountStatus> {
  try {
    const value = JSON.parse(window.localStorage.getItem(DEMO_ACCOUNT_STATUSES_KEY) ?? '{}') as Record<string, AccountStatus>
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

function writeDemoAccountStatuses(value: Record<string, AccountStatus>) {
  try { window.localStorage.setItem(DEMO_ACCOUNT_STATUSES_KEY, JSON.stringify(value)) } catch { /* Storage may be unavailable in strict file:// previews. */ }
}

function readDemoAccounts() {
  const registrations = readDemoRegistrations()
  const statuses = readDemoAccountStatuses()
  const builtInAccounts = Object.fromEntries(Object.entries(demoAccounts).map(([username, account]) => [username, { ...account, status: statuses[account.id] ?? account.status ?? 'active' }]))
  const registeredAccounts = Object.fromEntries(Object.entries(registrations).map(([username, item]) => [username, { ...item.user, status: statuses[item.user.id] ?? item.user.status ?? 'active' }]))
  return { ...builtInAccounts, ...registeredAccounts }
}

/**
 * Returns accounts for the administrator account directory.
 *
 * The mock branch reads browser-only demo data. In API mode the backend must
 * enforce the administrator permission and return the same user shape.
 */
export async function listManagedAccounts() {
  if (!isDemoAuth) {
    const payload = await apiRequest<BackendUserResponse[] | { items: BackendUserResponse[] }>('/admin/users', { withAuth: true })
    const accounts = Array.isArray(payload) ? payload : payload.items
    return accounts.map(normalizeBackendUser)
  }
  return Object.values(readDemoAccounts())
}

/** Changes an account status and immediately invalidates disabled sessions. */
export async function updateManagedAccountStatus(userId: string, status: AccountStatus) {
  if (!isDemoAuth) {
    const account = await apiRequest<BackendUserResponse>(`/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      body: { status },
      withAuth: true,
    })
    return normalizeBackendUser(account)
  }
  const accountEntry = Object.entries(readDemoAccounts()).find(([, account]) => account.id === userId)
  if (!accountEntry) throw new Error('账号不存在或已被删除')
  const [username, account] = accountEntry
  const statuses = readDemoAccountStatuses()
  statuses[userId] = status
  writeDemoAccountStatuses(statuses)
  const registrations = readDemoRegistrations()
  if (registrations[username]) {
    registrations[username].user = { ...registrations[username].user, status }
    writeDemoRegistrations(registrations)
  }
  const session = readDemoSession()
  if (session?.user.id === userId) {
    if (status === 'active') writeDemoSession({ ...session, user: { ...session.user, status } })
    else { writeDemoSession(null); setAccessToken(null) }
  }
  return { ...account, status }
}

function readDemoVerificationCode(email: string) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(DEMO_VERIFICATION_CODES_KEY) ?? '{}') as Record<string, { code?: string; expiresAt?: number }>
    const item = stored[email]
    return item?.code && item.expiresAt ? { code: item.code, expiresAt: item.expiresAt } : null
  } catch {
    return null
  }
}

function readDemoPassword(username: string) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(DEMO_PASSWORDS_KEY) ?? '{}') as Record<string, string>
    return stored[username] || readDemoRegistrations()[username]?.password || DEMO_PASSWORD
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
  if (!isDemoAuth) {
    const user = await apiRequest<BackendUserResponse>('/auth/me', { method: 'PATCH', body: patch })
    return normalizeBackendUser(user)
  }
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
  if (isDemoAuth) {
    const session = readDemoSession()
    if (!session || session.user.status === 'disabled' || session.user.status === 'closed') {
      if (session) writeDemoSession(null)
      return null
    }
    return session.user
  }
  if (!getAccessToken()) return null
  try {
    const user = await apiRequest<BackendUserResponse>('/auth/me')
    return normalizeBackendUser(user)
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

/**
 * Redeems one invitation and updates the current local demo session. In the
 * real deployment this call will be handled by the backend so the browser
 * cannot forge a role change.
 */
export async function redeemInviteCode(inviteCode: string): Promise<AuthUser> {
  if (!isDemoAuth) {
    const user = await apiRequest<BackendUserResponse>('/auth/me/redeem-invite', { method: 'POST', body: { inviteCode } })
    return normalizeBackendUser(user)
  }

  const session = readDemoSession()
  if (!session) throw new Error('请先登录后再兑换邀请码')
  if (session.user.status === 'disabled' || session.user.status === 'closed') throw new Error('当前账号不可用，请联系管理员')
  if (session.user.role !== 'Member') throw new Error('当前账号已经拥有组员或管理员身份，无需重复兑换')

  const redeemed = redeemInviteCodeValue(inviteCode)
  const updatedUser: AuthUser = { ...session.user, role: redeemed.role, status: 'active' }
  writeDemoSession({ ...session, user: updatedUser })

  // Keep registered demo accounts consistent after the user logs out and in.
  const registrations = readDemoRegistrations()
  const account = Object.values(registrations).find((item) => item.user.id === updatedUser.id)
  if (account) {
    account.user = updatedUser
    writeDemoRegistrations(registrations)
  }
  return updatedUser
}

/** Closes the current demo account and clears its local session. */
export async function closeAccount(): Promise<void> {
  if (!isDemoAuth) {
    await apiRequest<void>('/auth/me', { method: 'DELETE' })
    setAccessToken(null)
    return
  }
  const session = readDemoSession()
  if (!session) throw new Error('登录状态已失效，请重新登录')
  const statuses = readDemoAccountStatuses()
  statuses[session.user.id] = 'closed'
  writeDemoAccountStatuses(statuses)
  const registrations = readDemoRegistrations()
  const account = Object.values(registrations).find((item) => item.user.id === session.user.id)
  if (account) {
    account.user = { ...account.user, status: 'closed' }
    writeDemoRegistrations(registrations)
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

/** UI visibility helper. The backend must enforce the same rule on real data. */
export function canViewContent(user: AuthUser | null, visibility: ContentVisibility = 'public') {
  if (visibility === 'public') return true
  if (!user || user.status === 'disabled' || user.status === 'closed') return false
  if (visibility === 'contributors') return ['Contributor', 'Leader', 'Admin'].includes(user.role)
  return true
}
