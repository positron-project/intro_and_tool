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
  projectCategories as mockProjectCategories,
  resourceCategories as mockResourceCategories,
  prompts as mockPrompts,
  resources as mockResources,
  starterMessages as mockStarterMessages,
  interviewCategories as mockInterviewCategories,
} from '../data/mock'
import {
  createAnnouncement as serviceCreateAnnouncement,
  createCompetition as serviceCreateCompetition,
  createInterview as serviceCreateInterview,
  createLearningRoute as serviceCreateLearningRoute,
  createMember as serviceCreateMember,
  createProject as serviceCreateProject,
  createPrompt as serviceCreatePrompt,
  createResource as serviceCreateResource,
  deleteAnnouncement as serviceDeleteAnnouncement,
  deleteCompetition as serviceDeleteCompetition,
  deleteInterview as serviceDeleteInterview,
  deleteLearningRoute as serviceDeleteLearningRoute,
  deleteMember as serviceDeleteMember,
  deleteProject as serviceDeleteProject,
  deletePrompt as serviceDeletePrompt,
  createProjectCategory as serviceCreateProjectCategory,
  deleteProjectCategory as serviceDeleteProjectCategory,
  listProjectCategories,
  updateProjectCategory as serviceUpdateProjectCategory,
  createResourceCategory as serviceCreateResourceCategory,
  deleteResourceCategory as serviceDeleteResourceCategory,
  listResourceCategories,
  updateResourceCategory as serviceUpdateResourceCategory,
  createInterviewCategory as serviceCreateInterviewCategory,
  deleteInterviewCategory as serviceDeleteInterviewCategory,
  listInterviewCategories,
  updateInterviewCategory as serviceUpdateInterviewCategory,
  deleteResource as serviceDeleteResource,
  listLearningRoutes,
  isRemoteMemberDirectoryEnabled,
  listAnnouncements,
  listCompetitions,
  listInterviews,
  listMembers,
  listProjects,
  listProjectReviewQueue as serviceListProjectReviewQueue,
  listPrompts,
  listResources,
  isRemoteContentEnabled,
  updateAnnouncement as serviceUpdateAnnouncement,
  updateCompetition as serviceUpdateCompetition,
  updateInterview as serviceUpdateInterview,
  updateLearningRoute as serviceUpdateLearningRoute,
  updateMember as serviceUpdateMember,
  updateProject as serviceUpdateProject,
  updatePrompt as serviceUpdatePrompt,
  recordProjectView as serviceRecordProjectView,
  recordResourceView as serviceRecordResourceView,
  recordInterviewView as serviceRecordInterviewView,
  reviewProject as serviceReviewProject,
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
  ProjectCategory,
  ProjectReviewStatus,
  ContentCategory,
  PromptTemplate,
  Resource,
  UpdateInput,
  AIMessage,
  Citation,
  WorkbenchSettings,
} from '../types'
import { defaultWorkbenchSettings, getWorkbenchSettings, updateWorkbenchSettings } from './workbench.service'

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
  projectCategories: ProjectCategory[]
  resourceCategories: ContentCategory[]
  interviewCategories: ContentCategory[]
  prompts: PromptTemplate[]
  resources: Resource[]
  starterMessages: AIMessage[]
  workbench: WorkbenchSettings
}

