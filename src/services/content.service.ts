import {
  announcements as mockAnnouncements,
  competitionEvents as mockCompetitionEvents,
  interviews as mockInterviews,
  learningNodes as mockLearningNodes,
  members as mockMembers,
  projects as mockProjects,
  projectCategories as mockProjectCategories,
  resourceCategories as mockResourceCategories,
  interviewCategories as mockInterviewCategories,
  prompts as mockPrompts,
  resources as mockResources,
} from '../data/mock'
import { apiConfig, apiRequest } from './api-client'
import { listCompetitionProjects } from './competition-project.service'
import type {
  Announcement,
  CompetitionEvent,
  CreateInput,
  InterviewExperience,
  LearningRoute,
  ListParams,
  Member,
  Project,
  ProjectCategory,
  ProjectReviewStatus,
  ContentCategory,
  PromptTemplate,
  Resource,
  UpdateInput,
} from '../types'

/**
 * All editable content is exposed from this module. Pages should depend on
 * these functions instead of importing mock.ts, so switching to a backend is
 * an environment change rather than a UI rewrite.
 */

export const contentSource = apiConfig.contentSource
export const isRemoteContentEnabled = contentSource === 'api'
export const isRemoteMemberDirectoryEnabled = isRemoteContentEnabled

type ListPayload<T> = T[] | { items: T[] }

function itemsFromPayload<T>(payload: ListPayload<T>) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.items)) return payload.items
  throw new Error('列表接口返回格式不正确')
}

const CONTENT_STORAGE_KEY = 'club-content-overrides-v1'

function hydrateMockCollection<T extends { id: string }>(collection: T[], key: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(CONTENT_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const value = parsed[key]
    if (Array.isArray(value)) collection.splice(0, collection.length, ...copy(value) as T[])
  } catch {
    // Storage may be unavailable in file:// or private browsing contexts.
  }
}
function copy<T>(value: T): T {
  if (value === undefined || value === null) return value
  return JSON.parse(JSON.stringify(value)) as T
}

function memberQueryFrom(params?: ListParams) {
  if (!params) return undefined
  const page = params.page === undefined ? undefined : Math.max(1, Math.trunc(params.page))
  const pageSize = params.pageSize === undefined ? undefined : Math.min(100, Math.max(1, Math.trunc(params.pageSize)))
  return {
    search: params.search,
    // Keep the member directory on the same canonical query contract as the
    // other collection endpoints. The old cohort/direction/page_size aliases
    // made FastAPI receive different parameter names for the same filter.
    cohortId: params.cohortId ?? params.cohort,
    teamId: params.teamId ?? params.team,
    page,
    pageSize,
  }
}

function queryFrom(params?: ListParams) {
  if (!params) return undefined
  const { signal: _signal, cohort, team, cohortId, teamId, ...query } = params
  return {
    ...query,
    cohortId: cohortId ?? cohort,
    teamId: teamId ?? team,
  }
}

async function remoteList<T>(path: string, params?: ListParams) {
  const payload = await apiRequest<ListPayload<T>>(path, { query: queryFrom(params), signal: params?.signal })
  return itemsFromPayload(payload)
}

function createMock<T extends { id: string }>(collection: T[], input: CreateInput<T>, prefix: string) {
  const item = { id: `${prefix}-${Date.now()}`, ...input } as T
  collection.push(item)
  return copy(item)
}

function updateMock<T extends { id: string }>(collection: T[], id: string, patch: UpdateInput<T>) {
  const index = collection.findIndex((item) => item.id === id)
  if (index < 0) return undefined
  collection[index] = { ...collection[index], ...patch }
  return copy(collection[index])
}

function deleteMock<T extends { id: string }>(collection: T[], id: string) {
  const index = collection.findIndex((item) => item.id === id)
  if (index < 0) return false
  collection.splice(index, 1)
  return true
}

function viewCountFromPayload(payload: unknown) {
  if (typeof payload === 'number' && Number.isFinite(payload)) return Math.max(0, Math.trunc(payload))
  if (payload && typeof payload === 'object' && typeof (payload as { views?: unknown }).views === 'number') {
    const views = (payload as { views: number }).views
    if (Number.isFinite(views)) return Math.max(0, Math.trunc(views))
  }
  throw new Error('浏览接口返回格式不正确')
}

