import { useLocalDraft } from './lib/useLocalDraft'
import { confirmDraftNavigation } from './lib/draft-navigation'
import { LocalDraftNotice } from './components/LocalDraftNotice'
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bell,
  Bot,
  Camera,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Compass,
  CloudDownload,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Folder,
  Github,
  History,
  Home,
  ImagePlus,
  KeyRound,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  LogOut,
  Maximize2,
  Mail,
  Map,
  Menu,
  MessageCircle,
  Megaphone,
  Moon,
  Palette,
  Plus,
  PlayCircle,
  Quote,
  Radio,
  RefreshCw,
  Rocket,
  Route,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  ScrollText,
  Target,
  Terminal,
  Trash2,
  Trophy,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useContent } from './services/content.context'
import { apiConfig } from './services/api-client'
import { useClubConfig } from './services/club-config.context'
import { askAssistant } from './services/ai.service'
import { canAccessAdmin, canManageContent, canManageGlobalContent, canViewContent, demoCredentials, demoOwnerCredentials, isDemoAuth } from './services/auth.service'
import { createContributionSubmission, deleteContributionSubmission, listContributionSubmissions } from './services/contribution.service'
import { createFeedbackMessage, listFeedbackMessages, uploadFeedbackAttachment } from './services/feedback.service'
import type { FeedbackAttachment, FeedbackMessage } from './services/feedback.service'
import { MAX_RESOURCE_ATTACHMENTS, uploadAsset, validateResourceAttachmentFiles } from './services/upload.service'
import { ResourceLinksEditor } from './components/ResourceLinksEditor'
import { isRemoteClubConfigEnabled } from './services/club-config.service'
import { listMyProjectJoinRequests, listOwnedProjectJoinRequests, listProjectJoinRequests, reviewProjectJoinRequest, submitProjectJoinRequest, type ProjectJoinRequest } from './services/project.service'
import { competitionDateLabel, competitionNextMilestone, competitionStage, getCompetitionReminder, hasCompetitionSchedule, setCompetitionReminder } from './services/competition.service'
import { getSiteSettings, getUserPreferences, isRemoteSettingsEnabled, updateUserPreferences } from './services/settings.service'
import { getProject, getResource, listMyProjectSubmissions, resubmitProject } from './services/content.service'
import { favoriteTargetMatches, listFavorites, toggleFavorite, type FavoriteRecord, type FavoriteTargetType } from './services/favorite.service'
import { listAllInterviewReviewQueue, listMyInterviewSubmissions } from './services/interview.service'
import { submitPrompt } from './services/prompt.service'
import { deleteAllReadMyNotifications, deleteMyNotification, getMyUnreadNotificationCount, listMyNotifications, markAllMyNotificationsRead, markMyNotificationRead, type ServerNotification } from './services/notifications.service'
import { useAuth } from './services/auth.context'
import type { AIMessage, Announcement, AnnouncementCategory, Citation, CompetitionEvent, ContributionSubmission, ContentCategory, InterviewExperience, InterviewSubmission, LearningNode, Project, ProjectCategory, PromptTemplate, Resource, ResourceAttachment, ResourceLink } from './types'
import { PromptSubmissionModal } from './components/prompt-modals'
import ResourceMarkdown from './components/ResourceMarkdown'
import { InterviewPage, InterviewSubmissionRows } from './components/interviews'
import { TurnstileWidget } from './components/turnstile-widget'
import { ExpandedHomePage } from './components/home/ExpandedHomePage'
// 管理后台约 230KB 源码，只有 /admin 会遇到。改成动态导入后，
// vite.config 里分出来的 page-admin chunk 才会真正按需拉取，
// 而不是被 index.html 用 modulepreload 提前下载给每个访客。
const AdminPage = lazy(() =>
  import('./components/admin/AdminPage').then((module) => ({ default: module.AdminPage })),
)
import { resolveProjectMembers } from './utils/project-members'
import {
  Avatar,
  MAX_LOCAL_AVATAR_BYTES,
  MAX_LOCAL_IMAGE_BYTES,
  Tag,
  accentForMemberDirection,
  initialsFromName,
  isSupportedImage,
  mergeManagedTeamMembers,
  normalizeMemberTeamId,
  roleLabels,
  safeImageSource,
  safeLink,
  type BackgroundPreference,
  type Theme,
} from './lib/app-shared'

const iconMap: Record<string, LucideIcon> = {
  route: Route,
  rocket: Rocket,
  trophy: Trophy,
  folder: Folder,
  bot: Bot,
  users: Users,
  message: MessageCircle,
  history: History,
  spark: Sparkles,
  terminal: Terminal,
  calendar: CalendarDays,
  map: Map,
  scan: Target,
  book: BookOpen,
  code: Code2,
  file: FileText,
}

const navItems = [
  { label: '首页', href: '#/home', icon: Home },
  { label: '工具页', href: '#/tools', icon: LayoutDashboard },
  { label: '学习路线', href: '#/learning', icon: Route },
  { label: '项目库', href: '#/projects', icon: Rocket },
  { label: '资源库', href: '#/resources', icon: Folder },
  { label: '面经墙', href: '#/interviews', icon: MessageCircle },
  { label: '小组风采', href: '#/members', icon: Users },
  { label: '比赛中心', href: '#/events', icon: Trophy },
  { label: 'AI 助手', href: '#/ai', icon: Bot },
  { label: '留言建议', href: '#/feedback', icon: Quote },
]

/* 校园实拍（原 campus-entrance.png 已在首页改版时替换为 public/assets/campus/campus-main.png） */

const categoryClass: Record<AnnouncementCategory, string> = {
  重要: 'badge-red',
  比赛: 'badge-orange',
  项目: 'badge-blue',
  讲座: 'badge-violet',
  通知: 'badge-slate',
}

function routeFromHash() {
  const encodedPath = window.location.hash.replace(/^#/, '') || '/home'
  let raw = encodedPath
  try { raw = decodeURIComponent(encodedPath) } catch { /* 保留无法解码的路径。 */ }
  if (raw.startsWith('story-') || raw === '' || raw === '/') {
    return '/home'
  }
  const clean = raw.replace(/\/$/, '')
  return clean.startsWith('/') ? clean : `/${clean}`
}

function navigate(path: string) {
  if (path.startsWith('#')) {
    window.location.hash = path.slice(1)
  } else if (path.startsWith('/')) {
    window.location.hash = path
  } else {
    window.location.hash = `/${path}`
  }
}


function projectCategoryLabel(categories: ProjectCategory[], key: string) {
  return categories.find((category) => category.key === key)?.label ?? key
}

function contentCategoryLabel(categories: ContentCategory[], key?: string) {
  if (!key) return '未分类'
  return categories.find((category) => category.key === key)?.label ?? key
}

// 资源类型枚举（后端 ResourceType）→ 中文展示名；历史数据里存过中文值时原样透出
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  article: '文档 / 文章',
  video: '视频',
  course: '课程',
  link: '链接',
  tool: '工具',
  repository: '代码仓库',
  file: '文件',
}

function resourceTypeLabel(type?: string) {
  if (!type) return '资源'
  return RESOURCE_TYPE_LABELS[type] ?? type
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('club-theme') as Theme | null
    return stored === 'dark' || stored === 'light' ? stored : 'light'
  } catch {
    return 'light'
  }
}

function getStoredBackgroundPreference(): BackgroundPreference {
  try {
    const stored = localStorage.getItem('club-background-preference') as BackgroundPreference | null
    return stored === 'follow' || stored === 'campus' || stored === 'mist' || stored === 'paper' || stored === 'custom' ? stored : 'paper'
  } catch {
    return 'paper'
  }
}

const MESSAGE_READ_STORAGE_KEY = 'club-message-read-v1'
const MESSAGE_HIDDEN_STORAGE_KEY = 'club-message-hidden-v1'

type MessageFilter = 'all' | 'unread' | 'review-pending' | 'review-results' | 'join-request'

function getMessageReadState(userId: string | number) {
  try {
    const stored = JSON.parse(localStorage.getItem(`${MESSAGE_READ_STORAGE_KEY}:${userId}`) ?? '{}')
    return stored && typeof stored === 'object' ? stored as Record<string, true> : {}
  } catch {
    return {}
  }
}

function setMessageReadState(userId: string | number, state: Record<string, true>) {
  try { localStorage.setItem(`${MESSAGE_READ_STORAGE_KEY}:${userId}`, JSON.stringify(state)) } catch { /* Storage may be unavailable. */ }
  window.dispatchEvent(new Event('club-messages-state'))
}

type MessageStateChangeDetail = {
  userId?: string | number
  unreadCount?: number
}

function dispatchMessageStateChange(detail?: MessageStateChangeDetail) {
  window.dispatchEvent(new CustomEvent<MessageStateChangeDetail>('club-messages-state', { detail }))
}

function markMessagesRead(userId: string | number, messageIds: string[]) {
  const state = getMessageReadState(userId)
  messageIds.forEach((id) => { state[id] = true })
  setMessageReadState(userId, state)
}

function getHiddenMessageState(userId: string | number) {
  try {
    const stored = JSON.parse(localStorage.getItem(`${MESSAGE_HIDDEN_STORAGE_KEY}:${userId}`) ?? '{}')
    return stored && typeof stored === 'object' ? stored as Record<string, true> : {}
  } catch {
    return {}
  }
}

function hideMessage(userId: string | number, messageId: string) {
  hideMessages(userId, [messageId])
}

function hideMessages(userId: string | number, messageIds: string[]) {
  const state = getHiddenMessageState(userId)
  messageIds.forEach((id) => { state[id] = true })
  try { localStorage.setItem(`${MESSAGE_HIDDEN_STORAGE_KEY}:${userId}`, JSON.stringify(state)) } catch { /* Storage may be unavailable. */ }
  window.dispatchEvent(new Event('club-messages-state'))
}

function projectStatusMessageId(project: Pick<Project, 'id' | 'reviewStatus' | 'reviewedAt' | 'updatedAt'>) {
  return `project-status:${project.id}:${project.reviewStatus ?? 'pending'}:${project.reviewedAt ?? project.updatedAt ?? ''}`
}

function projectJoinRequestMessageId(request: Pick<ProjectJoinRequest, 'id'>) {
  return `project-join-request:${request.id}`
}

function projectJoinRequestResultMessageId(request: Pick<ProjectJoinRequest, 'id' | 'status' | 'reviewedAt' | 'updatedAt'>) {
  return `project-join-result:${request.id}:${request.status}:${request.reviewedAt ?? request.updatedAt ?? ''}`
}

function projectReviewMessageId(project: Pick<Project, 'id' | 'createdAt'>) {
  return `project-review:${project.id}:${project.createdAt ?? ''}`
}

function resourceSubmissionMessageId(submission: Pick<ContributionSubmission, 'id' | 'status' | 'version' | 'submittedAt'> & { reviewedAt?: string }) {
  return `resource-submission:${submission.id}:${submission.status}:${submission.version ?? 1}:${submission.reviewedAt ?? submission.submittedAt}`
}

function interviewSubmissionMessageId(submission: Pick<InterviewSubmission, 'id' | 'status' | 'version' | 'submittedAt' | 'reviewedAt'>) {
  return `interview-submission:${submission.id}:${submission.status}:${submission.version ?? 1}:${submission.reviewedAt ?? submission.submittedAt}`
}

function feedbackMessageId(feedback: Pick<FeedbackMessage, 'id'>) {
  return `feedback:${feedback.id}`
}

function Icon({ name, size = 18, strokeWidth = 1.9 }: { name: string; size?: number; strokeWidth?: number }) {
  const Component = iconMap[name] || Sparkles
  return <Component size={size} strokeWidth={strokeWidth} aria-hidden="true" />
}

function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow?: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action && <button className="text-button" onClick={onAction}>{action}<ArrowUpRight size={14} /></button>}
    </div>
  )
}


function Navbar({ route, theme, onTheme, onSearch, mobileOpen, setMobileOpen, backgroundPreference, onBackgroundPreferenceChange, backgroundImage, onBackgroundImageChange }: { route: string; theme: Theme; onTheme: () => void; onSearch: () => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void; backgroundPreference: BackgroundPreference; onBackgroundPreferenceChange: (value: BackgroundPreference) => void; backgroundImage: string | null; onBackgroundImageChange: (value: string | null) => void }) {
  const { user, signOut } = useAuth()
  const { data: { projects }, listProjectReviewQueue } = useContent()
  const activeUser = user && user.status !== 'disabled' && user.status !== 'closed' ? user : null
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationItems, setNotificationItems] = useState<Array<{ id: string; label: string; detail: string; count: number }>>([])
  const notificationRefreshVersion = useRef(0)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [closeAccountOpen, setCloseAccountOpen] = useState(false)
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false)
  const notificationTotal = notificationItems.reduce((total, item) => total + item.count, 0)

  useEffect(() => { setProfileOpen(false) }, [route])

  const handleThemeToggle = () => {
    onTheme()
    if (isRemoteSettingsEnabled && activeUser) {
      void updateUserPreferences({ theme: theme === 'light' ? 'dark' : 'light' }).catch(() => undefined)
    }
  }

  const refreshNotifications = useCallback(async () => {
    const refreshVersion = notificationRefreshVersion.current + 1
    notificationRefreshVersion.current = refreshVersion
    if (!activeUser || activeUser.role === 'Visitor') {
      setNotificationItems([])
      return
    }
    if (apiConfig.contentSource === 'api') {
      try {
        const unreadCount = await getMyUnreadNotificationCount()
        if (notificationRefreshVersion.current !== refreshVersion) return
        setNotificationItems(unreadCount > 0
          ? [{ id: 'saved-notifications', label: '站内通知', detail: '你有新的站内通知', count: unreadCount }]
          : [])
      } catch {
        setNotificationItems([])
      }
      return
    }
    const [ownerRequestsResult, myJoinRequestsResult, submissionsResult, myProjectsResult, notificationCountResult] = await Promise.allSettled([
      listOwnedProjectJoinRequests('pending'),
      listMyProjectJoinRequests(),
      listContributionSubmissions(),
      listMyProjectSubmissions(),
      getMyUnreadNotificationCount(),
    ])
    const readState = getMessageReadState(activeUser.id)
    const hiddenState = getHiddenMessageState(activeUser.id)
    const next: Array<{ id: string; label: string; detail: string; count: number }> = []
    const pendingRequests = new globalThis.Map<string, ProjectJoinRequest>()
    const ownedRequestIds = new Set<string>()
    const ownedProjectIds = new Set(projects.filter((project) => String(project.submittedBy ?? '') === String(activeUser.id)).map((project) => String(project.id)))
    if (ownerRequestsResult.status === 'fulfilled') {
      ownerRequestsResult.value.filter((request) => (
        (ownedProjectIds.size === 0 || ownedProjectIds.has(String(request.projectId)))
      )).forEach((request) => {
        pendingRequests.set(String(request.id), request)
        ownedRequestIds.add(String(request.id))
      })
    }
    if (myJoinRequestsResult.status === 'fulfilled') {
      const count = myJoinRequestsResult.value.filter((request) => (
        request.status !== 'pending'
        && !readState[projectJoinRequestResultMessageId(request)]
        && !hiddenState[projectJoinRequestResultMessageId(request)]
      )).length
      if (count) next.push({ id: 'join-results', label: '项目申请结果', detail: '你的项目加入申请有了处理结果', count })
    }
    if (submissionsResult.status === 'fulfilled') {
      const ownResultCount = submissionsResult.value.filter((submission) => (
        String(submission.submitterId) === String(activeUser.id)
        && ['approved', 'rejected', 'changes_requested'].includes(submission.status)
        && !readState[resourceSubmissionMessageId(submission)]
        && !hiddenState[resourceSubmissionMessageId(submission)]
      )).length
      if (ownResultCount) next.push({ id: 'resource-results', label: '资源投稿结果', detail: '你的资源投稿审核状态有更新', count: ownResultCount })
    }
    const projectsForStatus = myProjectsResult.status === 'fulfilled'
      ? [...myProjectsResult.value, ...projects]
      : projects
    const seenProjectIds = new Set<string>()
    const ownedProjectStatusCount = projectsForStatus.filter((project) => {
      if (String(project.submittedBy ?? '') !== String(activeUser.id)) return false
      const id = String(project.id)
      if (seenProjectIds.has(id)) return false
      seenProjectIds.add(id)
      return (
        ['approved', 'rejected'].includes(project.reviewStatus ?? '')
        && !readState[projectStatusMessageId(project)]
        && !hiddenState[projectStatusMessageId(project)]
      )
    }).length
    if (ownedProjectStatusCount) {
      next.push({ id: 'owned-project-status', label: '项目审核结果', detail: '你的项目审核状态有更新', count: ownedProjectStatusCount })
    }
    if (canAccessAdmin(activeUser)) {
      const [projectsResult, feedbackResult, joinRequestsResult] = await Promise.allSettled([
        listProjectReviewQueue(),
        canManageGlobalContent(activeUser) ? listFeedbackMessages({ status: 'pending' }) : Promise.resolve([]),
        listProjectJoinRequests('pending'),
      ])
      if (projectsResult.status === 'fulfilled') {
        const count = projectsResult.value.filter((project) => (
          project.reviewStatus === 'pending'
          && !readState[projectReviewMessageId(project)]
          && !hiddenState[projectReviewMessageId(project)]
        )).length
        if (count) next.push({ id: 'projects', label: '项目投稿审核', detail: '有项目等待审核', count })
      }
      if (submissionsResult.status === 'fulfilled') {
        const count = canManageGlobalContent(activeUser) ? submissionsResult.value.filter((submission) => (
          submission.status === 'pending'
          && !readState[resourceSubmissionMessageId(submission)]
          && !hiddenState[resourceSubmissionMessageId(submission)]
        )).length : 0
        if (count) next.push({ id: 'submissions', label: '资料投稿审核', detail: '有资料等待审核', count })
      }
      if (feedbackResult.status === 'fulfilled') {
        const count = feedbackResult.value.filter((message) => (
          (!message.status || message.status === 'pending')
          && !readState[feedbackMessageId(message)]
          && !hiddenState[feedbackMessageId(message)]
        )).length
        if (count) next.push({ id: 'feedback', label: '留言建议', detail: '有新的留言建议', count })
      }
      if (joinRequestsResult.status === 'fulfilled') {
        joinRequestsResult.value.forEach((request) => pendingRequests.set(String(request.id), request))
      }
    }
    const pendingRequestCount = [...pendingRequests.values()].filter((request) => (
      (apiConfig.contentSource !== 'api' || (canAccessAdmin(activeUser) && !ownedRequestIds.has(String(request.id))))
      &&
      !readState[projectJoinRequestMessageId(request)]
      && !hiddenState[projectJoinRequestMessageId(request)]
    )).length
    if (pendingRequestCount) next.push({ id: 'join-requests', label: '项目加入申请', detail: '有成员申请加入项目', count: pendingRequestCount })
    if (notificationCountResult.status === 'fulfilled' && notificationCountResult.value > 0) {
      next.push({ id: 'saved-notifications', label: '站内通知', detail: '你有新的站内通知', count: notificationCountResult.value })
    }
    if (notificationRefreshVersion.current === refreshVersion) setNotificationItems(next)
  }, [activeUser, listProjectReviewQueue, projects])

  useEffect(() => {
    void refreshNotifications()
    if (!activeUser || activeUser.role === 'Visitor') return undefined
    const timer = window.setInterval(() => void refreshNotifications(), 30000)
    return () => window.clearInterval(timer)
  }, [activeUser, refreshNotifications])

  useEffect(() => {
    const handleMessageStateChange = (event: Event) => {
      const detail = (event as CustomEvent<MessageStateChangeDetail>).detail
      if (detail?.userId !== undefined && activeUser && String(detail.userId) !== String(activeUser.id)) return
      if (typeof detail?.unreadCount === 'number') {
        // 已读操作已经得到后端确认，直接更新角标；同时让旧的查询结果失效，避免它把角标恢复。
        notificationRefreshVersion.current += 1
        setNotificationItems(detail.unreadCount > 0
          ? [{ id: 'saved-notifications', label: '站内通知', detail: '你有新的站内通知', count: detail.unreadCount }]
          : [])
        return
      }
      void refreshNotifications()
    }
    window.addEventListener('club-messages-state', handleMessageStateChange)
    return () => window.removeEventListener('club-messages-state', handleMessageStateChange)
  }, [activeUser, refreshNotifications])

  const handleSignOut = async () => {
    await signOut()
    setProfileOpen(false)
    setInviteOpen(false)
    setCloseAccountOpen(false)
    setAccountSettingsOpen(false)
    navigate('#/home')
  }

  const openMessages = () => {
    setProfileOpen(false)
    navigate('#/messages')
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
        <a href="#/home" className="brand" aria-label="回到首页">
          <picture>
            <source srcSet="./assets/college-logo-cropped.webp" type="image/webp" />
            <img className="brand-logo" src="./assets/college-logo-cropped.png" alt="南昌航空大学科技学院校徽" width="36" height="36" decoding="async" />
          </picture>
          <span className="brand-copy"><strong>南昌航空大学科技学院</strong><small>计算机科技小组 · Computer Science Club</small></span>
        </a>

        <nav className={`main-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="主导航">
          {navItems.map(({ label, href, icon: NavIcon }) => {
            const target = href.slice(1)
            const active = route === target || (target !== '/home' && route.startsWith(target))
            return <a key={href} href={href} className={`nav-link ${active ? 'active' : ''}`} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined}><NavIcon size={16} />{label}</a>
          })}
        </nav>

        <div className="topbar-actions">
          <button className="search-trigger" onClick={onSearch} aria-label="搜索内容"><Search size={16} /><span>搜索内容、项目、资源...</span><kbd>⌘K</kbd></button>
          <button className="icon-button theme-button" onClick={handleThemeToggle} aria-label={`当前主题：${theme === 'dark' ? '深色' : '浅色'}`} title="切换白天 / 夜间">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <div className="profile-menu-wrap">
            <button className={`profile-button ${profileOpen ? 'is-open' : ''} ${activeUser ? '' : 'is-guest'}`} onClick={() => setProfileOpen((open) => !open)} aria-label={activeUser ? (notificationTotal > 0 ? `打开个人菜单，${notificationTotal} 条消息` : '打开个人菜单') : '登录或注册'} title={activeUser ? '个人菜单' : '登录或注册'}><Avatar initials={activeUser?.initials ?? '访'} name={activeUser?.name} avatarUrl={activeUser?.avatarUrl} size="sm" />{activeUser && activeUser.role !== 'Visitor' && notificationTotal > 0 && <span className="profile-message-badge">{Math.min(99, notificationTotal)}{notificationTotal > 99 ? '+' : ''}</span>}{activeUser ? <ChevronDown size={14} /> : <span className="profile-button-label">登录 / 注册</span>}</button>
            {profileOpen && !activeUser && <div className="profile-menu profile-auth-menu" role="menu"><div className="profile-menu-head"><Avatar initials="访" size="md" /><div><strong>欢迎来到科技小组</strong><small>登录后管理个人资料和投稿</small></div></div><div className="profile-menu-rule" /><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); navigate('#/login') }}><LogIn size={15} /> 登录</button><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); navigate('#/login?mode=register') }}><UserPlus size={15} /> 注册账号</button></div>}
            {activeUser && profileOpen && <div className="profile-menu" role="menu">
              <div className="profile-menu-head"><Avatar initials={activeUser.initials} name={activeUser.name} avatarUrl={activeUser.avatarUrl} size="md" /><div><strong>{activeUser.name}</strong><small>{roleLabels[activeUser.role] ?? activeUser.role} · {activeUser.cohort} 届</small></div></div>
              <div className="profile-menu-rule" />
              {activeUser.role !== 'Visitor' && <button type="button" role="menuitem" className="profile-notification-trigger" onClick={openMessages} aria-label={notificationTotal ? `消息，${notificationTotal} 条待处理` : '消息'}>
                <Bell size={15} /><span>消息</span>{notificationTotal > 0 && <strong className="profile-notification-count">{Math.min(99, notificationTotal)}{notificationTotal > 99 ? '+' : ''}</strong>}
              </button>}
               <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); setAccountSettingsOpen(true) }}><UserCog size={15} /> 个人中心</button>
              {activeUser.role === 'Member' && <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); setInviteOpen(true) }}><KeyRound size={15} /> 输入邀请码</button>}
              {canAccessAdmin(activeUser) && <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); navigate('#/admin') }}><Settings2 size={15} /> 管理后台</button>}
              <button type="button" role="menuitem" onClick={() => void handleSignOut()}><LogOut size={15} /> 退出登录</button>
            </div>}
          </div>
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        </div>
      </header>
      {inviteOpen && <InviteRedemptionModal onClose={() => setInviteOpen(false)} />}
      {closeAccountOpen && <AccountClosureModal onClose={() => setCloseAccountOpen(false)} onClosed={() => { setCloseAccountOpen(false); navigate('#/home') }} />}
      {accountSettingsOpen && <AccountSettingsModal theme={theme} onTheme={handleThemeToggle} backgroundPreference={backgroundPreference} onBackgroundPreferenceChange={onBackgroundPreferenceChange} backgroundImage={backgroundImage} onBackgroundImageChange={onBackgroundImageChange} onClose={() => setAccountSettingsOpen(false)} onCloseAccount={() => { setAccountSettingsOpen(false); setCloseAccountOpen(true) }} />}
    </>
  )
}

function InviteRedemptionModal({ onClose }: { onClose: () => void }) {
  const { user, redeemInviteCode } = useAuth()
  const { data: { members }, createMember, updateMember, refresh } = useContent()
  const { currentCohort } = useClubConfig()
  const [inviteCode, setInviteCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!user) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!inviteCode.trim()) { setError('请输入邀请码'); return }
    setSubmitting(true)
    setError('')
    try {
      const nextUser = await redeemInviteCode(inviteCode)
      const cohortYear = nextUser.cohort.match(/\d{4}/)?.[0] ?? currentCohort?.year
      const cohort = cohortYear ? `${cohortYear} 届` : '待分配'
      const direction = nextUser.directions.find((item) => /算法|项目|网安|安全|cyber|ai|agent|模型/i.test(item)) ?? '待分配'
      const payload = { name: nextUser.name, role: '组员', cohort, direction, projects: [], initials: nextUser.initials, accent: accentForMemberDirection(direction) }
      if (isDemoAuth) {
        const existing = members.find((member) => member.id === nextUser.id)
        if (existing) await updateMember(existing.id, payload)
        else await createMember(payload)
      } else {
        await refresh()
      }
      setSuccess(cohortYear ? `邀请码验证成功，已加入 ${cohort} · ${direction}，成员账号和小组风采已同步。` : '邀请码验证成功，你现在拥有组员身份，届次和方向待管理员分配。')
      window.setTimeout(onClose, 1200)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '邀请码兑换失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="admin-modal-scrim invite-modal-scrim" role="presentation" onClick={onClose}><section className="admin-form-modal invite-modal" role="dialog" aria-modal="true" aria-labelledby="invite-redemption-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">MEMBERSHIP / INVITE</p><h2 id="invite-redemption-title">加入小组</h2><p>输入管理员发给你的邀请码，账号会升级为组员并同步到对应届次和方向。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭邀请码窗口"><X size={16} /></button></div><form className="invite-redemption-form" onSubmit={submit}><label><span>邀请码</span><input value={inviteCode} onChange={(event) => { setInviteCode(event.target.value.toUpperCase()); setError('') }} placeholder="例如 OS-7K4M-9Q2P" autoComplete="off" autoFocus /></label><div className="invite-redemption-hint"><KeyRound size={15} /><span>邀请码有有效期和使用次数限制，每个账号只能兑换一次。</span></div>{error && <p className="login-error" role="alert">{error}</p>}{success && <p className="login-success" role="status">{success}</p>}<div className="admin-modal-foot"><span>{user.name} · 当前为{roleLabels[user.role] ?? user.role}</span><div><button type="button" className="secondary-button admin-small-button" onClick={onClose}>取消</button><button type="submit" className="primary-button admin-small-button" disabled={submitting}>{submitting ? '验证中…' : '兑换邀请码'}</button></div></div></form><p className="invite-demo-note">{isDemoAuth ? '当前使用本地演示数据，兑换后会立即写入成员目录。' : '当前由后端验证邀请码并刷新成员目录。'}</p></section></div>
}

function ContributionSubmissionModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted?: () => void }) {
  const { user } = useAuth()
  const { data: { resourceCategories } } = useContent()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(resourceCategories.find((item) => item.enabled)?.key ?? '')
  const [resourceType, setResourceType] = useState<'article' | 'video' | 'course' | 'link' | 'tool' | 'repository' | 'file'>('article')
  const [accessMode, setAccessMode] = useState<'external_link' | 'attachment' | 'article'>('external_link')
  const [tags, setTags] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'members' | 'contributors'>('members')
  const [links, setLinks] = useState<ResourceLink[]>([])
  const [content, setContent] = useState('')
  const [uploadedAttachments, setUploadedAttachments] = useState<ResourceAttachment[]>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const localDraft = useLocalDraft({ ownerId: user?.id, scope: 'resource:new', value: { title, description, category, resourceType, accessMode, tags, visibility, links, content, uploadedAttachments }, ready: Boolean(user), onRestore: (saved) => { setTitle(saved.title); setDescription(saved.description); setCategory(saved.category); setResourceType(saved.resourceType); setAccessMode(saved.accessMode); setTags(saved.tags); setVisibility(saved.visibility); setLinks(saved.links); setContent(saved.content); setUploadedAttachments(saved.uploadedAttachments) }, sample: { title, description, category, resourceType, accessMode, tags, visibility, links: [{ title: '', url: '' }], content, uploadedAttachments: [{ name: '', url: '' }] } })
  const requestClose = () => { if (localDraft.confirmLeave()) onClose() }


  if (!user) return null

  const uploadSelectedFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    const validationError = validateResourceAttachmentFiles(files, uploadedAttachments.length)
    if (validationError) { setUploadError(validationError); return }
    setUploadingAttachments(true)
    setUploadError('')
    const results = await Promise.allSettled(files.map((file) => uploadAsset(file, { folder: 'resources' })))
    const completed = results.flatMap((result, index) => result.status === 'fulfilled' ? [{ assetId: result.value.id, name: result.value.name || files[index].name, url: result.value.url, mimeType: result.value.mimeType, size: result.value.size, sortOrder: uploadedAttachments.length + index }] : [])
    if (completed.length) setUploadedAttachments((current) => [...current, ...completed])
    const failures = results.filter((result) => result.status === 'rejected')
    if (failures.length) {
      const firstReason = failures[0].status === 'rejected' ? failures[0].reason : undefined
      setUploadError(firstReason instanceof Error ? firstReason.message : `${failures.length} 个文件上传失败，请重试`)
    }
    setUploadingAttachments(false)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !description.trim()) { setError('请填写资料标题和说明'); return }
    const resourceLinks = links.filter((link) => link.title.trim() || link.url.trim() || link.description?.trim()).map((link) => ({ title: link.title.trim(), url: link.url.trim(), description: link.description?.trim() || undefined }))
    if (accessMode === 'external_link' && !resourceLinks.length) { setError('请至少添加一个外部链接'); return }
    if (accessMode === 'external_link' && resourceLinks.some((link) => !link.title || !link.url)) { setError('请填写每条链接的名称和地址'); return }
    if (accessMode === 'attachment' && !uploadedAttachments.length) { setError('请至少上传一个附件'); return }
    if (uploadingAttachments) { setError('附件上传完成后再提交'); return }
    if (accessMode === 'article' && !content.trim()) { setError('请填写站内阅读正文'); return }
    setSubmitting(true)
    setError('')
    try {
      await createContributionSubmission({ submitterId: user.id, submitterName: user.name, title: title.trim(), description: description.trim(), category, resourceType, accessMode, tags: tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean), visibility, resourceUrl: accessMode === 'external_link' ? resourceLinks[0]?.url : undefined, links: accessMode === 'external_link' ? resourceLinks : undefined, attachments: accessMode === 'attachment' ? uploadedAttachments : undefined, content: content.trim() || undefined })
      localDraft.clear()
      setSuccess('投稿已提交，管理员审核通过后会进入资源库。')
      onSubmitted?.()
      window.setTimeout(onClose, 1400)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '投稿失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="admin-modal-scrim contribution-modal-scrim" role="presentation" onClick={requestClose}><section className="admin-editor-modal contribution-modal" role="dialog" aria-modal="true" aria-labelledby="contribution-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">RESOURCE / SUBMIT</p><h2 id="contribution-title">贡献一份资料</h2><p>提交的链接、附件或正文会原样进入审核，审核通过后才公开。</p></div><button className="icon-button small" onClick={requestClose} aria-label="关闭投稿窗口"><X size={16} /></button></div><form className="admin-editor-form" onSubmit={submit}><LocalDraftNotice draft={localDraft} /><label><span>资料标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：FastAPI 数据库连接笔记" autoFocus /></label><div className="admin-editor-form-grid"><label><span>资料分类</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{resourceCategories.filter((item) => item.enabled).map((item) => <option key={item.id} value={item.key}>{item.label}</option>)}</select></label><label><span>资源类型</span><select value={resourceType} onChange={(event) => setResourceType(event.target.value as typeof resourceType)}><option value="article">文档 / 文章</option><option value="video">视频</option><option value="course">课程</option><option value="link">链接</option><option value="tool">工具</option><option value="repository">代码仓库</option><option value="file">文件</option></select></label></div><div className="admin-editor-form-grid"><label><span>提供方式</span><select value={accessMode} onChange={(event) => setAccessMode(event.target.value as typeof accessMode)}><option value="external_link">外部链接</option><option value="attachment">上传附件</option><option value="article">站内阅读</option></select></label><label><span>建议可见范围</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}><option value="public">全站公开</option><option value="members">成员可见</option><option value="contributors">组员可见</option></select></label></div><label><span>资料说明</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="说明这份资料解决什么问题，适合谁使用" /></label>{accessMode === 'external_link' && <ResourceLinksEditor value={links} onChange={setLinks} />}{accessMode === 'attachment' && <div className="contribution-file-field"><label htmlFor="resource-contribution-files"><span>资源附件</span></label><input id="resource-contribution-files" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.md,.png,.jpg,.jpeg,.webp" multiple disabled={uploadingAttachments || apiConfig.contentSource !== 'api'} onChange={uploadSelectedFiles} /><small>{uploadingAttachments ? '正在上传附件，请稍候…' : apiConfig.contentSource === 'api' ? '最多 ' + MAX_RESOURCE_ATTACHMENTS + ' 个文件，单个不超过 20 MB' : '连接后端后可上传文件'}</small>{uploadError && <small className="admin-upload-error">{uploadError}</small>}{uploadedAttachments.length > 0 && <ul className="resource-upload-list">{uploadedAttachments.map((attachment, index) => <li className="resource-upload-item" key={attachment.assetId ?? attachment.url}><span><FileText size={14} /><span>{attachment.name}<small>{(attachment.size ?? 0) > 0 ? ((attachment.size ?? 0) / 1024 / 1024).toFixed(1) + ' MB' : '已上传'}</small></span></span><button type="button" className="admin-link-button admin-danger-link" onClick={() => setUploadedAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>移除</button></li>)}</ul>}</div>}{accessMode === 'article' && <label><span>站内正文</span><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={8} placeholder="输入将由后端保存的 Markdown 或纯文本正文" /></label>}<label><span>标签（逗号分隔）</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="FastAPI, 数据库, 入门" /></label>{error && <p className="login-error" role="alert">{error}</p>}{success && <p className="login-success" role="status">{success}</p>}<div className="admin-modal-foot"><span>投稿人：{user.name} · {roleLabels[user.role] ?? user.role}</span><div><button type="button" className="secondary-button admin-small-button" onClick={requestClose}>取消</button><button type="submit" className="primary-button admin-small-button" disabled={submitting}>{submitting ? '提交中…' : '提交审核'}</button></div></div></form></section></div>
}

function AccountClosureModal({ onClose, onClosed }: { onClose: () => void; onClosed: () => void }) {
  const { user, closeAccount } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  if (!user) return null

  const confirmClose = async () => {
    setSubmitting(true)
    setError('')
    try {
      await closeAccount()
      onClosed()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '注销失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-form-modal account-closure-modal" role="alertdialog" aria-modal="true" aria-labelledby="account-closure-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">ACCOUNT / CLOSE</p><h2 id="account-closure-title">注销当前账户？</h2><p>注销后会退出当前会话，账户不能再登录，状态将被标记为已注销。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭注销确认"><X size={16} /></button></div><div className="admin-note-card warning"><ShieldAlert size={15} /><div><strong>{user.email ?? user.name}</strong><p>这不是“退出登录”。退出登录只清除当前设备会话；注销会让账户本身失效。</p></div></div>{error && <p className="login-error" role="alert">{error}</p>}<div className="admin-modal-foot"><span>此操作不可在前端恢复</span><div><button className="secondary-button admin-small-button" onClick={onClose}>保留账户</button><button className="admin-danger-button admin-small-button" disabled={submitting} onClick={() => void confirmClose()}><Trash2 size={14} /> {submitting ? '注销中…' : '确认注销'}</button></div></div></section></div>
}

function FeedbackPage() {
  const [category, setCategory] = useState('功能建议')
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([])
  const [submitted, setSubmitted] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const chooseAttachments = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    if (apiConfig.contentSource !== 'api') {
      setError('当前是本地演示模式，连接后端后才能上传留言图片。')
      return
    }
    if (attachments.length + files.length > 3) {
      setError('最多上传 3 张留言图片。')
      return
    }
    const invalid = files.find((file) => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
    if (invalid) {
      setError(`${invalid.name} 格式不支持或超过 5 MB；支持 PNG、JPG 和 WebP。`)
      return
    }
    setUploading(true)
    setError('')
    try {
      const uploaded = await Promise.all(files.map((file) => uploadFeedbackAttachment(file)))
      setAttachments((current) => [...current, ...uploaded.map((asset) => ({ id: asset.id, assetId: asset.id, name: asset.name || '留言图片', url: asset.url, mimeType: asset.mimeType, size: asset.size }))])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '图片上传失败，请稍后重试。')
    } finally {
      setUploading(false)
    }
  }

  const removeAttachment = async (attachment: FeedbackAttachment) => {
    setAttachments((current) => current.filter((item) => item !== attachment))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = content.trim()
    if (!message) return
    setSubmitting(true)
    setError('')
    try {
      await createFeedbackMessage({ category, content: message, contact: contact.trim() || undefined, attachments })
      setContent('')
      setContact('')
      setAttachments([])
      setSubmitted(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '留言提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="page feedback-page"><PageIntro eyebrow="COMMUNITY / FEEDBACK" title="留言建议" description="无论是否登录，都可以把想法、问题和改进建议告诉我们。" /><div className="feedback-layout"><section className="panel feedback-card"><div className="feedback-card-head"><div><p className="eyebrow">WRITE TO THE CLUB</p><h2>一起把小组变得更好</h2><p>建议会交给管理员整理，联系方式仅用于需要回复时联系你。</p></div><span className="feedback-mark"><Quote size={22} /></span></div><form className="feedback-form" onSubmit={(event) => void submit(event)}><label><span>留言类型</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>功能建议</option><option>内容纠错</option><option>体验反馈</option><option>其他留言</option></select></label><label><span>你的建议</span><textarea value={content} onChange={(event) => { setContent(event.target.value); setSubmitted(false); setError('') }} rows={7} maxLength={1000} placeholder="说说你希望新增、修改或改进的地方" required /><small>{content.length} / 1000</small></label><div className="feedback-attachment-field"><div className="feedback-attachment-head"><span>问题截图（可选）</span><small>最多 3 张，每张不超过 5 MB</small></div><label className="feedback-upload-button"><ImagePlus size={15} /> {uploading ? '上传中…' : '添加图片'}<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={uploading || submitting} onChange={(event) => void chooseAttachments(event)} /></label>{attachments.length > 0 && <div className="feedback-attachment-list">{attachments.map((attachment) => <div className="feedback-attachment-preview" key={attachment.assetId ?? attachment.url}><img src={attachment.url} alt={attachment.name} /><span title={attachment.name}>{attachment.name}</span><button type="button" onClick={() => void removeAttachment(attachment)} aria-label={`移除${attachment.name}`}><X size={13} /></button></div>)}</div>}<small className="feedback-attachment-hint">图片只用于帮助管理员理解问题，提交后 30 天自动清理，文字留言不会删除。</small></div><label><span>联系方式（可选）</span><input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="邮箱或其他联系方式" /></label>{error && <p className="login-error" role="alert">{error}</p>}{submitted && <p className="feedback-success" role="status"><CheckCircle2 size={15} /> 留言已收到，感谢你的参与。</p>}<button className="primary-button" type="submit" disabled={submitting || uploading}><Send size={15} /> {submitting ? '提交中…' : '提交留言'}</button></form></section><aside className="panel feedback-aside"><span className="feedback-aside-icon"><Users size={18} /></span><h3>每一条建议都会被看见</h3><p>可以告诉我们你遇到的问题，也可以提出新的栏目、内容或功能想法。</p><div className="feedback-topics"><span><Check size={13} /> 功能建议</span><span><Check size={13} /> 内容纠错</span><span><Check size={13} /> 使用体验</span></div></aside></div></div>
}

function ProjectSubmissionModal({ categories, onClose, project, onUpdated }: { categories: ProjectCategory[]; onClose: () => void; project?: Project; onUpdated?: (project: Project) => void }) {
  const { user } = useAuth()
  const { createProject } = useContent()
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [intro, setIntro] = useState(project?.intro ?? '')
  const [stack, setStack] = useState(project?.stack.join(', ') ?? '')
  const [status, setStatus] = useState<Project['status']>(project?.status ?? '维护中')
  const [difficulty, setDifficulty] = useState(project?.difficulty ?? 1)
  const [category, setCategory] = useState(project?.category ?? categories.find((item) => item.enabled)?.key ?? '')
  const [githubUrl, setGithubUrl] = useState(project?.githubUrl ?? '')
  const [docsUrl, setDocsUrl] = useState(project?.docsUrl ?? '')
  const [demoUrl, setDemoUrl] = useState(project?.demoUrl ?? '')
  const [issueUrl, setIssueUrl] = useState(project?.issueUrl ?? '')
  const [downloadUrl, setDownloadUrl] = useState(project?.downloadUrl ?? '')
  const [joinEnabled, setJoinEnabled] = useState(project?.joinEnabled ?? false)
  const [joinNote, setJoinNote] = useState(project?.joinNote ?? '')
  const [coverImage, setCoverImage] = useState(project?.coverImage ?? '')
  const [galleryImages, setGalleryImages] = useState<string[]>(project?.galleryImages ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const localDraft = useLocalDraft({ ownerId: user?.id, scope: `project:${project?.id ?? 'new'}`, value: { name, description, intro, stack, status, difficulty, category, githubUrl, docsUrl, demoUrl, issueUrl, downloadUrl, joinEnabled, joinNote, coverImage, galleryImages }, ready: Boolean(user), onRestore: (saved) => { setName(saved.name); setDescription(saved.description); setIntro(saved.intro); setStack(saved.stack); setStatus(saved.status); setDifficulty(saved.difficulty); setCategory(saved.category); setGithubUrl(saved.githubUrl); setDocsUrl(saved.docsUrl); setDemoUrl(saved.demoUrl); setIssueUrl(saved.issueUrl); setDownloadUrl(saved.downloadUrl); setJoinEnabled(saved.joinEnabled); setJoinNote(saved.joinNote); setCoverImage(saved.coverImage); setGalleryImages(saved.galleryImages) } })
  const requestClose = () => { if (localDraft.confirmLeave()) onClose() }


  useEffect(() => {
    if (!category && categories.length) setCategory(categories.find((item) => item.enabled)?.key ?? categories[0].key)
  }, [categories, category])

  const readImage = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('图片读取失败，请重新选择'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })

  const uploadProjectImage = async (file: File, alt: string) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('请上传 PNG、JPG 或 WebP 图片，且单张不超过 10 MB')
    if (apiConfig.contentSource === 'api') return (await uploadAsset(file, { folder: 'projects', alt })).url
    return readImage(file)
  }

  const chooseCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try { setCoverImage(await uploadProjectImage(file, name.trim() || '项目封面')); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : '封面图片处理失败') }
  }

  const chooseGallery = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 5 - galleryImages.length))
    event.target.value = ''
    if (!files.length) return
    try {
      const images = await Promise.all(files.map((file, index) => uploadProjectImage(file, `${name.trim() || '项目'}展示图 ${index + 1}`)))
      setGalleryImages((current) => [...current, ...images].slice(0, 5))
      setError('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : '展示图片处理失败') }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = name.trim()
    const summary = description.trim()
    if (!title || !summary) { setError('请填写项目名称和项目简介'); return }
    const stackItems = stack.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
    if (!stackItems.length) { setError('请至少填写一项技术栈'); return }
    try {
      const repository = new URL(githubUrl.trim())
      if (!['github.com', 'www.github.com'].includes(repository.hostname.toLowerCase()) || !repository.pathname.split('/').filter(Boolean).length) throw new Error()
    } catch { setError('请填写有效的 GitHub 仓库地址'); return }
    if (!coverImage) { setError('请上传一张项目封面'); return }
    setBusy(true)
    setError('')
    try {
      const projectFields = {
        name: title,
        slug: project?.slug ?? `${title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-').replace(/^-|-$/g, '') || 'project'}-${Date.now()}`,
        description: summary,
        intro: intro.trim() || summary,
        githubUrl: githubUrl.trim(),
        docsUrl: docsUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        issueUrl: issueUrl.trim() || undefined,
        downloadUrl: downloadUrl.trim() || undefined,
        coverImage,
        galleryImages,
        stack: stackItems,
        status,
        difficulty: Math.min(5, Math.max(1, difficulty)),
        year: project?.year ?? new Date().getFullYear(),
        category: category || 'other',
        joinEnabled,
        joinNote: joinNote.trim() || undefined,
      }

      if (project) {
        const updatedProject = await resubmitProject(project.id, projectFields)
        onUpdated?.(updatedProject)
      } else {
        await createProject({
          ...projectFields,
          members: 1,
          stars: 0,
          accent: 'blue',
          icon: 'rocket',
          featured: false,
          visibility: 'members',
          reviewStatus: 'pending',
          memberIds: user ? [user.id] : [],
        })
      }
      localDraft.clear()
      setSuccess(true)
      window.setTimeout(onClose, 1000)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '项目提交失败，请稍后重试')
    } finally { setBusy(false) }
  }

  return <div className="admin-modal-scrim" role="presentation" onClick={requestClose}><section className="admin-editor-modal project-submission-modal" role="dialog" aria-modal="true" aria-labelledby="project-submission-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">PROJECTS / SUBMIT</p><h2 id="project-submission-title">{project ? '修改项目并重新提交' : '提交一个项目'}</h2><p>{project ? '根据审核意见修改项目内容，重新提交后会再次进入审核。' : '填写可访问的代码地址和展示图片，提交后会进入管理员审核。'}</p></div><button className="icon-button small" onClick={requestClose} aria-label="关闭项目提交"><X size={16} /></button></div><form className="admin-editor-form" onSubmit={submit}><LocalDraftNotice draft={localDraft} /><div className="project-submit-section"><div className="project-submit-section-head"><span>01</span><div><strong>基础信息</strong><small>让大家先了解你的项目</small></div></div><label><span>项目名称</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：校园智能助手" autoFocus /></label><label><span>一句话简介</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="用一两句话说明项目解决什么问题" /></label><label><span>项目详细介绍 <small>可选</small></span><textarea value={intro} onChange={(event) => setIntro(event.target.value)} rows={4} placeholder="补充背景、主要功能、使用方式和当前进展" /></label><div className="admin-editor-form-grid"><label><span>项目分类</span>{categories.length ? <select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.filter((item) => item.enabled).map((item) => <option key={item.id} value={item.key}>{item.label}</option>)}</select> : <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="项目分类" />}</label><label><span>技术栈 <em>必填</em></span><input value={stack} onChange={(event) => setStack(event.target.value)} placeholder="Python, FastAPI, React" /></label></div><label><span>项目状态</span><select value={status} onChange={(event) => setStatus(event.target.value as Project['status'])}><option value="招募中">进行中</option><option value="维护中">维护中</option><option value="已归档">已归档</option></select></label>