type PersistedContent = Pick<ContentSnapshot, 'announcements' | 'competitionEvents' | 'interviews' | 'learningNodes' | 'learningRoute' | 'learningRoutes' | 'members' | 'projects' | 'projectCategories' | 'prompts' | 'resourceCategories' | 'interviewCategories' | 'resources' | 'workbench'>
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
  createPrompt: (input: CreateInput<PromptTemplate>) => Promise<PromptTemplate>
  updatePrompt: (id: string, patch: UpdateInput<PromptTemplate>) => Promise<PromptTemplate>
  deletePrompt: (id: string) => Promise<void>
  recordProjectView: (id: string) => Promise<number>
  listProjectReviewQueue: () => Promise<Project[]>
  reviewProject: (id: string, reviewStatus: Extract<ProjectReviewStatus, 'approved' | 'rejected'>, reviewNote?: string) => Promise<Project>
  createProjectCategory: (input: CreateInput<ProjectCategory>) => Promise<ProjectCategory>
  updateProjectCategory: (id: string, patch: UpdateInput<ProjectCategory>) => Promise<ProjectCategory>
  deleteProjectCategory: (id: string) => Promise<void>
  createResourceCategory: (input: CreateInput<ContentCategory>) => Promise<ContentCategory>
  updateResourceCategory: (id: string, patch: UpdateInput<ContentCategory>) => Promise<ContentCategory>
  deleteResourceCategory: (id: string) => Promise<void>
  createResource: (input: CreateInput<Resource>) => Promise<Resource>
  updateResource: (id: string, patch: UpdateInput<Resource>) => Promise<Resource>
  deleteResource: (id: string) => Promise<void>
  recordResourceView: (id: string) => Promise<number>
  createInterview: (input: CreateInput<InterviewExperience>) => Promise<InterviewExperience>
  updateInterview: (id: string, patch: UpdateInput<InterviewExperience>) => Promise<InterviewExperience>
  deleteInterview: (id: string) => Promise<void>
  recordInterviewView: (id: string) => Promise<number>
  createInterviewCategory: (input: CreateInput<ContentCategory>) => Promise<ContentCategory>
  updateInterviewCategory: (id: string, patch: UpdateInput<ContentCategory>) => Promise<ContentCategory>
  deleteInterviewCategory: (id: string) => Promise<void>
  createCompetition: (input: CreateInput<CompetitionEvent>) => Promise<CompetitionEvent>
  updateCompetition: (id: string, patch: UpdateInput<CompetitionEvent>) => Promise<CompetitionEvent>
  deleteCompetition: (id: string) => Promise<void>
  createLearningRoute: (input: CreateInput<LearningRoute>) => Promise<LearningRoute>
  updateLearningRoute: (id: string, patch: UpdateInput<LearningRoute>) => Promise<LearningRoute>
  deleteLearningRoute: (id: string) => Promise<void>
  updateWorkbench: (settings: WorkbenchSettings) => Promise<WorkbenchSettings>
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
    projectCategories: copy(mockProjectCategories),
    resourceCategories: copy(mockResourceCategories),
    interviewCategories: copy(mockInterviewCategories),
    prompts: copy(mockPrompts),
    resources: copy(mockResources),
    starterMessages: copy(mockStarterMessages),
    workbench: defaultWorkbenchSettings(),
  }
}

/**
 * API mode must never silently fall back to the bundled demo catalogue. An
 * empty snapshot keeps the page renderable while making a missing backend
 * obvious to the user and to the administrator.
 */
function emptyContent(): ContentSnapshot {
  return {
    announcements: [],
    blogPosts: copy(mockBlogPosts),
    citations: [],
    competitionEvents: [],
    contactInfo: copy(mockContactInfo),
    growthStats: copy(mockGrowthStats),
    interviews: [],
    learningNodes: [],
    learningRoute: { id: '', title: '', direction: '', description: '', nodes: [], featuredProjectIds: [] },
    learningRoutes: [],
    members: [],
    membersManaged: isRemoteMemberDirectoryEnabled,
    projects: [],
    projectCategories: [],
    resourceCategories: [],
    interviewCategories: [],
    prompts: [],
    resources: [],
    starterMessages: [],
    workbench: defaultWorkbenchSettings(),
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
    projectCategories: data.projectCategories,
    prompts: data.prompts,
    resourceCategories: data.resourceCategories,
    interviewCategories: data.interviewCategories,
    resources: data.resources,
    workbench: data.workbench,
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Private/file:// browser contexts may disable storage; the in-memory state still works.
  }
}

