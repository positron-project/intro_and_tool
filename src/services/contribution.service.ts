import { apiConfig, apiRequest } from './api-client'
import type { ContributionSubmission, ContributionSubmissionStatus } from '../types'

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
  resourceUrl?: string
  fileName?: string
}

export async function listContributionSubmissions() {
  if (isRemoteContributionEnabled) return apiRequest<ContributionSubmission[]>('/contributions', { withAuth: true })
  return readLocalSubmissions().sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
}

export async function createContributionSubmission(input: CreateContributionInput) {
  if (isRemoteContributionEnabled) return apiRequest<ContributionSubmission>('/contributions', { method: 'POST', body: input, withAuth: true })
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
  if (isRemoteContributionEnabled) return apiRequest<ContributionSubmission>(`/contributions/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status, reviewNote }, withAuth: true })
  const submissions = readLocalSubmissions()
  const target = submissions.find((submission) => submission.id === id)
  if (!target) throw new Error('投稿不存在或已被删除')
  target.status = status
  target.reviewNote = reviewNote?.trim() || undefined
  writeLocalSubmissions(submissions)
  return target
}