<label><span>项目难度</span><div className="project-submit-difficulty" role="radiogroup" aria-label="项目难度"><span className="project-submit-difficulty-stars">{Array.from({ length: 5 }, (_, index) => <button type="button" key={index} className={index < difficulty ? 'active' : ''} onClick={() => setDifficulty(index + 1)} aria-label={'设置为 ' + (index + 1) + ' 级'}><Star size={16} fill={index < difficulty ? 'currentColor' : 'none'} /></button>)}</span><small>{['未设置', '入门', '基础', '进阶', '熟练', '挑战'][difficulty]}难度</small></div></label></div><div className="project-submit-section"><div className="project-submit-section-head"><span>02</span><div><strong>项目入口</strong><small>至少提供一个可访问的 GitHub 仓库</small></div></div><label><span>GitHub 仓库地址 <em>必填</em></span><input type="url" value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/组织名/项目名" required /></label><div className="admin-editor-form-grid"><label><span>项目文档地址 <small>可选</small></span><input type="url" value={docsUrl} onChange={(event) => setDocsUrl(event.target.value)} placeholder="https://..." /></label><label><span>在线演示地址 <small>可选</small></span><input type="url" value={demoUrl} onChange={(event) => setDemoUrl(event.target.value)} placeholder="https://..." /></label></div><div className="admin-editor-form-grid"><label><span>Issue / 反馈地址 <small>可选</small></span><input type="url" value={issueUrl} onChange={(event) => setIssueUrl(event.target.value)} placeholder="https://github.com/.../issues" /></label><label><span>项目文件下载地址 <small>可选</small></span><input type="url" value={downloadUrl} onChange={(event) => setDownloadUrl(event.target.value)} placeholder="ZIP、安装包或其他文件地址" /></label></div></div><div className="project-submit-section"><div className="project-submit-section-head"><span>03</span><div><strong>项目展示</strong><small>封面必填，最多添加 5 张展示图</small></div></div><div className="project-submit-image-grid"><div className="project-submit-cover"><div className="project-submit-image-preview">{coverImage ? <img src={coverImage} alt="项目封面预览" /> : <ImagePlus size={22} />}</div><input id="project-submit-cover" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void chooseCover(event)} /><label htmlFor="project-submit-cover" className="secondary-button admin-small-button"><ImagePlus size={14} /> {coverImage ? '更换封面' : '上传封面'}</label></div><div className="project-submit-gallery"><div className="project-submit-thumbs">{galleryImages.map((image, index) => <div className="project-submit-thumb" key={`${image}-${index}`}><img src={image} alt={`展示图 ${index + 1}`} /><button type="button" className="icon-button small" onClick={() => setGalleryImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} aria-label={`删除展示图 ${index + 1}`}><X size={13} /></button></div>)}<label className="project-submit-add" htmlFor="project-submit-gallery" aria-label="添加展示图片"><Plus size={19} /><span>添加展示图</span></label></div><input id="project-submit-gallery" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => void chooseGallery(event)} /></div></div></div><div className="project-submit-section"><div className="project-submit-section-head"><span>04</span><div><strong>项目协作</strong><small>是否接受其他成员加入</small></div></div><label className="admin-check-field"><input type="checkbox" checked={joinEnabled} onChange={(event) => setJoinEnabled(event.target.checked)} /><span>开放项目加入申请</span></label>{joinEnabled && <label><span>加入说明 <small>可选</small></span><input value={joinNote} onChange={(event) => setJoinNote(event.target.value)} placeholder="例如：欢迎熟悉前端和后端的成员参与" /></label>}</div>{error && <p className="login-error" role="alert">{error}</p>}{success && <p className="login-success" role="status">{project ? '项目已修改并重新提交，等待管理员审核。' : '项目已提交，等待管理员审核。'}</p>}<div className="admin-modal-foot"><span>{user?.name} · 待审核</span><div><button type="button" className="secondary-button admin-small-button" onClick={requestClose}>取消</button><button type="submit" className="primary-button admin-small-button" disabled={busy || success}>{busy ? '提交中…' : project ? '重新提交审核' : '提交项目'}</button></div></div></form></section></div>
}

type AccountSettingsTab = 'profile' | 'favorites' | 'submissions' | 'security' | 'appearance'

