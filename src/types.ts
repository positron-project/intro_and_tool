export type ProjectStatus = '招募中' | '维护中' | '已归档'
export type AnnouncementCategory = '重要' | '比赛' | '项目' | '讲座' | '通知'

export type Role = 'Visitor' | 'Member' | 'Contributor' | 'Leader' | 'Admin'

/** Shared query shape for all content list endpoints. */
export interface ListParams {
  search?: string
  category?: string
  status?: string
  cohort?: string
  page?: number
  pageSize?: number
  sort?: string
  direction?: 'asc' | 'desc'
  signal?: AbortSignal
}

export type CreateInput<T extends { id: string }> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'publishedAt' | 'archivedAt'>
export type UpdateInput<T extends { id: string }> = Partial<CreateInput<T>>

export interface PageInfo {
  page: number
  pageSize: number
  total: number
}

export interface Paginated<T> {
  items: T[]
  page: PageInfo
}

/** Content audience used by both the local demo and the future API. */
export type ContentVisibility = 'public' | 'members' | 'contributors'

export type AccountStatus = 'active' | 'disabled' | 'closed'

export type InviteCodeStatus = 'active' | 'expired' | 'exhausted' | 'revoked'

/** A temporary credential that upgrades a member to the contributor role. */
export interface InviteCode {
  id: string
  code: string
  role: 'Contributor'
  expiresAt: string
  maxUses: number
  usedCount: number
  createdAt: string
  revokedAt?: string
  status: InviteCodeStatus
}

export type ContributionSubmissionStatus = 'pending' | 'approved' | 'rejected'

/** Local demo record for a resource submitted by a member for moderation. */
export interface ContributionSubmission {
  id: string
  submitterId: string
  submitterName: string
  title: string
  description: string
  category: string
  resourceUrl?: string
  fileName?: string
  status: ContributionSubmissionStatus
  submittedAt: string
  reviewNote?: string
}

/** Server-managed fields returned with editable content records. */
export interface ContentMeta {
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
  publishedAt?: string
  archivedAt?: string
  visibility?: ContentVisibility
}

export interface AuthUser extends User {
  avatarUrl?: string
  status?: AccountStatus
}

export interface AuthSession {
  accessToken: string
  refreshToken?: string
  expiresAt?: string
  user: AuthUser
}

export interface UploadAsset {
  id: string
  url: string
  name: string
  mimeType: string
  size: number
  alt?: string
}

export interface User {
  id: string
  name: string
  /** Unique account identity; the backend must enforce a unique constraint. */
  email?: string
  initials: string
  bio?: string
  cohort: string
  role: Role
  directions: string[]
}

export interface Technology {
  id: string
  name: string
  category: string
  color?: string
}

export interface ProjectMember {
  userId: string
  projectId: string
  role: string
  cohort: string
}

export interface ProjectMilestone {
  id: string
  year: string
  title: string
  summary: string
  status?: '已完成' | '进行中' | '计划中'
}

export interface ProjectLogEntry {
  id: string
  date: string
  title: string
  detail: string
  author?: string
  authorInitials?: string
}

export interface Announcement extends ContentMeta {
  id: string
  category: AnnouncementCategory
  title: string
  detail: string
  date: string
  published?: boolean
  scope?: string
}

export interface Project extends ContentMeta {
  id: string
  name: string
  slug: string
  description: string
  intro?: string
  githubUrl?: string
  docsUrl?: string
  demoUrl?: string
  issueUrl?: string
  coverImage?: string
  stack: string[]
  members: number
  stars: number
  status: ProjectStatus
  difficulty: number
  year: number
  category: string
  accent: string
  icon: string
  featured?: boolean
  milestones?: ProjectMilestone[]
  logs?: ProjectLogEntry[]
  memberIds?: string[]
  joinEnabled?: boolean
  joinNote?: string
}

export interface LearningNode {
  id: string
  title: string
  duration: string
  resources: number
  projects: number
  description?: string
  projectIds?: string[]
}

export interface LearningRoute extends ContentMeta {
  id: string
  title: string
  direction?: string
  description: string
  nodes: LearningNode[]
  featuredProjectIds?: string[]
}

export interface Resource extends ContentMeta {
  id: string
  title: string
  description: string
  category: string
  type: string
  tags: string[]
  author: string
  updated: string
  views: number
  accent: string
}

export interface Member extends ContentMeta {
  id: string
  name: string
  role: string
  cohort: string
  direction: string
  projects: string[]
  initials: string
  accent: string
}

export interface InterviewExperience extends ContentMeta {
  id: string
  company: string
  role: string
  author: string
  cohort: string
  date: string
  difficulty: '简单' | '中等' | '困难'
  rounds: number
  tags: string[]
  summary: string
}

export interface PromptTemplate extends ContentMeta {
  id: string
  title: string
  usage: string
  model: string
  category: string
  preview: string
}

export interface Citation {
  id: string
  title: string
  type: string
  path: string
}

export interface Contribution {
  id: string
  userId: string
  type: 'resource' | 'project' | 'interview' | 'route' | 'document'
  title: string
  date: string
  published?: boolean
  scope?: string
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

export interface CompetitionProject {
  id: string
  title: string
  cohort: string
  description: string
  imageUrl?: string
  projectUrl?: string
}

export interface CompetitionEvent extends ContentMeta {
  id: string
  title: string
  type: string
  date: string
  deadline: string
  description: string
  status: '报名中' | '即将开始' | '已结束'
  accent: string
  projects?: CompetitionProject[]
}