function applyPersistedContent(data: ContentSnapshot): ContentSnapshot {
  if (isRemoteContentEnabled) return data
  const overrides = readPersistedContent()
  const next = { ...data, membersManaged: isRemoteMemberDirectoryEnabled ? false : Array.isArray(overrides.members) }
  for (const key of ['announcements', 'competitionEvents', 'interviews', 'learningNodes', 'learningRoutes', 'members', 'projects', 'projectCategories', 'prompts', 'resourceCategories', 'interviewCategories', 'resources'] as const) {
    if (key === 'members' && isRemoteMemberDirectoryEnabled) continue
    const value = overrides[key]
    if (Array.isArray(value)) next[key] = copy(value) as never
  }
  if (Array.isArray(next.resources)) {
    const legacyResourceKeys: Record<string, string> = { 前端: 'frontend', 后端: 'backend', 算法: 'algorithm', AI: 'ai', Agent: 'agent', 数据库: 'database', DevOps: 'devops', Prompt: 'prompt' }
    next.resources = next.resources.map((resource) => ({ ...resource, category: legacyResourceKeys[resource.category] ?? resource.category }))
  }
  if (Array.isArray(next.interviews)) {
    next.interviews = next.interviews.map((interview) => {
      if (interview.category) return interview
      const text = `${interview.role} ${interview.tags.join(' ')}`
      const category = text.includes('前端') || text.includes('React') ? 'frontend' : text.includes('后端') || text.includes('Java') || text.includes('服务端') ? 'backend' : text.includes('AI') || text.includes('算法') || text.includes('RAG') ? 'ai' : 'intern'
      return { ...interview, category }
    })
  }
  if (overrides.workbench && typeof overrides.workbench === 'object') {
    next.workbench = { ...next.workbench, ...copy(overrides.workbench) }
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
  const [data, setData] = useState<ContentSnapshot>(() => isRemoteContentEnabled ? emptyContent() : applyPersistedContent(fallbackContent()))
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
      listProjectCategories(),
      listResourceCategories(),
      listInterviewCategories(),
      listResources(),
      listInterviews(),
      listCompetitions(),
      listAnnouncements(),
      listPrompts(),
      listMembers(),
      getWorkbenchSettings(),
    ])
    const next = isRemoteContentEnabled ? emptyContent() : applyPersistedContent(fallbackContent())
    const failures: string[] = []
    const [route, projects, projectCategories, resourceCategories, interviewCategories, resources, interviews, competitions, announcements, prompts, members, workbench] = results
    if (route.status === 'fulfilled') { next.learningRoutes = copy(route.value); const primary = next.learningRoutes.find((item) => item.id === 'pyagent') ?? next.learningRoutes[0]; if (primary) { next.learningRoute = primary; next.learningNodes = copy(primary.nodes) } }
    else failures.push('学习路线')
    if (projects.status === 'fulfilled') next.projects = copy(projects.value)
    else failures.push('项目库')
    if (projectCategories.status === 'fulfilled') next.projectCategories = copy(projectCategories.value)
    else failures.push('项目分类')
    if (resourceCategories.status === 'fulfilled') next.resourceCategories = copy(resourceCategories.value)
    else failures.push('资源分类')
    if (interviewCategories.status === 'fulfilled') next.interviewCategories = copy(interviewCategories.value)
    else failures.push('面经分类')
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
    if (members.status === 'fulfilled') {
      next.members = copy(members.value)
      next.membersManaged = isRemoteMemberDirectoryEnabled
    } else if (isRemoteMemberDirectoryEnabled) {
      next.members = []
      next.membersManaged = true
      failures.push('成员目录')
    } else {
      failures.push('成员')
    }
    if (workbench.status === 'fulfilled') next.workbench = copy(workbench.value)
    setData(next)
    setError(failures.length
      ? isRemoteContentEnabled ? `内容服务暂时无法加载：${failures.join('、')}。当前不会显示演示数据，请检查后端接口。` : `部分内容暂时使用本地数据：${failures.join('、')}`
      : null)
    setLoading(false)
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      setData((current) => {
        if (isRemoteContentEnabled) return current
        return applyPersistedContent(fallbackContent())
      })
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
  const createPrompt = useCallback(async (input: CreateInput<PromptTemplate>) => { const item = await serviceCreatePrompt(input); if (!item) throw new Error('Prompt 模板创建失败'); commitCollection('prompts', (items) => [...items, item]); return item }, [commitCollection])
  const updatePrompt = useCallback(async (id: string, patch: UpdateInput<PromptTemplate>) => { const item = await serviceUpdatePrompt(id, patch); if (!item) throw new Error('Prompt 模板不存在或已被删除'); commitCollection('prompts', (items) => items.map((current) => current.id === id ? item : current)); return item }, [commitCollection])
  const deletePrompt = useCallback(async (id: string) => { if (!await serviceDeletePrompt(id)) throw new Error('Prompt 模板不存在或已被删除'); commitCollection('prompts', (items) => items.filter((item) => item.id !== id)) }, [commitCollection])
  const recordProjectView = useCallback(async (id: string) => {
    const views = await serviceRecordProjectView(id)
    if (views === undefined) throw new Error('项目不存在或已被删除')
    commitCollection('projects', (items) => items.map((item) => item.id === id ? { ...item, views } : item))
    return views
  }, [commitCollection])
  const listProjectReviewQueue = useCallback(async () => serviceListProjectReviewQueue(), [])
  const reviewProject = useCallback(async (id: string, reviewStatus: Extract<ProjectReviewStatus, 'approved' | 'rejected'>, reviewNote?: string) => {
    const item = await serviceReviewProject(id, reviewStatus, reviewNote)
    if (!item) throw new Error('项目不存在或已被删除')

    commitCollection(
      'projects',
      (items) => item.reviewStatus === 'approved'
        ? items.some((current) => current.id === item.id)
          ? items.map((current) => current.id === item.id ? item : current)
          : [...items, item]
        : items.filter((current) => current.id !== item.id),
    )

    return item
  }, [commitCollection])
  const createProjectCategory = useCallback(async (input: CreateInput<ProjectCategory>) => { const item = await serviceCreateProjectCategory(input); if (!item) throw new Error('分类创建失败'); commitCollection('projectCategories', (items) => [...items, item].sort((a, b) => a.order - b.order)); return item }, [commitCollection])
  const updateProjectCategory = useCallback(async (id: string, patch: UpdateInput<ProjectCategory>) => {
    const item = await serviceUpdateProjectCategory(id, patch)
    if (!item) throw new Error('分类不存在或已被删除')
    setData((current) => {
      const previous = current.projectCategories.find((category) => category.id === id)
      const nextProjects = previous && patch.key && patch.key !== previous.key
        ? current.projects.map((project) => project.category === previous.key ? { ...project, category: patch.key as string } : project)
        : current.projects
      const next = { ...current, projects: nextProjects, projectCategories: current.projectCategories.map((category) => category.id === id ? item : category).sort((a, b) => a.order - b.order) }
      persistContent(next)
      return next
    })
    return item
  }, [])
  const deleteProjectCategory = useCallback(async (id: string) => {
    const target = data.projectCategories.find((category) => category.id === id)
    if (!target) throw new Error('分类不存在或已被删除')
    if (target.builtIn) throw new Error('内置分类不可删除，请改为停用')
    if (data.projects.some((project) => project.category === target.key)) throw new Error('该分类仍有项目使用，请先迁移项目')
    if (!await serviceDeleteProjectCategory(id)) throw new Error('分类不存在或已被删除')
    commitCollection('projectCategories', (items) => items.filter((category) => category.id !== id))
  }, [commitCollection, data.projectCategories, data.projects])
  const createResourceCategory = useCallback(async (input: CreateInput<ContentCategory>) => { const item = await serviceCreateResourceCategory(input); if (!item) throw new Error('分类创建失败'); commitCollection('resourceCategories', (items) => [...items, item].sort((a, b) => a.order - b.order)); return item }, [commitCollection])
  const updateResourceCategory = useCallback(async (id: string, patch: UpdateInput<ContentCategory>) => {
    const item = await serviceUpdateResourceCategory(id, patch)
    if (!item) throw new Error('分类不存在或已被删除')
    setData((current) => {
      const previous = current.resourceCategories.find((category) => category.id === id)
      const nextResources = previous && patch.key && patch.key !== previous.key
        ? current.resources.map((resource) => resource.category === previous.key ? { ...resource, category: patch.key as string } : resource)
        : current.resources
      const next = { ...current, resources: nextResources, resourceCategories: current.resourceCategories.map((category) => category.id === id ? item : category).sort((a, b) => a.order - b.order) }
      persistContent(next)
      return next
    })
    return item
  }, [])
  const deleteResourceCategory = useCallback(async (id: string) => {
    const target = data.resourceCategories.find((category) => category.id === id)
    if (!target) throw new Error('分类不存在或已被删除')
    if (target.builtIn) throw new Error('内置分类不可删除，请改为停用')
    if (data.resources.some((resource) => resource.category === target.key)) throw new Error('该分类仍有资源使用，请先迁移资源')
    if (!await serviceDeleteResourceCategory(id)) throw new Error('分类不存在或已被删除')
    commitCollection('resourceCategories', (items) => items.filter((category) => category.id !== id))
  }, [commitCollection, data.resourceCategories, data.resources])
  const createResource = useCallback(async (input: CreateInput<Resource>) => { const item = await serviceCreateResource(input); if (!item) throw new Error('资源创建失败'); commitCollection('resources', (items) => [...items, item]); return item }, [commitCollection])
  const updateResource = useCallback(async (id: string, patch: UpdateInput<Resource>) => { const item = await serviceUpdateResource(id, patch); if (!item) throw new Error('资源不存在或已被删除'); commitCollection('resources', (items) => items.map((current) => current.id === id ? item : current)); return item }, [commitCollection])
  const deleteResource = useCallback(async (id: string) => { if (!await serviceDeleteResource(id)) throw new Error('资源不存在或已被删除'); commitCollection('resources', (items) => items.filter((item) => item.id !== id)) }, [commitCollection])
  const recordResourceView = useCallback(async (id: string) => {
    const views = await serviceRecordResourceView(id)
    if (views === undefined) throw new Error('资源不存在或已被删除')
    commitCollection('resources', (items) => items.map((item) => item.id === id ? { ...item, views } : item))
    return views
  }, [commitCollection])
  const createInterview = useCallback(async (input: CreateInput<InterviewExperience>) => { const item = await serviceCreateInterview(input); if (!item) throw new Error('面经创建失败'); commitCollection('interviews', (items) => [...items, item]); return item }, [commitCollection])
  const updateInterview = useCallback(async (id: string, patch: UpdateInput<InterviewExperience>) => { const item = await serviceUpdateInterview(id, patch); if (!item) throw new Error('面经不存在或已被删除'); commitCollection('interviews', (items) => items.map((current) => current.id === id ? item : current)); return item }, [commitCollection])
  const deleteInterview = useCallback(async (id: string) => { if (!await serviceDeleteInterview(id)) throw new Error('面经不存在或已被删除'); commitCollection('interviews', (items) => items.filter((item) => item.id !== id)) }, [commitCollection])
  const recordInterviewView = useCallback(async (id: string) => {
    const views = await serviceRecordInterviewView(id)
    if (views === undefined) throw new Error('面经不存在或已被删除')
    commitCollection('interviews', (items) => items.map((item) => item.id === id ? { ...item, views } : item))
    return views
  }, [commitCollection])
  const createInterviewCategory = useCallback(async (input: CreateInput<ContentCategory>) => { const item = await serviceCreateInterviewCategory(input); if (!item) throw new Error('分类创建失败'); commitCollection('interviewCategories', (items) => [...items, item].sort((a, b) => a.order - b.order)); return item }, [commitCollection])
  const updateInterviewCategory = useCallback(async (id: string, patch: UpdateInput<ContentCategory>) => {
    const item = await serviceUpdateInterviewCategory(id, patch)
    if (!item) throw new Error('分类不存在或已被删除')
    setData((current) => {
      const previous = current.interviewCategories.find((category) => category.id === id)
      const nextInterviews = previous && patch.key && patch.key !== previous.key
        ? current.interviews.map((interview) => interview.category === previous.key ? { ...interview, category: patch.key as string } : interview)
        : current.interviews
      const next = { ...current, interviews: nextInterviews, interviewCategories: current.interviewCategories.map((category) => category.id === id ? item : category).sort((a, b) => a.order - b.order) }
      persistContent(next)
      return next
    })
    return item
  }, [])
  const deleteInterviewCategory = useCallback(async (id: string) => {
    const target = data.interviewCategories.find((category) => category.id === id)
    if (!target) throw new Error('分类不存在或已被删除')
    if (target.builtIn) throw new Error('内置分类不可删除，请改为停用')
    if (data.interviews.some((interview) => interview.category === target.key)) throw new Error('该分类仍有面经使用，请先迁移面经')
    if (!await serviceDeleteInterviewCategory(id)) throw new Error('分类不存在或已被删除')
    commitCollection('interviewCategories', (items) => items.filter((category) => category.id !== id))
  }, [commitCollection, data.interviewCategories, data.interviews])
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

  const updateWorkbench = useCallback(async (settings: WorkbenchSettings) => {
    const result = await updateWorkbenchSettings(settings)
    setData((current) => {
      const next = { ...current, workbench: result }
      persistContent(next)
      return next
    })
    return result
  }, [])

  const value = useMemo(() => ({ data, loading, error, refresh, createAnnouncement, updateAnnouncement, deleteAnnouncement, createMember, updateMember, deleteMember, createProject, updateProject, deleteProject, createPrompt, updatePrompt, deletePrompt, recordProjectView, listProjectReviewQueue, reviewProject, createProjectCategory, updateProjectCategory, deleteProjectCategory, createResourceCategory, updateResourceCategory, deleteResourceCategory, createResource, updateResource, deleteResource, recordResourceView, createInterview, updateInterview, deleteInterview, recordInterviewView, createInterviewCategory, updateInterviewCategory, deleteInterviewCategory, createCompetition, updateCompetition, deleteCompetition, createLearningRoute, updateLearningRoute, deleteLearningRoute, updateWorkbench }), [data, loading, error, refresh, createAnnouncement, updateAnnouncement, deleteAnnouncement, createMember, updateMember, deleteMember, createProject, updateProject, deleteProject, createPrompt, updatePrompt, deletePrompt, recordProjectView, listProjectReviewQueue, reviewProject, createProjectCategory, updateProjectCategory, deleteProjectCategory, createResourceCategory, updateResourceCategory, deleteResourceCategory, createResource, updateResource, deleteResource, recordResourceView, createInterview, updateInterview, deleteInterview, recordInterviewView, createInterviewCategory, updateInterviewCategory, deleteInterviewCategory, createCompetition, updateCompetition, deleteCompetition, createLearningRoute, updateLearningRoute, deleteLearningRoute, updateWorkbench])
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent() {
  const value = useContext(ContentContext)
  if (!value) throw new Error('useContent 必须在 ContentProvider 内使用')
  return value
}