function AccountSettingsModal({ onClose, onCloseAccount, theme, onTheme, backgroundPreference, onBackgroundPreferenceChange, backgroundImage, onBackgroundImageChange }: { onClose: () => void; onCloseAccount: () => void; theme: Theme; onTheme: () => void; backgroundPreference: BackgroundPreference; onBackgroundPreferenceChange: (value: BackgroundPreference) => void; backgroundImage: string | null; onBackgroundImageChange: (value: string | null) => void }) {
  const { user, updateProfile, changePassword } = useAuth()
  const [tab, setTab] = useState<AccountSettingsTab>('profile')
  const { data: contentData, updateMemberProfileInCache } = useContent()
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [mySubmissions, setMySubmissions] = useState<ContributionSubmission[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [submissionsError, setSubmissionsError] = useState('')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [myFavorites, setMyFavorites] = useState<FavoriteRecord[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [favoritesError, setFavoritesError] = useState('')
  const removeMySubmission = async (submission: ContributionSubmission) => {
    if (!window.confirm(`确定删除“${submission.title}”这条投稿记录吗？`)) return
    try {
      await deleteContributionSubmission(submission.id)
      setMySubmissions((items) => items.filter((item) => item.id !== submission.id))
      setMessage('投稿记录已删除')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '投稿记录删除失败，请稍后重试')
    }
  }
  useEffect(() => {
    if (tab !== 'submissions') return
    setSubmissionsLoading(true)
    setSubmissionsError('')
    if (!user?.id) {
      setMyProjects([])
      setMySubmissions([])
      setSubmissionsLoading(false)
      return
    }

    void Promise.allSettled([
      listMyProjectSubmissions(),
      listContributionSubmissions(),
    ]).then(([projectsResult, resourcesResult]) => {
      const errors: string[] = []

      if (projectsResult.status === 'fulfilled') {
        setMyProjects(projectsResult.value.filter((project) => String(project.submittedBy ?? '') === String(user.id)))
      } else {
        setMyProjects([])
        errors.push('项目投稿暂时无法加载')
      }

      if (resourcesResult.status === 'fulfilled') {
        setMySubmissions(resourcesResult.value.filter((item) => String(item.submitterId) === String(user.id)))
      } else {
        setMySubmissions([])
        errors.push('资源投稿暂时无法加载')
      }

      setSubmissionsError(errors.join('；'))
    }).finally(() => setSubmissionsLoading(false))
  }, [tab, user?.id])
  useEffect(() => {
    if (tab !== 'favorites') return
    setFavoritesLoading(true)
    setFavoritesError('')
    void listFavorites(user?.id).then(setMyFavorites).catch((reason) => {
      setMyFavorites([])
      setFavoritesError(reason instanceof Error ? reason.message : '收藏列表暂时无法加载')
    }).finally(() => setFavoritesLoading(false))
  }, [tab, user?.id])
  const [profileName, setProfileName] = useState(user?.name ?? '')
  const [profileBio, setProfileBio] = useState(user?.bio ?? '')
  const [profileAvatar, setProfileAvatar] = useState(user?.avatarUrl ?? null)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [themeDraft, setThemeDraft] = useState(theme)
  const [backgroundDraft, setBackgroundDraft] = useState<BackgroundPreference>(backgroundPreference)
  const [backgroundImageDraft, setBackgroundImageDraft] = useState(backgroundImage)
  const [backgroundAssetId, setBackgroundAssetId] = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [backgroundBusy, setBackgroundBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Keep the draft in step with the app shell when another settings surface
  // changes the preference while this modal is open.
  useEffect(() => {
    setThemeDraft(theme)
    setBackgroundDraft(backgroundPreference)
    setBackgroundImageDraft(backgroundImage)
  }, [theme, backgroundPreference, backgroundImage])

  if (!user) return null

  const favoriteEntries = myFavorites.map((favorite) => {
    const item = favorite.targetType === 'project'
      ? contentData.projects.find((value) => favoriteTargetMatches(favorite, 'project', value.id))
      : favorite.targetType === 'resource'
        ? contentData.resources.find((value) => favoriteTargetMatches(favorite, 'resource', value.id))
        : favorite.targetType === 'interview'
          ? contentData.interviews.find((value) => favoriteTargetMatches(favorite, 'interview', value.id))
          : contentData.prompts.find((value) => favoriteTargetMatches(favorite, 'prompt', value.id))
    if (!item) return null
    const title = favorite.targetType === 'project' ? (item as Project).name : favorite.targetType === 'resource' ? (item as Resource).title : favorite.targetType === 'interview' ? `${(item as InterviewExperience).company} · ${(item as InterviewExperience).role}` : (item as PromptTemplate).title
    const detail = favorite.targetType === 'project' ? '项目库' : favorite.targetType === 'resource' ? '资源库' : favorite.targetType === 'interview' ? '面经墙' : 'Prompt 模板库'
    const path = favorite.targetType === 'project' ? `#/projects/${(item as Project).slug}` : favorite.targetType === 'prompt' ? '#/resources/prompts' : favorite.targetType === 'resource' ? '#/resources' : '#/interviews'
    return { key: `${favorite.targetType}-${favorite.targetId}`, title, detail, path }
  }).filter((item): item is { key: string; title: string; detail: string; path: string } => Boolean(item))

  const resetFeedback = () => { setMessage(''); setError('') }
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    resetFeedback()
    if (!isSupportedImage(file, MAX_LOCAL_AVATAR_BYTES)) { setError('请上传 PNG、JPG 或 WebP 头像，且大小不超过 5 MB'); event.target.value = ''; return }
    setAvatarBusy(true)
    if (!isDemoAuth) {
      try {
        const asset = await uploadAsset(file, { folder: 'avatars', alt: profileName.trim() || '成员头像' })
        setProfileAvatar(asset.url)
        setMessage('头像已上传，点击保存资料后生效')
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : '头像上传失败，请稍后重试')
      } finally {
        setAvatarBusy(false)
        event.target.value = ''
      }
      return
    }
    const reader = new FileReader()
    reader.onerror = () => { setError('头像读取失败，请重新选择文件'); setAvatarBusy(false) }
    reader.onload = () => { setProfileAvatar(String(reader.result)); setMessage('头像已载入预览，点击保存资料后生效'); setAvatarBusy(false); event.target.value = '' }
    reader.readAsDataURL(file)
  }
  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    resetFeedback()
    if (!isSupportedImage(file, MAX_LOCAL_IMAGE_BYTES)) { setError('请上传 PNG、JPG 或 WebP 图片，且大小不超过 10 MB'); event.target.value = ''; return }
    setBackgroundBusy(true)
    if (!isDemoAuth) {
      try {
        const asset = await uploadAsset(file, { folder: 'backgrounds', alt: '成员个人背景' })
        setBackgroundImageDraft(asset.url)
        setBackgroundAssetId(asset.id)
        setBackgroundDraft('custom')
        setMessage('背景图片已上传，点击保存外观后生效')
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : '背景图片上传失败，请稍后重试')
      } finally {
        setBackgroundBusy(false)
        event.target.value = ''
      }
      return
    }
    const reader = new FileReader()
    reader.onerror = () => { setError('背景图片读取失败，请重新选择文件'); setBackgroundBusy(false) }
    reader.onload = () => { setBackgroundImageDraft(String(reader.result)); setBackgroundDraft('custom'); setMessage('背景图片已载入预览，点击保存外观后生效'); setBackgroundBusy(false); event.target.value = '' }
    reader.readAsDataURL(file)
  }
  const saveProfile = async () => {
    const name = profileName.trim()
    const bio = profileBio.trim()
    resetFeedback()
    if (!name) { setError('请填写显示姓名'); return }
    if (name.length > 50) { setError('显示姓名不能超过 50 个字符'); return }
    if (bio.length > 500) { setError('个人简介不能超过 500 个字符'); return }
    setSaving(true)
    try {
      const updatedUser = await updateProfile({ name, initials: initialsFromName(name), avatarUrl: profileAvatar ?? undefined, bio })
      updateMemberProfileInCache(updatedUser.id, { name: updatedUser.name, initials: initialsFromName(updatedUser.name), avatarUrl: updatedUser.avatarUrl })
      setMessage('个人资料已保存')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '资料保存失败，请稍后重试')
    } finally { setSaving(false) }
  }
  const saveSecurity = async () => {
    resetFeedback()
    if (!currentPassword || !newPassword || !confirmPassword) { setError('请完整填写密码字段'); return }
    if (newPassword.length < 8 || newPassword.length > 128) { setError('新密码长度应为 8 到 128 位'); return }
    if (newPassword !== confirmPassword) { setError('两次输入的新密码不一致'); return }
    setSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordVisible(false)
      setMessage('密码已更新，请使用新密码登录')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '密码修改失败，请稍后重试')
    } finally { setSaving(false) }
  }
  const saveAppearance = async () => {
    resetFeedback()
    if (backgroundDraft === 'custom' && !backgroundImageDraft) { setError('请先上传一张自定义背景图片'); return }
    setSaving(true)
    // Apply locally before waiting for the network so every page in this tab
    // updates immediately. The server is a persistence layer, not a render
    // dependency; a temporary API outage must not undo the user's choice.
    if (themeDraft !== theme) onTheme()
    onBackgroundPreferenceChange(backgroundDraft)
    onBackgroundImageChange(backgroundDraft === 'custom' ? backgroundImageDraft : null)
    try {
      if (isRemoteSettingsEnabled) {
        await updateUserPreferences({
          theme: themeDraft,
          backgroundPreference: backgroundDraft,
          schoolBackgroundEnabled: backgroundDraft === 'follow',
          customBackgroundAssetId: backgroundDraft === 'custom' ? backgroundAssetId : null,
          customBackgroundUrl: backgroundDraft === 'custom' ? backgroundImageDraft : null,
        })
      }
      setMessage('主题与背景已保存')
    } catch (reason) {
      setMessage(`主题与背景已应用到当前设备，但服务器同步失败：${reason instanceof Error ? reason.message : '请稍后重试'}`)
      setError('')
    } finally { setSaving(false) }
  }
  const saveCurrent = () => { if (tab === 'profile') void saveProfile(); else if (tab === 'security') void saveSecurity(); else void saveAppearance() }
  const tabs: Array<{ id: AccountSettingsTab; label: string; icon: LucideIcon; hint: string }> = [
    { id: 'profile', label: '个人资料', icon: UserCog, hint: '姓名、简介与头像' },
    { id: 'favorites', label: '我的收藏', icon: Star, hint: '项目、资源和面经' },
    { id: 'submissions', label: '我的投稿', icon: Send, hint: '查看审核状态与意见' },
    { id: 'security', label: '密码与安全', icon: ShieldCheck, hint: '密码与登录安全' },
    { id: 'appearance', label: '主题与背景', icon: Palette, hint: '只影响当前账号' },
  ]
  const backgroundOptions: Array<{ id: BackgroundPreference; label: string; note: string }> = [
    { id: 'follow', label: '跟随日夜', note: '白天校园背景，夜间星空流星' },
    { id: 'mist', label: '雾蓝留白', note: '柔和通透，适合阅读' },
    { id: 'paper', label: '纸张留白', note: '干净克制，减少干扰' },
  ]

  return <><div className="admin-modal-scrim account-settings-scrim" role="presentation" onClick={onClose}><section className="account-settings-modal" role="dialog" aria-modal="true" aria-labelledby="account-settings-title" onClick={(event) => event.stopPropagation()}>
    <div className="account-settings-head"><div><p className="eyebrow">ACCOUNT / PROFILE</p><h2 id="account-settings-title">个人中心</h2><p>管理你的公开资料、投稿状态、登录安全和个人显示偏好。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭个人中心"><X size={16} /></button></div>
    <div className="account-settings-identity-banner"><div className="account-settings-identity-main"><Avatar initials={user.initials} name={user.name} avatarUrl={user.avatarUrl} accent="blue" size="lg" /><div><strong>{user.name}</strong><span>{user.email}</span></div></div><div className="account-settings-identity-meta"><span className="account-settings-status"><i />账号正常</span><small>{roleLabels[user.role] ?? user.role} · {user.cohort === '全站' ? '全站成员' : `${user.cohort} 届`}</small></div></div>
    <div className="account-settings-layout">
      <nav className="account-settings-nav" aria-label="账户设置分类">{tabs.map(({ id, label, icon: TabIcon, hint }) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => { setTab(id); resetFeedback() }}><span className="account-settings-nav-icon"><TabIcon size={16} /></span><span><strong>{label}</strong><small>{hint}</small></span><ChevronRight size={14} /></button>)}</nav>
      <div className="account-settings-panel">
        {tab === 'profile' && <div className="account-settings-section"><div className="account-settings-section-head"><div><p className="eyebrow">PUBLIC PROFILE</p><h3>让大家更了解你</h3><p>这些内容会出现在成员卡片、项目协作和操作记录中。</p></div></div><div className="account-profile-grid"><div className="account-avatar-editor"><label className="account-avatar-upload" htmlFor="account-avatar-upload">{profileAvatar ? <img src={profileAvatar} alt="头像预览" /> : <Avatar initials={user.initials} name={user.name} accent="blue" size="lg" />}<span><Camera size={13} /> {avatarBusy ? '上传中…' : '更换头像'}</span></label><input id="account-avatar-upload" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" disabled={avatarBusy} onChange={handleAvatarUpload} /><small>支持 PNG、JPG、WebP，最大 5 MB</small></div><div className="account-settings-fields"><label><span>显示姓名</span><input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="输入显示姓名" /></label><label><span>登录邮箱</span><input value={user.email} readOnly aria-readonly="true" /><small>邮箱是账号唯一标识，不能在这里修改。</small></label><label><span>个人简介</span><textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} rows={5} placeholder="介绍你的方向、职责或正在关注的主题" /></label></div></div><div className="account-settings-note account-profile-note"><UserCog size={15} /><span>届次和身份由小组管理员维护，个人资料只会更新你的公开展示信息。</span></div></div>}
        {tab === 'favorites' && <div className="account-settings-section"><div className="account-settings-section-head"><div><p className="eyebrow">SAVED CONTENT</p><h3>我的收藏</h3><p>把想回看的项目、资料、面经和 Prompt 集中放在这里。</p></div><span className="account-settings-security-mark"><Star size={20} /></span></div>{favoritesLoading ? <div className="empty-state account-submissions-empty"><RefreshCw size={21} className="spin" /><strong>正在加载收藏</strong><span>正在同步你的收藏记录。</span></div> : favoritesError ? <div className="empty-state account-submissions-empty"><CircleHelp size={21} /><strong>收藏列表暂不可用</strong><span>{favoritesError}</span></div> : favoriteEntries.length ? <div className="account-submission-list">{favoriteEntries.map((item) => <button type="button" className="account-favorite-row" key={item.key} onClick={() => { onClose(); navigate(item.path) }}><span className="account-favorite-icon"><Star size={16} fill="currentColor" /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowUpRight size={15} /></button>)}</div> : <div className="empty-state account-submissions-empty"><Star size={21} /><strong>还没有收藏</strong><span>在项目、资源、面经或 Prompt 卡片上点击“收藏”。</span></div>}<div className="account-settings-note"><Star size={15} /><span>收藏会跟随当前账号保存；API 模式需要后端提供收藏列表接口。</span></div></div>}
        {tab === 'security' && <div className="account-settings-section"><div className="account-settings-section-head"><div><p className="eyebrow">SECURITY / PASSWORD</p><h3>保护你的账号</h3><p>修改密码后，建议在其他设备重新登录。</p></div><span className="account-settings-security-mark"><ShieldCheck size={20} /></span></div><div className="account-settings-session"><span><Radio size={15} /><strong>当前会话</strong></span><div><b>此设备已登录</b><small>{user.email} · 账号状态正常</small></div><Tag tone="mint">安全</Tag></div><div className="account-settings-fields account-password-fields"><label><span>当前密码</span><div className="account-password-input"><input type={passwordVisible ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="输入当前密码" autoComplete="current-password" /><button type="button" onClick={() => setPasswordVisible((value) => !value)} aria-label={passwordVisible ? '隐藏密码' : '显示密码'}>{passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></label><label><span>新密码</span><input type={passwordVisible ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="至少 8 位字符" autoComplete="new-password" /></label><label><span>再次输入新密码</span><input type={passwordVisible ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="确认新密码" autoComplete="new-password" /></label></div><div className="account-settings-note"><ShieldCheck size={15} /><span>密码只会通过安全接口校验，页面不会显示或保存明文密码。</span></div></div>}
        {tab === 'submissions' && <div className="account-settings-section"><div className="account-settings-section-head"><div><p className="eyebrow">MY CONTRIBUTIONS</p><h3>我的投稿</h3><p>查看项目、资源和面经的审核状态与管理员意见。</p></div><span className="account-settings-security-mark"><Send size={20} /></span></div>{submissionsError && <p className="login-error" role="alert">{submissionsError}</p>}{submissionsLoading ? <div className="empty-state account-submissions-empty"><RefreshCw size={21} className="spin" /><strong>正在加载投稿</strong><span>正在同步你的投稿记录。</span></div> : <div className="account-submission-list">{myProjects.map((project) => <article className="account-submission-row" key={`project-${project.id}`}><div><div className="account-submission-title"><strong>{project.name}</strong><Tag tone={project.reviewStatus === 'approved' ? 'mint' : project.reviewStatus === 'rejected' ? 'red' : 'orange'}>{project.reviewStatus === 'approved' ? '已通过' : project.reviewStatus === 'rejected' ? '已退回' : '待审核'}</Tag></div><p>{project.description}</p><small>项目投稿 · {project.year} 届 · {project.category}</small>{project.reviewNote && <em>{project.reviewNote}</em>}</div>{project.reviewStatus === 'rejected' && <button type="button" className="secondary-button admin-small-button" onClick={() => setEditingProject(project)}>修改并重新提交</button>}</article>)}{mySubmissions.map((submission) => <article className="account-submission-row" key={submission.id}><div><div className="account-submission-title"><strong>{submission.title}</strong><Tag tone={submission.status === 'approved' ? 'mint' : submission.status === 'rejected' ? 'red' : submission.status === 'changes_requested' ? 'orange' : 'orange'}>{submission.status === 'approved' ? '已通过' : submission.status === 'rejected' ? '已退回' : submission.status === 'changes_requested' ? '待修改' : '待审核'}</Tag></div><p>{submission.description}</p><small>{submission.category} · {new Date(submission.submittedAt).toLocaleString('zh-CN')}</small>{submission.reviewNote && <em>{submission.reviewNote}</em>}</div><div className="account-submission-actions">{(submission.status === 'rejected' || submission.status === 'changes_requested') && <button type="button" className="secondary-button admin-small-button" onClick={() => setMessage('资料投稿修改入口已准备，后端需要支持 PATCH /api/contributions/{id} 后才能提交修改')}>修改并重新提交</button>}<button type="button" className="admin-link-button admin-danger-link" onClick={() => void removeMySubmission(submission)}><Trash2 size={13} /> 删除记录</button></div></article>)}{myProjects.length === 0 && mySubmissions.length === 0 && !submissionsError && <div className="empty-state account-submissions-empty"><Send size={21} /><strong>还没有投稿</strong><span>你提交的项目和资料会在这里显示审核状态。</span></div>}<section className="interview-account-section"><div><h4>面经投稿</h4><button type="button" className="text-button" onClick={() => { onClose(); navigate('#/interviews/my-submissions') }}>查看全部 <ArrowUpRight size={13} /></button></div><InterviewSubmissionRows onEdit={(id) => { onClose(); navigate(`#/interviews/submit/${encodeURIComponent(id)}`) }} /></section></div>}<div className="account-settings-note"><ShieldCheck size={15} /><span>项目和资源投稿读取当前账号的记录；面经投稿可在面经投稿页查看。</span></div></div>}
        {tab === 'appearance' && <div className="account-settings-section"><div className="account-settings-section-head"><div><p className="eyebrow">PERSONAL EXPERIENCE</p><h3>调整你的阅读环境</h3><p>个人设置会覆盖全局默认，不会影响其他成员。</p></div><span className="account-settings-security-mark"><Palette size={20} /></span></div><div className={`account-appearance-preview ${themeDraft} ${backgroundDraft}`}><div><span>当前预览</span><strong>你的工作台</strong><small>{backgroundDraft === 'follow' ? (themeDraft === 'dark' ? '夜间 · 静谧星空与流星' : '白天 · 校园晨曦') : backgroundDraft === 'custom' ? '个人背景图片' : backgroundOptions.find((option) => option.id === backgroundDraft)?.label}</small></div><span className="account-appearance-preview-dot" /></div><div className="account-theme-choice"><span>显示主题</span><div className="account-theme-options"><button type="button" className={themeDraft === 'light' ? 'active' : ''} onClick={() => setThemeDraft('light')}><Sun size={15} /> 白天</button><button type="button" className={themeDraft === 'dark' ? 'active' : ''} onClick={() => setThemeDraft('dark')}><Moon size={15} /> 夜间</button></div></div><div className="account-background-heading"><div><strong>页面背景</strong><small>{themeDraft === 'dark' ? '夜间主题会自动使用静谧星空和流星效果。' : '选择你希望在页面中看到的背景。'}</small></div></div><div className="account-background-options">{backgroundOptions.map((option) => <button type="button" key={option.id} className={backgroundDraft === option.id ? 'active' : ''} onClick={() => setBackgroundDraft(option.id)}><span className={`account-background-swatch ${option.id}`} /><span><strong>{option.label}</strong><small>{option.note}</small></span>{backgroundDraft === option.id && <CheckCircle2 size={15} />}</button>)}</div><div className={`account-custom-background ${backgroundDraft === 'custom' ? 'active' : ''}`}><span className="account-custom-background-preview">{backgroundImageDraft ? <img src={backgroundImageDraft} alt="自定义背景预览" /> : <ImagePlus size={19} />}</span><div><strong>{backgroundImageDraft ? '已选择自定义背景' : '上传自己的背景图片'}</strong><small>图片只对当前账号生效，建议使用横向图片。</small></div><input id="account-background-upload" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" disabled={backgroundBusy} onChange={handleBackgroundUpload} /><label className="secondary-button admin-small-button" htmlFor="account-background-upload">{backgroundBusy ? '上传中…' : '选择图片'}</label></div></div>}
      </div>
    </div>
    {(error || message) && <div className={`account-settings-feedback ${error ? 'error' : 'success'}`} role={error ? 'alert' : 'status'}>{error || message}</div>}
    <div className="account-settings-foot"><button type="button" className="account-close-button" onClick={onCloseAccount}><Trash2 size={14} /> 注销账户</button><div><button type="button" className="secondary-button admin-small-button" onClick={onClose}>关闭</button><button type="button" className="primary-button admin-small-button" disabled={tab === 'favorites' || saving || avatarBusy || backgroundBusy} onClick={saveCurrent}>{tab === 'favorites' ? '无需保存' : saving ? '保存中…' : tab === 'profile' ? '保存资料' : tab === 'security' ? '更新密码' : '保存外观'}</button></div></div>
  </section></div>{editingProject && <ProjectSubmissionModal categories={contentData.projectCategories} project={editingProject} onClose={() => setEditingProject(null)} onUpdated={(updatedProject) => {
    setMyProjects((projects) => projects.map((item) => item.id === updatedProject.id ? updatedProject : item))
    setMessage('项目已重新提交，等待审核。')
  }} />}</>
}

function ToolsLivePulse({ onOpenProject }: { onOpenProject: (project: Project) => void }) {
  const { data: { announcements, projects, resources, workbench } } = useContent()
  const { user } = useAuth()
  const [active, setActive] = useState(0)
  const [projectActive, setProjectActive] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const pulseItems = useMemo(() => {
    const visibleAnnouncements = announcements
      .filter((item) => item.published !== false && canViewContent(user, item.scope === '全站公开' ? 'public' : 'members'))
      .slice(0, 4)
      .map((item) => ({ id: `announcement-${item.id}`, label: item.category, title: item.title, detail: item.detail || '公告已更新', icon: item.category === '比赛' ? 'trophy' : item.category === '项目' ? 'rocket' : 'calendar', tone: item.category === '比赛' ? 'orange' : item.category === '项目' ? 'violet' : 'blue' }))
    const visibleProjects = projects
      .filter((item) => item.status !== '已归档' && canViewContent(user, item.visibility))
      .slice(0, 3)
      .map((item) => ({ id: `project-${item.id}`, label: '项目进展', title: item.name, detail: item.description || '项目资料已更新', icon: item.icon || 'rocket', tone: item.accent || 'violet' }))
    const visibleResources = resources
      .filter((item) => canViewContent(user, item.visibility))
      .slice(0, 3)
      .map((item) => ({ id: `resource-${item.id}`, label: item.type || '知识库', title: item.title, detail: item.description || '资料已更新', icon: item.type === '学习路线' ? 'route' : 'book', tone: item.accent || 'mint' }))
    const automaticItems = [...visibleAnnouncements, ...visibleProjects, ...visibleResources].slice(0, 6)
    if (!workbench.liveItems.length) return automaticItems
    const candidates = new globalThis.Map(automaticItems.map((item) => [item.id, item]))
    return workbench.liveItems.map((reference) => candidates.get(reference.type + '-' + reference.id)).filter((item): item is typeof automaticItems[number] => Boolean(item))
  }, [announcements, projects, resources, user, workbench.liveItems])
  const automaticProjects = projects.filter((project) => project.status !== '已归档' && canViewContent(user, project.visibility))
  const activeProjects = workbench.projectIds.length
    ? workbench.projectIds.map((id) => automaticProjects.find((project) => project.id === id)).filter((project): project is Project => Boolean(project))
    : automaticProjects

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(clock)
  }, [])
  useEffect(() => {
    if (pulseItems.length < 2) return undefined
    const rotation = window.setInterval(() => setActive((current) => (current + 1) % pulseItems.length), workbench.liveRotationSeconds * 1000)
    return () => window.clearInterval(rotation)
  }, [pulseItems.length, workbench.liveRotationSeconds])

  useEffect(() => {
    if (activeProjects.length < 2) return
    const rotation = window.setInterval(() => setProjectActive((current) => (current + 1) % activeProjects.length), workbench.projectRotationSeconds * 1000)
    return () => window.clearInterval(rotation)
  }, [activeProjects.length, workbench.projectRotationSeconds])

  useEffect(() => {
    if (activeProjects.length > 0 && projectActive >= activeProjects.length) setProjectActive(0)
  }, [activeProjects.length, projectActive])
  useEffect(() => {
    if (pulseItems.length === 0 && active !== 0) setActive(0)
    else if (pulseItems.length > 0 && active >= pulseItems.length) setActive(0)
  }, [active, pulseItems.length])

  const current = pulseItems[active] ?? pulseItems[0]
  const currentProject = activeProjects[projectActive]
  const timeLabel = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return workbench.liveEnabled || workbench.projectsEnabled ? (
    <section className={'tools-live-pulse' + (workbench.liveEnabled && workbench.projectsEnabled ? '' : ' single')} aria-label="小组实时动态">
      {workbench.liveEnabled && <div className="tools-live-column tools-live-activity">
        <div className="tools-live-pulse-head"><div><p className="eyebrow">LIVE WORKSPACE</p><strong>{workbench.liveTitle}</strong><small className="tools-live-subtitle">{workbench.liveSubtitle}</small></div><span className="tools-live-clock"><i /> {timeLabel} · 实时同步</span></div>
        <div className="tools-live-pulse-body">{current ? <><AnimatePresence mode="wait" initial={false}><motion.div className={`tools-live-story tone-${current.tone}`} key={current.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .24, ease: 'easeOut' }}><span className="tools-live-story-icon"><Icon name={current.icon} size={17} /></span><span className="tools-live-story-copy"><small>{current.label}</small><strong>{current.title}</strong><em>{current.detail}</em></span><span className="tools-live-story-index">0{active + 1}</span></motion.div></AnimatePresence>{pulseItems.length > 1 && <div className="tools-live-dots" aria-label="切换小组动态">{pulseItems.map((item, index) => <button key={item.id} className={index === active ? 'active' : ''} onClick={() => setActive(index)} aria-label={`查看${item.label}动态`} aria-current={index === active ? 'true' : undefined} />)}</div>}</> : <div className="tools-live-empty"><CircleHelp size={18} /><span>暂无动态，等待内容服务同步。</span></div>}</div>
      </div>}
      {workbench.liveEnabled && workbench.projectsEnabled && <span className="tools-live-divider" aria-hidden="true" />}
      {workbench.projectsEnabled && <div className="tools-live-column tools-live-project">
        <div className="tools-live-project-head"><div><p className="eyebrow">PROJECT IN PROGRESS</p><strong>{workbench.projectsTitle}</strong></div>{currentProject && <span className={`tools-live-project-status tone-${currentProject.accent}`}>{currentProject.status}</span>}</div>
        {currentProject ? <AnimatePresence mode="wait" initial={false}><motion.div className="tools-live-project-card" key={currentProject.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .24, ease: 'easeOut' }}><span className={`tools-live-project-icon tone-${currentProject.accent}`}><Icon name={currentProject.icon} size={18} /></span><div className="tools-live-project-copy"><small>{currentProject.category} · {currentProject.year} 届</small><strong>{currentProject.name}</strong><em>{currentProject.description}</em><div className="tools-live-project-stack">{currentProject.stack.slice(0, 3).map((stack) => <span key={stack}>{stack}</span>)}</div></div><button type="button" className="tools-live-project-open" onClick={() => onOpenProject(currentProject)} aria-label={`查看${currentProject.name}项目详情`}><ArrowUpRight size={15} /></button></motion.div></AnimatePresence> : <div className="tools-live-project-empty">暂无进行中的项目</div>}
         <div className="tools-live-project-footer"><div className="tools-live-project-dots" aria-label="切换当前项目">{activeProjects.map((project, index) => <button key={project.id} className={index === projectActive ? 'active' : ''} onClick={() => setProjectActive(index)} aria-label={`查看${project.name}`} aria-current={index === projectActive ? 'true' : undefined} />)}</div>{currentProject && <span>{currentProject.members} 位协作成员 · {currentProject.category}</span>}</div>
       </div>}
    </section>
  ) : null
}
function AnnouncementPanel() {
  const { data: { announcements } } = useContent()
  const { user } = useAuth()
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const userCohort = user?.cohort.replace(/\D/g, '')
  const visible = announcements.filter((item) => {
    if (item.published === false) return false
    if (!item.scope || item.scope === '全站公开') return true
    if (item.scope === '管理员可见') return Boolean(user && canManageContent(user))
    return Boolean(user && userCohort && item.scope.replace(/\D/g, '') === userCohort)
  })
  useEffect(() => {
    if (!selectedAnnouncement) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedAnnouncement(null) }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [selectedAnnouncement])
  return <>
    <section className="panel announcements-panel"><SectionHeading eyebrow="LIVE / CAMPUS" title="最新公告" /><div className="announcement-list">{visible.map((item) => <button type="button" className="announcement-row" key={item.id} onClick={() => setSelectedAnnouncement(item)} aria-label={`查看公告：${item.title}`}><span className={`category-badge ${categoryClass[item.category]}`}>{item.category}</span><span className="announcement-main"><strong>{item.title}</strong><small>{item.detail}</small></span><time>{item.date}</time><ArrowRight className="announcement-row-arrow" size={14} aria-hidden="true" /></button>)}</div>{visible.length === 0 && <div className="admin-empty"><Megaphone size={20} /><span>暂无公开公告</span></div>}</section>
    {selectedAnnouncement && createPortal(<div className="announcement-detail-scrim" role="presentation" onClick={() => setSelectedAnnouncement(null)}><section className="announcement-detail-modal" role="dialog" aria-modal="true" aria-labelledby="announcement-detail-title" onClick={(event) => event.stopPropagation()}><div className="announcement-detail-head"><div><p className="eyebrow">CAMPUS / ANNOUNCEMENT</p><div className="announcement-detail-kicker"><span className={`category-badge ${categoryClass[selectedAnnouncement.category]}`}>{selectedAnnouncement.category}</span><time>{selectedAnnouncement.date}</time></div><h2 id="announcement-detail-title">{selectedAnnouncement.title}</h2></div><button type="button" className="icon-button small" onClick={() => setSelectedAnnouncement(null)} aria-label="关闭公告详情"><X size={16} /></button></div><div className="announcement-detail-body"><p>{selectedAnnouncement.detail}</p></div><div className="announcement-detail-foot"><span>公告详情</span><button type="button" className="secondary-button admin-small-button" onClick={() => setSelectedAnnouncement(null)}>关闭</button></div></section></div>, document.body)}
  </>
}

function ProjectVisual({ project, compact = false }: { project: Project; compact?: boolean }) {
  const accent = project.accent
  const coverImage = safeImageSource(project.coverImage)
  return <div className={`project-visual visual-${accent} ${compact ? 'compact' : ''} ${coverImage ? 'has-cover' : ''}`} style={coverImage ? { backgroundImage: `linear-gradient(135deg, rgba(11, 31, 58, .06), rgba(11, 31, 58, .26)), url(${coverImage})` } : undefined}><div className="visual-noise" />{coverImage ? <span className="visual-cover-label">PROJECT COVER</span> : <><span className="visual-icon"><Icon name={project.icon} size={compact ? 21 : 28} /></span><div className="visual-lines"><i /><i /><i /><i /></div><span className="visual-code">{project.category === 'AI' ? 'retrieval.graph()' : project.category === 'Web' ? 'ship — iterate' : 'reserve.lab()'}</span></>}</div>
}

function FavoriteButton({ targetType, targetId, initialCount = 0, initialFavorited = false, compact = false, onChange }: { targetType: FavoriteTargetType; targetId: string; initialCount?: number; initialFavorited?: boolean; compact?: boolean; onChange?: (isFavorited: boolean, favoriteCount?: number) => void }) {
  const { user } = useAuth()
  const userId = user?.id
  const { data } = useContent()
  const [isFavorited, setIsFavorited] = useState(initialFavorited)
  const [count, setCount] = useState(initialCount)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const interactionVersion = useRef(0)

  // A list row and its detail page are separate button instances. Reset only
  // when the target/account changes; parent refreshes for the same target must
  // not overwrite a state that the user has just changed locally.
  useEffect(() => {
    interactionVersion.current = 0
    setIsFavorited(initialFavorited)
    setCount(initialCount)
  }, [targetType, targetId, userId, initialFavorited, initialCount])

  // The content object can be stale when navigating from a list to its detail
  // page, so confirm the current user's state from the canonical favorites list.
  // A click increments interactionVersion and wins over an older in-flight read.
  useEffect(() => {
    if (!userId) {
      setIsFavorited(false)
      return
    }
    let active = true
    const requestVersion = interactionVersion.current
    void listFavorites(userId).then((favorites) => {
      if (!active || requestVersion !== interactionVersion.current || interactionVersion.current !== 0) return
      const matchingFavorite = favorites.find((item) => favoriteTargetMatches(item, targetType, targetId))
      setIsFavorited(Boolean(matchingFavorite))
      if (typeof matchingFavorite?.favoriteCount === 'number') setCount(matchingFavorite.favoriteCount)
    }).catch(() => undefined)
    return () => { active = false }
  }, [targetType, targetId, userId])

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (busy) return
    if (!user) { setError('登录后才能收藏'); window.setTimeout(() => setError(''), 2200); return }
    interactionVersion.current += 1
    const nextState = !isFavorited
    setBusy(true)
    setError('')
    try {
      const result = await toggleFavorite(targetType, targetId, nextState, user.id)
      setIsFavorited(result.isFavorited)
      const nextCount = typeof result.favoriteCount === 'number' ? result.favoriteCount : Math.max(0, count + (result.isFavorited ? 1 : -1))
      setCount(nextCount)
      onChange?.(result.isFavorited, typeof result.favoriteCount === 'number' ? result.favoriteCount : nextCount)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '收藏操作失败，请稍后重试')
      window.setTimeout(() => setError(''), 2600)
    } finally { setBusy(false) }
  }
  const viewCount = targetType === 'project'
    ? data.projects.find((item) => String(item.id) === String(targetId))?.views
    : targetType === 'interview'
      ? data.interviews.find((item) => String(item.id) === String(targetId))?.views
      : undefined
  const showViews = targetType === 'project' || targetType === 'interview'
  return <span className={`favorite-control ${compact ? 'compact' : ''}`}><button type="button" className={`favorite-button ${isFavorited ? 'active' : ''}`} onClick={(event) => void handleClick(event)} onKeyDown={(event) => event.stopPropagation()} aria-pressed={isFavorited} aria-label={isFavorited ? '取消收藏' : '收藏'} title={isFavorited ? '取消收藏' : '收藏'} disabled={busy}><Star size={compact ? 14 : 15} fill={isFavorited ? 'currentColor' : 'none'} /><span>{isFavorited ? '已收藏' : '收藏'}{compact ? '' : ` ${count}`}</span></button>{showViews && typeof viewCount === 'number' && <span className="view-count"><Eye size={14} /> {viewCount.toLocaleString()}</span>}{error && <small role="status">{error}</small>}</span>
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: (project: Project) => void }) {
  return <motion.article className="project-card" whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: .995 }} transition={{ duration: 0.2, ease: 'easeOut' }} onClick={() => onOpen(project)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(project)}><ProjectVisual project={project} /><div className="project-card-body"><div className="project-card-top"><Tag tone={project.status === '招募中' ? 'mint' : project.status === '维护中' ? 'blue' : 'neutral'}>{project.status}</Tag><span className="project-year">{project.year}</span></div><h3>{project.name}</h3><p>{project.description}</p><div className="project-tags">{project.stack.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div><div className="project-meta"><span><Users size={14} /> {project.members} 位协作成员</span><FavoriteButton targetType="project" targetId={project.id} initialCount={project.favoriteCount ?? project.stars} initialFavorited={project.isFavorited} /><span className="project-arrow"><ArrowUpRight size={15} /></span></div></div></motion.article>
}

function FeaturedProjects({ onOpen }: { onOpen: (project: Project) => void }) {
  const { data: { projects, projectCategories } } = useContent()
  const { user } = useAuth()
  const [active, setActive] = useState(0)
  const visible = projects.filter((item) => item.featured && canViewContent(user, item.visibility))
  useEffect(() => {
    if (visible.length < 2) return
    const timer = window.setInterval(() => setActive((value) => (value + 1) % visible.length), 5200)
    return () => window.clearInterval(timer)
  }, [visible.length])
  useEffect(() => {
    if (visible.length === 0 && active !== 0) setActive(0)
    else if (visible.length > 0 && active >= visible.length) setActive(0)
  }, [active, visible.length])
  const current = visible[active] ?? visible[0]
  const maxStars = Math.max(...visible.map((project) => project.favoriteCount ?? project.stars), 1)
  const starRatio = current ? Math.round(((current.favoriteCount ?? current.stars) / maxStars) * 100) : 0
  return (
    <section className="panel featured-panel">
      <div className="section-heading"><div><p className="eyebrow">CURATED BY MEMBERS</p><h2><span className="title-spark">✦</span> 推荐项目</h2></div>{visible.length > 1 && <div className="carousel-actions"><span className="tools-section-code">AUTO ROTATE · 5.2S</span><button className="icon-button small" onClick={() => setActive((value) => (value - 1 + visible.length) % visible.length)} aria-label="上一个项目"><ChevronLeft size={16} /></button><button className="icon-button small" onClick={() => setActive((value) => (value + 1) % visible.length)} aria-label="下一个项目"><ChevronRight size={16} /></button></div>}</div>
      {current && <div className="tools-focus-layout">
        <div className={'tools-focus-stage tone-' + current.accent}>
          <div className="tools-focus-stage-top"><span><i /> NOW FEATURED</span><strong>0{active + 1} / 0{visible.length}</strong></div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div className="tools-focus-story" key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .25, ease: 'easeOut' }}>
              <span className="tools-focus-icon"><Icon name={current.icon} size={20} /></span>
              <div className="tools-focus-copy"><small>{current.year} 届 · {projectCategoryLabel(projectCategories, current.category)}</small><h3>{current.name}</h3><p>{current.description}</p><button className="tools-focus-action" onClick={() => onOpen(current)}>查看项目详情 <ArrowRight size={14} /></button></div>
            </motion.div>
          </AnimatePresence>
          <div className="tools-focus-meter"><span>收藏数</span><div><i style={{ width: starRatio + '%' }} /></div><strong>{current.favoriteCount ?? current.stars}</strong></div>
        </div>
        <div className="tools-focus-list">
          <span className="tools-focus-list-label">PROJECT QUEUE</span>
          {visible.map((project, index) => <button key={project.id} className={index === active ? 'active' : ''} onClick={() => setActive(index)}><span className={'tools-queue-index tone-' + project.accent}>0{index + 1}</span><span><strong>{project.name}</strong><small>{projectCategoryLabel(projectCategories, project.category)} · {project.year} 届</small></span><ArrowUpRight size={14} /></button>)}
        </div>
      </div>}
    </section>
  )
}

function RecentUpdates() {
  const { data: { learningRoutes, projects, resources, interviews } } = useContent()
  const updates = useMemo(() => [
    ...learningRoutes.map((item) => ({ id: `route-${item.id}`, title: item.title, date: item.updatedAt, icon: 'route', accent: 'blue', path: '#/learning' })),
    ...projects.map((item) => ({ id: `project-${item.id}`, title: item.name, date: item.updatedAt, icon: item.icon || 'rocket', accent: item.accent || 'violet', path: `#/projects/${item.slug}` })),
    ...resources.map((item) => ({ id: `resource-${item.id}`, title: item.title, date: item.updatedAt || item.updated, icon: item.type === '学习路线' ? 'route' : 'book', accent: item.accent || 'mint', path: '#/resources' })),
    ...interviews.map((item) => ({ id: `interview-${item.id}`, title: `${item.company} · ${item.role}`, date: item.updatedAt || item.date, icon: 'message', accent: 'orange', path: '#/interviews' })),
  ].slice(0, 4), [interviews, learningRoutes, projects, resources])
  return <section className="panel updates-panel"><SectionHeading eyebrow="KNOWLEDGE LOG" title="最近更新" action="查看全部" onAction={() => navigate('#/resources')} />{updates.length ? <div className="update-list">{updates.map((item) => <button className="update-row" key={item.id} onClick={() => navigate(item.path)}><span className={`update-icon accent-${item.accent}`}><Icon name={item.icon} size={16} /></span><strong>{item.title}</strong><time>{item.date || '—'}</time></button>)}</div> : <div className="admin-empty"><RefreshCw size={18} /><span>暂无最近更新，等待内容服务同步。</span></div>}</section>
}

function GrowthStats() {
  const { data, loading } = useContent()
  const { sortedCohorts, currentCohort } = useClubConfig()
  const memberCount = data.membersManaged ? data.members.length : currentCohort?.teams.reduce((sum, team) => sum + team.members.length, 0) ?? 0
  const stats = [
    { label: '成员总数', value: memberCount, note: '当前组织目录', icon: 'users', accent: 'blue' },
    { label: '项目数量', value: data.projects.length, note: '项目库记录', icon: 'rocket', accent: 'violet' },
    { label: '资源数量', value: data.resources.length, note: '资源库记录', icon: 'folder', accent: 'mint' },
    { label: '面经数量', value: data.interviews.length, note: '面经墙记录', icon: 'message', accent: 'orange' },
    { label: '赛事数量', value: data.competitionEvents.length, note: '比赛中心记录', icon: 'trophy', accent: 'rose' },
    { label: '届数', value: sortedCohorts.length, note: '组织配置记录', icon: 'history', accent: 'blue' },
  ]
  const displayValue = (value: number) => loading ? '…' : value > 0 ? String(value) : '—'
  return <section className="growth-section"><SectionHeading eyebrow="LIVE CATALOGUE" title="我们的成长" /><div className="growth-grid">{stats.map((item) => <div className={`growth-stat stat-${item.accent}`} key={item.label}><span className="growth-icon"><Icon name={item.icon} size={17} /></span><strong>{displayValue(item.value)}</strong><span>{item.label}</span><small>{item.note}</small></div>)}</div></section>
}

function QuoteCard() {
  const { siteCopy } = useClubConfig()
  const quote = siteCopy.find((item) => item.id === 'quote')
  const title = quote?.title ?? (isRemoteClubConfigEnabled ? '今日名言尚未配置' : '代码是写给人看的，附带能在机器上运行。')
  return <aside className="quote-card"><Quote size={22} /><p>“{title}”</p>{(quote?.author || !isRemoteClubConfigEnabled) && <span>— {quote?.author ?? 'Harold Abelson'}</span>}<div className="quote-mark">/ 今日名言</div></aside>
}

