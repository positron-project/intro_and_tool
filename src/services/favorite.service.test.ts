import { describe, expect, it } from 'vitest'

import { favoriteTargetMatches, normalizeFavoriteRecord } from './favorite.service'

describe('favoriteTargetMatches', () => {
  it('treats numeric and string content IDs as the same target', () => {
    expect(favoriteTargetMatches({ targetType: 'resource', targetId: '12' }, 'resource', 12)).toBe(true)
    expect(favoriteTargetMatches({ targetType: 'project', targetId: '12' }, 'resource', 12)).toBe(false)
    expect(favoriteTargetMatches({ targetType: 'prompt', targetId: '12' }, 'prompt', 13)).toBe(false)
  })
})

describe('normalizeFavoriteRecord', () => {
  it('normalizes the backend snake_case favorite fields', async () => {
    expect(normalizeFavoriteRecord({ target_type: 'resource', target_id: 12, favorite_count: 3, created_at: '2026-10-20T00:00:00Z' })).toEqual({
      id: undefined,
      targetType: 'resource',
      targetId: '12',
      favoriteCount: 3,
      createdAt: '2026-10-20T00:00:00Z',
    })
  })
})
