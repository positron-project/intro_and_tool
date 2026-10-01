export type ProjectStatus = '招募中' | '维护中' | '已归档'
export type AnnouncementCategory = '重要' | '比赛' | '项目' | '讲座' | '通知'

/**
 * Account roles are ordered from public access to full club control:
 * Visitor -> Member -> Contributor -> CohortLeader -> Leader.
 * Admin is retained as a legacy backend alias for existing records.
 */
export type Role = 'Visitor' | 'Member' | 'Contributor' | 'CohortLeader' | 'Leader' | 'Admin'

/** Shared query shape for all content list endpoints. */
export interface ListParams {
  search?: string
  category?: string
  resource?: string
  status?: string
  cohortId?: string
  teamId?: string
  /** Deprecated aliases kept for older page-level callers. */
  cohort?: string
  team?: string
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
  /** Optional membership placement carried by the invitation. */
  cohort?: string
  direction?: string
  expiresAt: string
  maxUses: number
  usedCount: number
  createdAt: string
  revokedAt?: string
  status: InviteCodeStatus
}

export type ContributionSubmissionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'withdrawn'

export type ResourceType = 'article' | 'video' | 'course' | 'link' | 'tool' | 'repository' | 'file'
export type ResourceAccessMode = 'external_link' | 'attachment' | 'article'
export type ResourceStatus = 'draft' | 'pending' | 'published' | 'archived' | 'offline'

export interface ResourceAttachment {
  id?: string
  /** Upload-service asset ID used to attach stored files to a resource. */
  assetId?: string
  name: string
  url: string
  mimeType?: string
  size?: number
  sortOrder?: number
}

/** Local demo record for a resource submitted by a member for moderation. */
export interface ContributionSubmission {
  id: string
  submitterId: string
  submitterName: string
  title: string
  description: string
  category: string
  resourceType?: ResourceType
  accessMode?: ResourceAccessMode
  tags?: string[]
  visibility?: ContentVisibility
  resourceUrl?: string
  fileName?: string
  attachments?: ResourceAttachment[]
  content?: string
  targetResourceId?: string
  version?: number
  changeNote?: string
  status: ContributionSubmissionStatus
  submittedAt: string
  reviewedAt?: string
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
  avatarAssetId?: string
  status?: AccountStatus
}

/** Normalized row used by the admin contribution center. */
export interface AdminContributionRow {
  id: string
  type: 'project' | 'resource' | 'feedback' | 'interview' | 'prompt'
  title: string
  description: string
  category: string
  submitterName: string
  cohort: string
  direction: string
  submittedAt: string
  status: ContributionSubmissionStatus
  reviewNote?: string
  project?: Project
  submission?: ContributionSubmission
  interview?: InterviewSubmission
  prompt?: PromptReviewItem
  feedback?: { id: string; category: string; content: string; contact?: string; createdAt: string; status?: 'pending' | 'read' | 'resolved' }
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

export type ProjectReviewStatus = 'pending' | 'approved' | 'rejected'

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
  downloadUrl?: string
  coverImage?: string
  galleryImages?: string[]
  stack: string[]
  members: number
  stars: number
  /** 浏览总数，由后端浏览事件接口维护。 */
  views?: number
  /** 收藏总数；未返回时兼容使用 stars。 */
  favoriteCount?: number
  /** 当前登录用户是否已收藏。 */
  isFavorited?: boolean
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

  /** 后端审核状态。 */
  reviewStatus?: ProjectReviewStatus

  /** 审核意见。 */
  reviewNote?: string

  /** 提交项目的用户编号。 */
  submittedBy?: number

  /** 提交人的公开显示名称。 */
  submittedByName?: string

  /** 提交人的方向。 */
  submittedByDirection?: string

  /** 审核人的用户编号。 */
  reviewedBy?: number

  /** 审核时间。 */
  reviewedAt?: string
}

/** Configurable content-library filter shown to members and administrators. */
export interface ContentCategory extends ContentMeta {
  id: string
  resource?: 'projects' | 'resources' | 'interviews'
  key: string
  label: string
  description?: string
  accent: string
  icon: string
  order: number
  enabled: boolean
  builtIn?: boolean
}

/** Backward-compatible name for integrations that still call these project categories. */
export type ProjectCategory = ContentCategory