function ToolsRadar({ syncedModules, nodeCount }: { syncedModules: number; nodeCount: number }) {
  const syncLabel = syncedModules > 0 ? `${syncedModules}/4` : '—'
  const nodeLabel = nodeCount > 0 ? String(nodeCount) : '—'
  return (
    <div className="tools-radar" aria-label="小组工作流信号图">
      <div className="radar-ambient radar-ambient-a" />
      <div className="radar-ambient radar-ambient-b" />
      <div className="radar-grid" />
      <div className="radar-ring radar-ring-one" />
      <div className="radar-ring radar-ring-two" />
      <div className="radar-ring radar-ring-three" />
      <div className="radar-cross radar-cross-horizontal" />
      <div className="radar-cross radar-cross-vertical" />
      <div className="radar-sweep" />
      <span className="radar-point radar-point-a" />
      <span className="radar-point radar-point-b" />
      <span className="radar-point radar-point-c" />
      <span className="radar-point radar-point-d" />
      <div className="radar-core"><strong>CS</strong><small>ONLINE</small></div>
      <div className="radar-readout radar-readout-top"><span>模块同步</span><strong>{syncLabel}</strong></div>
      <div className="radar-readout radar-readout-bottom"><span>路线节点</span><strong>{nodeLabel}</strong></div>
      <span className="radar-label radar-label-a">SYNC / LIVE</span>
      <span className="radar-label radar-label-b">SHIP / NEXT</span>
    </div>
  )
}

function CommitFlow() {
  const [activeStage, setActiveStage] = useState(0)
  const stages = [
    { label: '想法', code: 'IDEA', status: '整理想法，找到值得解决的问题。' },
    { label: '构建', code: 'BUILD', status: '正在构建，把方向变成可以运行的东西。' },
    { label: '评审', code: 'REVIEW', status: '等待 Review，让队友一起把方案打磨好。' },
    { label: '提交', code: 'SHIP', status: '准备下一次提交，让成果继续向前。' },
  ]

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (prefersReducedMotion) return
    const timer = window.setInterval(() => setActiveStage((current) => (current + 1) % stages.length), 4800)
    return () => window.clearInterval(timer)
  }, [stages.length])

  const current = stages[activeStage]
  const progress = activeStage / (stages.length - 1)

  return <div className="commit-flow" aria-label="从想法到提交的工作流">
    <div className="commit-flow-head">
      <span className="commit-flow-kicker"><i /> SHIP CYCLE</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span className="commit-flow-status" key={current.status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .2 }}>{current.status}</motion.span>
      </AnimatePresence>
    </div>
    <div className="commit-flow-track" role="list">
      <span className="commit-flow-line" aria-hidden="true"><i style={{ width: `${progress * 100}%` }} /></span>
      {stages.map((stage, index) => <button key={stage.code} type="button" className={`commit-flow-stage ${index === activeStage ? 'active' : ''} ${index < activeStage ? 'complete' : ''}`} onClick={() => setActiveStage(index)} aria-label={`查看${stage.label}阶段`} aria-current={index === activeStage ? 'step' : undefined}>
        <span className="commit-flow-node">{String(index + 1).padStart(2, '0')}</span>
        <span className="commit-flow-label"><strong>{stage.label}</strong><small>{stage.code}</small></span>
      </button>)}
    </div>
  </div>
}

function ToolsHero({ onNavigate, onOnboarding }: { onNavigate: (path: string) => void; onOnboarding: () => void }) {
  const { currentCohort, siteCopy } = useClubConfig()
  const { data, loading: contentLoading } = useContent()
  const { members: managedMembers, membersManaged, learningRoutes, projects, resources, competitionEvents } = data
  const purpose = siteCopy.find((item) => item.id === 'purpose')
  const memberCount = membersManaged
    ? managedMembers.filter((member) => member.cohort.replace(/\D/g, '') === currentCohort?.year).length
    : currentCohort?.teams.reduce((total, team) => total + team.members.length, 0) ?? 0
  const syncedModules = [learningRoutes.length, projects.length, resources.length, competitionEvents.length].filter((count) => count > 0).length
  const nodeCount = learningRoutes.reduce((total, route) => total + route.nodes.length, 0)
  return (
    <section className="tools-hero-redesign">
      <div className="tools-hero-lattice" aria-hidden="true" />
      <div className="tools-hero-copy">
        <p className="tools-hero-eyebrow"><span className="tools-live-beacon" /> CLUB CONTROL ROOM <i /> {currentCohort?.year ?? 'CURRENT'}</p>
        <div className="tools-hero-title-row">
          <h1>{purpose?.title ?? '我们的目的，只为'}<br /><em>{purpose?.body ?? '让想法传承，让成果延续。'}</em></h1>

        </div>
        <CommitFlow />
        <p className="tools-hero-description">学习、项目和历届经验，都在同一张工作台上汇合。<br />今天先选一个入口，让想法开始拥有下一步。</p>
        <div className="tools-hero-actions">
          <button className="primary-button" onClick={() => onNavigate('#/learning')}>开始学习之旅 <ArrowRight size={16} /></button>
          <button className="secondary-button" onClick={() => onNavigate('#/projects')}>浏览项目库 <ArrowUpRight size={15} /></button>
        </div>
        <button className="tools-onboarding-link" onClick={onOnboarding}><Sparkles size={13} /> 还不知道从哪开始？生成一条适合你的路线 <ArrowRight size={13} /></button>
        <div className="tools-hero-metrics"><span><Activity size={14} /> {contentLoading ? '内容同步中…' : syncedModules ? `${syncedModules} 个内容模块已同步` : '暂无内容模块'}</span><i /><span><Users size={14} /> {currentCohort?.year ?? '当前'} 届 · {memberCount || '—'} 人共建</span></div>
      </div>
      <ToolsRadar syncedModules={syncedModules} nodeCount={nodeCount} />
      <div className="tools-hero-caption"><span><span className="pulse-dot" /> LIVE SIGNAL</span><small>每一次提交，都会成为下一届的起点。</small></div>
    </section>
  )
}

function HomePage({ onNavigate, onOnboarding, onOpenProject }: { onNavigate: (path: string) => void; onOnboarding: () => void; onOpenProject: (project: Project) => void }) {
  return (
    <div className="page tools-dashboard-page">
      <ToolsHero onNavigate={onNavigate} onOnboarding={onOnboarding} />
      <ToolsLivePulse onOpenProject={onOpenProject} />
      <div className="tools-workbench">
        <div className="tools-main-column">
          <div className="tools-announcement-block"><AnnouncementPanel /></div>
          <div className="tools-project-block"><FeaturedProjects onOpen={onOpenProject} /></div>
          <div className="tools-growth-block"><GrowthStats /></div>
        </div>
        <div className="tools-side-column"><DynamicClubDirections /><RecentUpdates /><QuoteCard /></div>
      </div>
    </div>
  )
}
function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-intro-action">{action}</div>}</div>
}

function LoginPage({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const { user, loading, isDemo, signIn, signInWithCode, register, requestRegistrationCode, requestLoginCode, signOut } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState(isDemo ? demoCredentials.password : '')
  const [email, setEmail] = useState(isDemo ? demoCredentials.email : '')
  const [verificationCode, setVerificationCode] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [captchaNonce, setCaptchaNonce] = useState(0)
  const [rememberMe, setRememberMe] = useState(true)
  const [codeCooldown, setCodeCooldown] = useState(0)
  const [loginCodeCooldown, setLoginCodeCooldown] = useState(0)
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [loginDemoCode, setLoginDemoCode] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  useEffect(() => {
    if (!codeCooldown) return
    const timer = window.setInterval(() => setCodeCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [codeCooldown])

  useEffect(() => {
    if (!loginCodeCooldown) return
    const timer = window.setInterval(() => setLoginCodeCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [loginCodeCooldown])

  const handleTurnstileChange = useCallback((token: string) => setTurnstileToken(token), [])

  const resetTurnstile = () => {
    setTurnstileToken('')
    setCaptchaNonce((value) => value + 1)
  }

  const fillDemoAccount = (account: { email: string; password: string }) => {
    setEmail(account.email)
    setPassword(account.password)
    setError(null)
  }

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode)
    setLoginMethod('password')
    setError(null)
    setNotice(null)
    setDemoCode(null)
    setLoginDemoCode(null)
    resetTurnstile()
  }

  const sendRegistrationCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())) {
      setError('请输入合法的邮箱地址')
      return
    }
    if (!isDemo && !turnstileToken) {
      setError('请先完成验证码校验')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await requestRegistrationCode(email, turnstileToken)
      setCodeCooldown(60)
      setDemoCode(result.demoCode ?? null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '验证码发送失败，请稍后再试')
    } finally {
      resetTurnstile()
      setSubmitting(false)
    }
  }

  const sendLoginCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())) {
      setError('请输入合法的邮箱地址')
      return
    }
    if (!isDemo && !turnstileToken) {
      setError('请先完成验证码校验')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await requestLoginCode(email, turnstileToken)
      setLoginCodeCooldown(60)
      setLoginDemoCode(result.demoCode ?? null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '验证码发送失败，请稍后再试')
    } finally {
      resetTurnstile()
      setSubmitting(false)
    }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())) {
      setError('请输入合法的邮箱地址')
      return
    }
    if (!isDemo && !turnstileToken) {
      setError('请先完成验证码校验')
      return
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }
    if (mode === 'register' && (!username.trim() || !password)) {
      setError('请输入账号名和密码')
      return
    }
    if (mode === 'login' && loginMethod === 'password' && !password) {
      setError('请输入密码')
      return
    }
    if (mode === 'login' && loginMethod === 'code' && !verificationCode.trim()) {
      setError('请输入邮箱验证码')
      return
    }
    setSubmitting(true)
    setError(null)
    setNotice(null)
    let authenticationSucceeded = false
    // API 模式下任一登录/注册请求都会核验并消耗一次性 token；失败后需重新验证再试。
    const needsFreshTurnstile = !isDemo
    try {
      if (mode === 'register') {
        await register({ username, email, verificationCode, password, turnstileToken })
        authenticationSucceeded = true
        setPassword('')
        setConfirmPassword('')
        setVerificationCode('')
        switchMode('login')
        setNotice('注册成功，请使用刚创建的账号登录')
      } else {
        if (loginMethod === 'code') await signInWithCode({ email, verificationCode, turnstileToken, rememberMe })
        else await signIn({ email, password, turnstileToken, rememberMe })
        authenticationSucceeded = true
        navigate('#/tools')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '登录失败，请稍后再试')
    } finally {
      if (needsFreshTurnstile && !authenticationSucceeded) resetTurnstile()
      setSubmitting(false)
    }
  }

  if (loading) return <div className="page login-page login-loading"><div className="login-loading-mark"><span /><span /><span /></div><p>正在读取登录状态</p></div>

  if (user) return <div className="page login-page"><div className="login-layout login-layout-single"><section className="panel login-card logged-in-card"><span className="login-card-icon"><ShieldCheck size={21} /></span><p className="eyebrow">SESSION ACTIVE</p><h1>你已登录</h1><p className="login-card-description">{user.name} · {roleLabels[user.role] ?? user.role} · {user.cohort} 届</p><div className="logged-in-actions"><button className="primary-button" onClick={() => navigate('#/tools')}>进入工作台 <ArrowRight size={16} /></button><button className="secondary-button" onClick={() => void signOut()}><LogOut size={16} /> 退出登录</button></div></section></div></div>

  return <div className="page login-page">
    <div className="login-layout">
      <section className="login-intro">
        <div className="login-intro-grid" aria-hidden="true" />
        <div className="login-intro-orbit orbit-one" aria-hidden="true" />
        <div className="login-intro-orbit orbit-two" aria-hidden="true" />
        <div className="login-intro-copy">
          <p className="login-kicker"><span /> CLUB IDENTITY / ACCESS</p>
          <h1>让每一次<br /><em>贡献都有归属。</em></h1>
          <p>登录后进入小组工作台，查看成员身份和后续管理入口。</p>
        </div>
        <div className="login-intro-footer"><span><i /> 安全会话</span><span>LEARN · BUILD · PASS ON</span></div>
      </section>

      <section className="panel login-card">
        <div className="login-mode-switch" role="tablist" aria-label="登录或注册"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>登录</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>注册</button></div>
        <div className="login-card-head"><span className="login-card-icon">{mode === 'login' ? <KeyRound size={20} /> : <UserRound size={20} />}</span><div><p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'NEW MEMBER'}</p><h2>{mode === 'login' ? '登录科技小组' : '注册小组账号'}</h2></div></div>
        <p className="login-card-description">{mode === 'login' ? '使用小组账号继续访问你的工作台。' : isDemo ? '填写邮箱并完成验证，创建一个待管理员分配届次的账号。' : '填写邮箱和密码，创建一个待管理员分配届次的账号。'}</p>
        {mode === 'login' && <div className="login-method-switch" role="tablist" aria-label="登录方式"><button type="button" className={loginMethod === 'password' ? 'active' : ''} onClick={() => { setLoginMethod('password'); setError(null); setVerificationCode(''); setLoginDemoCode(null) }}>邮箱密码登录</button><button type="button" className={loginMethod === 'code' ? 'active' : ''} onClick={() => { setLoginMethod('code'); setError(null); setPassword(''); setLoginDemoCode(null) }}>邮箱验证码登录</button></div>}
        <form className="login-form" onSubmit={submit}>
          {mode === 'register' && <label className="login-field"><span>账号名</span><div className="login-input-wrap"><LogIn size={16} /><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="设置一个账号名" /></div></label>}
          <label className="login-field"><span>邮箱</span><div className="login-input-wrap"><Mail size={16} /><input value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => { if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())) setError('请输入合法的邮箱地址') }} aria-invalid={Boolean(email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim()))} autoComplete="email" type="email" placeholder="name@example.com" /></div></label>
          {(mode === 'register' || (mode === 'login' && loginMethod === 'password')) && <label className="login-field"><span>密码</span><div className="login-input-wrap"><KeyRound size={16} /><input value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} placeholder={mode === 'login' ? '输入密码' : '至少 8 位密码'} /><button type="button" className="login-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? '隐藏密码' : '显示密码'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>}
          {mode === 'register' && <label className="login-field"><span>确认密码</span><div className="login-input-wrap"><KeyRound size={16} /><input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="再次输入密码" /></div></label>}
          {(mode === 'register' || (mode === 'login' && loginMethod === 'code')) && <div className="login-code-row"><label className="login-field"><span>邮箱验证码</span><div className="login-input-wrap"><Mail size={16} /><input name="one-time-code" autoComplete="one-time-code" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} inputMode="numeric" placeholder="6 位验证码" /></div></label><button type="button" className="secondary-button login-code-button" disabled={submitting || (mode === 'register' ? codeCooldown > 0 : loginCodeCooldown > 0)} onClick={() => void (mode === 'register' ? sendRegistrationCode() : sendLoginCode())}>{mode === 'register' ? (codeCooldown > 0 ? `${codeCooldown}s 后重发` : '获取验证码') : (loginCodeCooldown > 0 ? `${loginCodeCooldown}s 后重发` : '获取验证码')}</button></div>}
          {!isDemo && <div className="login-captcha"><TurnstileWidget key={captchaNonce} value={turnstileToken} onChange={handleTurnstileChange} allowFallback={false} /></div>}
          {mode === 'login' && <label className="login-remember"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>记住登录状态</span></label>}
          {error && <p className="login-error" role="alert">{error}</p>}
          {notice && <p className="login-success" role="status">{notice}</p>}
          {(demoCode || loginDemoCode) && <p className="login-demo-code" role="status">本地测试验证码：<strong>{demoCode ?? loginDemoCode}</strong></p>}
          <button className="primary-button login-submit" type="submit" disabled={submitting}>{submitting ? <><span className="login-submit-spinner" /> 正在处理</> : mode === 'login' ? <><LogIn size={16} /> 登录</> : <><UserRound size={16} /> 创建账号</>}</button>
        </form>
        {isDemo && mode === 'login' && <div className="login-demo-box"><div><span>本地账号模式</span><small>当前使用本地持久化账号，可直接登录管理</small></div><div className="login-demo-actions"><button type="button" onClick={() => fillDemoAccount(demoCredentials)}>组长账号</button><button type="button" onClick={() => fillDemoAccount(demoOwnerCredentials)}>2029 届负责人</button></div><small className="login-demo-hint">初始密码：club2029</small></div>}
        <p className="login-footer-note">账号权限由管理员维护，注册后需由负责人分配届次和方向。</p>
      </section>
    </div>
  </div>
}

function LearningPage({ onOpenProject, initialRouteId }: { onOpenProject: (project: Project) => void; initialRouteId?: string }) {
  const { data: { learningRoutes, projects } } = useContent()
  const { user } = useAuth()
  const [activeRouteId, setActiveRouteId] = useState(initialRouteId ?? '')
  const [projectIndex, setProjectIndex] = useState(0)
  const visibleRoutes = useMemo(() => learningRoutes.filter((item) => canViewContent(user, item.visibility)), [learningRoutes, user])
  const visibleProjects = useMemo(() => projects.filter((item) => canViewContent(user, item.visibility)), [projects, user])
  const tracks = useMemo(() => visibleRoutes.map((route) => ({ id: route.id, label: route.direction?.trim() || route.title.trim(), route })).filter((item) => item.label), [visibleRoutes])
  const hasConfiguredRoutes = learningRoutes.length > 0
  const activeTrack = tracks.find((track) => track.id === activeRouteId) ?? tracks[0]
  const active = activeTrack?.label ?? ''
  const route = activeTrack?.route
  const visibleNodes = route?.nodes ?? []
  const routeProjects = (route?.featuredProjectIds ?? []).map((id) => visibleProjects.find((project) => project.id === id)).filter((project): project is Project => Boolean(project))
  const currentProject = routeProjects[projectIndex % Math.max(routeProjects.length, 1)]
  useEffect(() => {
    if (initialRouteId && tracks.some((track) => track.id === initialRouteId)) setActiveRouteId(initialRouteId)
  }, [initialRouteId, tracks])
  useEffect(() => {
    if (initialRouteId && tracks.some((track) => track.id === initialRouteId)) return
    if (!tracks.some((track) => track.id === activeRouteId)) setActiveRouteId(tracks[0]?.id ?? '')
  }, [activeRouteId, initialRouteId, tracks])
  useEffect(() => { setProjectIndex(0) }, [activeRouteId, route?.id])
  useEffect(() => {
    if (routeProjects.length < 2) return
    const timer = window.setInterval(() => setProjectIndex((value) => (value + 1) % routeProjects.length), 5200)
    return () => window.clearInterval(timer)
  }, [routeProjects.length, route?.id])
  const routeTitle = route?.title ?? (active ? `${active} · 进阶路径` : '暂无学习路线')
  const routeDescription = route?.description ?? (hasConfiguredRoutes ? user ? '当前账号暂时无法查看这些路线。' : '登录以查看全部学习路线。' : '暂时没有发布学习路线。')
  const emptyTitle = !hasConfiguredRoutes ? '暂时没有学习路线' : route ? '这个方向还没有学习节点' : user ? '暂无可查看的学习路线' : '请先登录'
  const emptyDescription = !hasConfiguredRoutes ? '' : route ? '' : user ? '当前账号暂时无法查看这些路线。' : '登录以查看全部学习路线。'
  return <div className="page learning-page">
    <PageIntro eyebrow="LEARNING OS / 01" title="学习路线" description={routeDescription} />
    {!user && hasConfiguredRoutes && <div className="access-policy-note"><LockKeyhole size={16} /><div><strong>请先登录</strong><span>登录以查看全部学习路线。</span></div></div>}
    <div className={`learning-layout ${tracks.length ? '' : 'learning-layout-empty'}`}>
      {tracks.length > 0 && <aside className="track-sidebar"><div className="sidebar-label">TECH TRACKS</div>{tracks.map((track, index) => <button key={track.id} className={`track-button ${activeRouteId === track.id ? 'active' : ''}`} onClick={() => setActiveRouteId(track.id)}><span className="track-number">{String(index + 1).padStart(2, '0')}</span>{track.label}{activeRouteId === track.id && <ChevronRight size={15} />}</button>)}<div className="sidebar-tip"><Sparkles size={16} /><strong>给下一步留一点空间</strong><span>路线是参考地图，学习内容可以来自你信任的平台。</span></div></aside>}
      <main className="roadmap-wrap">{route && <div className="roadmap-topline"><div><span className="live-dot" /> {routeTitle}</div><span>{visibleNodes.length} 个学习节点</span></div>}{visibleNodes.length ? <div className="roadmap"><div className="roadmap-line" />{visibleNodes.map((node, index) => <LearningNodeCard key={node.id} node={node} index={index} onOpenProject={onOpenProject} />)}</div> : <div className="empty-state learning-route-empty"><Route size={28} /><strong>{emptyTitle}</strong>{emptyDescription && <span>{emptyDescription}</span>}</div>}</main>
      {tracks.length > 0 && <aside className="learning-aside"><section className="panel route-guide"><p className="eyebrow">ROUTE GUIDE</p><h3>把路线当作地图</h3><p>按自己的节奏选择课程、资源和项目，不记录个人完成度。</p><div className="route-guide-steps"><span><b>01</b>基础</span><span><b>02</b>实践</span><span><b>03</b>交付</span></div></section><section className="panel next-project"><p className="eyebrow">PROJECT ENTRY</p>{currentProject ? <><div className="next-project-icon"><Icon name={currentProject.icon} size={20} /></div><h3>{currentProject.name}</h3><p>{currentProject.description}</p><button className="text-button" onClick={() => onOpenProject(currentProject)}>查看项目入口 <ArrowRight size={14} /></button>{routeProjects.length > 1 && <div className="next-project-dots">{routeProjects.map((project, index) => <button key={project.id} className={index === projectIndex ? 'active' : ''} onClick={() => setProjectIndex(index)} aria-label={`查看${project.name}`} />)}</div>}</> : <div className="next-project-empty"><div className="next-project-icon"><Rocket size={20} /></div><h3>等待项目入口</h3><p>暂时没有关联项目。</p></div>}</section></aside>}
    </div>
  </div>
}

function LearningNodeCard({ node: learningNode, index, onOpenProject }: { node: LearningNode; index: number; onOpenProject: (project: Project) => void }) {
  const { data: { projects, resources } } = useContent()
  const { user } = useAuth()
  const nodeProjects = (learningNode.projectIds ?? []).map((id) => projects.find((project) => project.id === id)).filter((project): project is Project => Boolean(project)).filter((project) => canViewContent(user, project.visibility))
  const nodeResources = (learningNode.resourceIds ?? []).map((id) => resources.find((resource) => resource.id === id)).filter((resource): resource is Resource => Boolean(resource)).filter((resource) => canViewContent(user, resource.visibility) && (!resource.status || resource.status === 'published'))
  const node = { ...learningNode, projects: nodeProjects.length }
  const resourceLinks = node.resourceLinks ?? []
  const videoLinks = node.videoLinks ?? (node.videoTitle || node.videoUrl ? [{ id: `legacy-video-${node.id}`, title: node.videoTitle ?? '', url: node.videoUrl ?? '' }] : [])
  return <motion.div className="learning-node" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
    <div className="node-marker"><span>{String(index + 1).padStart(2, '0')}</span></div>
    <div className="node-card">
      <div className="node-card-heading"><div><span className="node-status">学习节点 {String(index + 1).padStart(2, '0')}</span><h3>{node.title}</h3></div><span className="node-duration"><Clock3 size={13} /> {node.duration}</span></div>
      {node.description && <p>{node.description}</p>}
      {(nodeProjects.length > 0 || nodeResources.length > 0 || resourceLinks.length > 0 || videoLinks.length > 0 || (node.cloudDriveLinks?.length ?? 0) > 0) && <div className="node-learning-links">
        {nodeProjects.map((project) => <button type="button" key={project.id} className="learning-link-chip project-entry" onClick={() => onOpenProject(project)} aria-label={`打开项目：${project.name}`} title={`打开项目：${project.name}`}><Rocket size={13} /><span>{project.name}</span><ArrowUpRight size={12} /></button>)}
        {nodeResources.map((resource) => <a className="learning-link-chip library-resource-entry" key={resource.id} href={`#/resources/${encodeURIComponent(resource.id)}`} aria-label={`打开资源库资料：${resource.title}`} title={`打开资源库资料：${resource.title}`}><Folder size={13} /><span>{resource.title}</span><ArrowUpRight size={12} /></a>)}
        {resourceLinks.map((link) => { const url = safeLink(link.url); const title = link.title.trim() || '打开文档'; return url && <a className="learning-link-chip" key={link.id} href={url} target="_blank" rel="noopener noreferrer" aria-label={`打开文档：${title}`} title={`打开文档：${title}`}><FileText size={13} /><span>{title}</span><ExternalLink size={12} /></a> })}
        {videoLinks.map((link) => { const url = safeLink(link.url); const title = link.title.trim() || '观看教程'; return url && <a className="learning-link-chip" key={link.id} href={url} target="_blank" rel="noopener noreferrer" aria-label={`打开视频：${title}`} title={`打开视频：${title}`}><PlayCircle size={13} /><span>{title}</span><ExternalLink size={12} /></a> })}
        {(node.cloudDriveLinks ?? []).map((link) => { const url = safeLink(link.url); const title = link.title.trim() || '打开网盘资料'; return url && <a className="learning-link-chip learning-drive-link" key={link.id} href={url} target="_blank" rel="noopener noreferrer" aria-label={`打开网盘资料：${title}`} title={link.description ? `${title} · ${link.description}` : title}><CloudDownload size={13} /><span>{title}</span>{link.description?.trim() && <small>{link.description}</small>}<ExternalLink size={12} /></a> })}
      </div>}
    </div>
  </motion.div>
}

type FilterOption = string | { value: string; label: string }

type CompetitionDirectoryScope = 'all' | 'current' | 'past'

/** 列表里同时保留数据库原始状态和按赛程实时算出的阶段，供展示与筛选共用。 */
type LiveCompetitionEvent = CompetitionEvent & { dbStatus: CompetitionEvent['status'] }

/**
 * 这些阶段是主办方已经明确表态的结论，即使还没录具体日期也该照实显示。
 * 例如强网杯官网只写“报名即日起至 10 月下旬（暂定）”，没有可填的精确日期，
 * 但“正在报名”这个事实必须让人一眼看到，不能被“赛程待定”盖掉。
 */
const CONFIRMED_COMPETITION_STATUSES: CompetitionEvent['status'][] = ['报名中', '报名已截止', '比赛进行中', '等待结果', '已结束']

/**
 * 卡片、详情和筛选用同一个口径判断该显示什么。
 * 之前展示按“有无日期”判断、筛选按原始 status 比较，两套规则不一致，
 * 导致卡片上看得见的状态在下拉里筛不出来。
 */
function competitionDisplayStatus(event: LiveCompetitionEvent): CompetitionEvent['status'] | '赛程待定' {
  if (hasCompetitionSchedule(event)) return event.status
  return CONFIRMED_COMPETITION_STATUSES.includes(event.dbStatus) ? event.dbStatus : '赛程待定'
}

function isPastCompetition(event: LiveCompetitionEvent) {
  const displayed = competitionDisplayStatus(event)
  return event.lifecycle === 'archived' || displayed === '已结束'
}

function competitionSortRank(event: LiveCompetitionEvent) {
  if (isPastCompetition(event)) return 2
  if (['报名中', '比赛进行中', '等待结果'].includes(competitionDisplayStatus(event))) return 0
  return 1
}

function FilterBar({ search, setSearch, filters, activeFilter, setActiveFilter }: { search: string; setSearch: (value: string) => void; filters: FilterOption[]; activeFilter: string; setActiveFilter: (value: string) => void }) {
  return <div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索项目..." aria-label="搜索" /></div><div className="filter-pills">{filters.map((filter) => { const value = typeof filter === 'string' ? filter : filter.value; const label = typeof filter === 'string' ? filter : filter.label; return <button key={value} className={`filter-pill ${activeFilter === value ? 'active' : ''}`} onClick={() => setActiveFilter(value)}>{label}</button> })}</div></div>
}