function routeFromMock(): LearningRoute {
  return {
    id: 'pyagent',
    title: 'PyAgent · 从基础到真实项目',
    direction: 'PyAgent',
    description: '把 Python 能力带进一个可交付的 Agent 项目。',
    nodes: copy(mockLearningNodes),
    featuredProjectIds: [],
  }
}

let mockLearningRoutes: LearningRoute[] = [routeFromMock()]
hydrateMockCollection(mockLearningRoutes, 'learningRoutes')
if (!mockLearningRoutes.some((route) => route.id === 'pyagent')) mockLearningRoutes.unshift(routeFromMock())
hydrateMockCollection(mockAnnouncements, 'announcements')
hydrateMockCollection(mockProjects, 'projects')
hydrateMockCollection(mockProjectCategories, 'projectCategories')
hydrateMockCollection(mockResourceCategories, 'resourceCategories')
hydrateMockCollection(mockInterviewCategories, 'interviewCategories')
hydrateMockCollection(mockResources, 'resources')
hydrateMockCollection(mockInterviews, 'interviews')
hydrateMockCollection(mockCompetitionEvents, 'competitionEvents')
hydrateMockCollection(mockMembers, 'members')


export async function listLearningRoutes(params?: ListParams) {
  if (isRemoteContentEnabled) return remoteList<LearningRoute>('/learning-routes', params)
  return copy(mockLearningRoutes)
}

export async function getLearningRoute(id = 'pyagent', signal?: AbortSignal) {
  if (isRemoteContentEnabled) return apiRequest<LearningRoute>(`/learning-routes/${encodeURIComponent(id)}`, { signal })
  return copy(mockLearningRoutes.find((route) => route.id === id))
}

export async function createLearningRoute(input: CreateInput<LearningRoute>) {
  if (isRemoteContentEnabled) return apiRequest<LearningRoute>('/learning-routes', { method: 'POST', body: input })
  return createMock(mockLearningRoutes, input, 'route')
}

export async function updateLearningRoute(id: string, patch: UpdateInput<LearningRoute>) {
  if (isRemoteContentEnabled) return apiRequest<LearningRoute>(`/learning-routes/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
  return updateMock(mockLearningRoutes, id, patch)
}

export async function deleteLearningRoute(id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/learning-routes/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return true
  }
  return deleteMock(mockLearningRoutes, id)
}

export async function listProjects(params?: ListParams) {
  if (isRemoteContentEnabled) return remoteList<Project>('/projects', params)
  return copy(mockProjects)
}

/** Gets every project submitted by the current account, regardless of review status. */
export async function listMyProjectSubmissions() {
  if (isRemoteContentEnabled) return apiRequest<Project[]>('/projects/my-submissions', { withAuth: true })
  return copy(mockProjects.filter((project) => project.submittedBy != null))
}

/** 获取当前用户提交过的全部项目，包括待审核和已退回项目。 */
/** 获取当前审核人的项目审核队列。 */
export async function listProjectReviewQueue() {
  if (isRemoteContentEnabled) return apiRequest<Project[]>('/projects/review-queue')

  return copy(mockProjects.filter((project) => project.reviewStatus === 'pending'))
}

/** 提交项目审核结果。 */
export async function reviewProject(
  id: string,
  reviewStatus: Extract<ProjectReviewStatus, 'approved' | 'rejected'>,
  reviewNote?: string,
) {
  if (isRemoteContentEnabled) {
    return apiRequest<Project>(`/projects/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: {
        reviewStatus,
        reviewNote: reviewNote?.trim() || undefined,
      },
    })
  }

  const project = mockProjects.find((item) => item.id === id)
  if (!project) return undefined

  const updatedProject: Project = {
    ...project,
    reviewStatus,
    reviewNote: reviewNote?.trim() || undefined,
    reviewedAt: new Date().toISOString(),
  }

  const index = mockProjects.findIndex((item) => item.id === id)
  mockProjects[index] = updatedProject
  return copy(updatedProject)
}

