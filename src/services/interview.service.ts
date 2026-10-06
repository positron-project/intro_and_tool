import { interviews as mockInterviews } from '../data/mock'
import { apiConfig, apiRequest } from './api-client'
import type { ContributionSubmissionStatus, InterviewExperience, InterviewSubmission, Paginated } from '../types'

const SUBMISSIONS_KEY = 'club-interview-submissions-v1'
const HELPFUL_KEY = 'club-interview-helpful-v1'
const recordedViewIds = new Set<string>()

export interface InterviewListParams {
  search?: string
  recruitmentType?: string
  category?: string
  cohort?: string
  difficulty?: string
  sort?: 'latest' | 'helpful' | 'popular'
  page?: number
  pageSize?: number
  ownerId?: string | number
  signal?: AbortSignal
}

export type InterviewSubmissionInput = Omit<InterviewSubmission,
  'id' | 'submitterId' | 'submitterName' | 'author' | 'status' | 'submittedAt' | 'reviewedAt' | 'reviewNote' | 'withdrawnAt' | 'reviewHistory' | 'version'
  | 'views' | 'helpfulCount' | 'favoriteCount' | 'isHelpful' | 'isFavorited'
  | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'publishedAt' | 'archivedAt' | 'visibility'
>

export type InterviewReviewAction = 'approve' | 'reject' | 'request_changes'

function readSubmissions(): InterviewSubmission[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(SUBMISSIONS_KEY) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeSubmissions(items: InterviewSubmission[]) {
  try { window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(items)) } catch { /* Browser storage may be unavailable. */ }
}

function readHelpfulVotes(): Record<string, string[]> {
  try {
    const value = JSON.parse(window.localStorage.getItem(HELPFUL_KEY) ?? '{}')
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

function writeHelpfulVotes(value: Record<string, string[]>) {
  try { window.localStorage.setItem(HELPFUL_KEY, JSON.stringify(value)) } catch { /* Browser storage may be unavailable. */ }
}

function normalizePage(payload: unknown, page: number, pageSize: number): Paginated<InterviewExperience> {
  if (Array.isArray(payload)) return { items: payload as InterviewExperience[], page: { page, pageSize, total: payload.length } }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)) {
    const value = payload as { items: InterviewExperience[]; page?: { page?: number; pageSize?: number; total?: number } }
    return {
      items: value.items,
      page: {
        page: value.page?.page ?? page,
        pageSize: value.page?.pageSize ?? pageSize,
        total: value.page?.total ?? value.items.length,
      },
    }
  }
  throw new Error('面经列表接口返回格式不正确')
}

function normalizeSubmissionList(payload: unknown): InterviewSubmission[] {
  if (Array.isArray(payload)) return payload as InterviewSubmission[]
  if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)) return (payload as { items: InterviewSubmission[] }).items
  throw new Error('面经投稿接口返回格式不正确')
}

function normalizeSubmissionPage(payload: unknown, page: number, pageSize: number): Paginated<InterviewSubmission> {
  if (Array.isArray(payload)) return { items: payload as InterviewSubmission[], page: { page, pageSize, total: payload.length } }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)) {
    const value = payload as { items: InterviewSubmission[]; page?: { page?: number; pageSize?: number; total?: number } }
    return {
      items: value.items,
      page: {
        page: value.page?.page ?? page,
        pageSize: value.page?.pageSize ?? pageSize,
        total: value.page?.total ?? value.items.length,
      },
    }
  }
  throw new Error('面经审核接口返回格式不正确')
}

function localExperiences() {
  const submissions = readSubmissions().filter((item) => item.status === 'approved')
  const byId = new Map<string, InterviewExperience>()
  mockInterviews.forEach((item) => byId.set(item.id, item))
  submissions.forEach((item) => byId.set(item.id, item))
  return [...byId.values()]
}

