import type { Resource } from '../types'

/** Prefer the detail response over a potentially stale list snapshot. */
export function selectResourceDetail(listResource: Resource | undefined, freshResource: Resource | undefined) {
  return freshResource?.id === listResource?.id ? freshResource : listResource
}

/** Resolve both absolute links and same-origin paths from a relative API base. */
export function resolveResourceUrl(value: string | undefined, baseUrl = 'http://localhost', fallbackBaseUrl = 'http://localhost') {
  const source = value?.trim()
  if (!source || source.startsWith('#/')) return undefined

  try {
    const resolved = new URL(source, new URL(baseUrl, fallbackBaseUrl))
    return resolved.protocol === 'https:' || resolved.protocol === 'http:' ? resolved.href : undefined
  } catch {
    return undefined
  }
}
