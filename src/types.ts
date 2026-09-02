export type ProjectStatus = '招募中' | '维护中' | '已归档'
export type AnnouncementCategory = '重要' | '比赛' | '项目' | '讲座' | '通知'

export type Role = 'Visitor' | 'Member' | 'Contributor' | 'Leader' | 'Admin'

export interface User {
  id: string
  name: string
  initials: string
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

export interface Announcement {
  id: string
  category: AnnouncementCategory
  title: string
  detail: string
  date: string
}

export interface Project {
  id: string
  name: string
  slug: string
  description: string
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
}

export interface LearningNode {
  id: string
  title: string
  duration: string
  resources: number
  projects: number
  description?: string
}

export interface LearningRoute {
  id: string
  title: string
  description: string
  nodes: LearningNode[]
}

export interface Resource {
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

export interface Member {
  id: string
  name: string
  role: string
  cohort: string
  direction: string
  projects: string[]
  initials: string
  accent: string
}

export interface InterviewExperience {
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

export interface PromptTemplate {
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
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

export interface CompetitionEvent {
  id: string
  title: string
  type: string
  date: string
  deadline: string
  description: string
  status: '报名中' | '即将开始' | '已结束'
  accent: string
}
