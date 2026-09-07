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
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
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
    return window.localStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
    else window.localStorage.removeItem(ACCESS_TOKEN_KEY)
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

function unwrapResponse<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const candidate = payload as { message?: unknown; error?: unknown; detail?: unknown }
    if (typeof candidate.message === 'string') return candidate.message
    if (candidate.error && typeof candidate.error === 'object') {
      const nested = candidate.error as { message?: unknown }
      if (typeof nested.message === 'string') return nested.message
    }
    if (typeof candidate.error === 'string') return candidate.error
    if (typeof candidate.detail === 'string') return candidate.detail
  }
  return fallback
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError('未配置 API 地址，当前使用本地持久化内容。', 0, 'API_NOT_CONFIGURED')
  }

  const { body, query, signal: externalSignal, timeoutMs = apiConfig.timeoutMs, headers: inputHeaders, ...requestInit } = options
  const headers = new Headers(inputHeaders)
  headers.set('Accept', headers.get('Accept') ?? 'application/json')

  const token = getAccessToken()
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

    if (!response.ok) {
      const errorPayload = payload && typeof payload === 'object' ? payload as { code?: unknown; details?: unknown; error?: unknown } : undefined
      const nestedError = errorPayload?.error && typeof errorPayload.error === 'object'
        ? errorPayload.error as { code?: unknown; details?: unknown }
        : undefined
      throw new ApiError(
        getErrorMessage(payload, `请求失败（${response.status}）`),
        response.status,
        typeof errorPayload?.code === 'string'
          ? errorPayload.code
          : typeof nestedError?.code === 'string' ? nestedError.code : undefined,
        errorPayload?.details ?? nestedError?.details ?? payload,
      )
    }
    return unwrapResponse<T>(payload)
  } finally {
    globalThis.clearTimeout(timer)
    externalSignal?.removeEventListener('abort', abortExternal)
  }
}
