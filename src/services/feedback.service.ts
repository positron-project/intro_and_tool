import { apiConfig, apiRequest } from './api-client'

export interface FeedbackMessage {
  id: string
  category: string
  content: string
  contact?: string
  createdAt: string
  status?: 'pending' | 'read' | 'resolved'
  reviewNote?: string
}

export interface CreateFeedbackInput {
  category: string
  content: string
  contact?: string
}

const FEEDBACK_STORAGE_KEY = 'club-public-feedback'
const isRemoteFeedbackEnabled = apiConfig.contentSource === 'api'

function readLocalFeedback(): FeedbackMessage[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(FEEDBACK_STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeLocalFeedback(items: FeedbackMessage[]) {
  window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(items))
}

export async function listFeedbackMessages(query?: { status?: string; category?: string; page?: number; pageSize?: number }) {
  if (isRemoteFeedbackEnabled) {
    const payload = await apiRequest<FeedbackMessage[] | { items: FeedbackMessage[] }>('/feedback', { query, withAuth: true })
    return Array.isArray(payload) ? payload : payload.items
  }
  return readLocalFeedback().sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function getFeedbackMessage(id: string) {
  if (isRemoteFeedbackEnabled) return apiRequest<FeedbackMessage>(`/feedback/${encodeURIComponent(id)}`, { withAuth: true })
  const item = readLocalFeedback().find((entry) => entry.id === id)
  if (!item) throw new Error('留言建议不存在或已被删除')
  return item
}

export async function createFeedbackMessage(input: CreateFeedbackInput) {
  if (isRemoteFeedbackEnabled) return apiRequest<FeedbackMessage>('/feedback', { method: 'POST', body: input, withAuth: false })
  const item: FeedbackMessage = { id: `feedback-${Date.now()}`, ...input, createdAt: new Date().toISOString(), status: 'pending' }
  writeLocalFeedback([...readLocalFeedback(), item])
  return item
}

export async function updateFeedbackMessage(id: string, input: { status?: 'read' | 'resolved'; reviewNote?: string }) {
  if (isRemoteFeedbackEnabled) return apiRequest<FeedbackMessage>(`/feedback/${encodeURIComponent(id)}`, { method: 'PATCH', body: input, withAuth: true })
  const items = readLocalFeedback()
  const index = items.findIndex((entry) => entry.id === id)
  if (index < 0) throw new Error('留言建议不存在或已被删除')
  items[index] = { ...items[index], ...input }
  writeLocalFeedback(items)
  return items[index]
}

export async function deleteFeedbackMessage(id: string) {
  if (isRemoteFeedbackEnabled) return apiRequest<void>(`/feedback/${encodeURIComponent(id)}`, { method: 'DELETE', withAuth: true })
  writeLocalFeedback(readLocalFeedback().filter((entry) => entry.id !== id))
}
