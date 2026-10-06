import { apiConfig, apiRequest } from './api-client'
import type { ContentVisibility, ContributionSubmission, ContributionSubmissionStatus, ResourceAccessMode, ResourceAttachment, ResourceType } from '../types'

const CONTRIBUTIONS_STORAGE_KEY = 'club-demo-contribution-submissions-v1'
const isRemoteContributionEnabled = apiConfig.contentSource === 'api'
function readLocalSubmissions(): ContributionSubmission[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(CONTRIBUTIONS_STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeLocalSubmissions(submissions: ContributionSubmission[]) {
  try {
    window.localStorage.setItem(CONTRIBUTIONS_STORAGE_KEY, JSON.stringify(submissions))
  } catch {
    // localStorage may be unavailable in private browsing or file:// previews.
  }
}

export interface CreateContributionInput {
  submitterId: string
  submitterName: string
  title: string
  description: string
  category: string
  resourceType: ResourceType
  accessMode: ResourceAccessMode
  tags: string[]
  visibility: ContentVisibility
  resourceUrl?: string
  fileName?: string
  attachments?: ResourceAttachment[]
  content?: string
}

export async function listContributionSubmissions(options: { reviewQueueOnly?: boolean } = {}) {
  if (isRemoteContributionEnabled) return apiRequest<ContributionSubmission[] | { items: ContributionSubmission[] }>('/resource-submissions', {
    query: options.reviewQueueOnly ? { reviewQueueOnly: true } : undefined,
    withAuth: true,
  }).then((payload) => {
    const submissions = Array.isArray(payload) ? payload : payload && Array.isArray(payload.items) ? payload.items : null
    if (!submissions) throw new Error('投稿接口返回格式不正确')
    return submissions
  })
  return readLocalSubmissions()
    .filter((submission) => !options.reviewQueueOnly || submission.status === 'pending')
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
}

export async function getContributionSubmission(id: string) {
  if (isRemoteContributionEnabled) return apiRequest<ContributionSubmission>(`/resource-submissions/${encodeURIComponent(id)}`, { withAuth: true })
  const item = readLocalSubmissions().find((submission) => submission.id === id)
  if (!item) throw new Error('投稿不存在或已被删除')
  return item
}

export async function createContributionSubmission(input: CreateContributionInput) {
  if (isRemoteContributionEnabled) {
    return apiRequest<ContributionSubmission>('/resource-submissions', { method: 'POST', body: input, withAuth: true })
  }
  const submission: ContributionSubmission = {
    id: `contribution-${Date.now()}`,
    ...input,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  }
  const submissions = readLocalSubmissions()
  submissions.unshift(submission)
  writeLocalSubmissions(submissions)
  return submission
}

export async function reviewContributionSubmission(id: string, status: Extract<ContributionSubmissionStatus, 'approved' | 'rejected'>, reviewNote?: string) {
  if (isRemoteContributionEnabled) return apiRequest<ContributionSubmission>(`/admin/resource-submissions/${encodeURIComponent(id)}/review`, { method: 'POST', body: { action: status === 'approved' ? 'approve' : 'reject', reviewNote }, withAuth: true })
  const submissions = readLocalSubmissions()
  const target = submissions.find((submission) => submission.id === id)
  if (!target) throw new Error('投稿不存在或已被删除')
  target.status = status
  target.reviewNote = reviewNote?.trim() || undefined
  writeLocalSubmissions(submissions)
  return target
}

export async function requestContributionChanges(id: string, reviewNote = '请补充或修改投稿内容后重新提交') {
  if (isRemoteContributionEnabled) return apiRequest<ContributionSubmission>(`/admin/resource-submissions/${encodeURIComponent(id)}/review`, { method: 'POST', body: { action: 'request_changes', reviewNote }, withAuth: true })
  const submissions = readLocalSubmissions()
  const target = submissions.find((submission) => submission.id === id)
  if (!target) throw new Error('投稿不存在或已被删除')
  target.status = 'changes_requested'
  target.reviewNote = reviewNote
  writeLocalSubmissions(submissions)
  return target
}

export async function deleteContributionSubmission(id: string) {
  if (isRemoteContributionEnabled) {
    return apiRequest<void>(`/resource-submissions/${encodeURIComponent(id)}/withdraw`, { method: 'POST', withAuth: true })
  }
  const submissions = readLocalSubmissions()
  if (!submissions.some((submission) => submission.id === id)) throw new Error('投稿不存在或已被删除')
  writeLocalSubmissions(submissions.filter((submission) => submission.id !== id))
}

