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
      const messages = candidate.detail.map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && typeof (item as { msg?: unknown }).msg === 'string') return (item as { msg: string }).msg
        return null
      }).filter((item): item is string => Boolean(item))
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
  const timer = globalThis.setTimeout(() => controller.abort(), Math.max(timeoutMs, 1000))
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
  } finally {
    globalThis.clearTimeout(timer)
    externalSignal?.removeEventListener('abort', abortExternal)
  }
}
