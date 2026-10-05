import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  announcements as mockAnnouncements,
  blogPosts as mockBlogPosts,
  citations as mockCitations,
  competitionEvents as mockCompetitionEvents,
  contactInfo as mockContactInfo,
  growthStats as mockGrowthStats,
  interviews as mockInterviews,
  learningNodes as mockLearningNodes,
  members as mockMembers,
  projects as mockProjects,
  prompts as mockPrompts,
  resources as mockResources,
  starterMessages as mockStarterMessages,
} from '../data/mock'
import {
  createAnnouncement as serviceCreateAnnouncement,
  createCompetition as serviceCreateCompetition,
  createInterview as serviceCreateInterview,
  createLearningRoute as serviceCreateLearningRoute,
  createMember as serviceCreateMember,
  createProject as serviceCreateProject,
  createResource as serviceCreateResource,
  deleteAnnouncement as serviceDeleteAnnouncement,
  deleteCompetition as serviceDeleteCompetition,
  deleteInterview as serviceDeleteInterview,
  deleteLearningRoute as serviceDeleteLearningRoute,
  deleteMember as serviceDeleteMember,
  deleteProject as serviceDeleteProject,
  deleteResource as serviceDeleteResource,
  listLearningRoutes,
  isRemoteContentEnabled,
  listAnnouncements,
  listCompetitions,
  listInterviews,
  listMembers,
  listProjects,
  listPrompts,
  listResources,
  updateAnnouncement as serviceUpdateAnnouncement,
  updateCompetition as serviceUpdateCompetition,
  updateInterview as serviceUpdateInterview,
  updateLearningRoute as serviceUpdateLearningRoute,
  updateMember as serviceUpdateMember,
  updateProject as serviceUpdateProject,
  updateResource as serviceUpdateResource,
} from './content.service'
import type {
  Announcement,
  BlogPost,
  CompetitionEvent,
  CreateInput,
  InterviewExperience,
  LearningNode,
  LearningRoute,
  Member,
  Project,
  PromptTemplate,
  Resource,
  UpdateInput,
  AIMessage,
  Citation,
} from '../types'

export interface ContentSnapshot {
  announcements: Announcement[]
  blogPosts: BlogPost[]
  citations: Citation[]
  competitionEvents: CompetitionEvent[]
  contactInfo: typeof mockContactInfo
  growthStats: typeof mockGrowthStats
  interviews: InterviewExperience[]
  learningNodes: LearningNode[]
  learningRoute: LearningRoute
  learningRoutes: LearningRoute[]
  members: Member[]
  membersManaged: boolean
  projects: Project[]
  prompts: PromptTemplate[]
  resources: Resource[]
  starterMessages: AIMessage[]
}

type PersistedContent = Pick<ContentSnapshot, 'announcements' | 'competitionEvents' | 'interviews' | 'learningNodes' | 'learningRoute' | 'learningRoutes' | 'members' | 'projects' | 'resources'>
type CollectionKey = keyof PersistedContent

