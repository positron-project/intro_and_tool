import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import * as favoriteService from '../services/favorite.service'
import type { InterviewExperience } from '../types'

vi.mock('../services/auth.context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('../services/favorite.service', async () => {
  const actual = await vi.importActual<typeof import('../services/favorite.service')>('../services/favorite.service')
  return {
    ...actual,
    listFavorites: vi.fn().mockResolvedValue([]),
    toggleFavorite: vi.fn(),
  }
})

import { InterviewFavorite } from './interviews'

const interview: InterviewExperience = {
  id: 'interview-1',
  company: '示例公司',
  role: '前端开发',
  author: '成员',
  cohort: '2029 届',
  date: '2026-10-20',
  difficulty: '中等',
  rounds: 2,
  tags: [],
  summary: '示例面经',
}

describe('InterviewFavorite', () => {
  it('使用统一收藏按钮样式，避免暴露浏览器默认按钮外观', () => {
    render(<InterviewFavorite interview={interview} />)

    const button = screen.getByRole('button', { name: '收藏面经' })
    expect(button.className).toContain('favorite-control')
    expect(button.className).toContain('favorite-button')
  })

  it('点击后立即保留本地状态，不被较早发出的收藏列表请求覆盖', async () => {
    vi.clearAllMocks()
    const favoriteResolvers: Array<(items: favoriteService.FavoriteRecord[]) => void> = []
    vi.mocked(favoriteService.listFavorites).mockImplementation(() => new Promise((resolve) => { favoriteResolvers.push(resolve) }))
    vi.mocked(favoriteService.toggleFavorite).mockResolvedValue({
      targetType: 'interview',
      targetId: interview.id,
      isFavorited: true,
      favoriteCount: 1,
    })

    render(<InterviewFavorite interview={interview} />)
    const button = screen.getByRole('button', { name: '收藏面经' })
    await waitFor(() => expect(vi.mocked(favoriteService.listFavorites).mock.calls.length).toBeGreaterThan(0))
    fireEvent.click(button)
    await waitFor(() => expect(vi.mocked(favoriteService.toggleFavorite).mock.calls.length).toBe(1))

    await waitFor(() => {
      expect(button.getAttribute('aria-pressed')).toBe('true')
      expect(button.textContent).toContain('1')
    })

    await act(async () => {
      favoriteResolvers.forEach((resolve) => resolve([]))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })
})
