import { describe, expect, it } from 'vitest'
import type { Resource } from '../types'
import { resolveResourceUrl, selectResourceDetail } from './resource-detail'

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'resource-1',
    title: '尚硅谷大模型1',
    description: '大模型学习资料',
    category: 'study',
    type: 'article',
    tags: [],
    author: '小王',
    updated: '2026-11-27',
    views: 0,
    accent: 'blue',
    accessMode: 'external_link',
    visibility: 'public',
    links: [],
    ...overrides,
  }
}

describe('selectResourceDetail', () => {
  it('uses the fresh detail response when the list cache has no external links', () => {
    const listResource = makeResource()
    const detailResource = makeResource({
      links: [{ title: '百度网盘', url: 'https://pan.baidu.com/s/1khaZhEs_wpkYMJhCTgb8oQ?pwd=0wge' }],
    })

    expect(selectResourceDetail(listResource, detailResource)).toBe(detailResource)
    expect(selectResourceDetail(listResource, detailResource)?.links?.[0]?.url).toBe(detailResource.links?.[0]?.url)
  })
})

describe('resolveResourceUrl', () => {
  it('accepts an absolute external URL when the API base is the relative /api path', () => {
    const url = 'https://pan.baidu.com/s/1khaZhEs_wpkYMJhCTgb8oQ?pwd=0wge'

    expect(resolveResourceUrl(url, '/api')).toBe(url)
  })
})
