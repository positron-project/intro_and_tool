import { apiConfig, apiRequest } from './api-client'

export type FavoriteTargetType = 'project' | 'resource' | 'interview' | 'prompt'

export interface FavoriteRecord {
  id?: string | number
  targetType: FavoriteTargetType
  targetId: string
  createdAt?: string
}

export interface FavoriteResult {
  targetType: FavoriteTargetType
  targetId: string
  isFavorited: boolean
  favoriteCount?: number
}

const STORAGE_KEY = 'club-favorites-v1'

function storageKey(ownerId?: string | number) {
  return ownerId === undefined || ownerId === null ? STORAGE_KEY : `${STORAGE_KEY}:${ownerId}`
}

function recordKey(targetType: FavoriteTargetType, targetId: string) {
  return `${targetType}:${targetId}`
}

function readLocalFavorites(ownerId?: string | number) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(ownerId)) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item): item is FavoriteRecord => Boolean(item && typeof item.targetType === 'string' && typeof item.targetId === 'string')) : []
  } catch {
    return []
  }
}

function writeLocalFavorites(items: FavoriteRecord[], ownerId?: string | number) {
  try { window.localStorage.setItem(storageKey(ownerId), JSON.stringify(items)) } catch { /* Storage may be unavailable. */ }
}

function normalizeResult(value: unknown, targetType: FavoriteTargetType, targetId: string, fallback: boolean): FavoriteResult {
  const payload = value && typeof value === 'object' ? value as Partial<FavoriteResult> & { favorited?: boolean; favorite_count?: number } : {}
  return {
    targetType,
    targetId,
    isFavorited: typeof payload.isFavorited === 'boolean' ? payload.isFavorited : typeof payload.favorited === 'boolean' ? payload.favorited : fallback,
    favoriteCount: typeof payload.favoriteCount === 'number' ? payload.favoriteCount : typeof payload.favorite_count === 'number' ? payload.favorite_count : undefined,
  }
}

/**
 * API contract:
 * POST /favorites { targetType, targetId }
 * DELETE /favorites/{targetType}/{targetId}
 * Both may return { isFavorited, favoriteCount } in the Result.data payload.
 */
export async function toggleFavorite(targetType: FavoriteTargetType, targetId: string, nextState: boolean, ownerId?: string | number) {
  if (apiConfig.contentSource === 'api') {
    const path = nextState ? '/favorites' : `/favorites/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`
    const payload = nextState
      ? await apiRequest<FavoriteResult>(path, { method: 'POST', body: { targetType, targetId } })
      : await apiRequest<FavoriteResult>(path, { method: 'DELETE' })
    return normalizeResult(payload, targetType, targetId, nextState)
  }

  const items = readLocalFavorites(ownerId)
  const key = recordKey(targetType, targetId)
  const next = nextState
    ? [...items.filter((item) => recordKey(item.targetType, item.targetId) !== key), { targetType, targetId }]
    : items.filter((item) => recordKey(item.targetType, item.targetId) !== key)
  writeLocalFavorites(next, ownerId)
  return { targetType, targetId, isFavorited: nextState }
}

export async function listFavorites(ownerId?: string | number) {
  if (apiConfig.contentSource === 'api') {
    const payload = await apiRequest<FavoriteRecord[] | { items?: FavoriteRecord[]; favorites?: FavoriteRecord[] }>('/favorites')
    if (Array.isArray(payload)) return payload
    return payload.items ?? payload.favorites ?? []
  }
  return readLocalFavorites(ownerId)
}