function ProjectsPage({ onOpenProject }: { onOpenProject: (project: Project) => void }) {
  const { data: { projects, projectCategories } } = useContent()
  const { user } = useAuth()
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState<'全部' | Project['status']>('全部')
  const [page, setPage] = useState(1)
  const pageSize = 9
  const categoryFilters = useMemo(() => [{ value: '全部', label: '全部' }, ...projectCategories.filter((category) => category.enabled).sort((a, b) => a.order - b.order).map((category) => ({ value: category.key, label: category.label }))], [projectCategories])
  useEffect(() => { if (!categoryFilters.some((category) => category.value === filter)) setFilter('全部') }, [categoryFilters, filter])
  const accessibleProjects = useMemo(() => projects.filter((project) => canViewContent(user, project.visibility)), [projects, user])
  const filtered = accessibleProjects.filter((p) => (filter === '全部' || p.category === filter) && (statusFilter === '全部' || p.status === statusFilter) && `${p.name}${p.description}${p.stack.join('')}`.toLowerCase().includes(search.toLowerCase()))
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const emptyTitle = accessibleProjects.length ? '没有找到匹配的项目' : !user ? '请先登录' : projects.length ? '暂无可查看的项目' : '暂时没有项目'
  const emptyDescription = accessibleProjects.length ? '试试更短的关键词，或者换一个方向。' : !user ? '登录以查看全部项目资料。' : projects.length ? '当前账号暂时无法查看这些项目。' : '项目资料还在整理中。'
  useEffect(() => { setPage(1) }, [filter, statusFilter, search])
  return <div className="page listing-page"><PageIntro eyebrow="PROJECT OS / 02" title="项目库" description="探索历届优秀项目，在真实实践中成长。" action={<button className="primary-button" onClick={() => user ? setSubmissionOpen(true) : navigate('#/login')}><Plus size={15} /> 提交项目</button>} />{!user && <div className="access-policy-note"><LockKeyhole size={16} /><div><strong>请先登录</strong><span>登录以查看全部项目资料；登录后也可以提交自己的项目。</span></div></div>}<FilterBar search={search} setSearch={setSearch} filters={categoryFilters} activeFilter={filter} setActiveFilter={setFilter} /><div className="library-toolbar"><span>项目状态</span>{(['全部', '招募中', '维护中', '已归档'] as const).map((status) => <button key={status} type="button" className={statusFilter === status ? 'active' : ''} onClick={() => setStatusFilter(status)}>{status === '招募中' ? '进行中' : status}</button>)}</div><div className="listing-grid">{paged.map((project) => <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />)}</div>{filtered.length === 0 && <div className="empty-state"><CircleHelp size={28} /><strong>{emptyTitle}</strong><span>{emptyDescription}</span></div>}{pageCount > 1 && <div className="library-pagination"><span>第 {safePage} / {pageCount} 页 · 共 {filtered.length} 个项目</span><div><button type="button" className="secondary-button admin-small-button" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><button type="button" className="secondary-button admin-small-button" disabled={safePage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>下一页</button></div></div>}{submissionOpen && <ProjectSubmissionModal categories={projectCategories} onClose={() => setSubmissionOpen(false)} />}</div>
}

function EventsPage() {
  const { data: { competitionEvents } } = useContent()
  const { user } = useAuth()
  const [selected, setSelected] = useState<CompetitionEvent | null>(null)
  const [search, setSearch] = useState('')
  const [seriesFilter, setSeriesFilter] = useState('全部赛事系列')
  const [statusFilter, setStatusFilter] = useState('全部状态')
  const [directoryScope, setDirectoryScope] = useState<CompetitionDirectoryScope>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => typeof window === 'undefined' ? 8 : window.innerWidth <= 640 ? 2 : window.innerWidth <= 760 ? 4 : window.innerWidth <= 1200 ? 6 : 8)
  const [now, setNow] = useState(() => new Date())
  const [reminderSet, setReminderSet] = useState(false)
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderBusy, setReminderBusy] = useState(false)
  const [reminderError, setReminderError] = useState('')
  const accessibleEvents = useMemo(() => competitionEvents.filter((event) => event.lifecycle !== 'draft' && event.status !== '草稿' && canViewContent(user, event.visibility)), [competitionEvents, user])
  useEffect(() => {
    const updatePageSize = () => setPageSize(window.innerWidth <= 640 ? 2 : window.innerWidth <= 760 ? 4 : window.innerWidth <= 1200 ? 6 : 8)
    window.addEventListener('resize', updatePageSize)
    return () => window.removeEventListener('resize', updatePageSize)
  }, [])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  // dbStatus 保留数据库里的原始状态：赛程还没录全时，靠它区分“主办方已明确在报名”与“确实还没消息”。
  const liveEvents = useMemo<LiveCompetitionEvent[]>(() => accessibleEvents.map((event) => ({ ...event, dbStatus: event.status, status: competitionStage(event, now) })), [accessibleEvents, now])
  const sortedEvents = useMemo(() => [...liveEvents].sort((a, b) => {
    const rankDifference = competitionSortRank(a) - competitionSortRank(b)
    if (rankDifference) return rankDifference
    const aNext = competitionNextMilestone(a, now)?.date.getTime() ?? Number.MAX_SAFE_INTEGER
    const bNext = competitionNextMilestone(b, now)?.date.getTime() ?? Number.MAX_SAFE_INTEGER
    return aNext - bNext || a.title.localeCompare(b.title, 'zh-CN')
  }), [liveEvents, now])
  const currentEvents = useMemo(() => sortedEvents.filter((event) => !isPastCompetition(event)), [sortedEvents])
  const pastEvents = useMemo(() => sortedEvents.filter(isPastCompetition), [sortedEvents])
  const scopedEvents = directoryScope === 'current' ? currentEvents : directoryScope === 'past' ? pastEvents : sortedEvents
  const seriesOptions = useMemo(() => ['全部赛事系列', ...Array.from(new Set(liveEvents.map((event) => event.seriesName?.trim()).filter(Boolean) as string[])).sort()], [liveEvents])
  const statusOptions = ['全部状态', '赛程待定', '即将报名', '报名中', '报名已截止', '即将开始', '比赛进行中', '等待结果', '已结束', '已归档']
  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return scopedEvents.filter((event) => {
      const matchesSearch = !keyword || `${event.title} ${event.seriesName ?? ''} ${event.type} ${event.organizer ?? ''} ${event.description}`.toLowerCase().includes(keyword)
      const matchesSeries = seriesFilter === '全部赛事系列' || event.seriesName === seriesFilter
      const matchesStatus = statusFilter === '全部状态'
        || (statusFilter === '已归档'
          ? event.lifecycle === 'archived'
          : competitionDisplayStatus(event) === statusFilter)
      return matchesSearch && matchesSeries && matchesStatus
    })
  }, [scopedEvents, search, seriesFilter, statusFilter])
  const reminderEvent = useMemo(() => {
    const withMilestone = currentEvents
      .map((event) => ({ event, milestone: competitionNextMilestone(event, now) }))
      .filter((item): item is { event: LiveCompetitionEvent; milestone: NonNullable<typeof item.milestone> } => Boolean(item.milestone))
      .sort((a, b) => a.milestone.date.getTime() - b.milestone.date.getTime())
    // 后台刚发布、官网还没出赛程的赛事没有未来节点，此时用第一场当前赛事占位，
    // 避免横幅落到“暂无公开赛事”的空白态。
    return withMilestone[0]?.event ?? currentEvents[0]
  }, [currentEvents, now])
  const reminderMilestone = reminderEvent ? competitionNextMilestone(reminderEvent, now) : undefined
  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pagedEvents = filteredEvents.slice((safePage - 1) * pageSize, safePage * pageSize)
  const emptyTitle = accessibleEvents.length ? '没有匹配的比赛' : '暂无公开赛事'
  const emptyDescription = accessibleEvents.length ? '换个关键词、系列或状态再试试。' : '管理员发布赛事信息后会显示在这里。'
  useEffect(() => { setPage(1) }, [search, seriesFilter, statusFilter, directoryScope, pageSize])
  useEffect(() => {
    let active = true
    setReminderSet(false)
    setReminderError('')
    if (!user?.id || !reminderEvent) {
      setReminderLoading(false)
      return () => { active = false }
    }

    setReminderLoading(true)
    void getCompetitionReminder(reminderEvent.id, user.id)
      .then((reminder) => { if (active) setReminderSet(reminder.enabled) })
      .catch((error) => {
        if (active) setReminderError(error instanceof Error ? `提醒状态暂时无法同步：${error.message}` : '提醒状态暂时无法同步。')
      })
      .finally(() => { if (active) setReminderLoading(false) })
    return () => { active = false }
  }, [user?.id, reminderEvent?.id])
  const toggleReminder = async () => {
    if (!user) { navigate('#/login'); return }
    if (!reminderEvent) { setReminderError('当前没有可提醒的赛事。'); return }
    setReminderBusy(true)
    setReminderError('')
    try {
      const result = await setCompetitionReminder(reminderEvent.id, !reminderSet, user.id)
      setReminderSet(result.enabled)
    } catch (error) {
      setReminderError(error instanceof Error ? error.message : '赛事提醒设置失败，请稍后重试。')
    } finally {
      setReminderBusy(false)
    }
  }
  return <div className="page listing-page events-page">
    <PageIntro eyebrow="COMPETITION HUB / 08" title="比赛中心" description="按赛事系列整理比赛，把报名、时间节点和历届成果放在同一处。" action={<button type="button" className="secondary-button" onClick={() => void toggleReminder()} disabled={reminderBusy || reminderLoading || !reminderMilestone} aria-pressed={reminderSet} aria-label={reminderEvent && reminderMilestone ? `${reminderSet ? '取消' : '设置'}「${reminderEvent.title}」的最近赛程提醒` : '当前没有未来赛程节点可提醒'} title={reminderEvent && reminderMilestone ? `提醒「${reminderEvent.title}」的下一个赛程节点` : '当前没有未来赛程节点可提醒'}><CalendarDays size={16} /> {!user ? '登录后提醒' : reminderLoading ? '读取提醒…' : reminderBusy ? '保存中…' : reminderSet ? '最近节点已提醒' : '提醒最近节点'}</button>} />
    {reminderError && <p className="event-reminder-feedback" role="status">{reminderError}</p>}
    <section className="event-next-milestone" aria-label="最近赛事节点">
      <div className="event-next-label"><CalendarDays size={16} /><span>下一个时间节点</span></div>
      <div className="event-next-copy">
        <strong>{reminderEvent?.title ?? '暂无公开赛事'}</strong>
        <span>{reminderMilestone ? `${reminderMilestone.label} · ${reminderMilestone.date.toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : reminderEvent ? `${competitionDisplayStatus(reminderEvent)}：官网尚未公布具体赛程节点，可先看详情里的赛道与报名入口` : '发布赛事后会显示最近的赛程节点'}</span>
      </div>
      {reminderEvent && <button type="button" className="text-button event-next-action" onClick={() => setSelected(reminderEvent)}>查看赛事 <ArrowUpRight size={13} /></button>}
    </section>
    <div className="event-directory-head"><h2>赛事列表</h2><span>显示 {filteredEvents.length} / {scopedEvents.length} 场</span></div>
    <div className="event-scope-tabs" role="tablist" aria-label="赛事范围">
      {([
        { value: 'all', label: '全部赛事', count: liveEvents.length },
        { value: 'current', label: '当前赛事', count: currentEvents.length },
        { value: 'past', label: '往届赛事', count: pastEvents.length },
      ] as const).map((scope) => <button key={scope.value} type="button" role="tab" aria-selected={directoryScope === scope.value} className={directoryScope === scope.value ? 'active' : ''} onClick={() => { setDirectoryScope(scope.value); setStatusFilter('全部状态') }}>{scope.label}<span>{scope.count}</span></button>)}
    </div>
    <div className="event-filter-bar"><label className="admin-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索比赛、系列或主办方" aria-label="搜索比赛" /></label><select value={seriesFilter} onChange={(event) => setSeriesFilter(event.target.value)} aria-label="按赛事系列筛选">{seriesOptions.map((option) => <option key={option}>{option}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="按状态筛选">{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></div>
    <div className="event-grid">{pagedEvents.map((event) => {
      const milestones = [
        { stage: 'registration', label: '报名截止', date: event.registrationEnd ? competitionDateLabel(event.registrationEnd) : event.deadline.startsWith('报名截止') ? event.deadline.replace(/^报名截止\s*/, '') : undefined },
        { stage: 'competition', label: '比赛开始', date: competitionDateLabel(event.eventStart ?? event.date) },
        { stage: 'results', label: '结果公布', date: event.resultDate ? competitionDateLabel(event.resultDate) : undefined },
      ].filter((item): item is { stage: string; label: string; date: string } => Boolean(item.date))
      const displayedStatus = competitionDisplayStatus(event)
      const statusTone = displayedStatus === '报名中' ? 'mint'
        : displayedStatus === '比赛进行中' || displayedStatus === '报名已截止' ? 'orange'
          : displayedStatus === '等待结果' ? 'violet'
            : displayedStatus === '已结束' ? 'neutral' : 'blue'
      return <article className={`event-card event-${event.accent}`} key={event.id}>
        <div className="event-card-copy">
          <div className="event-card-top"><Tag tone={event.lifecycle === 'archived' ? 'neutral' : statusTone}>{event.lifecycle === 'archived' ? '已归档' : displayedStatus}</Tag><span title={event.seriesName || event.type}>{event.seriesName || event.type}</span></div>
          <button type="button" className="event-card-title" onClick={() => setSelected(event)} aria-label={`查看${event.title}详情`}>{event.title}</button>
          <p className="event-card-description">{event.description}</p>
        </div>
        {milestones.length > 0 ? <div className="event-timeline" data-count={milestones.length} aria-label={`${event.title}赛程节点`}>
          {milestones.map((milestone) => <div className="event-timeline-point" data-stage={milestone.stage} key={milestone.stage}>
            <span className="event-timeline-dot" aria-hidden="true" />
            <span className="event-timeline-label">{milestone.label}</span>
            <strong>{milestone.date || '待定'}</strong>
          </div>)}
        </div> : <p className="event-timeline-pending">赛程节点待官网公布，报名入口见详情</p>}
        <div className="event-meta"><span className="event-card-subtitle" title={[event.organizer, event.type].filter(Boolean).join(' · ')}>{[event.organizer, event.type].filter(Boolean).join(' · ')}</span><button type="button" className="text-button" onClick={() => setSelected(event)}>查看详情 <ArrowUpRight size={13} /></button></div>
      </article>
    })}</div>
    {!filteredEvents.length && <div className="empty-state"><Trophy size={28} /><strong>{emptyTitle}</strong><span>{emptyDescription}</span></div>}
    {pageCount > 1 && <div className="library-pagination"><span>第 {safePage} / {pageCount} 页 · 共 {filteredEvents.length} 场比赛</span><div><button type="button" className="secondary-button admin-small-button" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><button type="button" className="secondary-button admin-small-button" disabled={safePage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>下一页</button></div></div>}
    {selected && <CompetitionDetailModal event={selected} onClose={() => setSelected(null)} />}
  </div>
}

function CompetitionDetailModal({ event, onClose }: { event: CompetitionEvent; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null)
  // 详情弹窗拿到的可能是列表里已经算过阶段的对象，也可能是原始记录；
  // 统一走同一个判定，避免弹窗标签和卡片标签说法不一致。
  const dbStatus = (event as LiveCompetitionEvent).dbStatus ?? event.status
  const displayedStatus = competitionDisplayStatus({ ...event, dbStatus })
  const milestones = [{ label: '报名开始', value: event.registrationStart }, { label: '报名截止', value: event.registrationEnd ?? event.deadline }, { label: '比赛开始', value: event.eventStart ?? event.date }, { label: '比赛结束', value: event.eventEnd }, { label: '结果公布', value: event.resultDate }].filter((item) => item.value)
  const officialUrl = safeLink(event.officialUrl)
  const tracks = (event.tracks ?? []).filter((track) => track.name.trim())
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null)
  const [trackQuery, setTrackQuery] = useState('')
  const visibleTracks = tracks.filter((track) => !trackQuery.trim() || `${track.name} ${track.format ?? ''} ${track.audience ?? ''} ${track.description ?? ''} ${track.requirements ?? ''} ${track.awards ?? ''}`.toLowerCase().includes(trackQuery.trim().toLowerCase()))
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ;(firstFocusable ?? dialogRef.current)?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])
  return <div className="admin-modal-scrim competition-detail-scrim" role="presentation" onClick={onClose}>
    <section
      ref={dialogRef}
      className="admin-editor-modal competition-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="competition-detail-title"
      tabIndex={-1}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { onClose(); return }
        if (event.key !== 'Tab' || !dialogRef.current) return
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        if (!focusable.length) { event.preventDefault(); dialogRef.current.focus(); return }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }}
    >
      <div className="admin-modal-head"><div><p className="eyebrow">COMPETITION / ARCHIVE</p><h2 id="competition-detail-title">{event.title}</h2><p>{event.description}</p></div><button type="button" className="icon-button small" onClick={onClose} aria-label="关闭比赛详情"><X size={16} /></button></div>
      <div className="competition-detail-meta"><Tag tone={event.lifecycle === 'archived' ? 'neutral' : displayedStatus === '报名中' || displayedStatus === '比赛进行中' ? 'mint' : displayedStatus === '已结束' ? 'neutral' : 'violet'}>{event.lifecycle === 'archived' ? '已归档' : displayedStatus}</Tag>{event.seriesName && <span><Layers3 size={14} /> {event.seriesName}</span>}{event.organizer && <span>{event.organizer}</span>}</div>
      {milestones.length > 0 ? <div className="competition-schedule"><div className="admin-card-head"><div><p className="eyebrow">SCHEDULE</p><h3>关键时间</h3></div><span>按赛程节点更新状态</span></div><div className="competition-schedule-grid">{milestones.map((milestone) => <div key={milestone.label}><span>{milestone.label}</span><strong>{competitionDateLabel(milestone.value)}</strong></div>)}</div></div> : <div className="competition-schedule-pending"><CalendarDays size={16} /><span>赛事赛程暂未公布，后续更新后会在这里显示。</span></div>}
      {officialUrl && <a className="competition-official-link" href={officialUrl} target={officialUrl.startsWith('#/') ? undefined : '_blank'} rel="noreferrer"><ExternalLink size={14} /> 打开官方报名入口</a>}
      {tracks.length > 0 && <div className="competition-tracks"><div className="competition-tracks-head"><div className="admin-card-head"><div><p className="eyebrow">COMPETITION TRACKS</p><h3>比赛赛道</h3></div><span>{tracks.length} 个赛道</span></div>{tracks.length > 4 && <label className="admin-search competition-track-search"><Search size={14} /><input value={trackQuery} onChange={(inputEvent) => setTrackQuery(inputEvent.target.value)} placeholder="搜索赛道" aria-label="搜索赛道" /></label>}</div><div className="competition-track-list">{visibleTracks.map((track) => {
        const registrationUrl = safeLink(track.registrationUrl)
        const rulesUrl = safeLink(track.rulesUrl)
        const registrationSummary = track.registrationEnd ? `报名截止 ${competitionDateLabel(track.registrationEnd)}` : track.registrationStart ? `报名开始 ${competitionDateLabel(track.registrationStart)}` : '报名时间待补充'
        const isExpanded = expandedTrackId === track.id
        const detailsId = `competition-track-details-${track.id}`
        // 说明与要求都没填时左列会整块留白，这里兜一句提示，避免只剩右列事实栏的怪排版。
        const hasTrackIntro = Boolean(track.description || track.requirements)
        const hasTrackFacts = Boolean(track.audience || track.format || track.teamSize || track.registrationStart || track.registrationEnd || track.awards || registrationUrl || rulesUrl)
        return <article className={`competition-track-item ${isExpanded ? 'is-expanded' : ''}`} key={track.id}>
          <button type="button" className="competition-track-toggle" aria-expanded={isExpanded} aria-controls={isExpanded ? detailsId : undefined} onClick={() => setExpandedTrackId(isExpanded ? null : track.id)}>
            <span className="competition-track-toggle-main"><strong>{track.name}</strong>{track.format && <small>{track.format}</small>}</span>
            <span className="competition-track-toggle-facts"><span>{track.audience || '参赛对象待补充'}</span>{track.teamSize && <span>队伍 {track.teamSize}</span>}<span>{registrationSummary}</span></span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          {isExpanded && <div className={`competition-track-details${hasTrackIntro ? '' : ' is-facts-only'}${hasTrackFacts ? '' : ' is-intro-only'}`} id={detailsId}>
            <div className="competition-track-detail-main">
              {track.description && <p className="competition-track-description">{track.description}</p>}
              {track.requirements && <div className="competition-track-requirements"><strong>参赛要求</strong><p>{track.requirements}</p></div>}
              {!hasTrackIntro && <p className="competition-track-pending">{hasTrackFacts ? '这个赛道还没补方向说明，先看右侧的赛制与报名信息。' : '这个赛道的介绍和报名信息还在整理中。'}</p>}
            </div>
            {hasTrackFacts && <div className="competition-track-detail-side">
              <dl className="competition-track-facts">
                {track.audience && <div><dt>参赛对象</dt><dd>{track.audience}</dd></div>}
                {track.format && <div><dt>赛制</dt><dd>{track.format}</dd></div>}
                {track.teamSize && <div><dt>队伍人数</dt><dd>{track.teamSize}</dd></div>}
                {track.registrationStart && <div><dt>报名开始</dt><dd>{competitionDateLabel(track.registrationStart)}</dd></div>}
                {track.registrationEnd && <div><dt>报名截止</dt><dd>{competitionDateLabel(track.registrationEnd)}</dd></div>}
                {track.awards && <div><dt>奖项</dt><dd>{track.awards}</dd></div>}
              </dl>
              {(registrationUrl || rulesUrl) && <div className="competition-track-links">
                {registrationUrl && <a href={registrationUrl} target={registrationUrl.startsWith('#/') ? undefined : '_blank'} rel="noreferrer"><ExternalLink size={13} /> 赛道报名</a>}
                {rulesUrl && <a href={rulesUrl} target={rulesUrl.startsWith('#/') ? undefined : '_blank'} rel="noreferrer"><ExternalLink size={13} /> 赛事规则</a>}
              </div>}
            </div>}
          </div>}
        </article>
      })}{visibleTracks.length === 0 && <div className="competition-track-no-results">没有找到匹配的赛道。</div>}</div></div>}
      <div className="competition-projects"><div className="admin-card-head"><div><p className="eyebrow">COHORT PROJECTS</p><h3>历届成果</h3></div><span>{event.projects?.length ?? 0} 个项目</span></div>{event.projects?.length ? <div className="competition-project-grid">{event.projects.map((project) => { const projectUrl = safeLink(project.projectUrl); const projectImage = safeImageSource(project.imageUrl); return <article className="competition-project-card" key={project.id}>{projectImage ? <img src={projectImage} alt="" /> : <div className="competition-project-placeholder"><Rocket size={22} /></div>}<div><span className="eyebrow">{project.cohort} 届</span><h4>{project.title}</h4><p>{project.description || '管理员还没有补充项目说明。'}</p>{projectUrl && <a href={projectUrl} target={projectUrl.startsWith('#/') ? undefined : '_blank'} rel="noreferrer" className="text-button">打开项目 <ExternalLink size={13} /></a>}</div></article> })}</div> : <div className="admin-empty"><Trophy size={22} /><strong>还没有历届成果</strong><span>管理员可以在后台关联项目库中的项目。</span></div>}</div>
      <div className="admin-modal-foot"><span>比赛资料由管理员维护</span><button type="button" className="secondary-button admin-small-button" onClick={onClose}>关闭</button></div>
    </section>
  </div>
}
const PROJECT_MILESTONE_PREVIEW_LIMIT = 6
const PROJECT_MILESTONE_DESKTOP_COLUMNS = 4
const PROJECT_MILESTONE_MOBILE_COLUMNS = 3
const PROJECT_MILESTONE_ROW_HEIGHT = 128

function ProjectMilestoneTimeline({ milestones }: { milestones: NonNullable<Project['milestones']> }) {
  const [expanded, setExpanded] = useState(false)
  const [columnCount, setColumnCount] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches ? PROJECT_MILESTONE_MOBILE_COLUMNS : PROJECT_MILESTONE_DESKTOP_COLUMNS)
  const [timelineWidth, setTimelineWidth] = useState(1000)
  const timelineRef = useRef<HTMLDivElement>(null)
  const visibleMilestones = expanded ? milestones : milestones.slice(0, PROJECT_MILESTONE_PREVIEW_LIMIT)
  const rowCount = Math.ceil(visibleMilestones.length / columnCount)
  const timelineHeight = rowCount * PROJECT_MILESTONE_ROW_HEIGHT
  const nodePoint = (index: number) => {
    const row = Math.floor(index / columnCount)
    const position = index % columnCount
    const rowItemCount = Math.min(columnCount, visibleMilestones.length - row * columnCount)
    const xPercent = visibleMilestones.length === 1
      ? 50
      : rowItemCount === 1
        ? (row % 2 === 0 ? columnCount - 0.5 : 0.5) / columnCount * 100
        : (row % 2 === 0 ? position + 0.5 : rowItemCount - position - 0.5) / rowItemCount * 100
    return {
      row,
      x: timelineWidth * xPercent / 100,
      xPercent,
      width: visibleMilestones.length === 1 ? 100 : rowItemCount === 1 ? 100 / columnCount : 100 / rowItemCount,
      y: row * PROJECT_MILESTONE_ROW_HEIGHT + 28,
    }
  }
  const connectorPath = visibleMilestones.map((_, index) => {
    const point = nodePoint(index)
    if (index === 0) return `M ${point.x} ${point.y}`
    const previous = nodePoint(index - 1)
    if (point.row === previous.row) return `L ${point.x} ${point.y}`
    const turnX = previous.row % 2 === 0 ? timelineWidth - 2 : 2
    const turnDirection = Math.sign(turnX - previous.x)
    const cornerRadius = Math.min(10, Math.abs(turnX - previous.x), Math.abs(turnX - point.x), (point.y - previous.y) / 2)
    return [
      `L ${turnX - turnDirection * cornerRadius} ${previous.y}`,
      `Q ${turnX} ${previous.y} ${turnX} ${previous.y + cornerRadius}`,
      `L ${turnX} ${point.y - cornerRadius}`,
      `Q ${turnX} ${point.y} ${turnX - turnDirection * cornerRadius} ${point.y}`,
      `L ${point.x} ${point.y}`,
    ].join(' ')
  }).join(' ')
  const hiddenCurrentMilestone = !expanded
    ? milestones.slice(visibleMilestones.length).find((milestone) => milestone.status === '进行中')
    : undefined

  useEffect(() => {
    const breakpoint = window.matchMedia('(max-width: 760px)')
    const updateColumnCount = () => setColumnCount(breakpoint.matches ? PROJECT_MILESTONE_MOBILE_COLUMNS : PROJECT_MILESTONE_DESKTOP_COLUMNS)
    updateColumnCount()
    breakpoint.addEventListener('change', updateColumnCount)
    return () => breakpoint.removeEventListener('change', updateColumnCount)
  }, [])

  useEffect(() => {
    const timeline = timelineRef.current
    if (!timeline || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      if (width > 0) setTimelineWidth((current) => current === width ? current : width)
    })
    observer.observe(timeline)
    return () => observer.disconnect()
  }, [])

  return <>
    <div ref={timelineRef} className="project-timeline-snake" style={{ height: `${timelineHeight}px` }} aria-label="项目族谱时间线">
      <svg className="project-timeline-snake-path" viewBox={`0 0 ${timelineWidth} ${timelineHeight}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={connectorPath} />
      </svg>
      {visibleMilestones.map((milestone, index) => {
        const status = milestone.status ?? '计划中'
        const point = nodePoint(index)
        return <article
          className={`timeline-item project-milestone-item ${status === '进行中' ? 'active' : ''}`}
          key={milestone.id}
          style={{ left: `${point.xPercent}%`, top: `${point.row * PROJECT_MILESTONE_ROW_HEIGHT}px`, width: `${point.width}%` }}
        >
          <span className="timeline-year">{milestone.year}</span>
          <div className="project-timeline-copy">
            <strong>{milestone.title} {status === '进行中' && <Tag tone="violet">进行中</Tag>}</strong>
            <span>{milestone.summary || '管理员还没有补充阶段说明。'}</span>
          </div>
        </article>
      })}
    </div>
    {milestones.length > PROJECT_MILESTONE_PREVIEW_LIMIT && <div className="project-timeline-snake-footer">
      {hiddenCurrentMilestone && <span className="project-timeline-current-note"><strong>当前进行中</strong>{hiddenCurrentMilestone.title}</span>}
      <button type="button" className={`project-timeline-toggle ${expanded ? 'is-expanded' : ''}`} onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        {expanded ? '收起族谱' : `展开全部（${milestones.length} 个阶段）`}<ChevronDown size={14} />
      </button>
    </div>}
  </>
}

function ProjectDetailPage({ project: initialProject, slug, onNavigate }: { project?: Project; slug: string; onNavigate: (path: string) => void }) {
  const { user } = useAuth()
  const { data: { members }, recordProjectView } = useContent()
  const [project, setProject] = useState<Project | undefined>(initialProject)
  const [detailLoading, setDetailLoading] = useState(Boolean(slug))
  const [detailError, setDetailError] = useState('')
  const [joinBusy, setJoinBusy] = useState(false)
  const [joinSubmitted, setJoinSubmitted] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const recordedProjectViews = useRef(new Set<string>())
  const galleryImages = (project?.galleryImages ?? []).map((image) => safeImageSource(image)).filter((image): image is string => Boolean(image))
  useEffect(() => {
    let active = true
    setProject(initialProject)
    setDetailError('')
    if (!slug) {
      setDetailLoading(false)
      return () => { active = false }
    }
    setDetailLoading(true)
    void getProject(slug).then((result) => {
      if (active) setProject((current) => result ? { ...result, views: typeof current?.views === 'number' ? current.views : result.views } : result)
    }).catch((error) => {
      if (active && !initialProject) setDetailError(error instanceof Error ? error.message : '项目详情加载失败，请稍后重试。')
    }).finally(() => {
      if (active) setDetailLoading(false)
    })
    return () => { active = false }
  }, [initialProject, slug])
  useEffect(() => { setJoinBusy(false); setJoinSubmitted(false); setJoinError('') }, [project?.id])
  useEffect(() => {
    const id = project?.id
    if (!id || !canViewContent(user, project.visibility) || recordedProjectViews.current.has(id)) return
    recordedProjectViews.current.add(id)
    void recordProjectView(id).then((views) => {
      setProject((current) => current?.id === id ? { ...current, views } : current)
    }).catch(() => {
      // View tracking must never block the detail page.
      recordedProjectViews.current.delete(id)
    })
  }, [project?.id, project?.visibility, recordProjectView, user])
  useEffect(() => { setActiveGalleryIndex(0); setSelectedImage(null) }, [project?.id])
  useEffect(() => {
    if (galleryImages.length < 2) return
    const timer = window.setInterval(() => setActiveGalleryIndex((index) => (index + 1) % galleryImages.length), 5000)
    return () => window.clearInterval(timer)
  }, [galleryImages.length])
  if (detailLoading && !project) return <div className="page"><div className="empty-state"><RefreshCw size={28} /><strong>正在加载项目详情</strong><span>正在同步项目资料，请稍候。</span></div></div>
  if (detailError && !project) return <div className="page"><div className="empty-state"><CircleHelp size={28} /><strong>项目详情暂时不可用</strong><span>{detailError}</span><button className="secondary-button" onClick={() => onNavigate('#/projects')}>返回项目库</button></div></div>
  if (!project) return <div className="page"><div className="empty-state"><Rocket size={28} /><strong>项目暂不可用</strong><span>项目数据尚未同步，请稍后再试。</span><button className="secondary-button" onClick={() => onNavigate('#/projects')}>返回项目库</button></div></div>
  if (!canViewContent(user, project.visibility)) {
    const accessDescription = !user ? '登录后可以查看这个项目。' : project.visibility === 'contributors' ? '升级为组员后才能查看完整项目资料。' : '当前账号暂时无法查看这个项目。'
    return <div className="page"><div className="empty-state access-denied-state"><LockKeyhole size={28} /><strong>{!user ? '请先登录' : '这个项目需要更高权限'}</strong><span>{accessDescription}</span><button className="primary-button" onClick={() => onNavigate(user ? '#/tools' : '#/login')}>{user ? '返回工作台' : '去登录'} <ArrowRight size={15} /></button></div></div>
  }
  const projectMemberData = resolveProjectMembers(project.memberIds ?? [], members)
  const projectMembers = projectMemberData.members
  const milestones = project.milestones ?? []
  const logs = project.logs ?? []
  const visibleMembers = projectMembers
  const collaboratorCount = project.memberIds?.length ? projectMemberData.memberIds.length : project.members
  const previewMembers = visibleMembers.slice(0, 5)
  const remainingMemberCount = Math.max(collaboratorCount - previewMembers.length, 0)
  const favoriteCount = project.favoriteCount ?? project.stars
  const stackCount = project.stack.length
  const difficulty = Math.min(5, Math.max(1, project.difficulty || 1))
  const difficultyLabel = ['未设置', '入门', '基础', '进阶', '熟练', '挑战'][difficulty]
  const fallbackInitials = (name: string) => name.slice(0, 2)
  const requestToJoin = async () => {
    if (!user) { onNavigate('#/login'); return }
    if (project.joinEnabled === false || joinBusy || joinSubmitted) return
    setJoinBusy(true)
    setJoinError('')
    try {
      await submitProjectJoinRequest(project.id, { userId: user.id, userName: user.name, message: project.joinNote })
      setJoinSubmitted(true)
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : '加入申请提交失败，请稍后重试。')
    } finally {
      setJoinBusy(false)
    }
  }
  return (
    <div className="page project-detail-page">
      <button className="back-link" onClick={() => onNavigate('#/projects')}><ChevronLeft size={16} /> 返回项目库</button>
      <div className="detail-hero">
        <div>
          <div className="detail-kicker"><Tag tone="mint">{project.status}</Tag><span>{project.year} · {project.category}</span></div>
          <h1>{project.name}</h1>
          <p>{project.intro || project.description}</p>
          <div className="detail-actions">
            {safeLink(project.githubUrl) ? <a className="primary-button" href={safeLink(project.githubUrl)} target="_blank" rel="noreferrer"><Github size={16} /> 查看 GitHub</a> : <button type="button" className="primary-button detail-action-disabled" disabled title="管理员尚未配置有效的 GitHub 地址"><Github size={16} /> GitHub 未配置</button>}
            {safeLink(project.docsUrl) ? <a className="secondary-button" href={safeLink(project.docsUrl)} target={project.docsUrl?.startsWith('#/') ? undefined : '_blank'} rel="noreferrer"><FileText size={16} /> 项目文档</a> : <button type="button" className="secondary-button detail-action-disabled" disabled title="管理员尚未配置有效的项目文档"><FileText size={16} /> 文档未配置</button>}
            {safeLink(project.demoUrl) && <a className="secondary-button" href={safeLink(project.demoUrl)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> 在线演示</a>}
            {safeLink(project.downloadUrl) && <a className="secondary-button" href={safeLink(project.downloadUrl)} target="_blank" rel="noreferrer"><Download size={15} /> 下载项目文件</a>}
            {safeLink(project.issueUrl) && <a className="text-button" href={safeLink(project.issueUrl)} target="_blank" rel="noreferrer">反馈 Issue <ArrowUpRight size={14} /></a>}
            <FavoriteButton targetType="project" targetId={project.id} initialCount={project.favoriteCount ?? project.stars} initialFavorited={project.isFavorited} />
          </div>
        </div>
        <ProjectVisual project={project} />
      </div>
      {galleryImages.length > 0 && <section className="panel project-gallery" aria-labelledby="project-gallery-title"><div className="project-gallery-head"><div><p className="eyebrow">PROJECT SHOWCASE</p><h2 id="project-gallery-title">项目展示</h2></div><span>{galleryImages.length} 张图片</span></div><div className="project-gallery-main-wrap"><button type="button" className="project-gallery-main" onClick={() => setSelectedImage(galleryImages[activeGalleryIndex])} aria-label="查看当前项目展示大图"><img src={galleryImages[activeGalleryIndex]} alt={`${project.name} 项目展示`} /><span><Maximize2 size={15} /> 查看大图</span></button>{galleryImages.length > 1 && <><button type="button" className="project-gallery-nav prev" onClick={() => setActiveGalleryIndex((index) => (index - 1 + galleryImages.length) % galleryImages.length)} aria-label="上一张项目图片"><ChevronLeft size={18} /></button><button type="button" className="project-gallery-nav next" onClick={() => setActiveGalleryIndex((index) => (index + 1) % galleryImages.length)} aria-label="下一张项目图片"><ChevronRight size={18} /></button></>}</div>{galleryImages.length > 1 && <div className="project-gallery-thumbs">{galleryImages.map((image, index) => <button type="button" key={`${image}-${index}`} className={index === activeGalleryIndex ? 'active' : ''} onClick={() => setActiveGalleryIndex(index)} aria-label={`切换到第 ${index + 1} 张项目图片`}><img src={image} alt="" /></button>)}</div>}</section>}
      <div className="detail-grid">
        <main>
          <section className="panel detail-section">
            <SectionHeading eyebrow="PROJECT STORY" title="项目介绍" />
            <p className="prose">{project.intro || project.description}</p>
            <div className="detail-tags">{project.stack.map((tag) => <Tag tone="blue" key={tag}>{tag}</Tag>)}</div>
          </section>
          <section className="panel detail-section">
            <SectionHeading eyebrow="PROJECT HISTORY" title="项目族谱" />
            {milestones.length ? <ProjectMilestoneTimeline key={project.id} milestones={milestones} /> : <div className="empty-state detail-inline-empty"><History size={21} /><strong>项目族谱尚未配置</strong><span>管理员可以在项目库编辑器中添加项目阶段。</span></div>}
          </section>
          <section className="panel detail-section">
            <SectionHeading eyebrow="SHIP LOG" title="开发日志" />
            {logs.length ? <div className="project-log-list">{logs.map((log) => { const author = log.author || '项目成员'; const authorMember = members.find((member) => member.name === author); return <div className="log-row" key={log.id}><span className="log-date">{log.date}</span><div><strong>{log.title}</strong><p>{log.detail}</p></div><span className="log-author"><Avatar initials={log.authorInitials || fallbackInitials(author)} name={author} avatarUrl={authorMember?.avatarUrl} size="sm" /> {author}</span></div> })}</div> : <div className="empty-state detail-inline-empty"><ScrollText size={21} /><strong>还没有开发日志</strong><span>管理员可以在项目库编辑器中记录进展。</span></div>}
          </section>
        </main>
        <aside className="detail-aside">
          <section className="panel match-card">
            <p className="eyebrow">PROJECT SNAPSHOT</p>
            <div className="project-snapshot-metrics"><div className="project-snapshot-metric"><span>协作成员</span><strong>{collaboratorCount}<small>人</small></strong></div><div className="project-snapshot-metric"><span>收藏</span><strong>{favoriteCount}<small>次</small></strong></div><div className="project-snapshot-metric"><span>技术栈</span><strong>{stackCount}<small>项</small></strong></div><div className="project-snapshot-metric"><span>浏览</span><strong>{(project.views ?? 0).toLocaleString()}<small>次</small></strong></div></div>
            <div className="project-snapshot-difficulty"><div><span>项目难度</span><strong>{difficulty}/5</strong></div><div className="project-difficulty-stars" aria-label={`项目难度 ${difficulty} 级`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < difficulty ? 'currentColor' : 'none'} />)}</div><small>{difficultyLabel}难度 · 由项目提交者设置，管理员可调整</small></div>
            <div className="match-copy"><strong>当前状态</strong><div><Tag tone={project.status === '招募中' ? 'mint' : 'blue'}>{project.status}</Tag><Tag tone="blue">{project.year}</Tag></div><strong>技术栈</strong><div>{project.stack.slice(0, 4).map((tag) => <Tag tone="blue" key={tag}>{tag}</Tag>)}</div></div>
            <button className="primary-button full-button" onClick={() => onNavigate('#/learning')}>查看学习路线 <ArrowRight size={15} /></button>
          </section>
          <section className="panel team-card">
            <p className="eyebrow">PROJECT CREW</p>
            <div className="team-avatars">{previewMembers.map((member) => <Avatar key={member.id} initials={member.initials} name={member.name} avatarUrl={member.avatarUrl} accent={member.accent} />)}{remainingMemberCount > 0 && <span aria-label={`还有 ${remainingMemberCount} 位成员`}>+{remainingMemberCount}</span>}{!previewMembers.length && <span className="team-empty">待配置</span>}</div>
            {visibleMembers.length > 0 && <div className="project-member-list" aria-label="项目协作成员">{visibleMembers.map((member) => <div className="project-member-row" key={`detail-${member.id}`}><Avatar initials={member.initials} name={member.name} avatarUrl={member.avatarUrl} accent={member.accent} size="sm" /><span className="project-member-info"><strong>{member.name}</strong><small>{member.role}{member.direction ? ` · ${member.direction}` : ''}</small></span></div>)}</div>}
            <strong>{collaboratorCount} 位成员正在协作</strong>
            <small>{projectMemberData.unresolvedCount > 0 ? `另有 ${projectMemberData.unresolvedCount} 位成员尚未关联成员资料。` : project.joinNote || '项目协作成员由管理员维护。'}</small>
            {joinError && <p className="login-error" role="alert">{joinError}</p>}
            <button type="button" className="secondary-button full-button" disabled={project.joinEnabled === false || joinBusy || joinSubmitted} onClick={() => void requestToJoin()}>{project.joinEnabled === false ? '暂不开放加入' : joinSubmitted ? '申请已提交' : joinBusy ? '提交中…' : user ? '申请加入项目' : '登录后申请加入'}</button>
          </section>
        </aside>
      </div>
      {selectedImage && <div className="project-image-lightbox" role="presentation" onClick={() => setSelectedImage(null)}><section role="dialog" aria-modal="true" aria-label="项目展示大图" onClick={(event) => event.stopPropagation()}><button type="button" className="icon-button small" onClick={() => setSelectedImage(null)} aria-label="关闭项目展示大图"><X size={16} /></button><img src={selectedImage} alt={`${project.name} 项目展示大图`} /></section></div>}
    </div>
  )
}