export interface LearningNode {
  id: string
  title: string
  duration: string
  resources: number
  projects: number
  description?: string
  projectIds?: string[]
  videoTitle?: string
  videoUrl?: string
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
  /** Database cohort ID that controls who may manage this resource. */
  cohortId?: string | null
  title: string
  description: string
  category: string
  type: ResourceType | string
  tags: string[]
  author: string
  /** Legacy display field. New API responses should use ISO timestamps in ContentMeta. */
  updated: string
  views: number
  favoriteCount?: number
  isFavorited?: boolean
  accent: string
  resourceUrl?: string
  downloadUrl?: string
  content?: string
  accessMode?: ResourceAccessMode
  status?: ResourceStatus
  attachments?: ResourceAttachment[]
  sourceName?: string
}

export interface Member extends ContentMeta {
  id: string
  /** Login account ID when this member profile belongs to a user account. */
  userId?: string | number
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
  category?: string
  recruitmentType?: '实习' | '校招' | '社招' | '日常招聘' | string
  city?: string
  preparation?: string
  reflection?: string
  anonymous?: boolean
  roundDetails?: InterviewRound[]
  /** 浏览总数，由后端浏览事件接口维护。 */
  views?: number
  helpfulCount?: number
  isHelpful?: boolean
  favoriteCount?: number
  isFavorited?: boolean
}

export interface InterviewRound {
  title: string
  questions: Array<{
    question: string
    answer?: string
  }>
}

export interface InterviewSubmission extends InterviewExperience {
  submitterId: string
  /** Private reviewer-only display name, never returned by public detail endpoints. */
  submitterName?: string
  status: ContributionSubmissionStatus
  submittedAt: string
  reviewedAt?: string
  reviewNote?: string
  withdrawnAt?: string
  reviewHistory?: InterviewReviewRecord[]
  version?: number
}

export interface InterviewReviewRecord {
  id: string
  action: 'approve' | 'reject' | 'request_changes'
  status: Extract<ContributionSubmissionStatus, 'approved' | 'rejected' | 'changes_requested'>
  reviewerName: string
  note?: string
  createdAt: string
}

export interface PromptTemplate extends ContentMeta {
  id: string
  title: string
  usage: string
  model: string
  category: string
  preview: string
  status?: ContributionSubmissionStatus | 'archived'
  favoriteCount?: number
  isFavorited?: boolean
}

export interface PromptReviewItem extends PromptTemplate {
  status: ContributionSubmissionStatus
  submitterId?: string | null
  submitterName?: string
  submitterCohort?: string | null
  submitterDirection?: string | null
  submittedAt?: string
  reviewedAt?: string
  reviewNote?: string
}

export type WorkbenchFeedItemType = 'announcement' | 'project' | 'resource'

export interface WorkbenchFeedItem {
  type: WorkbenchFeedItemType
  id: string
}

export interface WorkbenchSettings {
  liveEnabled: boolean
  liveTitle: string
  liveSubtitle: string
  liveItems: WorkbenchFeedItem[]
  liveRotationSeconds: number
  projectsEnabled: boolean
  projectsTitle: string
  projectIds: string[]
  projectRotationSeconds: number
  updatedAt?: string
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
  cohortId?: string
  description: string
  imageUrl?: string
  imageAssetId?: string
  projectUrl?: string
  sortOrder?: number
}

export interface CompetitionTrack {
  id: string
  name: string
  description?: string
  audience?: string
  format?: string
  teamSize?: string
  requirements?: string
  registrationStart?: string
  registrationEnd?: string
  registrationUrl?: string
  rulesUrl?: string
  awards?: string
}

export type CompetitionStatus = '草稿' | '即将报名' | '报名中' | '即将开始' | '报名已截止' | '比赛进行中' | '等待结果' | '已结束'
export type CompetitionLifecycle = 'draft' | 'published' | 'archived'

export interface CompetitionEvent extends ContentMeta {
  id: string
  title: string
  /** Optional series name used to group recurring events such as 蓝桥杯. */
  seriesName?: string
  type: string
  organizer?: string
  officialUrl?: string
  registrationStart?: string
  registrationEnd?: string
  eventStart?: string
  eventEnd?: string
  resultDate?: string
  lifecycle?: CompetitionLifecycle
  date: string
  deadline: string
  description: string
  /** Kept for older API records; the UI derives a live stage when date nodes exist. */
  status: CompetitionStatus
  accent: string
  tracks?: CompetitionTrack[]
  projects?: CompetitionProject[]
}