function includesQuery(item: InterviewExperience, query: string) {
  if (!query) return true
  return `${item.company} ${item.role} ${item.author} ${item.cohort} ${item.recruitmentType ?? ''} ${item.category ?? ''} ${item.city ?? ''} ${item.difficulty} ${item.summary} ${item.preparation ?? ''} ${item.reflection ?? ''} ${item.tags.join(' ')} ${item.roundDetails?.map((round) => `${round.title} ${round.questions.map((question) => `${question.question} ${question.answer ?? ''}`).join(' ')}`).join(' ') ?? ''}`.toLocaleLowerCase().includes(query)
}

export async function listInterviewPage(params: InterviewListParams = {}): Promise<Paginated<InterviewExperience>> {
  const page = Math.max(1, Math.trunc(params.page ?? 1))
  const pageSize = Math.min(100, Math.max(1, Math.trunc(params.pageSize ?? 12)))
  if (apiConfig.contentSource === 'api') {
    const payload = await apiRequest<unknown>('/interviews', {
      query: {
        search: params.search?.trim() || undefined,
        recruitmentType: params.recruitmentType || undefined,
        category: params.category || undefined,
        cohort: params.cohort || undefined,
        difficulty: params.difficulty || undefined,
        sort: params.sort ?? 'latest',
        page,
        pageSize,
      },
      signal: params.signal,
    })
    return normalizePage(payload, page, pageSize)
  }

  const query = params.search?.trim().toLocaleLowerCase() ?? ''
  const votes = readHelpfulVotes()
  let items = localExperiences().map((item) => ({
    ...item,
    isHelpful: params.ownerId === undefined ? false : (votes[item.id] ?? []).includes(String(params.ownerId)),
  })).filter((item) => includesQuery(item, query))
  if (params.recruitmentType) items = items.filter((item) => item.recruitmentType === params.recruitmentType)
  if (params.category) items = items.filter((item) => item.category === params.category)
  if (params.cohort) items = items.filter((item) => item.cohort === params.cohort)
  if (params.difficulty) items = items.filter((item) => item.difficulty === params.difficulty)
  if (params.sort === 'helpful') items.sort((left, right) => (right.helpfulCount ?? 0) - (left.helpfulCount ?? 0))
  else if (params.sort === 'popular') items.sort((left, right) => (right.views ?? 0) - (left.views ?? 0))
  else items.sort((left, right) => String(right.date).localeCompare(String(left.date)))
  const total = items.length
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page: { page, pageSize, total } }
}

export async function getInterview(id: string) {
  if (apiConfig.contentSource === 'api') return apiRequest<InterviewExperience>(`/interviews/${encodeURIComponent(id)}`)
  const item = localExperiences().find((entry) => entry.id === id)
  if (!item) throw new Error('这条面经不存在或暂未公开')
  return item
}

export async function recordInterviewDetailView(id: string) {
  if (recordedViewIds.has(id)) {
    const current = await getInterview(id)
    return current.views ?? 0
  }
  if (apiConfig.contentSource === 'api') {
    const value = await apiRequest<unknown>(`/interviews/${encodeURIComponent(id)}/view`, { method: 'POST' })
    const payload = value && typeof value === 'object' ? value as { views?: unknown } : undefined
    const count = typeof value === 'number' ? value : payload?.views
    if (typeof count !== 'number' || !Number.isFinite(count)) throw new Error('浏览接口返回格式不正确')
    recordedViewIds.add(id)
    return Math.max(0, Math.trunc(count))
  }
  const mock = mockInterviews.find((item) => item.id === id)
  if (mock) {
    mock.views = Math.max(0, Math.trunc(mock.views ?? 0)) + 1
    recordedViewIds.add(id)
    return mock.views
  }
  const submissions = readSubmissions()
  const submission = submissions.find((item) => item.id === id && item.status === 'approved')
  if (!submission) throw new Error('这条面经不存在或暂未公开')
  submission.views = Math.max(0, Math.trunc(submission.views ?? 0)) + 1
  writeSubmissions(submissions)
  recordedViewIds.add(id)
  return submission.views
}