const RESOURCE_LIST_STATE_KEY = 'club-resource-list-state-v1'
const RESOURCE_DETAIL_ORIGIN_KEY = 'club-resource-detail-origin-v1'

type ResourceListState = { search: string; filter: string; sort: 'hot' | 'new'; page: number; scrollY: number }

function readResourceListState(): ResourceListState | null {
  try {
    const raw = window.sessionStorage.getItem(RESOURCE_LIST_STATE_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(RESOURCE_LIST_STATE_KEY)
    const value = JSON.parse(raw) as Partial<ResourceListState>
    return {
      search: typeof value.search === 'string' ? value.search : '',
      filter: typeof value.filter === 'string' ? value.filter : '全部',
      sort: value.sort === 'new' ? 'new' : 'hot',
      page: typeof value.page === 'number' && value.page > 0 ? Math.trunc(value.page) : 1,
      scrollY: typeof value.scrollY === 'number' && value.scrollY >= 0 ? value.scrollY : 0,
    }
  } catch {
    return null
  }
}

function ResourcesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data: { resources, resourceCategories } } = useContent()
  const { user } = useAuth()
  const [restoredState] = useState(readResourceListState)
  const [search, setSearch] = useState(restoredState?.search ?? '')
  const [filter, setFilter] = useState(restoredState?.filter ?? '全部')
  const [sort, setSort] = useState<'hot' | 'new'>(restoredState?.sort ?? 'hot')
  const [page, setPage] = useState(restoredState?.page ?? 1)
  const [contributionOpen, setContributionOpen] = useState(false)
  const pageSize = 10
  const filters = useMemo(() => ['全部', ...resourceCategories.filter((category) => category.enabled).sort((a, b) => a.order - b.order).map((category) => category.key)], [resourceCategories])
  useEffect(() => { if (!filters.includes(filter)) setFilter('全部') }, [filters, filter])
  useEffect(() => {
    if (restoredState?.scrollY === undefined) return
    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => window.scrollTo({ top: restoredState.scrollY, behavior: 'instant' }))
    })
    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
    }
  }, [restoredState])
  const lockedCount = resources.filter((item) => !canViewContent(user, item.visibility)).length
  const visible = useMemo(() => resources.filter((item) => canViewContent(user, item.visibility) && !['draft', 'pending', 'archived', 'offline'].includes(item.status ?? 'published') && (filter === '全部' || item.category === filter) && (item.title + item.description + item.tags.join('')).toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === 'hot' ? b.views - a.views : (b.updatedAt ?? b.updated).localeCompare(a.updatedAt ?? a.updated)), [resources, user, filter, search, sort])
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const paged = visible.slice((safePage - 1) * pageSize, safePage * pageSize)
  const changeFilter = (value: string) => { setFilter(value); setPage(1) }
  const changeSearch = (value: string) => { setSearch(value); setPage(1) }
  const changeSort = () => { setSort((value) => value === 'hot' ? 'new' : 'hot'); setPage(1) }
  const openResource = (resource: Resource) => {
    try {
      window.sessionStorage.setItem(RESOURCE_LIST_STATE_KEY, JSON.stringify({ search, filter, sort, page: safePage, scrollY: window.scrollY } satisfies ResourceListState))
      window.sessionStorage.setItem(RESOURCE_DETAIL_ORIGIN_KEY, 'list')
    } catch { /* Session storage may be unavailable. */ }
    onNavigate('#/resources/' + encodeURIComponent(resource.id))
  }
  return <div className="page listing-page"><PageIntro eyebrow="KNOWLEDGE BASE / 03" title="资源库" description="学习资料、路线与实践文档，来自每一届成员的真实积累。" action={<div className="resource-page-actions"><button className="secondary-button" onClick={() => onNavigate('#/resources/prompts')}><Sparkles size={16} /> Prompt 模板库</button><button className="primary-button" onClick={() => user ? setContributionOpen(true) : onNavigate('#/login')}><Send size={16} /> {user ? '贡献资料' : '登录后投稿'}</button></div>} />
    {!user && <div className="access-policy-note"><LockKeyhole size={16} /><div><strong>请先登录</strong><span>登录以查看全部资源；登录后也可以贡献资料。</span></div><button className="text-button" onClick={() => onNavigate('#/login')}>去登录 <ArrowRight size={14} /></button></div>}
    {lockedCount > 0 && user && <div className="access-policy-note"><LockKeyhole size={16} /><div><strong>还有 {lockedCount} 份资料需要组员权限</strong><span>升级为组员后可以查看全部受限资料。</span></div></div>}
    <div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(event) => changeSearch(event.target.value)} placeholder="搜索资源、标签..." aria-label="搜索资源" /></div><div className="filter-pills">{filters.map((item) => <button key={item} className={'filter-pill ' + (filter === item ? 'active' : '')} onClick={() => changeFilter(item)}>{item === '全部' ? item : contentCategoryLabel(resourceCategories, item)}</button>)}</div><button className="filter-sort" onClick={changeSort}><Filter size={15} /> {sort === 'hot' ? '热门' : '最新'} <ChevronDown size={14} /></button></div>
    <div className="resource-list">{paged.map((item) => <ResourceRow key={item.id} resource={item} categories={resourceCategories} onOpen={openResource} />)}</div>
    {visible.length === 0 && <div className="empty-state"><CircleHelp size={28} /><strong>{!user ? '请先登录' : lockedCount ? '需要组员权限' : '还没有这类资源'}</strong><span>{!user ? '登录以查看全部资源。' : lockedCount ? '升级为组员后可以查看全部受限资料。' : '换个关键词，或者贡献一份资料吧。'}</span></div>}
    {pageCount > 1 && <div className="library-pagination"><span>第 {safePage} / {pageCount} 页 · 共 {visible.length} 份资源</span><div><button type="button" className="secondary-button admin-small-button" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><button type="button" className="secondary-button admin-small-button" disabled={safePage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>下一页</button></div></div>}
    {contributionOpen && <ContributionSubmissionModal onClose={() => setContributionOpen(false)} />}
  </div>
}

function resolveResourceFileUrl(value?: string) {
  const source = value?.trim()
  if (!source) return undefined
  if (source.startsWith('#/')) return undefined
  try {
    const baseUrl = apiConfig.baseUrl || window.location.origin
    const resolved = new URL(source, baseUrl)
    return resolved.protocol === 'https:' || resolved.protocol === 'http:' ? resolved.href : undefined
  } catch {
    return undefined
  }
}

function downloadResourceMarkdown(title: string, content: string) {
  const safeTitle = Array.from(title.trim(), (character) => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127 || '<>:"/\\|?*'.includes(character) ? '_' : character
  }).join('')
    .replace(/\s+/g, ' ')
    .slice(0, 80) || 'resource'
  const filename = /\.md$/i.test(safeTitle) ? safeTitle : `${safeTitle}.md`
  const blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0)
}

function resolveResourceDownloadUrl(attachment: ResourceAttachment) {
  const uploadedAssetId = attachment.assetId || (() => {
    try {
      const fileUrl = new URL(attachment.url, apiConfig.baseUrl || window.location.origin)
      return fileUrl.pathname.split('/').pop()
    } catch {
      return undefined
    }
  })()

  // 上传文件通过同源 API 路由返回 attachment 响应，避免跨域时浏览器忽略 download 属性。
  if (uploadedAssetId && /^[a-f0-9]{32}\.(pdf|doc|docx|ppt|pptx|xls|xlsx|zip|txt|md|png|jpg|jpeg|webp)$/i.test(uploadedAssetId)) {
    const filename = new URLSearchParams({ filename: attachment.name })
    return `/api/uploads/${encodeURIComponent(uploadedAssetId)}/download?${filename.toString()}`
  }

  return resolveResourceFileUrl(attachment.url)
}

function resourceFileKind(attachment: ResourceAttachment, url?: string) {
  const value = `${attachment.mimeType ?? ''} ${attachment.name} ${url ?? ''}`.toLowerCase()
  if (value.includes('application/pdf') || /\.pdf(?:$|[?#])/.test(value)) return 'pdf'
  if (value.includes('image/') || /\.(png|jpe?g|webp|gif|avif)(?:$|[?#])/.test(value)) return 'image'
  return 'file'
}

function ResourceDetailPage({ resourceId, onNavigate }: { resourceId: string; onNavigate: (path: string) => void }) {
  const { data: { resources, resourceCategories }, loading, recordResourceView } = useContent()
  const { user } = useAuth()
  const resource = resources.find((item) => String(item.id) === resourceId)
  const currentResourceId = resource?.id
  const [freshResource, setFreshResource] = useState<Resource>()
  const [detailFavoriteCount, setDetailFavoriteCount] = useState<number | undefined>(resource?.favoriteCount)
  const [canReturnToList] = useState(() => {
    try {
      const fromList = window.sessionStorage.getItem(RESOURCE_DETAIL_ORIGIN_KEY) === 'list'
      window.sessionStorage.removeItem(RESOURCE_DETAIL_ORIGIN_KEY)
      return fromList
    } catch { return false }
  })
  const [previewIndex, setPreviewIndex] = useState(0)
  const [viewRecorded, setViewRecorded] = useState(false)
  const [resourceViews, setResourceViews] = useState<number | undefined>(resource?.views)
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null)
  const [copyErrorLinkIndex, setCopyErrorLinkIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!currentResourceId) {
      setFreshResource(undefined)
      return
    }
    let active = true
    setFreshResource(undefined)
    void getResource(currentResourceId).then((latest) => {
      if (active && latest) setFreshResource(latest)
    }).catch(() => undefined)
    return () => { active = false }
  }, [currentResourceId])

  useEffect(() => {
    setResourceViews(resource?.views)
  }, [resource?.id, resource?.views])
  useEffect(() => {
    setDetailFavoriteCount(freshResource?.id === resource?.id ? freshResource?.favoriteCount : resource?.favoriteCount)
  }, [freshResource, resource?.id, resource?.favoriteCount])
  useEffect(() => {
    if (!resource || !canViewContent(user, resource.visibility) || viewRecorded) return
    setViewRecorded(true)
    void recordResourceView(resource.id).then(setResourceViews).catch(() => setViewRecorded(false))
  }, [recordResourceView, resource, user, viewRecorded])
  useEffect(() => {
    if (copiedLinkIndex === null && copyErrorLinkIndex === null) return undefined
    const timer = window.setTimeout(() => {
      setCopiedLinkIndex(null)
      setCopyErrorLinkIndex(null)
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [copiedLinkIndex, copyErrorLinkIndex])

  if (!resource && loading) return <div className="page resource-detail-page"><div className="resource-detail-state"><RefreshCw size={18} className="spin" /><strong>正在加载资源</strong><span>正在读取资源详情。</span></div></div>
  if (!resource) return <div className="page resource-detail-page"><div className="resource-detail-state"><Folder size={22} /><strong>找不到这份资源</strong><span>资源可能已下架，或链接不再有效。</span><button type="button" className="secondary-button" onClick={() => onNavigate('#/resources')}><ChevronLeft size={15} /> 返回资源库</button></div></div>
  if (!canViewContent(user, resource.visibility)) return <div className="page resource-detail-page"><div className="resource-detail-state"><LockKeyhole size={22} /><strong>这份资源需要组员权限</strong><span>登录并加入小组后即可查看受限内容。</span><div><button type="button" className="secondary-button" onClick={() => onNavigate('#/resources')}><ChevronLeft size={15} /> 返回资源库</button><button type="button" className="primary-button" onClick={() => onNavigate('#/login')}>前往登录 <ArrowRight size={15} /></button></div></div></div>

  const detailResource = freshResource?.id === resource.id ? freshResource : resource
  const accessMode = resource.accessMode ?? (resource.content ? 'article' : resource.downloadUrl || resource.attachments?.length ? 'attachment' : 'external_link')
  const category = contentCategoryLabel(resourceCategories, resource.category)
  const updated = resource.updatedAt ? new Date(resource.updatedAt) : null
  const updatedLabel = updated && !Number.isNaN(updated.getTime()) ? updated.toLocaleDateString('zh-CN') : resource.updated || '时间待同步'
  const attachments = resource.attachments?.length
    ? resource.attachments
    : resource.downloadUrl ? [{ name: resource.sourceName || '资源附件', url: resource.downloadUrl }] : []
  const activeAttachment = attachments[previewIndex] ?? attachments[0]
  const activeFileUrl = activeAttachment ? resolveResourceFileUrl(activeAttachment.url) : undefined
  const activeFileKind = activeAttachment ? resourceFileKind(activeAttachment, activeFileUrl) : 'file'
  const resourceLinkSource = resource.links?.some((link) => link.url.trim()) ? resource.links : resource.resourceUrl ? [{ title: '外部资源', url: resource.resourceUrl }] : resource.links ?? []
  const externalLinks = resourceLinkSource.flatMap((link) => {
    const url = resolveResourceFileUrl(link.url)
    return url ? [{ ...link, resolvedUrl: url }] : []
  })
  const views = Math.max(0, Math.trunc(resourceViews ?? resource.views ?? 0))
  const backToList = () => {
    if (canReturnToList && window.history.length > 1) window.history.back()
    else onNavigate('#/resources')
  }
  const copyExternalLink = async (index: number, url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLinkIndex(index)
      setCopyErrorLinkIndex(null)
    } catch {
      setCopiedLinkIndex(null)
      setCopyErrorLinkIndex(index)
    }
  }

  return <div className="page resource-detail-page">
    <div className="resource-detail-crumb"><button type="button" className="resource-detail-back" onClick={backToList}><ChevronLeft size={16} /> 返回资源库</button><span>/</span><span>{category}</span></div>
    <header className="resource-detail-heading">
      <div className="resource-detail-title-block">
        <div className="resource-detail-kicker"><span className="resource-detail-kind-icon"><FileText size={15} /></span><span>{accessMode === 'article' ? '站内阅读' : accessMode === 'attachment' ? '文件资料' : '外部资源'}</span><i />{resourceTypeLabel(resource.type)}</div>
        <h1>{resource.title}</h1>
        <p>{resource.description}</p>
        <div className="resource-detail-tags"><Tag tone="blue">{category}</Tag>{resource.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
      </div>
    </header>

    <div className="resource-detail-layout">
      <main className="resource-detail-main">
        {accessMode === 'article' ? <section className="resource-reader" aria-label="资源正文">
          <div className="resource-reader-head"><span><BookOpen size={15} /> 正文</span><div className="resource-reader-actions"><small>{resource.content ? `${resource.content.length.toLocaleString()} 字符` : '内容待补充'}</small>{resource.content && <button type="button" className="resource-reader-download" onClick={() => downloadResourceMarkdown(resource.title, resource.content ?? '')}><Download size={14} /> 下载 Markdown</button>}</div></div>
          {resource.content ? <article className="resource-reader-content"><ResourceMarkdown content={resource.content} /></article> : <div className="resource-detail-state compact"><FileText size={20} /><strong>正文暂未提供</strong><span>请查看资源说明，或联系投稿人补充内容。</span></div>}
        </section> : accessMode === 'attachment' ? <section className="resource-file-viewer" aria-label="资源文件预览">
          <div className="resource-file-viewer-head"><span>{activeAttachment?.name ?? '资源附件'}</span><span>{activeAttachment?.size ? `${(activeAttachment.size / 1024 / 1024).toFixed(1)} MB` : activeAttachment?.mimeType || '附件预览'}</span>{activeAttachment && activeFileUrl && <a className="resource-file-download" href={resolveResourceDownloadUrl(activeAttachment)} download={activeAttachment.name}><Download size={14} /> 下载此文件</a>}</div>
          {activeAttachment && activeFileUrl && activeFileKind === 'image' && <div className="resource-image-stage"><img src={activeFileUrl} alt={activeAttachment.name} /></div>}
          {activeAttachment && activeFileUrl && activeFileKind === 'pdf' && <iframe className="resource-pdf-frame" src={activeFileUrl} title={`${resource.title} PDF 预览`} />}
          {activeAttachment && (!activeFileUrl || activeFileKind === 'file') && <div className="resource-file-fallback"><span><FileText size={25} /></span><strong>{activeAttachment.name}</strong><small>{activeFileUrl ? '此文件格式暂不支持网页预览，请使用上方按钮下载后查看。' : '文件地址暂不可用，请联系管理员检查资源附件。'}</small></div>}
          {!activeAttachment && <div className="resource-file-fallback"><span><Folder size={25} /></span><strong>尚未添加资源文件</strong><small>请查看资源说明，或联系管理员补充附件。</small></div>}
          {attachments.length > 1 && <div className="resource-attachment-list" aria-label="资源附件列表">{attachments.map((attachment, index) => <button type="button" key={`${attachment.assetId ?? attachment.id ?? attachment.url}-${index}`} className={index === previewIndex ? 'active' : ''} onClick={() => setPreviewIndex(index)}><FileText size={15} /><span><strong>{attachment.name}</strong><small>{attachment.mimeType || '附件'}{attachment.size ? ` · ${(attachment.size / 1024 / 1024).toFixed(1)} MB` : ''}</small></span>{index === previewIndex && <Check size={14} />}</button>)}</div>}
        </section> : <section className="resource-link-destination" aria-labelledby="resource-link-heading">
          <div className="resource-link-section-head"><div className="resource-link-mark"><ExternalLink size={19} /></div><div><p className="eyebrow">LINKS / {externalLinks.length}</p><h2 id="resource-link-heading">可用链接</h2><p>每条链接都可以单独打开或复制。</p></div></div>
          {externalLinks.length ? <div className="resource-link-list">{externalLinks.map((link, index) => <article className="resource-link-item" key={`${link.title}-${index}`}>
            <div className="resource-link-item-copy"><span className="resource-link-item-domain">{new URL(link.resolvedUrl).host}</span><strong>{link.title || '打开外部资源'}</strong>{link.description && <small>{link.description}</small>}</div>
            <div className="resource-link-item-actions"><a className="resource-link-open" href={link.resolvedUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> 打开链接</a><button type="button" className="resource-link-copy" aria-live="polite" onClick={() => void copyExternalLink(index, link.resolvedUrl)}><Copy size={13} /> {copiedLinkIndex === index ? '已复制' : copyErrorLinkIndex === index ? '复制失败' : '复制此链接'}</button></div>
          </article>)}</div> : <span className="resource-link-unavailable">当前资源尚未配置有效链接</span>}
        </section>}
      </main>

      <aside className="resource-detail-aside">
        <div className="resource-detail-aside-head"><span>资源信息</span><FavoriteButton targetType="resource" targetId={resource.id} initialCount={detailResource.favoriteCount} initialFavorited={detailResource.isFavorited} onChange={(_, favoriteCount) => { if (typeof favoriteCount === 'number') setDetailFavoriteCount(favoriteCount) }} /></div>
        <dl className="resource-detail-facts"><div><dt>贡献者</dt><dd>{resource.author || '小组成员'}</dd></div><div><dt>最近更新</dt><dd>{updatedLabel}</dd></div><div><dt>浏览</dt><dd><Eye size={14} /> {views.toLocaleString()}</dd></div><div><dt>收藏</dt><dd><Star size={14} /> {(detailFavoriteCount ?? 0).toLocaleString()}</dd></div><div><dt>资源类型</dt><dd>{resourceTypeLabel(resource.type)}</dd></div><div><dt>访问方式</dt><dd>{accessMode === 'article' ? '站内阅读' : accessMode === 'attachment' ? '站内文件' : '外部链接'}</dd></div></dl>
        {resource.sourceName && <div className="resource-detail-source"><span>来源</span><strong>{resource.sourceName}</strong></div>}
      </aside>
    </div>
  </div>
}

function ResourceRow({ resource, categories, onOpen }: { resource: Resource; categories: ContentCategory[]; onOpen: (resource: Resource) => void }) {
  return <article className="resource-row" role="link" aria-label={`查看资源：${resource.title}`} onClick={() => onOpen(resource)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(resource) } }} tabIndex={0}><span className={'resource-icon accent-' + resource.accent}><Icon name={resource.type === '学习路线' ? 'route' : resource.type === 'GitHub' ? 'code' : 'file'} size={18} /></span><div className="resource-main"><div className="resource-title-line"><h3>{resource.title}</h3><Tag tone="blue">{resourceTypeLabel(resource.type)}</Tag></div><p>{resource.description}</p><div className="resource-meta"><span>{contentCategoryLabel(categories, resource.category)}</span>{resource.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}<span>由 {resource.author} 更新</span></div></div><div className="resource-stats"><span><Clock3 size={14} /> {resource.updated}</span><span><Eye size={14} /> {resource.views.toLocaleString()}</span><FavoriteButton targetType="resource" targetId={resource.id} initialCount={resource.favoriteCount} initialFavorited={resource.isFavorited} compact /><button className="icon-button small" aria-label={'打开 ' + resource.title} onClick={(event) => { event.stopPropagation(); onOpen(resource) }}><ArrowUpRight size={15} /></button></div></article>
}

function PromptsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data: { prompts } } = useContent()
  const { user } = useAuth()
  const [copied, setCopied] = useState<string | null>(null)
  const [category, setCategory] = useState('全部')
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const [submissionNotice, setSubmissionNotice] = useState('')
  const copyPrompt = async (prompt: string, id: string) => { try { await navigator.clipboard.writeText(prompt) } catch { /* clipboard may be unavailable in preview */ } setCopied(id); window.setTimeout(() => setCopied(null), 1600) }
  const categories = ['全部', ...new Set(prompts.map((prompt) => prompt.category).filter(Boolean))]
  const visible = prompts.filter((prompt) => category === '全部' || prompt.category === category)
  const emptyTitle = prompts.length === 0 ? '暂时没有模板' : '还没有这个分类的模板'
  const canSubmit = Boolean(user && user.role !== 'Visitor')
  const emptyDescription = prompts.length === 0 ? '模板资料还在整理中。' : '换个分类再试试。'
  return <div className="page listing-page"><PageIntro eyebrow="PROMPT LIBRARY / 04" title="Prompt 模板库" description="把好问题保存下来，让每一次思考都更接近答案。" action={<div className="resource-page-actions"><button className="secondary-button" onClick={() => onNavigate('#/resources')}><ChevronLeft size={16} /> 返回资源库</button>{canSubmit ? <button className="primary-button" onClick={() => setSubmissionOpen(true)}><Send size={15} /> 投稿模板</button> : <button className="primary-button" onClick={() => onNavigate('#/login')}><Copy size={16} /> 登录后投稿</button>}</div>} />{submissionNotice && <div className="admin-inline-success" role="status">{submissionNotice}</div>}<div className="prompt-categories">{categories.map((item) => <button className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div><div className="prompt-grid">{visible.map((prompt) => <article className="prompt-card" key={prompt.id}><div className="prompt-card-head"><Tag tone="violet">{prompt.category}</Tag><span>{prompt.model}</span></div><h3>{prompt.title}</h3><p>{prompt.usage}</p><div className="prompt-preview"><span>›</span>{prompt.preview}</div><div className="prompt-card-actions"><FavoriteButton targetType="prompt" targetId={prompt.id} initialCount={prompt.favoriteCount} initialFavorited={prompt.isFavorited} compact /><button className={'secondary-button copy-button ' + (copied === prompt.id ? 'copied' : '')} onClick={() => copyPrompt(prompt.preview, prompt.id)}>{copied === prompt.id ? <><Check size={15} /> 已复制</> : <><Copy size={15} /> 复制 Prompt</>}</button></div></article>)}</div>{visible.length === 0 && <div className="empty-state"><CircleHelp size={28} /><strong>{emptyTitle}</strong><span>{emptyDescription}</span></div>}{submissionOpen && <PromptSubmissionModal onClose={() => setSubmissionOpen(false)} onSubmit={async (input) => { await submitPrompt(input); setSubmissionNotice('已提交审核，审核结果会通过站内通知告知。') }} />}</div>
}

function DynamicClubDirections() {
  const { data: { members: managedMembers, membersManaged } } = useContent()
  const { currentCohort } = useClubConfig()
  const iconByTeam: Record<string, LucideIcon> = { algorithm: Target, project: Rocket, cybersecurity: ShieldCheck }
  const teams = currentCohort?.teams.map((team) => {
    const members = mergeManagedTeamMembers(team, managedMembers, currentCohort?.year ?? '', membersManaged)
    return { ...team, members }
  }) ?? []
  return <section className="panel direction-panel"><SectionHeading eyebrow={`TEAM MAP / ${currentCohort?.year ?? 'CURRENT'}`} title="小组方向" /><div className="direction-list">{teams.map((team) => { const DirectionIcon = iconByTeam[team.id] ?? Layers3; return <button className="direction-row" key={team.id} onClick={() => navigate(`#/members/${team.id}`)}><span className={`direction-icon direction-${team.accent}`}><DirectionIcon size={17} /></span><span className="direction-copy"><strong>{team.name}</strong><small>{team.description}</small></span><span className="direction-count">{team.members.length} 人</span><ArrowUpRight size={14} className="direction-arrow" /></button> })}</div><div className="direction-footer"><span><Users size={14} /> {currentCohort?.generationLabel ?? '当前届次'}</span><button className="text-button" onClick={() => navigate('#/members')}>查看小组风采 <ArrowRight size={14} /></button></div></section>
}

function DynamicPhotoArchivePage() {
  const { sortedCohorts, photos } = useClubConfig()
  const { data: { members: managedMembers, membersManaged } } = useContent()
  return <div className="page archive-page"><PageIntro eyebrow="PEOPLE / 06 · ARCHIVE" title="历届合影" description="把每一届的共同记忆留在同一面照片墙里，随时回看小组一路走来的足迹。" action={<button className="secondary-button" onClick={() => navigate('#/members')}><ChevronLeft size={16} /> 返回小组风采</button>} /><section className="photo-archive archive-page-panel"><div className="archive-heading"><div><p className="eyebrow">PHOTO ARCHIVE</p><h2>每一届，都值得被记住</h2><p>照片由管理员整理维护，后续可以持续补充。</p></div><span><ShieldCheck size={14} /> 登录后由管理员维护</span></div><div className="archive-grid">{sortedCohorts.map((cohort) => { const photo = photos.filter((item) => item.cohortId === cohort.id).find((item) => item.isCover) ?? photos.find((item) => item.cohortId === cohort.id); const memberCount = membersManaged ? managedMembers.filter((member) => member.cohort.replace(/\D/g, '') === cohort.year).length : cohort.teams.reduce((sum, team) => sum + team.members.length, 0); return <article className="archive-card" key={cohort.id}>{photo ? <img src={photo.dataUrl} alt={photo.caption || `${cohort.year}届小组合影`} /> : <div className="archive-empty"><Camera size={28} /><span>暂无合影</span></div>}<div className="archive-card-meta"><strong>{cohort.year} 届</strong><span>· {memberCount || '人数待补充'} 人</span></div></article> })}</div></section></div>
}


function DynamicMembersPage({ initialTeam, initialCohortYear }: { initialTeam?: string; initialCohortYear?: string }) {
  const { sortedCohorts, currentCohort, photos, siteCopy } = useClubConfig()
  const { data: { members: managedMembers, membersManaged } } = useContent()
  const [cohortYear, setCohortYear] = useState(initialCohortYear ?? currentCohort?.year ?? sortedCohorts[0]?.year ?? '')
  const selectedCohort = sortedCohorts.find((item) => item.year === cohortYear) ?? currentCohort ?? sortedCohorts[0]
  // API 返回的小组 ID 可能是数字，路由参数始终是字符串；统一成字符串避免
  // 从工具页进入项目组/网安组时因为严格比较失败而回到第一组。
  const [activeTeamId, setActiveTeamId] = useState(String(initialTeam ?? selectedCohort?.teams[0]?.id ?? ''))
  const selectedCohortMembers = managedMembers.filter((member) => member.cohort.replace(/\D/g, '') === selectedCohort?.year)
  const visibleTeams = selectedCohort?.teams.map((team) => {
    const members = mergeManagedTeamMembers(team, selectedCohortMembers, selectedCohort?.year ?? '', membersManaged)
    return { ...team, members }
  }) ?? []
  const selectedTeam = visibleTeams.find((team) => String(team.id) === activeTeamId) ?? visibleTeams[0]
  const photo = selectedCohort ? photos.filter((item) => item.cohortId === selectedCohort.id).find((item) => item.isCover) ?? photos.find((item) => item.cohortId === selectedCohort.id) : undefined
  const memberCount = visibleTeams.reduce((sum, team) => sum + team.members.length, 0)
  const letter = siteCopy.find((item) => item.id === 'letter')
  useEffect(() => { if (selectedCohort && !visibleTeams.some((team) => String(team.id) === activeTeamId)) setActiveTeamId(String(visibleTeams[0]?.id ?? '')) }, [selectedCohort, activeTeamId, visibleTeams])
  if (!selectedCohort) return <div className="page"><div className="empty-state"><Users size={28} /><strong>暂时没有届次资料</strong><span>请由管理员先创建一届成员档案。</span></div></div>
  const letterTitle = letter?.title ?? (isRemoteClubConfigEnabled ? '传承寄语尚未配置' : '把这一届的经验，留给下一届。')
  const letterBody = letter?.body ?? (isRemoteClubConfigEnabled ? '管理员还没有补充这一届的寄语。' : '你不需要在大一就知道自己最终会去哪里，先和身边的人一起把一个项目做完。')
  const letterAuthor = letter?.author ?? (isRemoteClubConfigEnabled ? '' : '传承寄语 · 计算机科技小组')
  return <div className="page members-page members-page-redesign"><PageIntro eyebrow="PEOPLE / 06" title="小组风采" description="按届次认识一起写代码、做项目、把经验交给下一届的人。" action={<button className="secondary-button" onClick={() => navigate('#/members/archive')}><ImagePlus size={16} /> 历届合影</button>} /><div className="members-layout"><aside className="cohort-rail" aria-label="届次选择"><div className="cohort-rail-list">{sortedCohorts.map((item) => <button key={item.id} className={selectedCohort.id === item.id ? 'active' : ''} onClick={() => setCohortYear(item.year)} aria-current={selectedCohort.id === item.id ? 'page' : undefined}><span>{item.year}届</span></button>)}</div></aside><div className="members-content"><section className="cohort-showcase"><div className="cohort-showcase-copy"><p className="eyebrow">{selectedCohort.year} COHORT</p><h2>{selectedCohort.year} 届成员档案</h2><p>{selectedCohort.description || '这一届的成员资料和合影正在由管理员整理。'}</p><div className="cohort-stat-line"><span><strong>{memberCount || '—'}</strong>成员</span><i /><span><strong>{visibleTeams.length || '—'}</strong>技术组</span><i /><span><strong>{photo ? '已上传' : '待上传'}</strong>合影</span></div></div><div className={`cohort-photo-frame ${photo ? 'has-photo' : ''}`}>{photo ? <><img src={photo.dataUrl} alt={photo.caption || `${selectedCohort.year}届小组合影`} /><div className="cohort-photo-overlay"><span>{selectedCohort.year} 届 · 合影</span></div></> : <div className="cohort-photo-empty"><span className="photo-empty-icon"><Camera size={25} /></span><strong>还没有 {selectedCohort.year} 届合影</strong><span>合影正在由管理员整理，敬请期待。</span></div>}</div></section>{visibleTeams.length > 0 ? <section className="teams-section"><div className="teams-heading"><div><p className="eyebrow">{selectedCohort.year} · TEAMS</p><h2>{selectedCohort.teams.length} 支小组，协作完成一件事</h2></div><span>共 {memberCount} 位成员</span></div><div className="team-switcher">{visibleTeams.map((team) => <button key={team.id} className={activeTeamId === String(team.id) ? `active accent-${team.accent}` : ''} onClick={() => setActiveTeamId(String(team.id))}><span><strong>{team.name}</strong><small>{team.description}</small></span><b>{team.members.length}<em>人</em></b><ChevronRight size={16} /></button>)}</div>{selectedTeam && <div className={`team-detail accent-${selectedTeam.accent}`}><div className="team-detail-head"><div><span className="team-detail-kicker"><i /> {selectedTeam.name.toUpperCase()}</span><h3>{selectedTeam.name}</h3><p>{selectedTeam.description}</p></div><div className="team-role-counts"><span><strong>{selectedTeam.members.filter((member) => member.role === '组长').length}</strong>组长</span><span><strong>{selectedTeam.members.filter((member) => member.role === '负责人').length}</strong>负责人</span><span><strong>{selectedTeam.members.filter((member) => member.role === '组员').length}</strong>组员</span></div></div><div className="cohort-member-grid">{selectedTeam.members.map((member) => <article className="cohort-member-card" key={member.id}><Avatar initials={member.initials} name={member.name} avatarUrl={member.avatarUrl} accent={member.accent} size="md" /><div><strong>{member.name}</strong><span>{member.role}</span><small>{member.direction}</small></div><i className={`member-role-dot role-${member.role === '组长' ? 'lead' : member.role === '负责人' ? 'owner' : 'member'}`} /></article>)}</div></div>}</section> : <section className="cohort-data-empty"><div><span className="data-empty-icon"><Users size={22} /></span><h3>这一届的成员资料还在整理</h3><p>登录后，管理员可以补充成员分组和个人资料。</p></div></section>}<section className="letter-section members-letter"><div className="letter-copy"><p className="eyebrow">PASS IT ON</p><h2>{letterTitle}</h2><p>“{letterBody}”</p>{letterAuthor && <span>— {letterAuthor}</span>}</div><div className="letter-stamp"><span>TO</span><strong>NEXT<br />COHORT</strong><small>{selectedCohort.year} → {Number(selectedCohort.year) + 1}</small></div></section></div></div></div>
}

function AiPage({ messages, onSend, onNewChat }: { messages: AIMessage[]; onSend: (text: string) => void; onNewChat: () => void }) {
  const [input, setInput] = useState('')
  const send = () => { if (!input.trim()) return; onSend(input.trim()); setInput('') }
  const history = messages.filter((message) => message.role === 'user').slice(-8).reverse()
  return <div className="page ai-page"><div className="ai-layout"><aside className="ai-history panel"><div className="ai-history-head"><div><span className="eyebrow">AI WORKSPACE</span><h2>历史会话</h2></div><button className="icon-button small" onClick={onNewChat} aria-label="新建会话"><Sparkles size={16} /></button></div><button className="new-chat" onClick={onNewChat}><span><MessageCircle size={15} /> 新建会话</span><kbd>⌘ N</kbd></button>{history.length ? <div className="history-group"><span>本次会话</span>{history.map((message, index) => <button className={`history-item ${index === 0 ? 'active' : ''}`} key={message.id} onClick={() => onSend(message.content)}>{message.content.length > 28 ? `${message.content.slice(0, 28)}…` : message.content}</button>)}</div> : <div className="ai-history-empty"><MessageCircle size={17} /><span>暂无历史会话</span><small>发送第一条消息后会显示在这里。</small></div>}<div className="ai-history-footer"><Settings2 size={15} /> AI 助手设置</div></aside><main className="ai-chat panel"><div className="ai-chat-head"><div><div className="ai-title"><span className="ai-live-icon"><Bot size={17} /></span><strong>科技小组 AI 助手</strong><span className="online-status"><i /> 在线</span></div><small>连接学习路线、项目、资源与面经</small></div></div><div className="chat-stream">{messages.length ? messages.map((message) => <div className={`chat-message ${message.role}`} key={message.id}><div className="message-avatar">{message.role === 'assistant' ? <Bot size={16} /> : <Avatar initials="你" size="sm" />}</div><div className="message-content"><p>{message.content.split('\n').map((line, index) => <span key={`${message.id}-${index}`}>{line}<br /></span>)}</p>{message.citations && <CitationCard citations={message.citations} />}</div></div>) : <div className="ai-chat-empty"><Bot size={24} /><strong>还没有会话内容</strong><span>从下方问题开始，回答会由已接入的 AI 服务生成。</span></div>}<div className="suggestion-row"><button onClick={() => onSend('我现在能参加哪些项目？')}>我现在能参加哪些项目？ <ArrowUpRight size={13} /></button><button onClick={() => onSend('如何学习 FastAPI？')}>如何学习 FastAPI？ <ArrowUpRight size={13} /></button><button onClick={() => onSend('有没有 Java 后端面经？')}>有没有 Java 后端面经？ <ArrowUpRight size={13} /></button></div></div><div className="chat-composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="问问科技小组 AI...（Enter 发送，Shift + Enter 换行）" rows={1} /><button className="send-button" onClick={send} aria-label="发送"><Send size={17} /></button></div></main></div></div>
}

function CitationCard({ citations: sourceList }: { citations: Citation[] }) {
  return <div className="citation-card"><div className="citation-heading"><span><BookOpen size={14} /> 参考资料</span><span>RAG SOURCES</span></div>{sourceList.map((source, index) => <button key={source.id} onClick={() => navigate(source.path)}><span className="citation-index">[{index + 1}]</span><span><strong>{source.title}</strong><small>{source.type}</small></span><ArrowUpRight size={14} /></button>)}</div>
}

function AiDrawer({ open, onClose, messages, onSend }: { open: boolean; onClose: () => void; messages: AIMessage[]; onSend: (text: string) => void }) {
  const [input, setInput] = useState('')
  const send = () => { if (!input.trim()) return; onSend(input.trim()); setInput('') }
  return <AnimatePresence>{open && <><motion.div className="drawer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} /><motion.aside className="ai-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.24, ease: 'easeOut' }}><div className="drawer-head"><div className="ai-title"><span className="ai-live-icon"><Bot size={16} /></span><strong>AI 助手</strong><span className="online-status"><i /> 在线</span></div><button className="icon-button small" onClick={onClose} aria-label="关闭 AI 助手"><X size={17} /></button></div><div className="drawer-body">{messages.slice(-3).map((message) => <div className={`drawer-message ${message.role}`} key={message.id}><span className="drawer-avatar">{message.role === 'assistant' ? <Bot size={15} /> : '你'}</span><div><p>{message.content}</p>{message.citations && <CitationCard citations={message.citations.slice(0, 2)} />}</div></div>)}<div className="drawer-suggestions"><span>试试这样问</span><button onClick={() => onSend('我现在能参加哪些项目？')}>我现在能参加哪些项目？</button><button onClick={() => onSend('给我一条后端学习建议')}>给我一条后端学习建议</button></div></div><div className="drawer-composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="问问科技小组 AI..." rows={1} /><button onClick={send} aria-label="发送"><Send size={16} /></button><small>回答会标注可追溯的参考资料</small></div></motion.aside></>}</AnimatePresence>
}

function CommandPalette({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (path: string) => void }) {
  const { data: { learningRoutes, projects, resources, members } } = useContent()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const paletteRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState({ top: 78, left: 14, width: 400 })
  const commands = useMemo(() => [
    ...navItems.map((item) => ({ id: `page-${item.href}`, label: item.label, hint: '页面', path: item.href })),
    ...learningRoutes.map((item) => ({ id: `learning-${item.id}`, label: item.title, hint: '学习路线', path: `#/learning/${encodeURIComponent(item.id)}` })),
    ...projects.map((item) => ({ id: `project-${item.id}`, label: item.name, hint: '项目', path: `#/projects/${encodeURIComponent(item.slug)}` })),
    ...resources.map((item) => ({ id: `resource-${item.id}`, label: item.title, hint: item.type || '资源', path: `#/resources/${encodeURIComponent(String(item.id))}` })),
    ...members.map((item) => ({ id: `member-${item.id}`, label: item.name, hint: `${item.cohort} · ${item.direction}`, path: `#/members/${normalizeMemberTeamId(item.direction)}/${item.cohort.replace(/\D/g, '')}` })),
  ], [learningRoutes, members, projects, resources])
  const results = query.trim() ? commands.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())) : []
  useEffect(() => { if (open) { setQuery(''); setSelectedIndex(0); window.setTimeout(() => inputRef.current?.focus(), 30) } }, [open])
  useEffect(() => { setSelectedIndex((index) => Math.min(index, Math.max(results.length - 1, 0))) }, [results.length])
  useLayoutEffect(() => {
    if (!open) return
    const updateAnchor = () => {
      const trigger = document.querySelector<HTMLButtonElement>('.search-trigger')
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const width = Math.min(window.innerWidth <= 900 ? 340 : 400, window.innerWidth - 28)
      setAnchor({ top: rect.bottom + 8, left: Math.max(14, Math.min(rect.left, window.innerWidth - width - 14)), width })
    }
    updateAnchor()
    window.addEventListener('resize', updateAnchor)
    return () => window.removeEventListener('resize', updateAnchor)
  }, [open])
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      const trigger = document.querySelector('.search-trigger')
      if (!paletteRef.current?.contains(target) && !trigger?.contains(target)) onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open, onClose])
  useEffect(() => { if (!open) return; const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setSelectedIndex((index) => (index + 1) % results.length) }; if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setSelectedIndex((index) => (index - 1 + results.length) % results.length) }; if (event.key === 'Enter' && results[selectedIndex]) { onNavigate(results[selectedIndex].path); onClose() } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [open, onClose, onNavigate, results, selectedIndex])
  return <AnimatePresence>{open && <motion.div ref={paletteRef} className="command-palette" role="search" aria-label="站内搜索" style={anchor} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}><div className="command-input"><Search size={18} /><input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }} placeholder="搜索路线、项目、资源、成员..." aria-label="搜索路线、项目、资源和成员" /><kbd>ESC</kbd></div><div className="command-results">{results.length ? results.map((item, index) => <button type="button" className={`command-item ${index === selectedIndex ? 'selected' : ''}`} key={item.id} onClick={() => { onNavigate(item.path); onClose() }}><span className="command-item-icon"><Compass size={16} /></span><span><strong>{item.label}</strong><small>{item.hint}</small></span><ArrowUpRight size={14} /></button>) : <div className="command-empty"><CircleHelp size={16} /> {query.trim() ? '没有找到匹配内容' : '输入关键词开始搜索'}</div>}</div><div className="command-footer"><span><kbd>↑↓</kbd> 选择</span><span><kbd>↵</kbd> 打开</span><span><kbd>esc</kbd> 关闭</span></div></motion.div>}</AnimatePresence>
}

