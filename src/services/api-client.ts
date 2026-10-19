/**
 * Small, dependency-free HTTP client used by the content services.
 *
 * The app intentionally keeps the client independent from React and from a
 * specific backend framework. A FastAPI, Express, Nest or Supabase adapter
 * can expose the same HTTP contract without requiring page-level changes.
 */

export type QueryValue = string | number | boolean | null | undefined

export interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'signal'> {
  body?: unknown
  query?: Record<string, QueryValue>
  signal?: AbortSignal
  timeoutMs?: number
  expectedStatus?: number | number[]
  /** Public auth endpoints must opt out so a stale token is not forwarded. */
  withAuth?: boolean
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string | number
  readonly details?: unknown

  constructor(message: string, status: number, code?: string | number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export interface BackendResult<T> {
  code: number
  msg?: string | null
  data?: T
}

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
const requestedContentSource = (import.meta.env.VITE_CONTENT_SOURCE ?? '').trim().toLowerCase()
const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 10000)

/** The frontend uses mock data unless an API base URL is explicitly configured. */
export const apiConfig = Object.freeze({
  baseUrl: configuredBaseUrl,
  contentSource: (requestedContentSource === 'api' || (!requestedContentSource && Boolean(configuredBaseUrl)) ? 'api' : 'mock') as 'api' | 'mock',
  timeoutMs: Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 10000,
})

export const isApiConfigured = () => Boolean(apiConfig.baseUrl)

const ACCESS_TOKEN_KEY = 'club-access-token'

export function getAccessToken() {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string | null, remember = true) {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    if (token) (remember ? window.localStorage : window.sessionStorage).setItem(ACCESS_TOKEN_KEY, token)
  } catch {
    // Storage can be unavailable for file:// previews or strict privacy modes.
  }
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = apiConfig.baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  const url = new URL(`${base}${normalizedPath}`, typeof window !== 'undefined' ? window.location.origin : undefined)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    })
  }
  return url.toString()
}

function isJsonBody(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !(value instanceof FormData)
    && !(value instanceof Blob)
    && !(value instanceof ArrayBuffer)
    && !(value instanceof URLSearchParams)
}

function isBackendResult<T>(payload: unknown): payload is BackendResult<T> {
  return Boolean(payload && typeof payload === 'object' && 'code' in payload && typeof (payload as { code?: unknown }).code === 'number')
}

function unwrapResponse<T>(payload: unknown): T {
  if (isBackendResult<T>(payload)) return payload.data as T
  if (payload && typeof payload === 'object' && 'data' in payload) return (payload as { data: T }).data
  return payload as T
}

const validationFieldLabels: Record<string, string> = {
  name: '姓名',
  nickname: '昵称',
  username: '账号名',
  email: '邮箱',
  password: '密码',
  current_password: '当前密码',
  currentPassword: '当前密码',
  new_password: '新密码',
  newPassword: '新密码',
  verification_code: '邮箱验证码',
  verificationCode: '邮箱验证码',
  turnstile_token: '安全验证',
  turnstileToken: '安全验证',
  title: '标题',
  description: '说明',
  summary: '简介',
  content: '内容',
  category: '分类',
  resource_url: '资源链接',
  resourceUrl: '资源链接',
  github_url: 'GitHub 地址',
  githubUrl: 'GitHub 地址',
  url: '链接',
  cohort: '届次',
  direction: '方向',
}