export interface ContentContextValue {
  data: ContentSnapshot
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createAnnouncement: (input: CreateInput<Announcement>) => Promise<Announcement>
  updateAnnouncement: (id: string, patch: UpdateInput<Announcement>) => Promise<Announcement>
  deleteAnnouncement: (id: string) => Promise<void>
  createMember: (input: CreateInput<Member>) => Promise<Member>
  updateMember: (id: string, patch: UpdateInput<Member>) => Promise<Member>
  deleteMember: (id: string) => Promise<void>
  createProject: (input: CreateInput<Project>) => Promise<Project>
  updateProject: (id: string, patch: UpdateInput<Project>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  createResource: (input: CreateInput<Resource>) => Promise<Resource>
  updateResource: (id: string, patch: UpdateInput<Resource>) => Promise<Resource>
  deleteResource: (id: string) => Promise<void>
  createInterview: (input: CreateInput<InterviewExperience>) => Promise<InterviewExperience>
  updateInterview: (id: string, patch: UpdateInput<InterviewExperience>) => Promise<InterviewExperience>
  deleteInterview: (id: string) => Promise<void>
  createCompetition: (input: CreateInput<CompetitionEvent>) => Promise<CompetitionEvent>
  updateCompetition: (id: string, patch: UpdateInput<CompetitionEvent>) => Promise<CompetitionEvent>
  deleteCompetition: (id: string) => Promise<void>
  createLearningRoute: (input: CreateInput<LearningRoute>) => Promise<LearningRoute>
  updateLearningRoute: (id: string, patch: UpdateInput<LearningRoute>) => Promise<LearningRoute>
  deleteLearningRoute: (id: string) => Promise<void>
}

const STORAGE_KEY = 'club-content-overrides-v1'

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function fallbackContent(): ContentSnapshot {
  return {
    announcements: copy(mockAnnouncements),
    blogPosts: copy(mockBlogPosts),
    citations: copy(mockCitations),
    competitionEvents: copy(mockCompetitionEvents),
    contactInfo: copy(mockContactInfo),
    growthStats: copy(mockGrowthStats),
    interviews: copy(mockInterviews),
    learningNodes: copy(mockLearningNodes),
    learningRoute: { id: 'pyagent', title: 'PyAgent · 从基础到真实项目', direction: 'PyAgent', description: '把 Python 能力带进一个可交付的 Agent 项目。', nodes: copy(mockLearningNodes), featuredProjectIds: [] },
    learningRoutes: [{ id: 'pyagent', title: 'PyAgent · 从基础到真实项目', direction: 'PyAgent', description: '把 Python 能力带进一个可交付的 Agent 项目。', nodes: copy(mockLearningNodes), featuredProjectIds: [] }],
    members: copy(mockMembers),
    membersManaged: false,
    projects: copy(mockProjects),
    prompts: copy(mockPrompts),
    resources: copy(mockResources),
    starterMessages: copy(mockStarterMessages),
  }
}

function emptyRemoteContent(): ContentSnapshot {
  const emptyRoute: LearningRoute = { id: 'remote-empty', title: '', direction: '', description: '', nodes: [], featuredProjectIds: [] }
  return {
    announcements: [],
    blogPosts: copy(mockBlogPosts),
    citations: [],
    competitionEvents: [],
    contactInfo: copy(mockContactInfo),
    growthStats: copy(mockGrowthStats),
    interviews: [],
    learningNodes: [],
    learningRoute: emptyRoute,
    learningRoutes: [],
    members: [],
    membersManaged: true,
    projects: [],
    prompts: [],
    resources: [],
    starterMessages: [],
  }
}

function readPersistedContent(): Partial<PersistedContent> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<PersistedContent>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistContent(data: ContentSnapshot) {
  if (typeof window === 'undefined' || isRemoteContentEnabled) return
  const snapshot: PersistedContent = {
    announcements: data.announcements,
    competitionEvents: data.competitionEvents,
    interviews: data.interviews,
    learningNodes: data.learningNodes,
    learningRoute: data.learningRoute,
    learningRoutes: data.learningRoutes,
    members: data.members,
    projects: data.projects,
    resources: data.resources,
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Private/file:// browser contexts may disable storage; the in-memory state still works.
  }
}

function applyPersistedContent(data: ContentSnapshot): ContentSnapshot {
  const overrides = readPersistedContent()
  const next = { ...data, membersManaged: Array.isArray(overrides.members) }
  for (const key of ['announcements', 'competitionEvents', 'interviews', 'learningNodes', 'learningRoutes', 'members', 'projects', 'resources'] as const) {
    const value = overrides[key]
    if (Array.isArray(value)) next[key] = copy(value) as never
  }
  if (Array.isArray(overrides.learningRoutes)) {
    next.learningRoutes = copy(overrides.learningRoutes)
    if (next.learningRoutes.length === 0) next.learningRoutes = [copy(next.learningRoute)]
    const primary = next.learningRoutes.find((route) => route.id === 'pyagent') ?? next.learningRoutes[0]
    if (primary) { next.learningRoute = primary; next.learningNodes = copy(primary.nodes) }
  } else if (overrides.learningRoute && typeof overrides.learningRoute === 'object') {
    next.learningRoute = copy(overrides.learningRoute)
    next.learningRoutes = [next.learningRoute]
    next.learningNodes = copy(overrides.learningRoute.nodes)
  } else if (Array.isArray(overrides.learningNodes)) {
    next.learningRoute = { ...next.learningRoute, nodes: copy(overrides.learningNodes) }
    next.learningRoutes = next.learningRoutes.map((route) => route.id === next.learningRoute.id ? next.learningRoute : route)
  }
  return next
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ContentSnapshot>(() => isRemoteContentEnabled ? emptyRemoteContent() : applyPersistedContent(fallbackContent()))
  const [loading, setLoading] = useState(isRemoteContentEnabled)
  const [error, setError] = useState<string | null>(null)

  const commitCollection = useCallback(<K extends CollectionKey>(key: K, update: (items: PersistedContent[K]) => PersistedContent[K]) => {
    setData((current) => {
      const next = { ...current, [key]: update(current[key]), membersManaged: key === 'members' ? true : current.membersManaged } as ContentSnapshot
      persistContent(next)
      return next
    })
  }, [])

  const refresh = useCallback(async () => {
    setLoading(isRemoteContentEnabled)
    setError(null)
    const results = await Promise.allSettled([
      listLearningRoutes(),
      listProjects(),
      listResources(),
      listInterviews(),
      listCompetitions(),
      listAnnouncements(),
      listPrompts(),
      listMembers(),
    ])
    const next = isRemoteContentEnabled ? emptyRemoteContent() : fallbackContent()
    const failures: string[] = []
    const [route, projects, resources, interviews, competitions, announcements, prompts, members] = results
    if (route.status === 'fulfilled') { next.learningRoutes = copy(route.value); const primary = next.learningRoutes.find((item) => item.id === 'pyagent') ?? next.learningRoutes[0]; if (primary) { next.learningRoute = primary; next.learningNodes = copy(primary.nodes) } }
    else failures.push('学习路线')
    if (projects.status === 'fulfilled') next.projects = copy(projects.value)
    else failures.push('项目库')
    if (resources.status === 'fulfilled') next.resources = copy(resources.value)
    else failures.push('资源库')
    if (interviews.status === 'fulfilled') next.interviews = copy(interviews.value)
    else failures.push('面经墙')
    if (competitions.status === 'fulfilled') next.competitionEvents = copy(competitions.value)
    else failures.push('比赛中心')
    if (announcements.status === 'fulfilled') next.announcements = copy(announcements.value)
    else failures.push('公告')
    if (prompts.status === 'fulfilled') next.prompts = copy(prompts.value)
    else failures.push('Prompt 模板')
    if (members.status === 'fulfilled') { next.members = copy(members.value); next.membersManaged = isRemoteContentEnabled }
    else failures.push('成员')
    setData(isRemoteContentEnabled ? next : applyPersistedContent(next))
    setError(failures.length
      ? isRemoteContentEnabled ? `部分内容暂时无法加载：${failures.join('、')}` : `部分内容暂时使用本地数据：${failures.join('、')}`
      : null)
    setLoading(false)
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (typeof window === 'undefined' || isRemoteContentEnabled) return
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      setData((current) => applyPersistedContent(current))
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])
  useEffect(() => {
    if (isRemoteContentEnabled || typeof window === 'undefined') return
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setData(applyPersistedContent(fallbackContent()))
    }
    window.addEventListener('storage', syncFromAnotherTab)
    return () => window.removeEventListener('storage', syncFromAnotherTab)
  }, [])