export async function getProject(slug: string, signal?: AbortSignal) {
  if (isRemoteContentEnabled) return apiRequest<Project>(`/projects/${encodeURIComponent(slug)}`, { signal })
  return copy(mockProjects.find((project) => project.slug === slug))
}

/** Records one effective project detail view. The API owns deduplication. */
export async function recordProjectView(id: string) {
  if (isRemoteContentEnabled) {
    return viewCountFromPayload(await apiRequest<unknown>(`/projects/${encodeURIComponent(id)}/view`, { method: 'POST' }))
  }
  const project = mockProjects.find((item) => item.id === id)
  if (!project) return undefined
  project.views = Math.max(0, Math.trunc(project.views ?? 0)) + 1
  return project.views
}

export async function createProject(input: CreateInput<Project>) {
  if (isRemoteContentEnabled) return apiRequest<Project>('/projects', { method: 'POST', body: input })
  return createMock(mockProjects, input, 'project')
}

export async function updateProject(id: string, patch: UpdateInput<Project>) {
  if (isRemoteContentEnabled) return apiRequest<Project>(`/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
  return updateMock(mockProjects, id, patch)
}

/** Re-submit an owned project after the reviewer returned it for changes. */
export async function resubmitProject(id: string, patch: UpdateInput<Project>) {
  if (isRemoteContentEnabled) {
    return apiRequest<Project>(`/projects/${encodeURIComponent(id)}/resubmit`, {
      method: 'POST',
      body: {
        ...patch,
        docsUrl: patch.docsUrl ?? null,
        demoUrl: patch.demoUrl ?? null,
        issueUrl: patch.issueUrl ?? null,
        downloadUrl: patch.downloadUrl ?? null,
        joinNote: patch.joinNote ?? null,
      },
      withAuth: true,
    })
  }

  const updatedProject = updateMock(mockProjects, id, {
    ...patch,
    reviewStatus: 'pending',
    reviewNote: undefined,
    reviewedBy: undefined,
    reviewedAt: undefined,
  })
  if (!updatedProject) throw new Error('项目不存在或已被删除')
  return updatedProject
}

export async function deleteProject(id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return true
  }
  return deleteMock(mockProjects, id)
}

export async function listProjectCategories() {
  return listCategories('projects') as Promise<ProjectCategory[]>
}

export async function createProjectCategory(input: CreateInput<ProjectCategory>) {
  return createCategory('projects', input) as Promise<ProjectCategory>
}

export async function updateProjectCategory(id: string, patch: UpdateInput<ProjectCategory>) {
  return updateCategory('projects', id, patch) as Promise<ProjectCategory | undefined>
}

export async function deleteProjectCategory(id: string) {
  return deleteCategory('projects', id)
}

async function listCategories(resource: 'projects' | 'resources' | 'interviews') {
  if (isRemoteContentEnabled) return remoteList<ContentCategory>('/categories', { resource })
  const collection = resource === 'projects' ? mockProjectCategories : resource === 'resources' ? mockResourceCategories : mockInterviewCategories
  return copy(collection).sort((a, b) => a.order - b.order)
}

async function createCategory(resource: 'projects' | 'resources' | 'interviews', input: CreateInput<ContentCategory>) {
  if (isRemoteContentEnabled) return apiRequest<ContentCategory>('/categories', { method: 'POST', body: { ...input, resource } })
  const collection = resource === 'projects' ? mockProjectCategories : resource === 'resources' ? mockResourceCategories : mockInterviewCategories
  return createMock(collection, input, `${resource}-category`)
}

async function updateCategory(resource: 'projects' | 'resources' | 'interviews', id: string, patch: UpdateInput<ContentCategory>) {
  if (isRemoteContentEnabled) return apiRequest<ContentCategory>(`/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
  const collection = resource === 'projects' ? mockProjectCategories : resource === 'resources' ? mockResourceCategories : mockInterviewCategories
  return updateMock(collection, id, patch)
}

async function deleteCategory(resource: 'projects' | 'resources' | 'interviews', id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return true
  }
  const collection = resource === 'projects' ? mockProjectCategories : resource === 'resources' ? mockResourceCategories : mockInterviewCategories
  return deleteMock(collection, id)
}