function formatValidationIssue(issue: unknown): string | null {
  if (typeof issue === 'string') return issue
  if (!issue || typeof issue !== 'object') return null

  const value = issue as { type?: unknown; loc?: unknown; msg?: unknown; ctx?: unknown }
  const type = typeof value.type === 'string' ? value.type : ''
  const location = Array.isArray(value.loc) ? value.loc : []
  const field = [...location].reverse().find((part): part is string =>
    typeof part === 'string' && !['body', 'query', 'path', 'header', 'cookie'].includes(part),
  )
  const label = field ? validationFieldLabels[field] ?? '提交内容' : '提交内容'
  const context = value.ctx && typeof value.ctx === 'object' ? value.ctx as Record<string, unknown> : {}
  const limit = typeof context.limit_value === 'number' ? context.limit_value : undefined
  const minLength = typeof context.min_length === 'number' ? context.min_length : undefined
  const maxLength = typeof context.max_length === 'number' ? context.max_length : undefined
  const originalMessage = typeof value.msg === 'string' ? value.msg : ''

  if (/[\u3400-\u9fff]/.test(originalMessage)) return originalMessage

  switch (type) {
    case 'missing':
      return field === 'turnstile_token' || field === 'turnstileToken'
        ? '请先完成安全验证'
        : `请填写${label}`
    case 'string_too_short':
      return minLength === undefined ? `${label}长度不符合要求` : `${label}至少需要 ${minLength} 个字符`
    case 'string_too_long':
      return maxLength === undefined ? `${label}长度不符合要求` : `${label}不能超过 ${maxLength} 个字符`
    case 'string_pattern_mismatch':
      if (field === 'verification_code' || field === 'verificationCode') return '邮箱验证码应为 6 位数字'
      if (field === 'turnstile_token' || field === 'turnstileToken') return '请重新完成安全验证'
      return `${label}格式不正确`
    case 'value_error':
    case 'value_error.email':
      return field === 'email' ? '请输入有效的邮箱地址' : `${label}格式不正确`
    case 'greater_than_equal':
      return limit === undefined ? `${label}数值过小` : `${label}不能小于 ${limit}`
    case 'greater_than':
      return limit === undefined ? `${label}数值过小` : `${label}必须大于 ${limit}`
    case 'less_than_equal':
      return limit === undefined ? `${label}数值过大` : `${label}不能大于 ${limit}`
    case 'less_than':
      return limit === undefined ? `${label}数值过大` : `${label}必须小于 ${limit}`
    case 'int_parsing':
    case 'int_type':
      return `${label}必须是整数`
    case 'float_parsing':
    case 'float_type':
      return `${label}必须是数字`
    case 'bool_parsing':
    case 'bool_type':
      return `${label}选项无效，请重新选择`
    case 'list_type':
      return `${label}内容格式不正确`
    case 'url_parsing':
    case 'url_scheme':
      return `请输入有效的${label}`
    case 'extra_forbidden':
      return '提交内容包含不支持的字段，请刷新页面后重试'
    default:
      return `${label}不符合要求，请检查后重试`
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const candidate = payload as { message?: unknown; msg?: unknown; error?: unknown; detail?: unknown }
    if (typeof candidate.message === 'string') return candidate.message
    if (typeof candidate.msg === 'string') return candidate.msg
    if (candidate.error && typeof candidate.error === 'object') {
      const nested = candidate.error as { message?: unknown }
      if (typeof nested.message === 'string') return nested.message
    }
    if (typeof candidate.error === 'string') return candidate.error
    if (typeof candidate.detail === 'string') return candidate.detail
    if (Array.isArray(candidate.detail)) {
      const messages = candidate.detail
        .map(formatValidationIssue)
        .filter((item): item is string => Boolean(item))
      if (messages.length) return messages.join('；')
    }
  }
  return fallback
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError('未配置 API 地址，当前使用本地持久化内容。', 0, 'API_NOT_CONFIGURED')
  }

  const { body, query, signal: externalSignal, timeoutMs = apiConfig.timeoutMs, expectedStatus, withAuth = true, headers: inputHeaders, ...requestInit } = options
  const headers = new Headers(inputHeaders)
  headers.set('Accept', headers.get('Accept') ?? 'application/json')

  const token = withAuth ? getAccessToken() : null
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)

  let requestBody: BodyInit | null | undefined
  if (isJsonBody(body)) {
    headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json')
    requestBody = JSON.stringify(body)
  } else {
    requestBody = body as BodyInit | null | undefined
  }

  const controller = new AbortController()
  let timedOut = false
  const timer = globalThis.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, Math.max(timeoutMs, 1000))
  const abortExternal = () => controller.abort()
  if (externalSignal?.aborted) controller.abort()
  else externalSignal?.addEventListener('abort', abortExternal, { once: true })

  try {
    const response = await fetch(buildUrl(path, query), {
      ...requestInit,
      body: requestBody,
      headers,
      signal: controller.signal,
    })
    const raw = await response.text()
    let payload: unknown = undefined
    if (raw) {
      try { payload = JSON.parse(raw) } catch { payload = raw }
    }

    const allowedStatuses = expectedStatus === undefined ? undefined : (Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus])
    const businessResult = isBackendResult<unknown>(payload) ? payload : undefined
    const businessSuccess = !businessResult || businessResult.code === 200
    if (!response.ok || (allowedStatuses && !allowedStatuses.includes(response.status)) || !businessSuccess) {
      const errorPayload = payload && typeof payload === 'object' ? payload as { code?: unknown; details?: unknown; error?: unknown; msg?: unknown } : undefined
      const nestedError = errorPayload?.error && typeof errorPayload.error === 'object'
        ? errorPayload.error as { code?: unknown; details?: unknown }
        : undefined
      const businessStatus = businessResult && businessResult.code !== 200 ? businessResult.code : undefined
      throw new ApiError(
        getErrorMessage(payload, businessResult ? `请求未通过业务校验（${businessResult.code}）` : allowedStatuses ? `请求未返回预期状态（${response.status}）` : `请求失败（${response.status}）`),
        businessStatus ?? response.status,
        typeof errorPayload?.code === 'string' || typeof errorPayload?.code === 'number'
          ? errorPayload.code
          : typeof nestedError?.code === 'string' || typeof nestedError?.code === 'number' ? nestedError.code : undefined,
        errorPayload?.details ?? nestedError?.details ?? payload,
      )
    }
    return unwrapResponse<T>(payload)
  } catch (error) {
    // 超时/取消时 fetch 抛的是浏览器原生 DOMException（"signal is aborted without reason"），
    // 原样透出会把英文错误显示到界面上，这里统一换成可读提示。
    if (timedOut) throw new ApiError('请求超时，请检查网络后重试', 0, 'TIMEOUT')
    if (controller.signal.aborted) throw new ApiError('请求已取消，请重试', 0, 'ABORTED')
    throw error
  } finally {
    globalThis.clearTimeout(timer)
    externalSignal?.removeEventListener('abort', abortExternal)
  }
}