export async function toggleInterviewHelpful(id: string, ownerId: string | number) {
  if (apiConfig.contentSource === 'api') return apiRequest<{ helpfulCount: number; isHelpful: boolean }>(`/interviews/${encodeURIComponent(id)}/helpful`, { method: 'POST' })
  const votes = readHelpfulVotes()
  const voters = votes[id] ?? []
  const alreadyHelpful = voters.includes(String(ownerId))
  const nextVoters = alreadyHelpful ? voters.filter((value) => value !== String(ownerId)) : [...voters, String(ownerId)]
  votes[id] = nextVoters
  writeHelpfulVotes(votes)
  const submissions = readSubmissions()
  const target = submissions.find((item) => item.id === id)
  if (target) target.helpfulCount = nextVoters.length
  const mock = mockInterviews.find((item) => item.id === id)
  if (mock) mock.helpfulCount = nextVoters.length
  writeSubmissions(submissions)
  return { helpfulCount: nextVoters.length, isHelpful: !alreadyHelpful }
}

export async function listMyInterviewSubmissions(ownerId: string | number) {
  if (apiConfig.contentSource === 'api') {
    const pageSize = 100
    const first = normalizeSubmissionPage(await apiRequest<unknown>('/interviews/submissions/mine', {
      query: { page: 1, pageSize },
    }), 1, pageSize)
    const items = [...first.items]
    const pageCount = Math.ceil(first.page.total / first.page.pageSize)
    for (let page = 2; page <= pageCount; page += 1) {
      const next = normalizeSubmissionPage(await apiRequest<unknown>('/interviews/submissions/mine', {
        query: { page, pageSize: first.page.pageSize },
      }), page, first.page.pageSize)
      if (!next.items.length) break
      items.push(...next.items)
    }
    return items
  }
  return readSubmissions().filter((item) => item.submitterId === String(ownerId))
}

export async function createInterviewDraft(input: InterviewSubmissionInput, submitterId: string, submitterName: string) {
  if (apiConfig.contentSource === 'api') return apiRequest<InterviewSubmission>('/interviews/submissions', { method: 'POST', body: input })
  const item: InterviewSubmission = { ...input, author: input.anonymous ? '匿名成员' : submitterName, submitterName, id: `interview-submission-${Date.now()}`, submitterId, status: 'draft', submittedAt: new Date().toISOString(), version: 1 }
  const submissions = readSubmissions()
  submissions.unshift(item)
  writeSubmissions(submissions)
  return item
}

export async function getMyInterviewSubmission(id: string, ownerId: string | number) {
  if (apiConfig.contentSource === 'api') return apiRequest<InterviewSubmission>(`/interviews/submissions/${encodeURIComponent(id)}`)
  const item = readSubmissions().find((submission) => submission.id === id && submission.submitterId === String(ownerId))
  if (!item) throw new Error('面经投稿不存在')
  return item
}

export async function updateInterviewDraft(id: string, input: InterviewSubmissionInput, ownerId: string | number, submitterName: string) {
  if (apiConfig.contentSource === 'api') return apiRequest<InterviewSubmission>(`/interviews/submissions/${encodeURIComponent(id)}`, { method: 'PATCH', body: input })
  const submissions = readSubmissions()
  const item = submissions.find((submission) => submission.id === id && submission.submitterId === String(ownerId))
  if (!item) throw new Error('面经投稿不存在')
  if (!['draft', 'changes_requested', 'rejected'].includes(item.status)) throw new Error('当前状态不允许编辑')
  Object.assign(item, input, { author: input.anonymous ? '匿名成员' : submitterName, submitterName, version: (item.version ?? 1) + 1 })
  writeSubmissions(submissions)
  return item
}

export async function submitInterviewDraft(id: string, ownerId: string | number) {
  if (apiConfig.contentSource === 'api') return apiRequest<InterviewSubmission>(`/interviews/submissions/${encodeURIComponent(id)}/submit`, { method: 'POST' })
  const submissions = readSubmissions()
  const item = submissions.find((submission) => submission.id === id && submission.submitterId === String(ownerId))
  if (!item) throw new Error('面经投稿不存在')
  if (!['draft', 'changes_requested', 'rejected'].includes(item.status)) throw new Error('当前状态不能重新提交')
  item.status = 'pending'
  item.submittedAt = new Date().toISOString()
  item.reviewedAt = undefined
  item.reviewNote = undefined
  item.version = (item.version ?? 1) + 1
  writeSubmissions(submissions)
  return item
}