export const listResourceCategories = () => listCategories('resources')
export const createResourceCategory = (input: CreateInput<ContentCategory>) => createCategory('resources', input)
export const updateResourceCategory = (id: string, patch: UpdateInput<ContentCategory>) => updateCategory('resources', id, patch)
export const deleteResourceCategory = (id: string) => deleteCategory('resources', id)
export const listInterviewCategories = () => listCategories('interviews')
export const createInterviewCategory = (input: CreateInput<ContentCategory>) => createCategory('interviews', input)
export const updateInterviewCategory = (id: string, patch: UpdateInput<ContentCategory>) => updateCategory('interviews', id, patch)
export const deleteInterviewCategory = (id: string) => deleteCategory('interviews', id)

export async function listResources(params?: ListParams) {
  if (isRemoteContentEnabled) return remoteList<Resource>('/resources', params)
  return copy(mockResources)
}

export async function createResource(input: CreateInput<Resource>) {
  if (isRemoteContentEnabled) return apiRequest<Resource>('/admin/resources', { method: 'POST', body: input, withAuth: true })
  return createMock(mockResources, input, 'resource')
}

export async function updateResource(id: string, patch: UpdateInput<Resource>) {
  if (isRemoteContentEnabled) return apiRequest<Resource>(`/admin/resources/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch, withAuth: true })
  return updateMock(mockResources, id, patch)
}

export async function deleteResource(id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/admin/resources/${encodeURIComponent(id)}`, { method: 'DELETE', withAuth: true })
    return true
  }
  return deleteMock(mockResources, id)
}

/** Records one effective resource detail view. The API owns deduplication. */
export async function recordResourceView(id: string) {
  if (isRemoteContentEnabled) {
    return viewCountFromPayload(await apiRequest<unknown>(`/resources/${encodeURIComponent(id)}/view`, { method: 'POST' }))
  }
  const resource = mockResources.find((item) => item.id === id)
  if (!resource) return undefined
  resource.views = Math.max(0, Math.trunc(resource.views ?? 0)) + 1
  return resource.views
}

export async function listInterviews(params?: ListParams) {
  if (isRemoteContentEnabled) {
    const pageSize = Math.min(100, Math.max(1, Math.trunc(params?.pageSize ?? 100)))
    const readPage = async (page: number) => {
      const payload = await apiRequest<unknown>('/interviews', {
        query: queryFrom({ ...params, page, pageSize }),
        signal: params?.signal,
      })
      const value = payload && typeof payload === 'object' ? payload as { items?: unknown; page?: { total?: number } } : {}
      return {
        items: Array.isArray(value.items) ? value.items as InterviewExperience[] : itemsFromPayload(payload as ListPayload<InterviewExperience>),
        total: value.page?.total,
      }
    }
    const first = await readPage(1)
    // The content context consumes a collection rather than a single page.
    // Walk the server pages so admin lists do not silently stop at the API default.
    if (params?.page !== undefined || typeof first.total !== 'number' || first.total <= first.items.length) return first.items
    const all = [...first.items]
    const pageCount = Math.ceil(first.total / pageSize)
    for (let page = 2; page <= pageCount; page += 1) {
      const next = await readPage(page)
      if (!next.items.length) break
      all.push(...next.items)
    }
    return all
  }
  return copy(mockInterviews)
}

export async function createInterview(input: CreateInput<InterviewExperience>) {
  if (isRemoteContentEnabled) return apiRequest<InterviewExperience>('/interviews', { method: 'POST', body: input })
  return createMock(mockInterviews, input, 'interview')
}

