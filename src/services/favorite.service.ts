import { apiConfig, apiRequest } from './api-client'

export type FavoriteTargetType = 'project' | 'resource' | 'interview' | 'prompt'

export interface FavoriteRecord {
  id?: string | number
  targetType: FavoriteTargetType
  targetId: string
  createdAt?: string
  favoriteCount?: number
}

export interface FavoriteResult {
  targetType: FavoriteTargetType
  targetId: string
  isFavorited: boolean
  favoriteCount?: number
}

const STORAGE_KEY = 'club-favorites-v1'
const FAVORITE_TARGET_TYPES = new Set<FavoriteTargetType>(['project', 'resource', 'interview', 'prompt'])

/**
 * Content IDs are strings in the frontend contract, but older API responses
 * and local demo records may contain numbers. Matching by their textual form
 * keeps the favorite button and the account favorites list consistent.
 */
export function favoriteTargetMatches(record: Pick<FavoriteRecord, 'targetType' | 'targetId'>, targetType: FavoriteTargetType, targetId: string | number) {
  return record.targetType === targetType && String(record.targetId) === String(targetId)
}

export function normalizeFavoriteRecord(value: unknown): FavoriteRecord | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<FavoriteRecord> & { target_type?: unknown; target_id?: unknown; targetType?: unknown; targetId?: unknown }
  const targetType = item.targetType ?? item.target_type
  const targetId = item.targetId ?? item.target_id
  if (typeof targetType !== 'string' || !FAVORITE_TARGET_TYPES.has(targetType as FavoriteTargetType) || targetId === undefined || targetId === null || String(targetId).trim() === '') return null
  return {
    id: item.id,
    targetType: targetType as FavoriteTargetType,
    targetId: String(targetId),
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : typeof (item as { created_at?: unknown }).created_at === 'string' ? (item as { created_at: string }).created_at : undefined,
    favoriteCount: typeof item.favoriteCount === 'number' ? item.favoriteCount : typeof (item as { favorite_count?: unknown }).favorite_count === 'number' ? (item as { favorite_count: number }).favorite_count : undefined,
  }
}

function storageKey(ownerId?: string | number) {
  return ownerId === undefined || ownerId === null ? STORAGE_KEY : `${STORAGE_KEY}:${ownerId}`
}

function recordKey(targetType: FavoriteTargetType, targetId: string) {
  return `${targetType}:${targetId}`
}

function readLocalFavorites(ownerId?: string | number) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(ownerId)) ?? '[]')
    return Array.isArray(parsed) ? parsed.map(normalizeFavoriteRecord).filter((item): item is FavoriteRecord => Boolean(item)) : []
  } catch {
    return []
  }
}

function writeLocalFavorites(items: FavoriteRecord[], ownerId?: string | number) {
  try { window.localStorage.setItem(storageKey(ownerId), JSON.stringify(items)) } catch { /* Storage may be unavailable. */ }
}

function normalizeResult(value: unknown, targetType: FavoriteTargetType, targetId: string, fallback: boolean): FavoriteResult {
  const payload = value && typeof value === 'object' ? value as Partial<FavoriteResult> & { favorited?: boolean; is_favorited?: boolean; favorite_count?: number } : {}
  return {
    targetType,
    targetId,
    isFavorited: typeof payload.isFavorited === 'boolean' ? payload.isFavorited : typeof payload.is_favorited === 'boolean' ? payload.is_favorited : typeof payload.favorited === 'boolean' ? payload.favorited : fallback,
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
    const items = Array.isArray(payload) ? payload : payload.items ?? payload.favorites ?? []
    return items.map(normalizeFavoriteRecord).filter((item): item is FavoriteRecord => Boolean(item))
  }
  return readLocalFavorites(ownerId)
}
