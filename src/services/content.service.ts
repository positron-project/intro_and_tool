import {
  announcements as mockAnnouncements,
  competitionEvents as mockCompetitionEvents,
  interviews as mockInterviews,
  learningNodes as mockLearningNodes,
  members as mockMembers,
  projects as mockProjects,
  prompts as mockPrompts,
  resources as mockResources,
} from '../data/mock'
import { apiConfig, apiRequest } from './api-client'
import type {
  Announcement,
  CompetitionEvent,
  CreateInput,
  InterviewExperience,
  LearningRoute,
  ListParams,
  Member,
  Project,
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

type ListPayload<T> = T[] | { items: T[] }

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

function queryFrom(params?: ListParams) {
  if (!params) return undefined
  const { signal: _signal, ...query } = params
  return query
}

async function remoteList<T>(path: string, params?: ListParams) {
  const payload = await apiRequest<ListPayload<T>>(path, { query: queryFrom(params), signal: params?.signal })
  return Array.isArray(payload) ? payload : payload.items
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

export async function getProject(slug: string, signal?: AbortSignal) {
  if (isRemoteContentEnabled) return apiRequest<Project>(`/projects/${encodeURIComponent(slug)}`, { signal })
  return copy(mockProjects.find((project) => project.slug === slug))
}

export async function createProject(input: CreateInput<Project>) {
  if (isRemoteContentEnabled) return apiRequest<Project>('/projects', { method: 'POST', body: input })
  return createMock(mockProjects, input, 'project')
}

export async function updateProject(id: string, patch: UpdateInput<Project>) {
  if (isRemoteContentEnabled) return apiRequest<Project>(`/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
  return updateMock(mockProjects, id, patch)
}

export async function deleteProject(id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return true
  }
  return deleteMock(mockProjects, id)
}

export async function listResources(params?: ListParams) {
  if (isRemoteContentEnabled) return remoteList<Resource>('/resources', params)
  return copy(mockResources)
}

export async function createResource(input: CreateInput<Resource>) {
  if (isRemoteContentEnabled) return apiRequest<Resource>('/resources', { method: 'POST', body: input })
  return createMock(mockResources, input, 'resource')
}

export async function updateResource(id: string, patch: UpdateInput<Resource>) {
  if (isRemoteContentEnabled) return apiRequest<Resource>(`/resources/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
  return updateMock(mockResources, id, patch)
}

export async function deleteResource(id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/resources/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return true
  }
  return deleteMock(mockResources, id)
}

export async function listInterviews(params?: ListParams) {
  if (isRemoteContentEnabled) return remoteList<InterviewExperience>('/interviews', params)
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

export async function listCompetitions(params?: ListParams) {
  if (isRemoteContentEnabled) return remoteList<CompetitionEvent>('/competitions', params)
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

export async function listMembers(params?: ListParams) {
  if (isRemoteContentEnabled) return remoteList<Member>('/members', params)
  return copy(mockMembers)
}
export async function createMember(input: CreateInput<Member>) {
  if (isRemoteContentEnabled) return apiRequest<Member>('/members', { method: 'POST', body: input })
  return createMock(mockMembers, input, 'member')
}

export async function updateMember(id: string, patch: UpdateInput<Member>) {
  if (isRemoteContentEnabled) return apiRequest<Member>(`/members/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
  return updateMock(mockMembers, id, patch)
}

export async function deleteMember(id: string) {
  if (isRemoteContentEnabled) {
    await apiRequest<void>(`/members/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return true
  }
  return deleteMock(mockMembers, id)
}