  const createAnnouncement = useCallback(async (input: CreateInput<Announcement>) => {
    const item = await serviceCreateAnnouncement(input)
    if (!item) throw new Error('公告创建失败')
    commitCollection('announcements', (items) => [...items, item])
    return item
  }, [commitCollection])
  const updateAnnouncement = useCallback(async (id: string, patch: UpdateInput<Announcement>) => {
    const item = await serviceUpdateAnnouncement(id, patch)
    if (!item) throw new Error('公告不存在或已被删除')
    commitCollection('announcements', (items) => items.map((current) => current.id === id ? item : current))
    return item
  }, [commitCollection])
  const deleteAnnouncement = useCallback(async (id: string) => {
    if (!await serviceDeleteAnnouncement(id)) throw new Error('公告不存在或已被删除')
    commitCollection('announcements', (items) => items.filter((item) => item.id !== id))
  }, [commitCollection])

  const createMember = useCallback(async (input: CreateInput<Member>) => {
    const item = await serviceCreateMember(input)
    if (!item) throw new Error('成员创建失败')
    commitCollection('members', (items) => [...items, item])
    return item
  }, [commitCollection])
  const updateMember = useCallback(async (id: string, patch: UpdateInput<Member>) => {
    const item = await serviceUpdateMember(id, patch)
    if (!item) throw new Error('成员不存在或已被删除')
    commitCollection('members', (items) => items.map((current) => current.id === id ? item : current))
    return item
  }, [commitCollection])
  const deleteMember = useCallback(async (id: string) => {
    if (!await serviceDeleteMember(id)) throw new Error('成员不存在或已被删除')
    commitCollection('members', (items) => items.filter((item) => item.id !== id))
  }, [commitCollection])