export async function updateInterview(id: string, patch: UpdateInput<InterviewExperience>) {
  if (isRemoteContentEnabled) return apiRequest<InterviewExperience>(`/interviews/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
  return updateMock(mockInterviews, id, patch)
}

export async function deleteInterview(id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/interviews/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return true
  }
  return deleteMock(mockInterviews, id)
}

/** Records one effective interview detail view. The API owns deduplication. */
export async function recordInterviewView(id: string) {
  if (isRemoteContentEnabled) {
    return viewCountFromPayload(await apiRequest<unknown>(`/interviews/${encodeURIComponent(id)}/view`, { method: 'POST' }))
  }
  const interview = mockInterviews.find((item) => item.id === id)
  if (!interview) return undefined
  interview.views = Math.max(0, Math.trunc(interview.views ?? 0)) + 1
  return interview.views
}

export async function listCompetitions(params?: ListParams) {
  if (isRemoteContentEnabled) {
    const events = await remoteList<CompetitionEvent>('/competitions', params)
    return Promise.all(events.map(async (event) => {
      // Prefer an embedded child collection when the API already returns it.
      // Older deployments can still fall back to the child endpoint.
      if (Array.isArray(event.projects)) return event
      try {
        return { ...event, projects: await listCompetitionProjects(event.id) }
      } catch {
        // Keep the event visible when an older backend has not exposed the child collection yet.
        return event
      }
    }))
  }
  return copy(mockCompetitionEvents)
}

export async function createCompetition(input: CreateInput<CompetitionEvent>) {
  if (isRemoteContentEnabled) return apiRequest<CompetitionEvent>('/competitions', { method: 'POST', body: input })
  return createMock(mockCompetitionEvents, input, 'competition')
}

export async function updateCompetition(id: string, patch: UpdateInput<CompetitionEvent>) {
  if (isRemoteContentEnabled) return apiRequest<CompetitionEvent>(`/competitions/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
  return updateMock(mockCompetitionEvents, id, patch)
}

export async function deleteCompetition(id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/competitions/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return true
  }
  return deleteMock(mockCompetitionEvents, id)
}

export async function listAnnouncements(params?: ListParams) {
  if (isRemoteContentEnabled) return remoteList<Announcement>('/announcements', params)
  return copy(mockAnnouncements)
}

export async function createAnnouncement(input: CreateInput<Announcement>) {
  if (isRemoteContentEnabled) return apiRequest<Announcement>('/announcements', { method: 'POST', body: input })
  return createMock(mockAnnouncements, input, 'announcement')
}

export async function updateAnnouncement(id: string, patch: UpdateInput<Announcement>) {
  if (isRemoteContentEnabled) return apiRequest<Announcement>(`/announcements/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
  return updateMock(mockAnnouncements, id, patch)
}

export async function deleteAnnouncement(id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return true
  }
  return deleteMock(mockAnnouncements, id)
}
export async function listPrompts(params?: ListParams) {
  if (isRemoteContentEnabled) return remoteList<PromptTemplate>('/prompts', params)
  return copy(mockPrompts)
}

export async function createPrompt(input: CreateInput<PromptTemplate>) {
  if (isRemoteContentEnabled) return apiRequest<PromptTemplate>('/prompts', { method: 'POST', body: input, withAuth: true })
  return createMock(mockPrompts, input, 'prompt')
}

export async function updatePrompt(id: string, patch: UpdateInput<PromptTemplate>) {
  if (isRemoteContentEnabled) return apiRequest<PromptTemplate>(`/prompts/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch, withAuth: true })
  return updateMock(mockPrompts, id, patch)
}

export async function deletePrompt(id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/prompts/${encodeURIComponent(id)}`, { method: 'DELETE', withAuth: true })
    return true
  }
  return deleteMock(mockPrompts, id)
}

export async function listMembers(params?: ListParams) {
  if (isRemoteMemberDirectoryEnabled) {
    const payload = await apiRequest<ListPayload<Member>>('/members', { query: memberQueryFrom(params), signal: params?.signal, withAuth: false })
    return itemsFromPayload(payload)
  }
  return copy(mockMembers)
}
export async function createMember(input: CreateInput<Member>) {
  if (isRemoteContentEnabled) return apiRequest<Member>('/members', { method: 'POST', body: input, withAuth: true })
  return createMock(mockMembers, input, 'member')
}

export async function updateMember(id: string, patch: UpdateInput<Member>) {
  if (isRemoteContentEnabled) return apiRequest<Member>(`/members/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch, withAuth: true })
  return updateMock(mockMembers, id, patch)
}

export async function deleteMember(id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/members/${encodeURIComponent(id)}`, { method: 'DELETE', withAuth: true })
    return true
  }
  return deleteMock(mockMembers, id)
}
