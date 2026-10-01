import { apiConfig, apiRequest } from './api-client'
import type { PromptReviewItem } from '../types'

export const isRemotePromptEnabled = apiConfig.contentSource === 'api'

export async function submitPrompt(input: Omit<PromptReviewItem, 'id' | 'status'>) {
  if (!isRemotePromptEnabled) throw new Error('Prompt 投稿需要连接后端。')
  return apiRequest<PromptReviewItem>('/prompts/submissions', {
    method: 'POST',
    body: input,
    withAuth: true,
  })
}

export async function listPromptReviewQueue() {
  if (!isRemotePromptEnabled) return []
  return apiRequest<PromptReviewItem[]>('/prompts/review', {
    withAuth: true,
  })
}

export async function reviewPrompt(
  id: string,
  status: 'approved' | 'rejected' | 'changes_requested',
  reviewNote?: string,
) {
  if (!isRemotePromptEnabled) throw new Error('Prompt 审核需要连接后端。')
  return apiRequest<PromptReviewItem>(`/prompts/${encodeURIComponent(id)}/review`, {
    method: 'PATCH',
    body: { status, reviewNote },
    withAuth: true,
  })
}