function OnboardingModal({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (path: string) => void }) {
  const [step, setStep] = useState(0)
  const [grade, setGrade] = useState('大一')
  const [interest, setInterest] = useState('AI Agent')
  const [time, setTime] = useState('5h')
  if (!open) return null
  const steps = [{ title: '你现在大几？', options: ['大一', '大二', '大三', '大四'] }, { title: '你最感兴趣的方向？', options: ['AI Agent', '前端', '后端', '算法', 'AI', 'Java'] }, { title: '每周能投入多少时间？', options: ['2h', '5h', '8h', '10h+'] }]
  const current = steps[step]
  const selectedOption = step === 0 ? grade : step === 1 ? interest : time
  const selectOption = (option: string) => { if (step === 0) setGrade(option); else if (step === 1) setInterest(option); else setTime(option) }
  return <AnimatePresence><motion.div className="modal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section className="onboarding-modal" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }}><button className="icon-button modal-close" onClick={onClose} aria-label="关闭"><X size={18} /></button><div className="modal-progress"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div><p className="eyebrow">STARTER PATH / 0{step + 1}</p><h2>{current.title}</h2><div className="onboarding-options">{current.options.map((option) => <button key={option} className={selectedOption === option ? 'selected' : ''} onClick={() => selectOption(option)}>{option}{selectedOption === option && <Check size={15} />}</button>)}</div><div className="modal-footer"><span>{step + 1} / {steps.length}</span><button className="primary-button" onClick={() => { if (step < steps.length - 1) setStep(step + 1); else { onClose(); onNavigate('#/learning') } }}>{step < steps.length - 1 ? '下一步' : '生成我的路线'} <ArrowRight size={15} /></button></div></motion.section></motion.div></AnimatePresence>
}

type MessageRow = {
  id: string
  kind: 'join-request' | 'join-result' | 'project-review' | 'project-status' | 'resource-submission' | 'interview-submission' | 'feedback-review' | 'server-notification'
  title: string
  body: string
  createdAt: string
  read: boolean
  statusLabel: string
  statusTone: string
  request?: ProjectJoinRequest
  project?: Project
  submission?: ContributionSubmission
  interview?: InterviewSubmission
  feedback?: FeedbackMessage
  serverNotification?: ServerNotification
}

function MessageCenterPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user } = useAuth()
  const { data: { projects }, listProjectReviewQueue } = useContent()
  const [requests, setRequests] = useState<ProjectJoinRequest[]>([])
  const [myJoinRequests, setMyJoinRequests] = useState<ProjectJoinRequest[]>([])
  const [mySubmittedProjects, setMySubmittedProjects] = useState<Project[]>([])
  const [pendingProjects, setPendingProjects] = useState<Project[]>([])
  const [submissions, setSubmissions] = useState<ContributionSubmission[]>([])
  const [myInterviewSubmissions, setMyInterviewSubmissions] = useState<InterviewSubmission[]>([])
  const [pendingInterviewSubmissions, setPendingInterviewSubmissions] = useState<InterviewSubmission[]>([])
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([])
  const [serverNotifications, setServerNotifications] = useState<ServerNotification[]>([])
  const notificationPageRef = useRef(1)
  const [notificationTotal, setNotificationTotal] = useState(0)
  const [unreadNotificationTotal, setUnreadNotificationTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState<MessageFilter>('all')
  const [readVersion, setReadVersion] = useState(0)
  const [deleteAllPending, setDeleteAllPending] = useState(false)

  const ownedProjects = useMemo(() => projects.filter((project) => String(project.submittedBy ?? '') === String(user?.id ?? '')), [projects, user?.id])
  const ownedProjectIds = useMemo(() => new Set(ownedProjects.map((project) => String(project.id))), [ownedProjects])
  const myProjects = useMemo(() => {
    const records = new globalThis.Map<string, Project>()
    ownedProjects.forEach((project) => records.set(String(project.id), project))
    mySubmittedProjects.forEach((project) => records.set(String(project.id), project))
    return [...records.values()].sort((left, right) => String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? '')))
  }, [mySubmittedProjects, ownedProjects])

  const loadMessages = useCallback(async (showLoading = true, resetNotifications = true) => {
    if (!user || user.role === 'Visitor') {
      setRequests([])
      setMyJoinRequests([])
      setMySubmittedProjects([])
      setPendingProjects([])
      setSubmissions([])
      setMyInterviewSubmissions([])
      setPendingInterviewSubmissions([])
      setFeedbackMessages([])
      setServerNotifications([])
      notificationPageRef.current = 1
      setNotificationTotal(0)
      setUnreadNotificationTotal(0)
      setLoading(false)
      return
    }
    if (showLoading) setLoading(true)
    setError('')
    const isReviewer = canAccessAdmin(user)
    const canReviewGlobal = canManageGlobalContent(user)

    if (apiConfig.contentSource === 'api') {
      const pageSize = 25
      const pageLimit = resetNotifications ? 1 : Math.max(notificationPageRef.current, 1)
      const pageNumbers = Array.from({ length: pageLimit }, (_, index) => index + 1)
      const [ownedRequestsResult, reviewerRequestsResult, notificationPagesResult, unreadCountResult] = await Promise.allSettled([
        listOwnedProjectJoinRequests(),
        isReviewer ? listProjectJoinRequests() : Promise.resolve([] as ProjectJoinRequest[]),
        Promise.all(pageNumbers.map((page) => listMyNotifications(page, pageSize))),
        getMyUnreadNotificationCount(),
      ])
      const errors: string[] = []
      const availableRequests = new globalThis.Map<string, ProjectJoinRequest>()
      if (ownedRequestsResult.status === 'fulfilled') {
        ownedRequestsResult.value.forEach((request) => availableRequests.set(String(request.id), request))
      } else {
        errors.push('你负责项目的加入申请暂时无法加载。')
      }
      if (reviewerRequestsResult.status === 'fulfilled') {
        reviewerRequestsResult.value.forEach((request) => availableRequests.set(String(request.id), request))
      } else if (isReviewer) {
        errors.push('管理审核的加入申请暂时无法加载。')
      }
      setRequests([...availableRequests.values()])
      setMyJoinRequests([])
      setMySubmittedProjects([])
      setPendingProjects([])
      setSubmissions([])
      setMyInterviewSubmissions([])
      setPendingInterviewSubmissions([])
      setFeedbackMessages([])

      if (notificationPagesResult.status === 'fulfilled') {
        const pages = notificationPagesResult.value
        const uniqueItems = new globalThis.Map<string, ServerNotification>()
        pages.flatMap((page) => page.items).forEach((item) => uniqueItems.set(item.id, item))
        setServerNotifications([...uniqueItems.values()])
        notificationPageRef.current = pageLimit
        setNotificationTotal(pages[0]?.total ?? 0)
      } else {
        errors.push('站内通知暂时无法加载，请稍后刷新。')
      }
      if (unreadCountResult.status === 'fulfilled') {
        setUnreadNotificationTotal(unreadCountResult.value)
      } else {
        errors.push('未读通知数量暂时无法同步。')
      }
      setError(errors.join(' '))
      if (showLoading) setLoading(false)
      return
    }

    const [ownedRequestsResult, myRequestsResult, myProjectsResult, reviewerRequestsResult, projectsResult, submissionsResult, feedbackResult, myInterviewResult, interviewReviewResult, notificationsResult] = await Promise.allSettled([
      listOwnedProjectJoinRequests(),
      listMyProjectJoinRequests(),
      listMyProjectSubmissions(),
      isReviewer ? listProjectJoinRequests() : Promise.resolve([] as ProjectJoinRequest[]),
      isReviewer ? listProjectReviewQueue() : Promise.resolve([] as Project[]),
      listContributionSubmissions(),
      canReviewGlobal ? listFeedbackMessages({ status: 'pending' }) : Promise.resolve([] as FeedbackMessage[]),
      listMyInterviewSubmissions(user.id),
      isReviewer ? listAllInterviewReviewQueue() : Promise.resolve([] as InterviewSubmission[]),
      listMyNotifications(1, 25),
    ])
    const errors: string[] = []
    const availableRequests = new globalThis.Map<string, ProjectJoinRequest>()
    if (ownedRequestsResult.status === 'fulfilled') {
      ownedRequestsResult.value
        .filter((request) => apiConfig.contentSource === 'api' || ownedProjectIds.size === 0 || ownedProjectIds.has(String(request.projectId)))
        .forEach((request) => availableRequests.set(String(request.id), request))
    } else {
      errors.push('你负责项目的加入申请暂时无法加载。')
    }
    if (reviewerRequestsResult.status === 'fulfilled') {
      reviewerRequestsResult.value.forEach((request) => availableRequests.set(String(request.id), request))
    } else if (isReviewer) {
      errors.push('管理审核的加入申请暂时无法加载。')
    }
    setRequests([...availableRequests.values()])
    if (myRequestsResult.status === 'fulfilled') {
      setMyJoinRequests(myRequestsResult.value.filter((request) => request.status !== 'pending'))
    } else {
      setMyJoinRequests([])
      errors.push('你提交的项目申请结果暂时无法加载。')
    }
    if (myProjectsResult.status === 'fulfilled') {
      setMySubmittedProjects(myProjectsResult.value.filter((project) => String(project.submittedBy ?? '') === String(user.id)))
    } else {
      setMySubmittedProjects(ownedProjects)
    }
    if (projectsResult.status === 'fulfilled') {
      setPendingProjects(projectsResult.value.filter((project) => project.reviewStatus === 'pending'))
    } else {
      setPendingProjects([])
      if (isReviewer) errors.push('项目审核待办暂时无法加载。')
    }
    if (submissionsResult.status === 'fulfilled') {
      setSubmissions(submissionsResult.value.filter((submission) => (
        (canReviewGlobal && submission.status === 'pending')
        || (String(submission.submitterId) === String(user.id) && ['approved', 'rejected', 'changes_requested'].includes(submission.status))
      )))
    } else {
      setSubmissions([])
      errors.push('资源投稿状态暂时无法加载。')
    }
    if (feedbackResult.status === 'fulfilled') {
      setFeedbackMessages(feedbackResult.value.filter((message) => !message.status || message.status === 'pending'))
    } else {
      setFeedbackMessages([])
      if (canReviewGlobal) errors.push('留言建议审核待办暂时无法加载。')
    }
    if (myInterviewResult.status === 'fulfilled') {
      setMyInterviewSubmissions(myInterviewResult.value.filter((submission) => ['approved', 'rejected', 'changes_requested'].includes(submission.status)))
    } else {
      setMyInterviewSubmissions([])
      errors.push('面经投稿审核结果暂时无法加载。')
    }
    if (interviewReviewResult.status === 'fulfilled') {
      setPendingInterviewSubmissions(interviewReviewResult.value.filter((submission) => submission.status === 'pending' && String(submission.submitterId) !== String(user.id) && canManageContent(user, submission.cohort)))
    } else {
      setPendingInterviewSubmissions([])
      if (isReviewer) errors.push('面经审核待办暂时无法加载。')
    }
    if (notificationsResult.status === 'fulfilled') {
      setServerNotifications(notificationsResult.value.items)
      setNotificationTotal(notificationsResult.value.total)
    } else {
      setServerNotifications([])
    }
    setError(errors.join(' '))
    if (showLoading) setLoading(false)
  }, [listProjectReviewQueue, ownedProjectIds, ownedProjects, user])

  useEffect(() => {
    void loadMessages()
    if (!user || user.role === 'Visitor') return undefined
    const timer = window.setInterval(() => void loadMessages(false, false), 30000)
    return () => window.clearInterval(timer)
  }, [loadMessages, user])
  useEffect(() => {
    const handleReadStateChange = () => setReadVersion((version) => version + 1)
    window.addEventListener('club-messages-state', handleReadStateChange)
    return () => window.removeEventListener('club-messages-state', handleReadStateChange)
  }, [])

  const messageRows = useMemo<MessageRow[]>(() => {
    const readState = user ? getMessageReadState(user.id) : {}
    const notifiedJoinRequestIds = new Set(serverNotifications
      .map((notification) => notification.dedupeKey?.match(/^project-join-request:(\d+):submitted$/)?.[1])
      .filter((id): id is string => Boolean(id)))
    const visibleJoinRequests = apiConfig.contentSource === 'api'
      ? requests.filter((request) => !ownedProjectIds.has(String(request.projectId)) && !notifiedJoinRequestIds.has(String(request.id)))
      : requests
    const requestRows: MessageRow[] = visibleJoinRequests.map((request) => {
      const isPending = request.status === 'pending'
      const isApproved = request.status === 'approved'
      return {
        id: projectJoinRequestMessageId(request),
        kind: 'join-request',
        title: '有人申请加入「' + (request.projectName || '未命名项目') + '」',
        body: request.message?.trim() || ((request.userName || '一位成员') + '申请加入这个项目。'),
        createdAt: request.createdAt,
        read: Boolean(readState[projectJoinRequestMessageId(request)]),
        statusLabel: isPending ? '待处理' : isApproved ? '已同意' : '已拒绝',
        statusTone: isPending ? 'orange' : isApproved ? 'mint' : 'red',
        request,
      }
    })
    const joinResultRows: MessageRow[] = apiConfig.contentSource === 'api' ? [] : myJoinRequests.map((request) => {
      const approved = request.status === 'approved'
      const id = projectJoinRequestResultMessageId(request)
      const projectName = request.projectName || '该项目'
      return {
        id,
        kind: 'join-result',
        title: approved ? '项目加入申请已通过' : '项目加入申请未通过',
        body: approved ? `你申请加入「${projectName}」的请求已通过。` : `你申请加入「${projectName}」的请求未通过。${request.reviewNote ? `审核说明：${request.reviewNote}` : ''}`,
        createdAt: request.reviewedAt ?? request.updatedAt ?? request.createdAt,
        read: Boolean(readState[id]),
        statusLabel: approved ? '已通过' : '未通过',
        statusTone: approved ? 'mint' : 'red',
        request,
      }
    })
    const statusRows: MessageRow[] = apiConfig.contentSource === 'api'
      ? []
      : myProjects.filter((project) => ['approved', 'rejected'].includes(project.reviewStatus ?? '')).map((project) => {
      const approved = project.reviewStatus === 'approved'
      const id = projectStatusMessageId(project)
      return {
        id,
        kind: 'project-status',
        title: approved ? '项目审核已通过' : '项目审核未通过',
        body: approved ? '「' + project.name + '」已经通过审核，现在可以在项目库中展示。' : '「' + project.name + '」已被退回，请查看审核意见后修改。' + (project.reviewNote ? ` 审核说明：${project.reviewNote}` : ''),
        createdAt: project.reviewedAt ?? project.updatedAt ?? project.createdAt ?? '',
        read: Boolean(readState[id]),
        statusLabel: approved ? '已通过' : '已退回',
        statusTone: approved ? 'mint' : 'red',
        project,
      }
    })
    const projectReviewRows: MessageRow[] = pendingProjects.map((project) => {
      const id = projectReviewMessageId(project)
      return {
        id,
        kind: 'project-review',
        title: `项目投稿待审核：${project.name}`,
        body: project.description,
        createdAt: project.createdAt ?? project.updatedAt ?? '',
        read: Boolean(readState[id]),
        statusLabel: '待审核',
        statusTone: 'orange',
        project,
      }
    })
    const resourceSubmissionRows: MessageRow[] = submissions.map((submission) => {
      const id = resourceSubmissionMessageId(submission)
      const isPending = submission.status === 'pending'
      const isApproved = submission.status === 'approved'
      const isChangesRequested = submission.status === 'changes_requested'
      return {
        id,
        kind: 'resource-submission',
        title: isPending ? `资源投稿待审核：${submission.title}` : isApproved ? `资源投稿已通过：${submission.title}` : isChangesRequested ? `资源投稿需要修改：${submission.title}` : `资源投稿未通过：${submission.title}`,
        body: isPending ? submission.description : `${submission.description}${submission.reviewNote ? ` 审核说明：${submission.reviewNote}` : ''}`,
        createdAt: submission.reviewedAt ?? submission.submittedAt,
        read: Boolean(readState[id]),
        statusLabel: isPending ? '待审核' : isApproved ? '已通过' : isChangesRequested ? '待修改' : '未通过',
        statusTone: isPending || isChangesRequested ? 'orange' : isApproved ? 'mint' : 'red',
        submission,
      }
    })
    const interviewRows: MessageRow[] = [...pendingInterviewSubmissions, ...myInterviewSubmissions].map((submission) => {
      const id = interviewSubmissionMessageId(submission)
      const isPending = submission.status === 'pending'
      const isApproved = submission.status === 'approved'
      const isChangesRequested = submission.status === 'changes_requested'
      return {
        id,
        kind: 'interview-submission',
        title: isPending ? `面经投稿待审核：${submission.company} · ${submission.role}` : isApproved ? `面经投稿已通过：${submission.company} · ${submission.role}` : isChangesRequested ? `面经投稿需要修改：${submission.company} · ${submission.role}` : `面经投稿未通过：${submission.company} · ${submission.role}`,
        body: isPending ? submission.summary || '有一条面经投稿等待审核。' : `${submission.summary || ''}${submission.reviewNote ? ` 审核说明：${submission.reviewNote}` : ''}`,
        createdAt: submission.reviewedAt ?? submission.submittedAt,
        read: Boolean(readState[id]),
        statusLabel: isPending ? '待审核' : isApproved ? '已通过' : isChangesRequested ? '待修改' : '未通过',
        statusTone: isPending || isChangesRequested ? 'orange' : isApproved ? 'mint' : 'red',
        interview: submission,
      }
    })
    const feedbackRows: MessageRow[] = feedbackMessages.map((feedback) => {
      const id = feedbackMessageId(feedback)
      return {
        id,
        kind: 'feedback-review',
        title: `留言建议待查看：${feedback.category || '未分类'}`,
        body: feedback.content,
        createdAt: feedback.createdAt,
        read: Boolean(readState[id]),
        statusLabel: '待处理',
        statusTone: 'orange',
        feedback,
      }
    })
    const serverNotificationRows: MessageRow[] = serverNotifications.map((notification) => {
      const isProjectReviewResult = notification.type === 'project_review_result'
      const isApprovedProject = isProjectReviewResult && notification.title.includes('已通过')
      const joinRequestId = notification.dedupeKey?.match(/^project-join-request:(\d+):submitted$/)?.[1]
      const joinRequest = joinRequestId
        ? [...requests, ...myJoinRequests].find((request) => String(request.id) === joinRequestId)
        : undefined
      const isJoinRequest = notification.type === 'project_join_request'
      const isJoinRequestResult = notification.type === 'project_join_request_result'
      const isApprovedJoinRequest = isJoinRequestResult && notification.title.includes('已通过')
      const isPendingJoinRequest = isJoinRequest && notification.isActionable
      const isPendingReviewType = [
        'project_review_pending',
        'resource_submission_pending',
        'interview_submission_pending',
        'feedback_review_pending',
      ].includes(notification.type)
      const isPendingReview = isPendingReviewType && notification.isActionable
      const isCompletedReviewTask = isPendingReviewType && !notification.isActionable
      const isReviewResult = [
        'project_review_result',
        'resource_submission_result',
        'interview_submission_result',
      ].includes(notification.type)
      const isApprovedResult = notification.title.includes('已通过')
      const isChangesRequested = notification.title.includes('需要修改')
      const competitionMilestone = notification.type === 'competition_reminder'
        ? notification.content.match(/的“([^”]+)”时间是/)?.[1]
        : undefined
      return {
        id: `server-notification:${notification.id}`,
        kind: 'server-notification',
        title: competitionMilestone
          ? `${notification.title} · ${competitionMilestone}`
          : notification.title,
        body: notification.content,
        createdAt: notification.createdAt,
        read: notification.isRead,
        statusLabel: isJoinRequest
          ? isPendingJoinRequest ? '待处理' : joinRequest?.status === 'approved' ? '已同意' : joinRequest?.status === 'rejected' ? '已拒绝' : '已结束'
          : isJoinRequestResult
            ? isApprovedJoinRequest ? '已通过' : '未通过'
          : isProjectReviewResult
          ? isApprovedProject ? '已通过' : '已退回'
          : isCompletedReviewTask
            ? '已处理'
            : isPendingReview
            ? notification.type === 'feedback_review_pending' ? '待处理' : '待审核'
            : isReviewResult
              ? isChangesRequested ? '待修改' : isApprovedResult ? '已通过' : '未通过'
          : notification.type === 'competition_reminder' ? '比赛提醒' : '站内通知',
        statusTone: isJoinRequest
          ? isPendingJoinRequest ? 'orange' : joinRequest?.status === 'approved' ? 'mint' : joinRequest?.status === 'rejected' ? 'red' : 'blue'
          : isJoinRequestResult
            ? isApprovedJoinRequest ? 'mint' : 'red'
          : isProjectReviewResult
          ? isApprovedProject ? 'mint' : 'red'
          : isCompletedReviewTask
            ? 'mint'
            : isPendingReview
            ? 'orange'
            : isReviewResult
              ? isChangesRequested ? 'orange' : isApprovedResult ? 'mint' : 'red'
          : notification.type === 'competition_reminder' ? 'blue' : 'mint',
        serverNotification: notification,
        request: joinRequest,
      }
    })
    const hiddenState = user ? getHiddenMessageState(user.id) : {}
    const visibleRows = apiConfig.contentSource === 'api'
      ? serverNotificationRows
      : [...requestRows, ...joinResultRows, ...statusRows, ...projectReviewRows, ...resourceSubmissionRows, ...interviewRows, ...feedbackRows]
    return visibleRows
      .filter((message) => !hiddenState[message.id])
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
  }, [feedbackMessages, myInterviewSubmissions, myJoinRequests, myProjects, ownedProjectIds, pendingInterviewSubmissions, pendingProjects, readVersion, requests, serverNotifications, submissions, user])

  const unreadCount = apiConfig.contentSource === 'api'
    ? unreadNotificationTotal
    : messageRows.filter((message) => !message.read).length
  const hasReadNotifications = apiConfig.contentSource === 'api'
    ? notificationTotal > unreadNotificationTotal
    : messageRows.some((message) => message.read)
  const filterOptions: Array<{ value: MessageFilter; label: string }> = [
    { value: 'all', label: '全部' },
    { value: 'unread', label: '未读' + (unreadCount ? ' ' + unreadCount : '') },
    { value: 'review-pending', label: '待审核' },
    { value: 'review-results', label: '审核结果' },
    { value: 'join-request', label: '项目申请' },
  ]
  const filteredMessages = messageRows.filter((message) => {
    if (filter === 'unread') return !message.read
    if (filter === 'review-pending') return message.kind === 'project-review' || message.kind === 'feedback-review' || (message.kind === 'join-request' && message.request?.status === 'pending') || (message.kind === 'resource-submission' && message.submission?.status === 'pending') || (message.kind === 'interview-submission' && message.interview?.status === 'pending') || (message.kind === 'server-notification' && Boolean(message.serverNotification?.isActionable))
    if (filter === 'review-results') return message.kind === 'project-status' || (message.kind === 'join-request' && message.request?.status !== 'pending') || (message.kind === 'server-notification' && (message.serverNotification?.type.endsWith('_result') || message.serverNotification?.type === 'project_review_result' || (message.serverNotification?.type.endsWith('_pending') && !message.serverNotification.isActionable))) || (message.kind === 'resource-submission' && message.submission?.status !== 'pending') || (message.kind === 'interview-submission' && message.interview?.status !== 'pending')
    if (filter === 'join-request') return message.kind === 'join-request' || message.kind === 'join-result' || (message.kind === 'server-notification' && ['project_join_request', 'project_join_request_result'].includes(message.serverNotification?.type ?? ''))
    return filter === 'all'
  })

  const markRead = async (message: MessageRow) => {
    if (!user || message.read) return
    if (message.serverNotification) {
      try {
        await markMyNotificationRead(message.serverNotification.id)
        setServerNotifications((items) => items.map((item) => item.id === message.serverNotification?.id ? { ...item, isRead: true } : item))
        const nextUnreadCount = Math.max(0, unreadNotificationTotal - 1)
        setUnreadNotificationTotal(nextUnreadCount)
        dispatchMessageStateChange({ userId: user.id, unreadCount: nextUnreadCount })
        return
      } catch {
        setError('标记通知已读失败，请稍后重试。')
        return
      }
    }
    markMessagesRead(user.id, [message.id])
    setReadVersion((version) => version + 1)
  }

  const canDeleteMessage = (message: MessageRow) => {
    if (!message.read) return false
    if (message.serverNotification?.isActionable) return false
    if (message.kind === 'join-request' && message.request?.status === 'pending') return false
    if (message.serverNotification?.type === 'project_join_request') {
      return message.request?.status !== 'pending'
    }
    return true
  }

  const loadMoreNotifications = async () => {
    if (loadingMore || serverNotifications.length >= notificationTotal) return
    setLoadingMore(true)
    setError('')
    try {
      const nextPage = notificationPageRef.current + 1
      const result = await listMyNotifications(nextPage, 25)
      setServerNotifications((items) => {
        const merged = new globalThis.Map(items.map((item) => [item.id, item]))
        result.items.forEach((item) => merged.set(item.id, item))
        return [...merged.values()]
      })
      notificationPageRef.current = result.page
      setNotificationTotal(result.total)
      setUnreadNotificationTotal(await getMyUnreadNotificationCount())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载更多通知失败，请稍后重试。')
    } finally {
      setLoadingMore(false)
    }
  }

  const removeMessage = async (message: MessageRow) => {
    if (!user) return
    if (!canDeleteMessage(message)) {
      setError('未读消息或待处理的项目申请暂时不能删除。')
      return
    }
    if (message.serverNotification) {
      setBusyId(message.id)
      try {
        await deleteMyNotification(message.serverNotification.id)
        setServerNotifications((items) => items.filter((item) => item.id !== message.serverNotification?.id))
        await loadMessages(false, false)
        setNotice('通知已从消息中心删除。')
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : '删除通知失败，请稍后重试。')
      } finally {
        setBusyId(null)
      }
      return
    }
    hideMessage(user.id, message.id)
    setNotice('消息已删除，仅从你的消息中心隐藏，不会删除项目或申请记录。')
    setReadVersion((version) => version + 1)
  }

  const removeAllMessages = async () => {
    if (!user || !messageRows.length) return
    if (apiConfig.contentSource === 'api') {
      setBusyId('delete-all')
      setError('')
      try {
        const deletedCount = await deleteAllReadMyNotifications()
        await loadMessages(false, true)
        setDeleteAllPending(false)
        setNotice(`已删除 ${deletedCount} 条已读通知；未读消息和仍待处理的审核事项会保留。业务记录不会被删除。`)
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : '批量删除通知失败，请稍后重试。')
      } finally {
        setBusyId(null)
      }
      return
    }
    const localMessages = messageRows.filter((message) => !message.serverNotification && canDeleteMessage(message))
    const savedMessages = messageRows.filter((message) => message.serverNotification && canDeleteMessage(message))
    if (localMessages.length) hideMessages(user.id, localMessages.map((message) => message.id))
    const deletedResults = await Promise.allSettled(savedMessages.map((message) => deleteMyNotification(message.serverNotification!.id)))
    const deletedIds = new Set(savedMessages
      .filter((_, index) => deletedResults[index].status === 'fulfilled')
      .map((message) => message.serverNotification!.id))
    setServerNotifications((items) => items.filter((item) => !deletedIds.has(item.id)))
    setDeleteAllPending(false)
    const deleteFailures = deletedResults.filter((result) => result.status === 'rejected').length
    if (deleteFailures) setError(`${deleteFailures} 条站内通知删除失败，请重试。`)
    const keptCount = messageRows.length - localMessages.length - deletedIds.size
    setNotice(`已删除 ${localMessages.length + deletedIds.size} 条已读消息；保留 ${keptCount} 条未处理或未读消息，业务记录不会被删除。`)
    setReadVersion((version) => version + 1)
  }

  const markAllRead = async () => {
    if (!user || !unreadCount) return
    if (apiConfig.contentSource === 'api') {
      try {
        await markAllMyNotificationsRead()
        setServerNotifications((items) => items.map((item) => ({ ...item, isRead: true })))
        setUnreadNotificationTotal(0)
        dispatchMessageStateChange({ userId: user.id, unreadCount: 0 })
        setNotice(`已将 ${unreadCount} 条通知标记为已读。待处理审核仍会保留，不能通过标记已读绕过审核。`)
      } catch (readError) {
        setError(readError instanceof Error ? readError.message : '标记通知已读失败，请稍后重试。')
      }
      return
    }
    const unreadMessages = messageRows.filter((message) => !message.read)
    const localUnread = unreadMessages.filter((message) => !message.serverNotification)
    const savedUnread = unreadMessages.filter((message) => message.serverNotification)
    if (localUnread.length) markMessagesRead(user.id, localUnread.map((message) => message.id))
    let serverUpdateFailed = false
    if (savedUnread.length) {
      try {
        await markAllMyNotificationsRead()
        setServerNotifications((items) => items.map((item) => ({ ...item, isRead: true })))
      } catch {
        serverUpdateFailed = true
      }
    }
    setNotice(`已将 ${unreadCount} 条消息标记为已读。`)
    if (serverUpdateFailed) setError('部分站内通知未能同步为已读，请稍后刷新重试。')
    setReadVersion((version) => version + 1)
  }

  const reviewRequest = async (request: ProjectJoinRequest, status: 'approved' | 'rejected') => {
    setBusyId(request.id)
    setError('')
    setNotice('')
    try {
      await reviewProjectJoinRequest(request.id, status, status === 'approved' ? '项目提交人已同意加入' : '项目提交人已拒绝加入')
      if (user) markMessagesRead(user.id, [projectJoinRequestMessageId(request)])
      await loadMessages(false)
      window.dispatchEvent(new Event('club-messages-state'))
      setNotice(status === 'approved' ? '已同意加入，项目成员会同步更新。' : '已拒绝这条加入申请。')
      setReadVersion((version) => version + 1)
    } catch {
      setError('处理项目加入申请失败，请确认后端已开放项目提交人的审核权限。')
    } finally {
      setBusyId(null)
    }
  }

  const openAdminContributions = () => {
    try { window.sessionStorage.setItem('club-admin-focus-section', 'contributions') } catch { /* Storage may be unavailable. */ }
    onNavigate('#/admin')
  }

  if (!user || user.role === 'Visitor') {
    return <div className="page message-center-page"><div className="empty-state"><LockKeyhole size={28} /><strong>登录后查看消息</strong><span>项目申请、投稿审核和处理结果会显示在这里。</span><button type="button" className="primary-button" onClick={() => onNavigate('#/login')}>前往登录 <ArrowRight size={15} /></button></div></div>
  }

  return <div className="page message-center-page">
    <PageIntro eyebrow="ACCOUNT / MESSAGES" title="消息中心" description="投稿待办、审核结果和项目申请状态统一显示在这里。管理审核仍在管理后台处理。" action={canAccessAdmin(user) ? <button type="button" className="secondary-button" onClick={openAdminContributions}><Settings2 size={15} /> 管理后台</button> : undefined} />
    <section className="message-center-card message-inbox-card">
      <div className="message-inbox-head"><div><p className="eyebrow">INBOX</p><h2>全部消息</h2><p>通知保存在账号收件箱；删除通知不会删除投稿、申请或其他业务记录。</p></div><div className="message-inbox-actions"><strong>{unreadCount}<small>未读</small></strong><div className="message-inbox-action-row"><button type="button" className="text-button" onClick={markAllRead} disabled={!unreadCount}>全部标为已读</button>{deleteAllPending ? <><button type="button" className="message-danger-button" onClick={removeAllMessages} disabled={busyId === 'delete-all'}>确认清理已读</button><button type="button" className="message-cancel-button" onClick={() => setDeleteAllPending(false)}>取消</button></> : <button type="button" className="text-button message-delete-all-trigger" onClick={() => setDeleteAllPending(true)} disabled={!hasReadNotifications}><Trash2 size={12} /> 清理已读消息</button>}</div></div></div>
      <div className="message-filter-tabs" role="tablist" aria-label="消息筛选">{filterOptions.map((option) => <button type="button" key={option.value} className={filter === option.value ? 'active' : ''} onClick={() => setFilter(option.value)} role="tab" aria-selected={filter === option.value}>{option.label}</button>)}</div>
      {error && <div className="message-center-alert error" role="alert"><CircleHelp size={16} /> {error}</div>}
      {notice && <div className="message-center-alert success" role="status"><CheckCircle2 size={16} /> {notice}</div>}
      {loading ? <div className="message-center-empty"><RefreshCw size={20} className="spin" /><strong>正在加载消息</strong><span>正在同步收件箱和相关项目申请。</span></div> : filteredMessages.length ? <div className="message-list">{filteredMessages.map((message) => {
        const pendingSubmission = message.kind === 'resource-submission' && message.submission?.status === 'pending'
        const pendingInterview = message.kind === 'interview-submission' && message.interview?.status === 'pending'
        const serverReviewTask = message.kind === 'server-notification' && message.serverNotification?.isActionable && ['project_review_pending', 'resource_submission_pending', 'interview_submission_pending', 'feedback_review_pending'].includes(message.serverNotification.type)
        const reviewerTask = message.kind === 'project-review' || message.kind === 'feedback-review' || pendingSubmission || pendingInterview || serverReviewTask
        const rowIcon = message.kind === 'server-notification' ? message.serverNotification?.type === 'competition_reminder' ? <Trophy size={17} /> : ['project_join_request', 'project_join_request_result'].includes(message.serverNotification?.type ?? '') ? <Users size={17} /> : <Bell size={17} /> : message.kind === 'join-request' || message.kind === 'join-result' ? <Users size={17} /> : message.kind === 'project-review' || message.kind === 'project-status' ? <Rocket size={17} /> : message.kind === 'feedback-review' ? <Quote size={17} /> : message.kind === 'interview-submission' ? <MessageCircle size={17} /> : <FileText size={17} />
        return <article className={'message-row ' + (message.read ? '' : 'is-unread')} key={message.id} onClick={() => void markRead(message)}>
          <span className={'message-row-icon tone-' + message.statusTone}>{rowIcon}</span>
          <div className="message-row-main">
            <div className="message-row-head"><strong>{message.title}</strong><Tag tone={message.statusTone}>{message.statusLabel}</Tag>{!message.read && <span className="message-unread-label">未读</span>}{message.read && <span className="message-read-label">已读</span>}</div>
            <p className={reviewerTask || message.kind === 'resource-submission' ? 'message-resource-submission-body' : undefined}>{message.body}</p>
            {message.request && message.serverNotification?.type === 'project_join_request' && <small>申请人：{message.request.userName || '未命名用户'} · 项目：{message.request.projectName || '未命名项目'}</small>}
            {message.kind === 'join-request' && message.request && <small>申请人：{message.request.userName || '未命名用户'} · 项目：{message.request.projectName || '未命名项目'}</small>}
            {message.kind === 'resource-submission' && message.submission && <small>投稿人：{message.submission.submitterName} · 分类：{message.submission.category}</small>}
            {message.kind === 'interview-submission' && message.interview && <small>{message.interview.anonymous ? '匿名展示' : `投稿人：${message.interview.author}`} · {message.interview.recruitmentType || '招聘类型未标注'} · {message.interview.cohort}</small>}
            {message.kind === 'project-review' && message.project && <small>提交人：{message.project.submittedByName || '项目提交人'} · {message.project.year} 届 · {message.project.category}</small>}
            {message.kind === 'feedback-review' && message.feedback && <small>{message.feedback.contact ? `联系方式：${message.feedback.contact}` : '匿名留言'} · {message.feedback.category}</small>}
            <small>{message.createdAt ? new Date(message.createdAt).toLocaleString('zh-CN') : '时间待同步'}</small>
            {message.serverNotification?.link && <div className="message-row-actions"><button type="button" className="secondary-button admin-small-button" onClick={(event) => { event.stopPropagation(); void markRead(message); onNavigate(message.serverNotification?.link ?? '#/messages') }}>查看详情 <ArrowRight size={13} /></button></div>}
            {(message.kind === 'join-request' || (message.kind === 'server-notification' && message.serverNotification?.type === 'project_join_request')) && message.request?.status === 'pending' && <div className="message-row-actions"><button type="button" className="secondary-button admin-small-button" disabled={busyId === message.request.id} onClick={(event) => { event.stopPropagation(); void reviewRequest(message.request as ProjectJoinRequest, 'rejected') }}><X size={13} /> 拒绝</button><button type="button" className="primary-button admin-small-button" disabled={busyId === message.request.id} onClick={(event) => { event.stopPropagation(); void reviewRequest(message.request as ProjectJoinRequest, 'approved') }}><Check size={13} /> 同意加入</button></div>}
            {message.kind === 'project-status' && message.project && <div className="message-row-actions"><button type="button" className="secondary-button admin-small-button" onClick={(event) => { event.stopPropagation(); markRead(message); onNavigate('#/projects/' + (message.project?.slug ?? '')) }}>查看项目 <ArrowRight size={13} /></button></div>}
            {message.kind === 'interview-submission' && message.interview && message.interview.status !== 'pending' && <div className="message-row-actions"><button type="button" className="secondary-button admin-small-button" onClick={(event) => { event.stopPropagation(); markRead(message); onNavigate('#/interviews/my-submissions') }}>查看我的面经投稿 <ArrowRight size={13} /></button></div>}
            {reviewerTask && <div className="message-row-actions"><button type="button" className="secondary-button admin-small-button" onClick={(event) => { event.stopPropagation(); markRead(message); openAdminContributions() }}><Settings2 size={13} /> 去投稿中心处理</button></div>}
          <button type="button" className="message-delete-button" aria-label="删除消息" title={canDeleteMessage(message) ? '删除已读消息；仍待处理的审核通知会被服务器保留' : '未读消息或待处理申请不能删除'} disabled={!canDeleteMessage(message) || busyId === message.id} onClick={(event) => { event.stopPropagation(); void removeMessage(message) }}><Trash2 size={13} /> 删除</button>
          </div>
        </article>
      })}</div> : <div className="message-center-empty"><Bell size={22} /><strong>{filter === 'unread' ? '没有未读消息' : '暂时没有消息'}</strong><span>{apiConfig.contentSource === 'api' && serverNotifications.length < notificationTotal ? (filter === 'unread' && unreadCount > 0 ? '更早通知中还有未读消息，可加载更多。' : '当前已加载的通知中没有符合条件的消息，可加载更早记录。') : filter === 'unread' ? '你已经看完了当前消息。' : filter === 'review-pending' ? '当前没有需要审核的投稿或申请。' : filter === 'review-results' ? '当前没有新的审核结果。' : filter === 'join-request' ? '当前没有项目加入申请。' : '投稿待办、审核结果和申请状态会显示在这里。'}</span></div>}
      <div className="message-inbox-footer">{canAccessAdmin(user) && <button type="button" className="message-admin-link" onClick={openAdminContributions}><Settings2 size={14} /> 去投稿中心处理审核</button>}{apiConfig.contentSource === 'api' && serverNotifications.length < notificationTotal && <button type="button" className="message-center-refresh" onClick={() => void loadMoreNotifications()} disabled={loadingMore}>{loadingMore ? <RefreshCw size={14} className="spin" /> : <ArrowDown size={14} />} 加载更多（{serverNotifications.length}/{notificationTotal}）</button>}<button type="button" className="message-center-refresh" onClick={() => void loadMessages()} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : undefined} /> 刷新消息</button></div>
    </section>
  </div>
}

function App() {
  const { data: { projects, starterMessages } } = useContent()
  const { user } = useAuth()
  const [route, setRoute] = useState(routeFromHash())
  // When settings are API-backed, the server is the source of truth. Local
  // demo preferences are only loaded while the API setting is turned off.
  const [theme, setTheme] = useState<Theme>(() => isRemoteSettingsEnabled ? 'light' : getStoredTheme())
  const [backgroundPreference, setBackgroundPreference] = useState<BackgroundPreference>(
    () => isRemoteSettingsEnabled ? 'paper' : getStoredBackgroundPreference(),
  )
  const [appearanceReady, setAppearanceReady] = useState(() => !isRemoteSettingsEnabled)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(() => {
    if (isRemoteSettingsEnabled) return null
    try { return localStorage.getItem('club-background-image') } catch { return null }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [messages, setMessages] = useState<AIMessage[]>(starterMessages)
  useEffect(() => {
    if (!isRemoteSettingsEnabled) {
      setAppearanceReady(true)
      return
    }
    let active = true
    setAppearanceReady(false)
    void Promise.allSettled([getSiteSettings(), user ? getUserPreferences() : Promise.resolve(null)]).then(([siteResult, userResult]) => {
      if (!active) return
      if (siteResult.status === 'fulfilled') {
        const site = siteResult.value
        // A signed-in user's preference wins over the site default.
        if (!user) {
          setTheme(site.theme)
          setBackgroundPreference(site.schoolBackgroundEnabled ? 'follow' : 'paper')
        }
      }
      if (userResult.status === 'fulfilled' && userResult.value) {
        const preferences = userResult.value
        setTheme(preferences.theme)
        setBackgroundPreference(preferences.backgroundPreference ?? (preferences.schoolBackgroundEnabled ? 'follow' : preferences.customBackgroundUrl ? 'custom' : 'paper'))
        if (preferences.customBackgroundUrl) setBackgroundImage(preferences.customBackgroundUrl)
      }
      setAppearanceReady(true)
    })
    return () => { active = false }
  }, [user])
  useEffect(() => {
    let previousHash = window.location.hash
    const updateRoute = () => {
      if (window.location.hash !== previousHash && !confirmDraftNavigation()) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${previousHash}`)
        return
      }
      previousHash = window.location.hash
      setRoute(routeFromHash())
      setMobileOpen(false)
      const rawHash = window.location.hash.replace(/^#/, '')
      if (!rawHash.startsWith('story-')) {
        window.scrollTo({ top: 0, behavior: 'auto' })
      }
    }
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    if (isRemoteSettingsEnabled) return
    try { localStorage.setItem('club-theme', theme) } catch { /* file:// privacy modes may disable storage */ }
  }, [theme])
  useEffect(() => {
    if (isRemoteSettingsEnabled) return
    try { localStorage.setItem('club-background-preference', backgroundPreference) } catch { /* file:// privacy modes may disable storage */ }
  }, [backgroundPreference])
  useEffect(() => {
    if (isRemoteSettingsEnabled) return
    try { if (backgroundImage) localStorage.setItem('club-background-image', backgroundImage); else localStorage.removeItem('club-background-image') } catch { /* file:// privacy modes may disable storage */ }
  }, [backgroundImage])
  useEffect(() => {
    if (isRemoteSettingsEnabled) return
    const syncStoredAppearance = (event: StorageEvent) => {
      if (event.key === 'club-theme' && (event.newValue === 'light' || event.newValue === 'dark')) setTheme(event.newValue)
      if (event.key === 'club-background-preference' && (event.newValue === 'follow' || event.newValue === 'campus' || event.newValue === 'mist' || event.newValue === 'paper' || event.newValue === 'custom')) setBackgroundPreference(event.newValue)
      if (event.key === 'club-background-image') setBackgroundImage(event.newValue)
    }
    window.addEventListener('storage', syncStoredAppearance)
    return () => window.removeEventListener('storage', syncStoredAppearance)
  }, [])
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true) } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [])
  const openProject = (project: Project) => navigate(`#/projects/${project.slug}`)
  const sendMessage = (text: string, options: { openDrawer?: boolean } = {}) => {
    const userMessage: AIMessage = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages((current) => [...current, userMessage])
    if (options.openDrawer !== false) setAiOpen(true)
    void askAssistant(text)
      .then((assistant) => setMessages((current) => [...current, assistant]))
      .catch((error) => setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: error instanceof Error ? error.message : '暂时无法连接 AI 服务，请稍后再试。' }]))
  }
  const renderPage = () => {
    if (route === '/home') return <ExpandedHomePage onNavigate={navigate} />
    if (route === '/tools') return <HomePage onNavigate={navigate} onOnboarding={() => setOnboardingOpen(true)} onOpenProject={openProject} />
    if (route === '/login' || route.startsWith('/login?')) {
      const mode = new URLSearchParams(route.split('?')[1] ?? '').get('mode') === 'register' ? 'register' : 'login'
      return <LoginPage key={route} initialMode={mode} />
    }
    if (route === '/messages') return <MessageCenterPage onNavigate={navigate} />
    if (route === '/admin') return <AdminPage onNavigate={navigate} theme={theme} backgroundPreference={backgroundPreference} onBackgroundPreferenceChange={setBackgroundPreference} backgroundImage={backgroundImage} onBackgroundImageChange={setBackgroundImage} />
    if (route === '/learning' || route.startsWith('/learning/')) return <LearningPage onOpenProject={openProject} initialRouteId={route.startsWith('/learning/') ? route.slice('/learning/'.length) : undefined} />
    if (route === '/projects') return <ProjectsPage onOpenProject={openProject} />
    if (route.startsWith('/projects/')) {
      const slug = route.slice('/projects/'.length)
      return <ProjectDetailPage slug={slug} project={projects.find((item) => item.slug === slug)} onNavigate={navigate} />
    }
    if (route === '/events' || route === '/competitions') return <EventsPage />
    if (route === '/resources') return <ResourcesPage onNavigate={navigate} />
    if (route === '/resources/prompts') return <PromptsPage onNavigate={navigate} />
    if (route.startsWith('/resources/')) return <ResourceDetailPage resourceId={route.slice('/resources/'.length)} onNavigate={navigate} />
    if (route === '/interviews') return <InterviewPage view="list" onNavigate={navigate} />
    if (route === '/interviews/my-submissions') return <InterviewPage view="mine" onNavigate={navigate} />
    if (route === '/interviews/submit') return <InterviewPage view="submit" onNavigate={navigate} />
    if (route.startsWith('/interviews/submit/')) return <InterviewPage view="submit" id={route.slice('/interviews/submit/'.length)} onNavigate={navigate} />
    if (route.startsWith('/interviews/')) return <InterviewPage view="detail" id={route.slice('/interviews/'.length)} onNavigate={navigate} />
    if (route === '/members/archive') return <DynamicPhotoArchivePage />
    if (route === '/members') return <DynamicMembersPage />
    if (route.startsWith('/members/')) {
      const [, , initialTeam, initialCohortYear] = route.split('/')
      return <DynamicMembersPage initialTeam={initialTeam} initialCohortYear={initialCohortYear} />
    }
    if (route === '/ai') return <AiPage messages={messages} onSend={(text) => sendMessage(text, { openDrawer: false })} onNewChat={() => setMessages([])} />
    if (route === '/feedback') return <FeedbackPage />
    return <ExpandedHomePage onNavigate={navigate} />
  }
  const isLanding = route === '/home'
  const isTools = route === '/tools'
  const isAdminRoute = route === '/admin'
  const isFullBleed = isLanding
  const siteBackground = !appearanceReady
    ? 'paper'
    : theme === 'dark' && backgroundPreference !== 'custom'
      ? 'starfield'
      : backgroundPreference === 'follow' ? 'campus' : backgroundPreference
  return <div className={`app-shell ${isLanding ? 'landing-shell' : ''} ${isTools ? 'tools-shell' : ''} ${isAdminRoute ? 'admin-shell' : ''} ${!isLanding ? 'site-background-shell' : ''} site-bg-${siteBackground}`} style={{ '--site-background-image': backgroundImage ? `url(${backgroundImage})` : 'none' } as React.CSSProperties}>{!isFullBleed && <Navbar route={route} theme={theme} onTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} onSearch={() => setCommandOpen(true)} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} backgroundPreference={backgroundPreference} onBackgroundPreferenceChange={setBackgroundPreference} backgroundImage={backgroundImage} onBackgroundImageChange={setBackgroundImage} />}<main className={`${isFullBleed ? 'full-bleed-main' : ''} ${isTools ? 'tools-main' : ''}`}><AnimatePresence mode="wait"><motion.div key={route} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }}><Suspense fallback={null}>{renderPage()}</Suspense></motion.div></AnimatePresence></main>{!isFullBleed && !isAdminRoute && <footer className="site-footer"><div><a href="#/home" className="brand footer-brand"><img className="brand-logo" src="./assets/college-logo-cropped.png" alt="南昌航空大学科技学院校徽" /><span className="brand-copy"><strong>南昌航空大学科技学院</strong><small>计算机科技小组 · Computer Science Club</small></span></a><p>学习 → 实践 → 传承。让每一届的知识都留下来。</p></div><div className="footer-links"><a href="#/members">关于我们</a><a href="#/members">加入我们</a><a href="#/resources">贡献指南</a><a href="#/home">隐私政策</a></div><span className="copyright">© 2026 南昌航空大学科技学院计算机科技小组</span></footer>}{!isFullBleed && !isAdminRoute && <button className="floating-ai" onClick={() => setAiOpen(true)} aria-label="打开 AI 助手"><Bot size={21} /></button>}<AiDrawer open={aiOpen && !isLanding} onClose={() => setAiOpen(false)} messages={messages} onSend={sendMessage} /><CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={navigate} /><OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} onNavigate={navigate} /></div>
}

export default App