  const createProject = useCallback(async (input: CreateInput<Project>) => { const item = await serviceCreateProject(input); if (!item) throw new Error('项目创建失败'); commitCollection('projects', (items) => [...items, item]); return item }, [commitCollection])
  const updateProject = useCallback(async (id: string, patch: UpdateInput<Project>) => { const item = await serviceUpdateProject(id, patch); if (!item) throw new Error('项目不存在或已被删除'); commitCollection('projects', (items) => items.map((current) => current.id === id ? item : current)); return item }, [commitCollection])
  const deleteProject = useCallback(async (id: string) => { if (!await serviceDeleteProject(id)) throw new Error('项目不存在或已被删除'); commitCollection('projects', (items) => items.filter((item) => item.id !== id)) }, [commitCollection])
  const createResource = useCallback(async (input: CreateInput<Resource>) => { const item = await serviceCreateResource(input); if (!item) throw new Error('资源创建失败'); commitCollection('resources', (items) => [...items, item]); return item }, [commitCollection])
  const updateResource = useCallback(async (id: string, patch: UpdateInput<Resource>) => { const item = await serviceUpdateResource(id, patch); if (!item) throw new Error('资源不存在或已被删除'); commitCollection('resources', (items) => items.map((current) => current.id === id ? item : current)); return item }, [commitCollection])
  const deleteResource = useCallback(async (id: string) => { if (!await serviceDeleteResource(id)) throw new Error('资源不存在或已被删除'); commitCollection('resources', (items) => items.filter((item) => item.id !== id)) }, [commitCollection])
  const createInterview = useCallback(async (input: CreateInput<InterviewExperience>) => { const item = await serviceCreateInterview(input); if (!item) throw new Error('面经创建失败'); commitCollection('interviews', (items) => [...items, item]); return item }, [commitCollection])
  const updateInterview = useCallback(async (id: string, patch: UpdateInput<InterviewExperience>) => { const item = await serviceUpdateInterview(id, patch); if (!item) throw new Error('面经不存在或已被删除'); commitCollection('interviews', (items) => items.map((current) => current.id === id ? item : current)); return item }, [commitCollection])
  const deleteInterview = useCallback(async (id: string) => { if (!await serviceDeleteInterview(id)) throw new Error('面经不存在或已被删除'); commitCollection('interviews', (items) => items.filter((item) => item.id !== id)) }, [commitCollection])
  const createCompetition = useCallback(async (input: CreateInput<CompetitionEvent>) => { const item = await serviceCreateCompetition(input); if (!item) throw new Error('比赛创建失败'); commitCollection('competitionEvents', (items) => [...items, item]); return item }, [commitCollection])
  const updateCompetition = useCallback(async (id: string, patch: UpdateInput<CompetitionEvent>) => { const item = await serviceUpdateCompetition(id, patch); if (!item) throw new Error('比赛不存在或已被删除'); commitCollection('competitionEvents', (items) => items.map((current) => current.id === id ? item : current)); return item }, [commitCollection])
  const deleteCompetition = useCallback(async (id: string) => { if (!await serviceDeleteCompetition(id)) throw new Error('比赛不存在或已被删除'); commitCollection('competitionEvents', (items) => items.filter((item) => item.id !== id)) }, [commitCollection])
  const commitLearningRoute = useCallback((route: LearningRoute) => {
    setData((current) => {
      const routes = current.learningRoutes.some((item) => item.id === route.id) ? current.learningRoutes.map((item) => item.id === route.id ? route : item) : [...current.learningRoutes, route]
      const primary = routes.find((item) => item.id === 'pyagent') ?? routes[0] ?? route
      const next = { ...current, learningRoutes: routes, learningRoute: primary, learningNodes: primary.nodes }
      persistContent(next)
      return next
    })
  }, [])
  const createLearningRoute = useCallback(async (input: CreateInput<LearningRoute>) => { const item = await serviceCreateLearningRoute(input); if (!item) throw new Error('学习路线创建失败'); commitLearningRoute(item); return item }, [commitLearningRoute])
  const updateLearningRoute = useCallback(async (id: string, patch: UpdateInput<LearningRoute>) => { const item = await serviceUpdateLearningRoute(id, patch); if (!item) throw new Error('学习路线不存在或已被删除'); commitLearningRoute(item); return item }, [commitLearningRoute])
  const deleteLearningRoute = useCallback(async (id: string) => {
    if (id === 'pyagent') throw new Error('默认 PyAgent 路线不可删除')
    if (!await serviceDeleteLearningRoute(id)) throw new Error('学习路线不存在或已被删除')
    setData((current) => {
      const routes = current.learningRoutes.filter((item) => item.id !== id)
      const primary = routes.find((item) => item.id === 'pyagent') ?? routes[0] ?? current.learningRoute
      const next = { ...current, learningRoutes: routes, learningRoute: primary, learningNodes: primary.nodes }
      persistContent(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ data, loading, error, refresh, createAnnouncement, updateAnnouncement, deleteAnnouncement, createMember, updateMember, deleteMember, createProject, updateProject, deleteProject, createResource, updateResource, deleteResource, createInterview, updateInterview, deleteInterview, createCompetition, updateCompetition, deleteCompetition, createLearningRoute, updateLearningRoute, deleteLearningRoute }), [data, loading, error, refresh, createAnnouncement, updateAnnouncement, deleteAnnouncement, createMember, updateMember, deleteMember, createProject, updateProject, deleteProject, createResource, updateResource, deleteResource, createInterview, updateInterview, deleteInterview, createCompetition, updateCompetition, deleteCompetition, createLearningRoute, updateLearningRoute, deleteLearningRoute])
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent() {
  const value = useContext(ContentContext)
  if (!value) throw new Error('useContent 必须在 ContentProvider 内使用')
  return value
}