export async function deleteMyInterviewSubmission(id: string, ownerId: string | number) {
  if (apiConfig.contentSource === 'api') {
    await apiRequest<void>(`/interviews/submissions/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return
  }
  const submissions = readSubmissions()
  const exists = submissions.some((item) => item.id === id && item.submitterId === String(ownerId))
  if (!exists) throw new Error('面经投稿不存在')
  writeSubmissions(submissions.filter((item) => !(item.id === id && item.submitterId === String(ownerId))))
}

export async function withdrawMyInterviewSubmission(id: string, ownerId: string | number) {
  if (apiConfig.contentSource === 'api') return apiRequest<InterviewSubmission>(`/interviews/submissions/${encodeURIComponent(id)}/withdraw`, { method: 'POST' })
  const submissions = readSubmissions()
  const item = submissions.find((submission) => submission.id === id && submission.submitterId === String(ownerId))
  if (!item) throw new Error('面经投稿不存在')
  if (item.status !== 'pending') throw new Error('只有待审核的投稿可以撤回')
  item.status = 'withdrawn'
  item.withdrawnAt = new Date().toISOString()
  item.version = (item.version ?? 1) + 1
  writeSubmissions(submissions)
  return item
}

export async function listInterviewReviewQueue(params: { cohort?: string; search?: string; page?: number; pageSize?: number } = {}): Promise<Paginated<InterviewSubmission>> {
  const page = Math.max(1, Math.trunc(params.page ?? 1))
  const pageSize = Math.min(100, Math.max(1, Math.trunc(params.pageSize ?? 100)))
  if (apiConfig.contentSource === 'api') return normalizeSubmissionPage(await apiRequest<unknown>('/admin/interviews/submissions', {
    query: { cohort: params.cohort, search: params.search, page, pageSize },
  }), page, pageSize)
  const items = readSubmissions().filter((item) => item.status === 'pending'
    && (!params.cohort || item.cohort === params.cohort)
    && includesQuery(item, params.search?.trim().toLocaleLowerCase() ?? ''))
    .sort((left, right) => String(right.submittedAt).localeCompare(String(left.submittedAt)))
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), page: { page, pageSize, total: items.length } }
}

export async function listAllInterviewReviewQueue(params: Omit<Parameters<typeof listInterviewReviewQueue>[0], 'page' | 'pageSize'> = {}) {
  const firstPage = await listInterviewReviewQueue({ ...params, page: 1, pageSize: 100 })
  const items = [...firstPage.items]
  const pageCount = Math.ceil(firstPage.page.total / firstPage.page.pageSize)
  for (let page = 2; page <= pageCount; page += 1) {
    const nextPage = await listInterviewReviewQueue({ ...params, page, pageSize: firstPage.page.pageSize })
    if (!nextPage.items.length) break
    items.push(...nextPage.items)
  }
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

export async function reviewInterviewSubmission(id: string, action: InterviewReviewAction, reviewNote?: string) {
  if (apiConfig.contentSource === 'api') return apiRequest<InterviewSubmission>(`/admin/interviews/submissions/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body: { action, reviewNote: reviewNote?.trim() || undefined },
  })
  const submissions = readSubmissions()
  const item = submissions.find((submission) => submission.id === id)
  if (!item) throw new Error('面经投稿不存在')
  const statusByAction: Record<InterviewReviewAction, ContributionSubmissionStatus> = { approve: 'approved', reject: 'rejected', request_changes: 'changes_requested' }
  item.status = statusByAction[action]
  item.reviewNote = reviewNote?.trim() || undefined
  item.reviewedAt = new Date().toISOString()
  item.reviewHistory = [...(item.reviewHistory ?? []), {
    id: `interview-review-${Date.now()}`,
    action,
    status: item.status as 'approved' | 'rejected' | 'changes_requested',
    reviewerName: '管理员',
    note: item.reviewNote,
    createdAt: item.reviewedAt,
  }]
  item.version = (item.version ?? 1) + 1
  writeSubmissions(submissions)
  return item
}
