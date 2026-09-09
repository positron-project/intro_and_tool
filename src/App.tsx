import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
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
  Command,
  Compass,
  Copy,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Folder,
  Github,
  Gauge,
  History,
  Home,
  ImagePlus,
  LayoutDashboard,
  Layers3,
  KeyRound,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Map,
  Menu,
  MessageCircle,
  Megaphone,
  Moon,
  PanelLeft,
  Palette,
  Plus,
  Quote,
  Radio,
  RefreshCw,
  Rocket,
  Route,
  Save,
  Search,
  Send,
  ServerCog,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  SlidersHorizontal,
  ScrollText,
  Target,
  Terminal,
  Trash2,
  Trophy,
  Timer,
  UserCog,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useContent } from './services/content.context'
import { useClubConfig } from './services/club-config.context'
import { askAssistant } from './services/ai.service'
import { canManageContent, demoCredentials, demoOwnerCredentials } from './services/auth.service'
import { useAuth } from './services/auth.context'
import type { AIMessage, AnnouncementCategory, Citation, CompetitionEvent, CompetitionProject, InterviewExperience, LearningNode, LearningRoute, Project, Resource } from './types'
import { AdminAnnouncementModal, AdminContentManagerModal, AdminContentModal, AdminDeleteConfirm, AdminLearningRouteModal, AdminMemberModal, createLearningRouteDraft, createMemberDraft, type AdminCollectionKind, type AdminDeleteRequest, type AnnouncementDraft, type CollectionDraft, type ContentDraft, type LearningRouteDraft, type MemberDraft } from './components/admin-modals'
import { TurnstileWidget } from './components/turnstile-widget'

type Theme = 'light' | 'dark'
type BackgroundPreference = 'follow' | 'campus' | 'mist' | 'paper' | 'custom'

const MAX_LOCAL_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_LOCAL_AVATAR_BYTES = 5 * 1024 * 1024

function isSupportedImage(file: File, maxBytes: number) {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && file.size <= maxBytes
}

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
]

const campusEntranceAsset = './assets/campus-entrance.png'

const categoryClass: Record<AnnouncementCategory, string> = {
  重要: 'badge-red',
  比赛: 'badge-orange',
  项目: 'badge-blue',
  讲座: 'badge-violet',
  通知: 'badge-slate',
}

const roleLabels: Record<string, string> = {
  Admin: '超级管理员',
  Leader: '超级管理员 · 组长',
  Contributor: '本届负责人',
  Member: '小组成员',
  Visitor: '访客',
}

function routeFromHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/home'
  return raw.replace(/\/$/, '') || '/home'
}

function navigate(path: string) {
  window.location.hash = path.startsWith('#') ? path.slice(1) : path
}

function safeLink(value?: string) {
  const href = value?.trim()
  if (!href) return undefined
  if (href.startsWith('#/')) return href
  try {
    const url = new URL(href)
    return url.protocol === 'https:' || url.protocol === 'http:' ? href : undefined
  } catch {
    return undefined
  }
}

function safeImageSource(value?: string) {
  const source = value?.trim()
  if (!source) return undefined
  if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(source)) return source
  return safeLink(source)
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
    return stored === 'follow' || stored === 'campus' || stored === 'mist' || stored === 'paper' || stored === 'custom' ? stored : 'follow'
  } catch {
    return 'follow'
  }
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

function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

function Avatar({ initials, accent = 'blue', size = 'md' }: { initials: string; accent?: string; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`avatar avatar-${accent} avatar-${size}`}>{initials}</span>
}

function Navbar({ route, theme, onTheme, onSearch, mobileOpen, setMobileOpen }: { route: string; theme: Theme; onTheme: () => void; onSearch: () => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  const { user, signOut } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setProfileOpen(false)
    navigate('#/home')
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a href="#/home" className="brand" aria-label="回到首页">
          <img className="brand-logo" src="./assets/college-logo-cropped.png" alt="南昌航空大学科技学院校徽" />
          <span className="brand-copy"><strong>南昌航空大学科技学院</strong><small>计算机科技小组 · Computer Science Club</small></span>
        </a>

        <nav className={`main-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="主导航">
          {navItems.map(({ label, href, icon: NavIcon }) => {
            const target = href.slice(1)
            const active = route === target || (target !== '/home' && route.startsWith(target))
            return <a key={href} href={href} className={`nav-link ${active ? 'active' : ''}`} onClick={() => setMobileOpen(false)}><NavIcon size={16} />{label}</a>
          })}
        </nav>

        <div className="topbar-actions">
          <button className="search-trigger" onClick={onSearch} aria-label="搜索内容"><Search size={16} /><span>搜索内容、项目、资源...</span><kbd>⌘K</kbd></button>
          <button className="icon-button theme-button" onClick={onTheme} aria-label={`当前主题：${theme === 'dark' ? '深色' : '浅色'}`} title="切换白天 / 夜间">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <div className="profile-menu-wrap">
            <button className={`profile-button ${profileOpen ? 'is-open' : ''}`} onClick={() => user ? setProfileOpen((open) => !open) : navigate('#/login')} aria-label={user ? '打开个人菜单' : '登录'} title={user ? '个人菜单' : '登录'}><Avatar initials={user?.initials ?? '访'} size="sm" />{user && <ChevronDown size={14} />}</button>
            {user && profileOpen && <div className="profile-menu" role="menu">
              <div className="profile-menu-head"><Avatar initials={user.initials} size="md" /><div><strong>{user.name}</strong><small>{roleLabels[user.role] ?? user.role} · {user.cohort} 届</small></div></div>
              <div className="profile-menu-rule" />
              <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); navigate('#/tools') }}><LayoutDashboard size={15} /> 工作台</button>
              {canManageContent(user) && <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); navigate('#/admin') }}><Settings2 size={15} /> 管理后台</button>}
              <button type="button" role="menuitem" onClick={() => void handleSignOut()}><LogOut size={15} /> 退出登录</button>
            </div>}
          </div>
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
    </header>
  )
}

function CampusIllustration() {
  return (
    <div className="campus-illustration" aria-label="抽象校园与知识网络插画">
      <div className="orb orb-one" /><div className="orb orb-two" /><div className="orb orb-three" />
      <div className="campus-grid" />
      <div className="campus-building building-a"><span /><span /><span /><span /></div>
      <div className="campus-building building-b"><span /><span /><span /></div>
      <div className="campus-bridge" />
      <div className="signal signal-a"><span>RAG</span></div>
      <div className="signal signal-b"><span>API</span></div>
      <div className="signal signal-c"><span>OS</span></div>
      <div className="campus-caption"><span className="pulse-dot" />本周知识新增 <strong>18</strong> 条</div>
    </div>
  )
}

function Hero({ onNavigate, onOnboarding }: { onNavigate: (path: string) => void; onOnboarding: () => void }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="kicker-mark"><Sparkles size={13} /></span> 2026 · 第四代知识社区</div>
        <h1>探索技术的边界<br /><em>创造无限可能</em></h1>
        <p>在这里学习、构建、分享，<br className="desktop-only" />让每一届的知识都传承下去。</p>
        <div className="hero-actions"><button className="primary-button" onClick={() => onNavigate('#/learning')}>开始学习之旅 <ArrowRight size={17} /></button><button className="secondary-button" onClick={() => onNavigate('#/projects')}>浏览项目库</button></div>
        <button className="onboarding-link" onClick={onOnboarding}><span>还不知道从哪开始？</span> 用 2 分钟生成你的路线 <ArrowUpRight size={14} /></button>
      </div>
      <div className="hero-visual"><CampusIllustration /></div>
    </section>
  )
}

function ToolsLivePulse({ onOpenProject }: { onOpenProject: (project: Project) => void }) {
  const { data: { projects } } = useContent()
  const [active, setActive] = useState(0)
  const [projectActive, setProjectActive] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const pulseItems = [
    { label: '算法组', title: 'RAG 评测集正在整理', detail: '4 位成员在线 · 刚刚更新', icon: 'scan', tone: 'blue' },
    { label: '项目组', title: '校园 AI 助手接口联调中', detail: '下一次同步 · 今天 19:30', icon: 'rocket', tone: 'violet' },
    { label: '知识库', title: 'FastAPI 学习路线新增 3 条资料', detail: '来自 2025 届 · 12 分钟前', icon: 'book', tone: 'mint' },
    { label: '小组活动', title: '本周项目分享会开放报名', detail: '周四 18:40 · 线上会议室', icon: 'calendar', tone: 'orange' },
  ]
  const activeProjects = projects.filter((project) => project.status !== '已归档')

  useEffect(() => {
    const rotation = window.setInterval(() => setActive((current) => (current + 1) % pulseItems.length), 4200)
    const clock = window.setInterval(() => setNow(new Date()), 1000)
    return () => { window.clearInterval(rotation); window.clearInterval(clock) }
  }, [pulseItems.length])

  useEffect(() => {
    if (activeProjects.length < 2) return
    const rotation = window.setInterval(() => setProjectActive((current) => (current + 1) % activeProjects.length), 5200)
    return () => window.clearInterval(rotation)
  }, [activeProjects.length])

  useEffect(() => {
    if (activeProjects.length > 0 && projectActive >= activeProjects.length) setProjectActive(0)
  }, [activeProjects.length, projectActive])

  const current = pulseItems[active]
  const currentProject = activeProjects[projectActive]
  const timeLabel = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return (
    <section className="tools-live-pulse" aria-label="小组实时动态">
      <div className="tools-live-column tools-live-activity">
        <div className="tools-live-pulse-head"><div><p className="eyebrow">LIVE WORKSPACE</p><strong>本届正在发生</strong></div><span className="tools-live-clock"><i /> {timeLabel} · 实时同步</span></div>
        <div className="tools-live-pulse-body"><AnimatePresence mode="wait" initial={false}><motion.div className={`tools-live-story tone-${current.tone}`} key={current.title} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .24, ease: 'easeOut' }}><span className="tools-live-story-icon"><Icon name={current.icon} size={17} /></span><span className="tools-live-story-copy"><small>{current.label}</small><strong>{current.title}</strong><em>{current.detail}</em></span><span className="tools-live-story-index">0{active + 1}</span></motion.div></AnimatePresence><div className="tools-live-dots" aria-label="切换小组动态">{pulseItems.map((item, index) => <button key={item.title} className={index === active ? 'active' : ''} onClick={() => setActive(index)} aria-label={`查看${item.label}动态`} aria-current={index === active ? 'true' : undefined} />)}</div></div>
      </div>
      <span className="tools-live-divider" aria-hidden="true" />
      <div className="tools-live-column tools-live-project">
        <div className="tools-live-project-head"><div><p className="eyebrow">PROJECT IN PROGRESS</p><strong>当前进行的项目</strong></div>{currentProject && <span className={`tools-live-project-status tone-${currentProject.accent}`}>{currentProject.status}</span>}</div>
        {currentProject ? <AnimatePresence mode="wait" initial={false}><motion.div className="tools-live-project-card" key={currentProject.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .24, ease: 'easeOut' }}><span className={`tools-live-project-icon tone-${currentProject.accent}`}><Icon name={currentProject.icon} size={18} /></span><div className="tools-live-project-copy"><small>{currentProject.category} · {currentProject.year} 届</small><strong>{currentProject.name}</strong><em>{currentProject.description}</em><div className="tools-live-project-stack">{currentProject.stack.slice(0, 3).map((stack) => <span key={stack}>{stack}</span>)}</div></div><button type="button" className="tools-live-project-open" onClick={() => onOpenProject(currentProject)} aria-label={`查看${currentProject.name}项目详情`}><ArrowUpRight size={15} /></button></motion.div></AnimatePresence> : <div className="tools-live-project-empty">暂无进行中的项目</div>}
        <div className="tools-live-project-footer"><div className="tools-live-project-dots" aria-label="切换当前项目">{activeProjects.map((project, index) => <button key={project.id} className={index === projectActive ? 'active' : ''} onClick={() => setProjectActive(index)} aria-label={`查看${project.name}`} aria-current={index === projectActive ? 'true' : undefined} />)}</div>{currentProject && <span>{currentProject.members} 人协作 · {currentProject.category}</span>}</div>
      </div>
    </section>
  )
}
function AnnouncementPanel() {
  const { data: { announcements } } = useContent()
  const { user } = useAuth()
  const userCohort = user?.cohort.replace(/\D/g, '')
  const visible = announcements.filter((item) => {
    if (item.published === false) return false
    if (!item.scope || item.scope === '全站公开') return true
    if (item.scope === '管理员可见') return Boolean(user && canManageContent(user))
    return Boolean(user && userCohort && item.scope.replace(/\D/g, '') === userCohort)
  })
  return <section className="panel announcements-panel"><SectionHeading eyebrow="LIVE / CAMPUS" title="最新公告" /><div className="announcement-list">{visible.map((item) => <button className="announcement-row" key={item.id}><span className={`category-badge ${categoryClass[item.category]}`}>{item.category}</span><span className="announcement-main"><strong>{item.title}</strong><small>{item.detail}</small></span><time>{item.date}</time></button>)}</div>{visible.length === 0 && <div className="admin-empty"><Megaphone size={20} /><span>暂无公开公告</span></div>}</section>
}

function ProjectVisual({ project, compact = false }: { project: Project; compact?: boolean }) {
  const accent = project.accent
  const coverImage = safeImageSource(project.coverImage)
  return <div className={`project-visual visual-${accent} ${compact ? 'compact' : ''} ${coverImage ? 'has-cover' : ''}`} style={coverImage ? { backgroundImage: `linear-gradient(135deg, rgba(11, 31, 58, .2), rgba(11, 31, 58, .68)), url(${coverImage})` } : undefined}><div className="visual-noise" />{coverImage ? <span className="visual-cover-label">PROJECT COVER</span> : <><span className="visual-icon"><Icon name={project.icon} size={compact ? 21 : 28} /></span><div className="visual-lines"><i /><i /><i /><i /></div><span className="visual-code">{project.category === 'AI' ? 'retrieval.graph()' : project.category === 'Web' ? 'ship — iterate' : 'reserve.lab()'}</span></>}</div>
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: (project: Project) => void }) {
  return <motion.article className="project-card" whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: .995 }} transition={{ duration: 0.2, ease: 'easeOut' }} onClick={() => onOpen(project)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(project)}><ProjectVisual project={project} /><div className="project-card-body"><div className="project-card-top"><Tag tone={project.status === '招募中' ? 'mint' : project.status === '维护中' ? 'blue' : 'neutral'}>{project.status}</Tag><span className="project-year">{project.year}</span></div><h3>{project.name}</h3><p>{project.description}</p><div className="project-tags">{project.stack.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div><div className="project-meta"><span><Users size={14} /> {project.members} 人</span><span><Star size={14} /> {project.stars}</span><span className="project-arrow"><ArrowUpRight size={15} /></span></div></div></motion.article>
}

function FeaturedProjects({ onOpen }: { onOpen: (project: Project) => void }) {
  const { data: { projects } } = useContent()
  const [active, setActive] = useState(0)
  const visible = projects.filter((item) => item.featured)
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
  const maxStars = Math.max(...visible.map((project) => project.stars), 1)
  const starRatio = current ? Math.round((current.stars / maxStars) * 100) : 0
  return (
    <section className="panel featured-panel">
      <div className="section-heading"><div><p className="eyebrow">CURATED BY MEMBERS</p><h2><span className="title-spark">✦</span> 推荐项目</h2></div>{visible.length > 1 && <div className="carousel-actions"><span className="tools-section-code">AUTO ROTATE · 5.2S</span><button className="icon-button small" onClick={() => setActive((value) => (value - 1 + visible.length) % visible.length)} aria-label="上一个项目"><ChevronLeft size={16} /></button><button className="icon-button small" onClick={() => setActive((value) => (value + 1) % visible.length)} aria-label="下一个项目"><ChevronRight size={16} /></button></div>}</div>
      {current && <div className="tools-focus-layout">
        <div className={'tools-focus-stage tone-' + current.accent}>
          <div className="tools-focus-stage-top"><span><i /> NOW FEATURED</span><strong>0{active + 1} / 0{visible.length}</strong></div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div className="tools-focus-story" key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .25, ease: 'easeOut' }}>
              <span className="tools-focus-icon"><Icon name={current.icon} size={20} /></span>
              <div className="tools-focus-copy"><small>{current.year} 届 · {current.category}</small><h3>{current.name}</h3><p>{current.description}</p><button className="tools-focus-action" onClick={() => onOpen(current)}>查看项目详情 <ArrowRight size={14} /></button></div>
            </motion.div>
          </AnimatePresence>
          <div className="tools-focus-meter"><span>社区星标</span><div><i style={{ width: starRatio + '%' }} /></div><strong>{current.stars}</strong></div>
        </div>
        <div className="tools-focus-list">
          <span className="tools-focus-list-label">PROJECT QUEUE</span>
          {visible.map((project, index) => <button key={project.id} className={index === active ? 'active' : ''} onClick={() => setActive(index)}><span className={'tools-queue-index tone-' + project.accent}>0{index + 1}</span><span><strong>{project.name}</strong><small>{project.category} · {project.year} 届</small></span><ArrowUpRight size={14} /></button>)}
        </div>
      </div>}
    </section>
  )
}

function ClubDirections() {
  const directions = [
    { label: '算法组', team: 'algorithm', count: '6 人', description: '算法训练 · 竞赛 · 模型实践', icon: Target, tone: 'blue' },
    { label: '项目组', team: 'project', count: '7 人', description: '产品开发 · 协作交付 · 作品沉淀', icon: Rocket, tone: 'violet' },
    { label: '网安组', team: 'cybersecurity', count: '2 人', description: '安全研究 · 攻防实践 · 风险防护', icon: ShieldCheck, tone: 'rose' },
  ]

  return <section className="panel direction-panel"><SectionHeading eyebrow="TEAM MAP / 2029" title="小组方向" /><div className="direction-list">{directions.map(({ label, team, count, description, icon: DirectionIcon, tone }) => <button className="direction-row" key={label} onClick={() => navigate(`#/members/${team}`)}><span className={`direction-icon direction-${tone}`}><DirectionIcon size={17} /></span><span className="direction-copy"><strong>{label}</strong><small>{description}</small></span><span className="direction-count">{count}</span><ArrowUpRight size={14} className="direction-arrow" /></button>)}</div><div className="direction-footer"><span><Users size={14} /> 第四代 · 2029 届</span><button className="text-button" onClick={() => navigate('#/members')}>查看小组风采 <ArrowRight size={14} /></button></div></section>
}

function RecentUpdates() {
  const updates = [{ title: 'FastAPI 学习路线', date: '05-15', icon: 'route', accent: 'blue' }, { title: 'Docker 从入门到实践', date: '05-14', icon: 'terminal', accent: 'mint' }, { title: 'LangChain 中文文档整理', date: '05-13', icon: 'book', accent: 'violet' }]
  return <section className="panel updates-panel"><SectionHeading eyebrow="KNOWLEDGE LOG" title="最近更新" action="查看全部" onAction={() => navigate('#/resources')} /><div className="update-list">{updates.map((item) => <button className="update-row" key={item.title} onClick={() => navigate('#/resources')}><span className={`update-icon accent-${item.accent}`}><Icon name={item.icon} size={16} /></span><strong>{item.title}</strong><time>{item.date}</time></button>)}</div></section>
}

function GrowthStats() {
  const { data: { growthStats } } = useContent()
  return <section className="growth-section"><SectionHeading eyebrow="SINCE 2021" title="我们的成长" /><div className="growth-grid">{growthStats.map((item) => <div className={`growth-stat stat-${item.accent}`} key={item.label}><span className="growth-icon"><Icon name={item.icon} size={17} /></span><strong>{item.value}</strong><span>{item.label}</span><small>{item.note}</small></div>)}</div></section>
}

function QuoteCard() {
  const { siteCopy } = useClubConfig()
  const quote = siteCopy.find((item) => item.id === 'quote')
  return <aside className="quote-card"><Quote size={22} /><p>“{quote?.title ?? '代码是写给人看的，附带能在机器上运行。'}”</p><span>— {quote?.author ?? 'Harold Abelson'}</span><div className="quote-mark">/ 今日名言</div></aside>
}

function LandingPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const landingRef = useRef<HTMLDivElement>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = landingRef.current
    const canvas = particleCanvasRef.current
    const context = canvas?.getContext('2d')
    if (!root || !canvas || !context) return

    type Particle = { x: number; y: number; vx: number; vy: number; radius: number; alpha: number; life: number; maxLife: number; color: string }
    type Star = { x: number; y: number; radius: number; alpha: number; twinkle: number; phase: number }
    const colors = ['37, 99, 235', '90, 145, 238', '124, 92, 229', '16, 185, 129']
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const pointer = { x: -1000, y: -1000, lastX: -1000, lastY: -1000, active: false, dragging: false }
    const particles: Particle[] = []
    const stars: Star[] = []
    let width = 0
    let height = 0
    let pixelRatio = 1
    let frame = 0
    let lastFrame = performance.now()

    const randomParticle = (x = Math.random() * width, y = Math.random() * height, burst = false): Particle => {
      const angle = Math.random() * Math.PI * 2
      const speed = burst ? Math.random() * 1.4 + .35 : Math.random() * .18 + .03
      const maxLife = burst ? Math.random() * 42 + 28 : 1
      return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: burst ? Math.random() * 1.7 + .65 : Math.random() * 1.35 + .45, alpha: burst ? .7 : Math.random() * .42 + .18, life: burst ? maxLife : Math.random(), maxLife, color: colors[Math.floor(Math.random() * colors.length)] }
    }

    const randomStar = (): Star => ({ x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 1.15 + .25, alpha: Math.random() * .48 + .16, twinkle: Math.random() * .9 + .55, phase: Math.random() * Math.PI * 2 })

    const resize = () => {
      const rect = root.getBoundingClientRect()
      width = rect.width
      height = rect.height
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const seed = () => {
      particles.length = 0
      stars.length = 0
      const count = Math.min(115, Math.max(48, Math.floor((width * height) / 11500)))
      for (let index = 0; index < count; index += 1) particles.push(randomParticle())
      const starCount = Math.min(180, Math.max(80, Math.floor((width * height) / 7600)))
      for (let index = 0; index < starCount; index += 1) stars.push(randomStar())
    }

    const pointFromEvent = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const addBurst = (x: number, y: number, amount: number) => {
      for (let index = 0; index < amount; index += 1) particles.push(randomParticle(x + (Math.random() - .5) * 12, y + (Math.random() - .5) * 12, true))
      if (particles.length > 190) particles.splice(0, particles.length - 190)
    }

    const onPointerMove = (event: PointerEvent) => {
      const point = pointFromEvent(event)
      pointer.lastX = pointer.x
      pointer.lastY = pointer.y
      pointer.x = point.x
      pointer.y = point.y
      pointer.active = true
      if (pointer.dragging) {
        const distance = Math.hypot(pointer.x - pointer.lastX, pointer.y - pointer.lastY)
        addBurst(pointer.x, pointer.y, Math.min(5, Math.max(1, Math.floor(distance / 8))))
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      const point = pointFromEvent(event)
      pointer.x = point.x
      pointer.y = point.y
      pointer.lastX = point.x
      pointer.lastY = point.y
      pointer.active = true
      pointer.dragging = true
      addBurst(point.x, point.y, 14)
    }
    const onPointerUp = () => { pointer.dragging = false }
    const onPointerLeave = () => { pointer.active = false; pointer.dragging = false }

    const draw = (now: number) => {
      const delta = Math.min(2.2, (now - lastFrame) / 16.67)
      lastFrame = now
      context.clearRect(0, 0, width, height)
      for (const star of stars) {
        const pulse = .72 + Math.sin(now / 900 * star.twinkle + star.phase) * .28
        context.fillStyle = `rgba(126, 153, 190, ${star.alpha * pulse * .58})`
        context.beginPath()
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        context.fill()
        if (star.radius > 1.05) {
          context.fillStyle = `rgba(92, 132, 190, ${star.alpha * pulse * .1})`
          context.beginPath()
          context.arc(star.x, star.y, star.radius * 3.6, 0, Math.PI * 2)
          context.fill()
        }
      }
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index]
        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        if (pointer.active) {
          const dx = pointer.x - particle.x
          const dy = pointer.y - particle.y
          const distance = Math.hypot(dx, dy)
          if (distance < 125) {
            const influence = (125 - distance) / 125
            particle.vx += (dx / Math.max(distance, 1)) * influence * .009 * delta
            particle.vy += (dy / Math.max(distance, 1)) * influence * .009 * delta
          }
        }
        particle.vx *= .995
        particle.vy *= .995
        if (particle.maxLife !== 1) { particle.life -= delta; particle.alpha *= .985 }
        if (particle.x < -20 || particle.x > width + 20 || particle.y < -20 || particle.y > height + 20 || particle.life <= 0) particles.splice(index, 1)
      }
      while (particles.length < 80) particles.push(randomParticle())

      for (let first = 0; first < particles.length; first += 1) {
        const particle = particles[first]
        for (let second = first + 1; second < particles.length; second += 1) {
          const other = particles[second]
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y)
          if (distance < 82) {
            context.strokeStyle = `rgba(${particle.color}, ${(1 - distance / 82) * .12})`
            context.lineWidth = .55
            context.beginPath()
            context.moveTo(particle.x, particle.y)
            context.lineTo(other.x, other.y)
            context.stroke()
          }
        }
      }
      for (const particle of particles) {
        context.fillStyle = `rgba(${particle.color}, ${particle.alpha})`
        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context.fill()
      }
      if (pointer.active) {
        if (pointer.dragging) {
          for (const particle of particles) {
            const distance = Math.hypot(pointer.x - particle.x, pointer.y - particle.y)
            if (distance < 145) {
              context.strokeStyle = `rgba(74, 116, 190, ${(1 - distance / 145) * .24})`
              context.lineWidth = .7
              context.beginPath()
              context.moveTo(pointer.x, pointer.y)
              context.lineTo(particle.x, particle.y)
              context.stroke()
            }
          }
        }
        const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, pointer.dragging ? 95 : 65)
        glow.addColorStop(0, `rgba(37, 99, 235, ${pointer.dragging ? .16 : .09})`)
        glow.addColorStop(1, 'rgba(37, 99, 235, 0)')
        context.fillStyle = glow
        context.beginPath()
        context.arc(pointer.x, pointer.y, pointer.dragging ? 95 : 65, 0, Math.PI * 2)
        context.fill()
        if (pointer.dragging) {
          context.strokeStyle = 'rgba(37, 99, 235, .33)'
          context.lineWidth = 1
          context.beginPath()
          context.arc(pointer.x, pointer.y, 17 + Math.sin(now / 120) * 2, 0, Math.PI * 2)
          context.stroke()
        }
      }
      if (!prefersReducedMotion) frame = window.requestAnimationFrame(draw)
    }

    resize()
    seed()
    window.addEventListener('resize', resize)
    root.addEventListener('pointermove', onPointerMove, { passive: true })
    root.addEventListener('pointerdown', onPointerDown, { passive: true })
    root.addEventListener('pointerup', onPointerUp, { passive: true })
    root.addEventListener('pointercancel', onPointerUp, { passive: true })
    root.addEventListener('pointerleave', onPointerLeave, { passive: true })
    if (prefersReducedMotion) draw(performance.now())
    else frame = window.requestAnimationFrame(draw)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointerup', onPointerUp)
      root.removeEventListener('pointercancel', onPointerUp)
      root.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  return <div ref={landingRef} className="landing-page">
    <div className="landing-media" aria-hidden="true"><img src={campusEntranceAsset} alt="" /><div className="landing-photo-overlay" /></div>
    <canvas ref={particleCanvasRef} className="landing-particles" aria-hidden="true" />
    <header className="landing-header">
      <button className="landing-brand" onClick={() => onNavigate('#/home')} aria-label="南昌航空大学科技学院计算机科技小组首页">
        <img className="landing-brand-logo" src="./assets/college-logo-cropped.png" alt="南昌航空大学科技学院校徽" />
        <span><strong>南昌航空大学科技学院</strong><small>计算机科技小组</small></span>
      </button>
      <div className="landing-header-right"><span className="landing-cohort">CS CLUB · 2026</span><span className="landing-language">中 <i /> EN</span></div>
    </header>
    <main className="landing-content">
      <div className="landing-copy">
        <p className="landing-eyebrow"><span /><span>南昌航空大学科技学院 · COMPUTER SCIENCE CLUB</span></p>
        <h1>计算机科技小组<br /><em>让知识持续发生</em></h1>
        <p className="landing-lead">一个连接学习、项目与传承的技术社区。<br />从第一个节点开始，和下一届一起把想法做出来。</p>
        <div className="landing-proof"><span className="proof-number">04</span><span>代成员持续共建</span><i /><span className="proof-number">68</span><span>个项目正在传承</span></div>
      </div>
      <div className="landing-visual" aria-label="学习路线与项目传承可视化">
        <div className="landing-orbit orbit-large" /><div className="landing-orbit orbit-small" />
        <div className="landing-node node-main"><span className="node-main-kicker"><i /> CS CLUB</span><strong>计算机科技小组</strong><small>学习 · 实践 · 传承</small></div>
        <div className="landing-node node-top"><span><Route size={15} /></span><small>学习路线</small></div>
        <div className="landing-node node-right"><span><Rocket size={15} /></span><small>项目库</small></div>
        <div className="landing-node node-bottom"><span><History size={15} /></span><small>历届知识</small></div>
        <div className="landing-node node-left"><span><Users size={15} /></span><small>成员协作</small></div>
        <div className="landing-connector connector-one" /><div className="landing-connector connector-two" /><div className="landing-connector connector-three" /><div className="landing-connector connector-four" />
        <div className="landing-code-card"><span className="code-card-dot" /><span>第 4 代 · 知识持续生长</span></div>
      </div>
    </main>
    <div className="landing-footer-left"><a className="school-link" href="https://www.stcnchu.edu.cn/" target="_blank" rel="noreferrer">南昌航空大学科技学院官网 <ArrowUpRight size={14} /></a></div>
    <div className="landing-footer-center"><span /> <small>把这一届的经验，留给下一届。</small></div>
    <button className="landing-arrow" onClick={() => onNavigate('#/tools')} aria-label="进入工具页"><span>进入</span><ArrowRight size={21} /></button>
  </div>
}


function ToolsRadar() {
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
      <div className="radar-readout radar-readout-top"><span>同步率</span><strong>92.4%</strong></div>
      <div className="radar-readout radar-readout-bottom"><span>本周节点</span><strong>18</strong></div>
      <span className="radar-label radar-label-a">RAG / 04</span>
      <span className="radar-label radar-label-b">SHIP / 02</span>
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
  const purpose = siteCopy.find((item) => item.id === 'purpose')
  const memberCount = currentCohort?.teams.reduce((total, team) => total + team.members.length, 0) ?? 0
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
        <div className="tools-hero-metrics"><span><Activity size={14} /> 4 个工作流在线</span><i /><span><Users size={14} /> {currentCohort?.year ?? '当前'} 届 · {memberCount || '—'} 人共建</span></div>
      </div>
      <ToolsRadar />
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

function LoginPage() {
  const { user, loading, isDemo, signIn, signInWithCode, register, requestRegistrationCode, requestLoginCode, signOut } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
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

  const fillDemoAccount = (account: { email: string; password: string }) => {
    setEmail(account.email)
    setPassword(account.password)
    setError(null)
  }

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode)
    setLoginMethod('password')
    setError(null)
    setDemoCode(null)
    setLoginDemoCode(null)
    setTurnstileToken('')
    setCaptchaNonce((value) => value + 1)
  }

  const sendRegistrationCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())) {
      setError('请输入合法的邮箱地址')
      return
    }
    if (!turnstileToken) {
      setError('请先完成验证码校验')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await requestRegistrationCode(email, turnstileToken)
      setCodeCooldown(60)
      setDemoCode(result.demoCode ?? null)
      // Turnstile tokens are single-use; registration needs a fresh token.
      setTurnstileToken('')
      setCaptchaNonce((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '验证码发送失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  const sendLoginCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())) {
      setError('请输入合法的邮箱地址')
      return
    }
    if (!turnstileToken) {
      setError('请先完成验证码校验')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await requestLoginCode(email, turnstileToken)
      setLoginCodeCooldown(60)
      setLoginDemoCode(result.demoCode ?? null)
      setTurnstileToken('')
      setCaptchaNonce((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '验证码发送失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())) {
      setError('请输入合法的邮箱地址')
      return
    }
    if (!turnstileToken) {
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
    try {
      if (mode === 'register') await register({ username, email, verificationCode, password, turnstileToken })
      else if (loginMethod === 'code') await signInWithCode({ email, verificationCode, turnstileToken, rememberMe })
      else await signIn({ email, password, turnstileToken, rememberMe })
      navigate('#/tools')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '登录失败，请稍后再试')
    } finally {
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
        <p className="login-card-description">{mode === 'login' ? '使用小组账号继续访问你的工作台。' : '填写邮箱并完成验证，创建一个待管理员分配届次的账号。'}</p>
        {mode === 'login' && <div className="login-method-switch" role="tablist" aria-label="登录方式"><button type="button" className={loginMethod === 'password' ? 'active' : ''} onClick={() => { setLoginMethod('password'); setError(null); setVerificationCode(''); setLoginDemoCode(null) }}>邮箱密码登录</button><button type="button" className={loginMethod === 'code' ? 'active' : ''} onClick={() => { setLoginMethod('code'); setError(null); setPassword(''); setLoginDemoCode(null) }}>邮箱验证码登录</button></div>}
        <form className="login-form" onSubmit={submit}>
          {mode === 'register' && <label className="login-field"><span>账号名</span><div className="login-input-wrap"><LogIn size={16} /><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="设置一个账号名" /></div></label>}
          <label className="login-field"><span>邮箱</span><div className="login-input-wrap"><Mail size={16} /><input value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => { if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())) setError('请输入合法的邮箱地址') }} aria-invalid={Boolean(email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim()))} autoComplete="email" type="email" placeholder="name@example.com" /></div></label>
          {(mode === 'register' || (mode === 'login' && loginMethod === 'password')) && <label className="login-field"><span>密码</span><div className="login-input-wrap"><KeyRound size={16} /><input value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} placeholder={mode === 'login' ? '输入密码' : '至少 8 位密码'} /><button type="button" className="login-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? '隐藏密码' : '显示密码'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>}
          {mode === 'register' && <label className="login-field"><span>确认密码</span><div className="login-input-wrap"><KeyRound size={16} /><input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="再次输入密码" /></div></label>}
          {(mode === 'register' || (mode === 'login' && loginMethod === 'code')) && <div className="login-code-row"><label className="login-field"><span>邮箱验证码</span><div className="login-input-wrap"><Mail size={16} /><input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} inputMode="numeric" placeholder="6 位验证码" /></div></label><button type="button" className="secondary-button login-code-button" disabled={submitting || (mode === 'register' ? codeCooldown > 0 : loginCodeCooldown > 0)} onClick={() => void (mode === 'register' ? sendRegistrationCode() : sendLoginCode())}>{mode === 'register' ? (codeCooldown > 0 ? `${codeCooldown}s 后重发` : '获取验证码') : (loginCodeCooldown > 0 ? `${loginCodeCooldown}s 后重发` : '获取验证码')}</button></div>}
          <div className="login-captcha"><TurnstileWidget key={captchaNonce} value={turnstileToken} onChange={handleTurnstileChange} /></div>
          {mode === 'login' && <label className="login-remember"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>记住登录状态</span></label>}
          {error && <p className="login-error" role="alert">{error}</p>}
          {(demoCode || loginDemoCode) && <p className="login-demo-code" role="status">本地测试验证码：<strong>{demoCode ?? loginDemoCode}</strong></p>}
          <button className="primary-button login-submit" type="submit" disabled={submitting}>{submitting ? <><span className="login-submit-spinner" /> 正在处理</> : mode === 'login' ? <><LogIn size={16} /> 登录</> : <><UserRound size={16} /> 创建账号</>}</button>
        </form>
        {isDemo && mode === 'login' && <div className="login-demo-box"><div><span>本地账号模式</span><small>当前使用本地持久化账号，可直接登录管理</small></div><div className="login-demo-actions"><button type="button" onClick={() => fillDemoAccount(demoCredentials)}>组长账号</button><button type="button" onClick={() => fillDemoAccount(demoOwnerCredentials)}>2029 届负责人</button></div><small className="login-demo-hint">初始密码：club2029</small></div>}
        <p className="login-footer-note">账号权限由管理员维护，注册后需由负责人分配届次和方向。</p>
      </section>
    </div>
  </div>
}

function LearningPage({ onOpenProject }: { onOpenProject: (project: Project) => void }) {
  const { data: { learningRoutes, projects } } = useContent()
  const [activeRouteId, setActiveRouteId] = useState('pyagent')
  const [projectIndex, setProjectIndex] = useState(0)
  const tracks = useMemo(() => {
    const configured = learningRoutes.map((route) => ({ id: route.id, label: route.direction?.trim() || route.title.trim(), route })).filter((item) => item.label)
    return configured
  }, [learningRoutes])
  const activeTrack = tracks.find((track) => track.id === activeRouteId) ?? tracks[0]
  const active = activeTrack?.label ?? 'PyAgent'
  const route = activeTrack?.route
  const visibleNodes = route?.nodes ?? []
  const routeProjects = (route?.featuredProjectIds ?? []).map((id) => projects.find((project) => project.id === id)).filter((project): project is Project => Boolean(project))
  const currentProject = routeProjects[projectIndex % Math.max(routeProjects.length, 1)]
  useEffect(() => {
    if (!tracks.some((track) => track.id === activeRouteId)) setActiveRouteId(tracks[0]?.id ?? 'pyagent')
  }, [activeRouteId, tracks])
  useEffect(() => { setProjectIndex(0) }, [activeRouteId, route?.id])
  useEffect(() => {
    if (routeProjects.length < 2) return
    const timer = window.setInterval(() => setProjectIndex((value) => (value + 1) % routeProjects.length), 5200)
    return () => window.clearInterval(timer)
  }, [routeProjects.length, route?.id])
  const routeTitle = route?.title ?? `${active} · 进阶路径`
  const routeDescription = route?.description ?? '这个方向还没有发布路线，管理员可以在管理后台添加第一阶段。'
  return <div className="page learning-page"><PageIntro eyebrow="LEARNING OS / 01" title="学习路线" description={routeDescription} /><div className="learning-layout"><aside className="track-sidebar"><div className="sidebar-label">TECH TRACKS</div>{tracks.map((track, index) => <button key={track.id} className={`track-button ${activeRouteId === track.id ? 'active' : ''}`} onClick={() => setActiveRouteId(track.id)}><span className="track-number">{String(index + 1).padStart(2, '0')}</span>{track.label}{activeRouteId === track.id && <ChevronRight size={15} />}</button>)}<div className="sidebar-tip"><Sparkles size={16} /><strong>给下一步留一点空间</strong><span>路线是参考地图，学习内容可以来自你信任的平台。</span></div></aside><main className="roadmap-wrap"><div className="roadmap-topline"><div><span className="live-dot" /> {routeTitle}</div><span>{visibleNodes.length} 个学习节点</span></div>{visibleNodes.length ? <div className="roadmap"><div className="roadmap-line" />{visibleNodes.map((node, index) => <LearningNodeCard key={node.id} node={node} index={index} onOpenProject={onOpenProject} />)}</div> : <div className="empty-state learning-route-empty"><Route size={28} /><strong>这个方向还没有学习节点</strong><span>管理员可以在后台为“{active}”创建路线并绑定项目。</span></div>}</main><aside className="learning-aside"><section className="panel route-guide"><p className="eyebrow">ROUTE GUIDE</p><h3>把路线当作地图</h3><p>按自己的节奏选择课程、资源和项目，不记录个人完成度。</p><div className="route-guide-steps"><span><b>01</b>基础</span><span><b>02</b>实践</span><span><b>03</b>交付</span></div></section><section className="panel next-project"><p className="eyebrow">PROJECT ENTRY</p>{currentProject ? <><div className="next-project-icon"><Icon name={currentProject.icon} size={20} /></div><h3>{currentProject.name}</h3><p>{currentProject.description}</p><button className="text-button" onClick={() => onOpenProject(currentProject)}>查看项目入口 <ArrowRight size={14} /></button>{routeProjects.length > 1 && <div className="next-project-dots">{routeProjects.map((project, index) => <button key={project.id} className={index === projectIndex ? 'active' : ''} onClick={() => setProjectIndex(index)} aria-label={`查看${project.name}`} />)}</div>}</> : <div className="next-project-empty"><div className="next-project-icon"><Rocket size={20} /></div><h3>等待项目入口</h3><p>管理员可以在路线编辑器中选择要展示的项目。</p></div>}</section></aside></div></div>
}

function LearningNodeCard({ node, index, onOpenProject }: { node: LearningNode; index: number; onOpenProject: (project: Project) => void }) {
  const { data: { projects } } = useContent()
  const nodeProjects = (node.projectIds ?? []).map((id) => projects.find((project) => project.id === id)).filter((project): project is Project => Boolean(project))
  return <motion.div className="learning-node" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}><div className="node-marker"><span>{String(index + 1).padStart(2, '0')}</span></div><div className="node-card"><div className="node-card-heading"><div><span className="node-status">学习节点 {String(index + 1).padStart(2, '0')}</span><h3>{node.title}</h3></div><span className="node-duration"><Clock3 size={13} /> {node.duration}</span></div><p>{node.description}</p><div className="node-card-meta"><span><BookOpen size={14} /> {node.resources} 个资源</span><span><Rocket size={14} /> {node.projects} 个相关项目</span>{nodeProjects.map((project) => <button key={project.id} className="project-entry" onClick={() => onOpenProject(project)}><Rocket size={13} /> {project.name} <ArrowUpRight size={13} /></button>)}</div></div></motion.div>
}

function FilterBar({ search, setSearch, filters, activeFilter, setActiveFilter }: { search: string; setSearch: (value: string) => void; filters: string[]; activeFilter: string; setActiveFilter: (value: string) => void }) {
  return <div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索项目..." aria-label="搜索" /></div><div className="filter-pills">{filters.map((filter) => <button key={filter} className={`filter-pill ${activeFilter === filter ? 'active' : ''}`} onClick={() => setActiveFilter(filter)}>{filter}</button>)}</div></div>
}

function ProjectsPage({ onOpenProject }: { onOpenProject: (project: Project) => void }) {
  const { data: { projects } } = useContent()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部')
  const filtered = projects.filter((p) => (filter === '全部' || p.category === filter) && `${p.name}${p.description}${p.stack.join('')}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page listing-page"><PageIntro eyebrow="PROJECT OS / 02" title="项目库" description="探索历届优秀项目，在真实实践中成长。" action={<button className="primary-button" onClick={() => onOpenProject(projects[0])}>提交项目 <ArrowUpRight size={16} /></button>} /><FilterBar search={search} setSearch={setSearch} filters={['全部', 'AI', 'Web', 'Backend', 'Algorithm', 'Tools']} activeFilter={filter} setActiveFilter={setFilter} /><div className="listing-grid">{filtered.map((project) => <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />)}</div>{filtered.length === 0 && <div className="empty-state"><CircleHelp size={28} /><strong>没有找到匹配的项目</strong><span>试试更短的关键词，或者换一个方向。</span></div>}</div>
}

function EventsPage() {
  const { data: { competitionEvents } } = useContent()
  const [selected, setSelected] = useState<CompetitionEvent | null>(null)
  const [reminderSet, setReminderSet] = useState(false)
  return <div className="page listing-page events-page"><PageIntro eyebrow="COMPETITION HUB / 08" title="比赛中心" description="把学习带进赛场，在一次次交付里找到自己的节奏。" action={<button className="secondary-button" onClick={() => setReminderSet((value) => !value)}><CalendarDays size={16} /> {reminderSet ? "已加入赛事提醒" : "加入赛事提醒"}</button>} /><div className="event-banner"><div><p className="eyebrow">UP NEXT</p><h2>本学期，和队友一起交付一次。</h2><p>从练习题到一个完整 Demo，比赛会让你的能力变得可见。</p></div><Trophy size={65} /></div><div className="event-grid">{competitionEvents.map((event) => <article className={`event-card event-${event.accent}`} key={event.id} onClick={() => setSelected(event)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(event) } }}><div className="event-card-top"><Tag tone={event.status === '报名中' ? 'mint' : 'violet'}>{event.status}</Tag><span>{event.type}</span></div><div className="event-date"><strong>{event.date.split('.')[0]}</strong><span>．{event.date.split('.')[1]}<small>{event.date.slice(0, 4)}</small></span></div><h3>{event.title}</h3><p>{event.description}</p><div className="event-meta"><span><Clock3 size={13} /> {event.deadline}</span><button className="text-button" onClick={(e) => { e.stopPropagation(); setSelected(event) }}>查看详情 <ArrowUpRight size={13} /></button></div></article>)}</div>{selected && <CompetitionDetailModal event={selected} onClose={() => setSelected(null)} />}</div>
}

function CompetitionDetailModal({ event, onClose }: { event: CompetitionEvent; onClose: () => void }) {
  return <div className="admin-modal-scrim competition-detail-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal competition-detail-modal" role="dialog" aria-modal="true" aria-labelledby="competition-detail-title" onClick={(e) => e.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">COMPETITION / PROJECT ARCHIVE</p><h2 id="competition-detail-title">{event.title}</h2><p>{event.description}</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭比赛详情"><X size={16} /></button></div><div className="competition-detail-meta"><Tag tone={event.status === '报名中' ? 'mint' : 'violet'}>{event.status}</Tag><span><CalendarDays size={14} /> {event.date}</span><span><Clock3 size={14} /> 报名截止 {event.deadline}</span></div><div className="competition-projects"><div className="admin-card-head"><div><p className="eyebrow">COHORT PROJECTS</p><h3>历届学长姐项目</h3></div><span>{event.projects?.length ?? 0} 个项目</span></div>{event.projects?.length ? <div className="competition-project-grid">{event.projects.map((project) => { const projectUrl = safeLink(project.projectUrl); const projectImage = safeImageSource(project.imageUrl); return <article className="competition-project-card" key={project.id}>{projectImage ? <img src={projectImage} alt="" /> : <div className="competition-project-placeholder"><Rocket size={22} /></div>}<div><span className="eyebrow">{project.cohort} 届</span><h4>{project.title}</h4><p>{project.description || '管理员还没有补充项目说明。'}</p>{projectUrl && <a href={projectUrl} target={projectUrl.startsWith('#/') ? undefined : '_blank'} rel="noreferrer" className="text-button" onClick={(e) => e.stopPropagation()}>打开项目 <ExternalLink size={13} /></a>}</div></article> })}</div> : <div className="admin-empty"><Trophy size={22} /><strong>还没有历届项目</strong><span>管理员可以在后台为这项比赛添加届次、项目说明和图片。</span></div>}</div><div className="admin-modal-foot"><span>比赛资料由管理员维护</span><button className="secondary-button admin-small-button" onClick={onClose}>关闭</button></div></section></div>
}
function ProjectDetailPage({ project, onNavigate }: { project?: Project; onNavigate: (path: string) => void }) {
  if (!project) return <div className="page"><div className="empty-state"><Rocket size={28} /><strong>项目暂不可用</strong><span>项目数据尚未同步，请稍后再试。</span><button className="secondary-button" onClick={() => onNavigate('#/projects')}>返回项目库</button></div></div>
  const { data: { members } } = useContent()
  const projectMembers = (project.memberIds ?? []).map((id) => members.find((member) => member.id === id)).filter((member): member is typeof members[number] => Boolean(member))
  const milestones = project.milestones ?? []
  const logs = project.logs ?? []
  const visibleMembers = projectMembers.slice(0, 5)
  const remainingMembers = Math.max(projectMembers.length - visibleMembers.length, 0)
  const fallbackInitials = (name: string) => name.slice(0, 2)
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
            {safeLink(project.issueUrl) && <a className="text-button" href={safeLink(project.issueUrl)} target="_blank" rel="noreferrer">反馈 Issue <ArrowUpRight size={14} /></a>}
          </div>
        </div>
        <ProjectVisual project={project} />
      </div>
      <div className="detail-grid">
        <main>
          <section className="panel detail-section">
            <SectionHeading eyebrow="PROJECT STORY" title="项目介绍" />
            <p className="prose">{project.intro || project.description}</p>
            <div className="detail-tags">{project.stack.map((tag) => <Tag tone="blue" key={tag}>{tag}</Tag>)}</div>
          </section>
          <section className="panel detail-section">
            <SectionHeading eyebrow="PROJECT HISTORY" title="项目族谱" />
            {milestones.length ? <div className="project-timeline">{milestones.map((milestone) => <div className={'timeline-item ' + (milestone.status === '进行中' ? 'active' : '')} key={milestone.id}><span className="timeline-year">{milestone.year}</span><div><strong>{milestone.title} {milestone.status === '进行中' && <Tag tone="violet">进行中</Tag>}</strong><span>{milestone.summary || '管理员还没有补充阶段说明。'}</span></div></div>)}</div> : <div className="empty-state detail-inline-empty"><History size={21} /><strong>项目族谱尚未配置</strong><span>管理员可以在项目库编辑器中添加项目阶段。</span></div>}
          </section>
          <section className="panel detail-section">
            <SectionHeading eyebrow="SHIP LOG" title="开发日志" />
            {logs.length ? <div className="project-log-list">{logs.map((log) => <div className="log-row" key={log.id}><span className="log-date">{log.date}</span><div><strong>{log.title}</strong><p>{log.detail}</p></div><span className="log-author"><Avatar initials={log.authorInitials || fallbackInitials(log.author || '组员')} size="sm" /> {log.author || '项目成员'}</span></div>)}</div> : <div className="empty-state detail-inline-empty"><ScrollText size={21} /><strong>还没有开发日志</strong><span>管理员可以在项目库编辑器中记录进展。</span></div>}
          </section>
        </main>
        <aside className="detail-aside">
          <section className="panel match-card">
            <p className="eyebrow">PROJECT SNAPSHOT</p>
            <div className="match-score"><strong>{project.members}</strong><span>位协作成员</span></div>
            <div className="skill-bars"><SkillBar label="项目难度" value={project.difficulty * 20} tone="blue" /><SkillBar label="社区星标" value={Math.min(100, Math.round(project.stars / 2))} tone="mint" /><SkillBar label="技术栈" value={Math.min(100, project.stack.length * 20)} tone="violet" /></div>
            <div className="match-copy"><strong>当前状态</strong><div><Tag tone={project.status === '招募中' ? 'mint' : 'blue'}>{project.status}</Tag><Tag tone="blue">{project.year}</Tag></div><strong>技术栈</strong><div>{project.stack.slice(0, 4).map((tag) => <Tag tone="blue" key={tag}>{tag}</Tag>)}</div></div>
            <button className="primary-button full-button" onClick={() => onNavigate('#/learning')}>查看学习路线 <ArrowRight size={15} /></button>
          </section>
          <section className="panel team-card">
            <p className="eyebrow">PROJECT CREW</p>
            <div className="team-avatars">{visibleMembers.map((member) => <Avatar key={member.id} initials={member.initials} accent={member.accent} />)}{remainingMembers > 0 && <span>+{remainingMembers}</span>}{!visibleMembers.length && <span className="team-empty">待配置</span>}</div>
            <strong>{projectMembers.length || project.members} 位成员正在协作</strong>
            <small>{project.joinNote || '项目协作成员由管理员维护。'}</small>
            <button className="secondary-button full-button" disabled={project.joinEnabled === false} onClick={() => onNavigate('#/login')}>{project.joinEnabled === false ? '暂不开放加入' : '登录后申请加入'}</button>
          </section>
        </aside>
      </div>
    </div>
  )
}

function SkillBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="skill-bar"><div><span>{label}</span><strong>{value}%</strong></div><span className="bar-track"><i className={`bar-${tone}`} style={{ width: `${value}%` }} /></span></div>
}

function ResourcesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data: { resources } } = useContent()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部')
  const [sort, setSort] = useState<'hot' | 'new'>('hot')
  const [selected, setSelected] = useState<Resource | null>(null)
  const filters = ['全部', '前端', '后端', '算法', 'Python', 'AI', 'Agent', '数据库', 'DevOps']
  const visible = useMemo(() => resources.filter((item) => (filter === '全部' || item.category === filter) && (item.title + item.description + item.tags.join('')).toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === 'hot' ? b.views - a.views : b.updated.localeCompare(a.updated)), [resources, filter, search, sort])
  return <div className="page listing-page"><PageIntro eyebrow="KNOWLEDGE BASE / 03" title="资源库" description="学习资料、路线与实践文档，来自每一届成员的真实积累。" action={<button className="secondary-button" onClick={() => onNavigate('#/resources/prompts')}><Sparkles size={16} /> Prompt 模板库</button>} /><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索资源、标签..." aria-label="搜索资源" /></div><div className="filter-pills">{filters.map((f) => <button key={f} className={'filter-pill ' + (filter === f ? 'active' : '')} onClick={() => setFilter(f)}>{f}</button>)}</div><button className="filter-sort" onClick={() => setSort((value) => value === 'hot' ? 'new' : 'hot')}><Filter size={15} /> {sort === 'hot' ? '热门' : '最新'} <ChevronDown size={14} /></button></div><div className="resource-list">{visible.map((item) => <ResourceRow key={item.id} resource={item} onOpen={setSelected} />)}</div>{visible.length === 0 && <div className="empty-state"><CircleHelp size={28} /><strong>还没有这类资源</strong><span>换个关键词，或者向小组贡献一份吧。</span></div>}{selected && <div className="admin-modal-scrim" role="presentation" onClick={() => setSelected(null)}><section className="admin-editor-modal" role="dialog" aria-modal="true" aria-labelledby="resource-detail-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">RESOURCE DETAIL</p><h2 id="resource-detail-title">{selected.title}</h2><p>{selected.description}</p></div><button className="icon-button small" onClick={() => setSelected(null)} aria-label="关闭资源详情"><X size={16} /></button></div><div className="resource-detail-body"><div className="resource-meta"><Tag tone="blue">{selected.category}</Tag><Tag>{selected.type}</Tag>{selected.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div><p>由 {selected.author} 更新 · {selected.updated} · {selected.views.toLocaleString()} 次浏览</p></div><div className="admin-modal-foot"><span>资源内容由管理员维护</span><button className="secondary-button admin-small-button" onClick={() => setSelected(null)}>关闭</button></div></section></div>}</div>
}

function ResourceRow({ resource, onOpen }: { resource: Resource; onOpen: (resource: Resource) => void }) {
  return <article className="resource-row" onClick={() => onOpen(resource)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(resource) } }} tabIndex={0}><span className={'resource-icon accent-' + resource.accent}><Icon name={resource.type === '学习路线' ? 'route' : resource.type === 'GitHub' ? 'code' : 'file'} size={18} /></span><div className="resource-main"><div className="resource-title-line"><h3>{resource.title}</h3><Tag tone="blue">{resource.type}</Tag></div><p>{resource.description}</p><div className="resource-meta"><span>{resource.category}</span>{resource.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}<span>由 {resource.author} 更新</span></div></div><div className="resource-stats"><span><Clock3 size={14} /> {resource.updated}</span><span><Users size={14} /> {resource.views.toLocaleString()}</span><button className="icon-button small" aria-label={'打开 ' + resource.title} onClick={(event) => { event.stopPropagation(); onOpen(resource) }}><ArrowUpRight size={15} /></button></div></article>
}

function PromptsPage() {
  const { data: { prompts } } = useContent()
  const [copied, setCopied] = useState<string | null>(null)
  const [category, setCategory] = useState('全部')
  const copyPrompt = async (prompt: string, id: string) => { try { await navigator.clipboard.writeText(prompt) } catch { /* clipboard may be unavailable in preview */ } setCopied(id); window.setTimeout(() => setCopied(null), 1600) }
  const categories = ['全部', '编程', '代码 Review', 'Debug', '学习', '论文', '数据分析', 'Agent']
  const visible = prompts.filter((prompt) => category === '全部' || prompt.category === category)
  return <div className="page listing-page"><PageIntro eyebrow="PROMPT LIBRARY / 04" title="Prompt 模板库" description="把好问题保存下来，让每一次思考都更接近答案。" action={<button className="primary-button" onClick={() => navigate('#/login')}><Copy size={16} /> 登录后提交模板</button>} /><div className="prompt-categories">{categories.map((item) => <button className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div><div className="prompt-grid">{visible.map((prompt) => <article className="prompt-card" key={prompt.id}><div className="prompt-card-head"><Tag tone="violet">{prompt.category}</Tag><span>{prompt.model}</span></div><h3>{prompt.title}</h3><p>{prompt.usage}</p><div className="prompt-preview"><span>›</span>{prompt.preview}</div><button className={'secondary-button copy-button ' + (copied === prompt.id ? 'copied' : '')} onClick={() => copyPrompt(prompt.preview, prompt.id)}>{copied === prompt.id ? <><Check size={15} /> 已复制</> : <><Copy size={15} /> 复制 Prompt</>}</button></article>)}</div>{visible.length === 0 && <div className="empty-state"><CircleHelp size={28} /><strong>还没有这个分类的模板</strong><span>可以换个分类，或登录后提交一条。</span></div>}</div>
}

function InterviewsPage() {
  const { data: { interviews } } = useContent()
  const [filter, setFilter] = useState('全部')
  const [sortDesc, setSortDesc] = useState(true)
  const filters = ['全部', '实习', '校招', '前端', '后端', 'AI']
  const visible = useMemo(() => interviews.filter((item) => filter === '全部' || item.role.includes(filter) || item.tags.some((tag) => tag.includes(filter))).sort((a, b) => sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)), [interviews, filter, sortDesc])
  return <div className="page listing-page"><PageIntro eyebrow="INTERVIEW WALL / 05" title="面经墙" description="把一次面试的经验，变成下一次更从容的准备。" action={<button className="primary-button" onClick={() => navigate('#/login')}><MessageCircle size={16} /> 登录后分享面经</button>} /><div className="interview-filters">{filters.map((item) => <button key={item} className={'filter-pill ' + (filter === item ? 'active' : '')} onClick={() => setFilter(item)}>{item}</button>)}<span className="filter-spacer" /><button className="filter-sort" onClick={() => setSortDesc((value) => !value)}><Filter size={15} /> {sortDesc ? '最新' : '最早'}</button></div><div className="interview-list">{visible.map((item) => <article className="interview-card" key={item.id}><div className="company-logo">{item.company.slice(0, 1)}</div><div className="interview-main"><div className="interview-title"><h3>{item.company} · {item.role}</h3><Tag tone={item.difficulty === '困难' ? 'red' : item.difficulty === '中等' ? 'orange' : 'mint'}>{item.difficulty}</Tag></div><p>{item.summary}</p><div className="interview-meta"><span><Avatar initials={item.author.slice(0, 2)} size="sm" /> {item.author} · {item.cohort}</span><span>{item.date}</span><span>{item.rounds} 轮面试</span>{item.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div></div></article>)}</div>{visible.length === 0 && <div className="empty-state"><CircleHelp size={28} /><strong>还没有匹配的面经</strong><span>换个分类或关键词再试试。</span></div>}</div>
}
function DynamicClubDirections() {
  const { data: { members: managedMembers, membersManaged } } = useContent()
  const { currentCohort } = useClubConfig()
  const iconByTeam: Record<string, LucideIcon> = { algorithm: Target, project: Rocket, cybersecurity: ShieldCheck }
  const teams = currentCohort?.teams.map((team) => {
    const members = managedMembers.filter((member) => member.cohort.replace(/\D/g, '') === currentCohort?.year && normalizeMemberTeamId(member.direction) === team.id)
    return membersManaged ? { ...team, members } : team
  }) ?? []
  return <section className="panel direction-panel"><SectionHeading eyebrow={`TEAM MAP / ${currentCohort?.year ?? 'CURRENT'}`} title="小组方向" /><div className="direction-list">{teams.map((team) => { const DirectionIcon = iconByTeam[team.id] ?? Layers3; return <button className="direction-row" key={team.id} onClick={() => navigate(`#/members/${team.id}`)}><span className={`direction-icon direction-${team.accent}`}><DirectionIcon size={17} /></span><span className="direction-copy"><strong>{team.name}</strong><small>{team.description}</small></span><span className="direction-count">{team.members.length} 人</span><ArrowUpRight size={14} className="direction-arrow" /></button> })}</div><div className="direction-footer"><span><Users size={14} /> {currentCohort?.generationLabel ?? '当前届次'}</span><button className="text-button" onClick={() => navigate('#/members')}>查看小组风采 <ArrowRight size={14} /></button></div></section>
}

function DynamicPhotoArchivePage() {
  const { sortedCohorts, photos } = useClubConfig()
  return <div className="page archive-page"><PageIntro eyebrow="PEOPLE / 06 · ARCHIVE" title="历届合影" description="把每一届的共同记忆留在同一面照片墙里，随时回看小组一路走来的足迹。" action={<button className="secondary-button" onClick={() => navigate('#/members')}><ChevronLeft size={16} /> 返回小组风采</button>} /><section className="photo-archive archive-page-panel"><div className="archive-heading"><div><p className="eyebrow">PHOTO ARCHIVE</p><h2>每一届，都值得被记住</h2><p>照片由管理员整理维护，后续可以持续补充。</p></div><span><ShieldCheck size={14} /> 登录后由管理员维护</span></div><div className="archive-grid">{sortedCohorts.map((cohort) => { const photo = photos.filter((item) => item.cohortId === cohort.id).find((item) => item.isCover) ?? photos.find((item) => item.cohortId === cohort.id); const memberCount = cohort.teams.reduce((sum, team) => sum + team.members.length, 0); return <article className="archive-card" key={cohort.id}>{photo ? <img src={photo.dataUrl} alt={photo.caption || `${cohort.year}届小组合影`} /> : <div className="archive-empty"><Camera size={28} /><span>暂无合影</span></div>}<div className="archive-card-meta"><strong>{cohort.year} 届</strong><span>· {memberCount || '人数待补充'} 人</span></div></article> })}</div></section></div>
}

function normalizeMemberTeamId(direction: string) {
  const value = direction.trim().toLowerCase()
  if (value.includes('网安') || value.includes('安全') || value.includes('cyber')) return 'cybersecurity'
  if (value.includes('算法') || value.includes('ai') || value.includes('agent') || value.includes('模型')) return 'algorithm'
  return 'project'
}

function normalizeMemberRole(role: string): '组长' | '负责人' | '组员' {
  if (role.includes('组长')) return '组长'
  if (role.includes('负责人')) return '负责人'
  return '组员'
}
function DynamicMembersPage({ initialTeam }: { initialTeam?: string }) {
  const { sortedCohorts, currentCohort, photos, siteCopy } = useClubConfig()
  const { data: { members: managedMembers, membersManaged } } = useContent()
  const [cohortYear, setCohortYear] = useState(currentCohort?.year ?? sortedCohorts[0]?.year ?? '')
  const selectedCohort = sortedCohorts.find((item) => item.year === cohortYear) ?? currentCohort ?? sortedCohorts[0]
  const [activeTeamId, setActiveTeamId] = useState(initialTeam ?? selectedCohort?.teams[0]?.id ?? '')
  const selectedCohortMembers = managedMembers.filter((member) => member.cohort.replace(/\D/g, '') === selectedCohort?.year)
  const visibleTeams = selectedCohort?.teams.map((team) => {
    if (!membersManaged) return team
    const members = selectedCohortMembers.filter((member) => normalizeMemberTeamId(member.direction) === team.id).map((member) => ({ id: member.id, name: member.name, role: normalizeMemberRole(member.role), direction: member.direction, initials: member.initials, accent: member.accent }))
    return { ...team, members }
  }) ?? []
  const selectedTeam = visibleTeams.find((team) => team.id === activeTeamId) ?? visibleTeams[0]
  const photo = selectedCohort ? photos.filter((item) => item.cohortId === selectedCohort.id).find((item) => item.isCover) ?? photos.find((item) => item.cohortId === selectedCohort.id) : undefined
  const memberCount = visibleTeams.reduce((sum, team) => sum + team.members.length, 0)
  const letter = siteCopy.find((item) => item.id === 'letter')
  useEffect(() => { if (selectedCohort && !visibleTeams.some((team) => team.id === activeTeamId)) setActiveTeamId(visibleTeams[0]?.id ?? '') }, [selectedCohort, activeTeamId, visibleTeams])
  if (!selectedCohort) return <div className="page"><div className="empty-state"><Users size={28} /><strong>暂时没有届次资料</strong><span>请由管理员先创建一届成员档案。</span></div></div>
  return <div className="page members-page members-page-redesign"><PageIntro eyebrow="PEOPLE / 06" title="小组风采" description="按届次认识一起写代码、做项目、把经验交给下一届的人。" action={<button className="secondary-button" onClick={() => navigate('#/members/archive')}><ImagePlus size={16} /> 历届合影</button>} /><div className="members-layout"><aside className="cohort-rail" aria-label="届次选择"><div className="cohort-rail-list">{sortedCohorts.map((item) => <button key={item.id} className={selectedCohort.id === item.id ? 'active' : ''} onClick={() => setCohortYear(item.year)} aria-current={selectedCohort.id === item.id ? 'page' : undefined}><span>{item.year}届</span></button>)}</div></aside><div className="members-content"><section className="cohort-showcase"><div className="cohort-showcase-copy"><p className="eyebrow">{selectedCohort.year} COHORT</p><h2>{selectedCohort.year} 届成员档案</h2><p>{selectedCohort.description || '这一届的成员资料和合影正在由管理员整理。'}</p><div className="cohort-stat-line"><span><strong>{memberCount || '—'}</strong>成员</span><i /><span><strong>{visibleTeams.length || '—'}</strong>技术组</span><i /><span><strong>{photo ? '已上传' : '待上传'}</strong>合影</span></div></div><div className={`cohort-photo-frame ${photo ? 'has-photo' : ''}`}>{photo ? <><img src={photo.dataUrl} alt={photo.caption || `${selectedCohort.year}届小组合影`} /><div className="cohort-photo-overlay"><span>{selectedCohort.year} 届 · 合影</span></div></> : <div className="cohort-photo-empty"><span className="photo-empty-icon"><Camera size={25} /></span><strong>还没有 {selectedCohort.year} 届合影</strong><span>合影正在由管理员整理，敬请期待。</span></div>}</div></section>{visibleTeams.length > 0 ? <section className="teams-section"><div className="teams-heading"><div><p className="eyebrow">{selectedCohort.year} · TEAMS</p><h2>{selectedCohort.teams.length} 支小组，协作完成一件事</h2></div><span>共 {memberCount} 位成员</span></div><div className="team-switcher">{visibleTeams.map((team) => <button key={team.id} className={activeTeamId === team.id ? `active accent-${team.accent}` : ''} onClick={() => setActiveTeamId(team.id)}><span><strong>{team.name}</strong><small>{team.description}</small></span><b>{team.members.length}<em>人</em></b><ChevronRight size={16} /></button>)}</div>{selectedTeam && <div className={`team-detail accent-${selectedTeam.accent}`}><div className="team-detail-head"><div><span className="team-detail-kicker"><i /> {selectedTeam.name.toUpperCase()}</span><h3>{selectedTeam.name}</h3><p>{selectedTeam.description}</p></div><div className="team-role-counts"><span><strong>{selectedTeam.members.filter((member) => member.role === '组长').length}</strong>组长</span><span><strong>{selectedTeam.members.filter((member) => member.role === '负责人').length}</strong>负责人</span><span><strong>{selectedTeam.members.filter((member) => member.role === '组员').length}</strong>组员</span></div></div><div className="cohort-member-grid">{selectedTeam.members.map((member) => <article className="cohort-member-card" key={member.id}><Avatar initials={member.initials} accent={member.accent} size="md" /><div><strong>{member.name}</strong><span>{member.role}</span><small>{member.direction}</small></div><i className={`member-role-dot role-${member.role === '组长' ? 'lead' : member.role === '负责人' ? 'owner' : 'member'}`} /></article>)}</div></div>}</section> : <section className="cohort-data-empty"><div><span className="data-empty-icon"><Users size={22} /></span><h3>这一届的成员资料还在整理</h3><p>登录后，管理员可以补充成员分组和个人资料。</p></div></section>}<section className="letter-section members-letter"><div className="letter-copy"><p className="eyebrow">PASS IT ON</p><h2>{letter?.title ?? '把这一届的经验，留给下一届。'}</h2><p>“{letter?.body ?? '你不需要在大一就知道自己最终会去哪里，先和身边的人一起把一个项目做完。'}”</p><span>— {letter?.author ?? '传承寄语 · 计算机科技小组'}</span></div><div className="letter-stamp"><span>TO</span><strong>NEXT<br />COHORT</strong><small>{selectedCohort.year} → {Number(selectedCohort.year) + 1}</small></div></section></div></div></div>
}

function AiPage({ messages, onSend, onNewChat }: { messages: AIMessage[]; onSend: (text: string) => void; onNewChat: () => void }) {
  const [input, setInput] = useState('')
  const send = () => { if (!input.trim()) return; onSend(input.trim()); setInput('') }
  return <div className="page ai-page"><div className="ai-layout"><aside className="ai-history panel"><div className="ai-history-head"><div><span className="eyebrow">AI WORKSPACE</span><h2>历史会话</h2></div><button className="icon-button small" onClick={onNewChat} aria-label="新建会话"><Sparkles size={16} /></button></div><button className="new-chat" onClick={onNewChat}><span><MessageCircle size={15} /> 新建会话</span><kbd>⌘ N</kbd></button><div className="history-group"><span>今天</span><button className="history-item active" onClick={() => onSend("如何学习 FastAPI？")}>FastAPI 学习建议</button><button className="history-item" onClick={() => onSend("帮我分析项目匹配度")}>项目匹配度分析</button></div><div className="history-group"><span>昨天</span><button className="history-item" onClick={() => onSend("给我一份蓝桥杯准备清单")}>蓝桥杯准备清单</button><button className="history-item" onClick={() => onSend("Agent 路线怎么选？")}>Agent 路线怎么选</button></div><div className="ai-history-footer"><Settings2 size={15} /> AI 助手设置</div></aside><main className="ai-chat panel"><div className="ai-chat-head"><div><div className="ai-title"><span className="ai-live-icon"><Bot size={17} /></span><strong>科技小组 AI 助手</strong><span className="online-status"><i /> 在线</span></div><small>连接学习路线、项目、资源与面经</small></div><button className="icon-button small"><PanelLeft size={16} /></button></div><div className="chat-stream">{messages.map((message) => <div className={`chat-message ${message.role}`} key={message.id}><div className="message-avatar">{message.role === 'assistant' ? <Bot size={16} /> : <Avatar initials="ZY" size="sm" />}</div><div className="message-content"><p>{message.content.split('\n').map((line) => <span key={line}>{line}<br /></span>)}</p>{message.citations && <CitationCard citations={message.citations} />}</div></div>)}<div className="suggestion-row"><button onClick={() => onSend('我现在能参加哪些项目？')}>我现在能参加哪些项目？ <ArrowUpRight size={13} /></button><button onClick={() => onSend('如何学习 FastAPI？')}>如何学习 FastAPI？ <ArrowUpRight size={13} /></button><button onClick={() => onSend('有没有 Java 后端面经？')}>有没有 Java 后端面经？ <ArrowUpRight size={13} /></button></div></div><div className="chat-composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="问问科技小组 AI...（Enter 发送，Shift + Enter 换行）" rows={1} /><button className="send-button" onClick={send} aria-label="发送"><Send size={17} /></button></div></main></div></div>
}

function CitationCard({ citations: sourceList }: { citations: Citation[] }) {
  return <div className="citation-card"><div className="citation-heading"><span><BookOpen size={14} /> 参考资料</span><span>RAG SOURCES</span></div>{sourceList.map((source, index) => <button key={source.id} onClick={() => navigate(source.path)}><span className="citation-index">[{index + 1}]</span><span><strong>{source.title}</strong><small>{source.type}</small></span><ArrowUpRight size={14} /></button>)}</div>
}

function AiDrawer({ open, onClose, messages, onSend }: { open: boolean; onClose: () => void; messages: AIMessage[]; onSend: (text: string) => void }) {
  const [input, setInput] = useState('')
  const send = () => { if (!input.trim()) return; onSend(input.trim()); setInput('') }
  return <AnimatePresence>{open && <><motion.div className="drawer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} /><motion.aside className="ai-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.24, ease: 'easeOut' }}><div className="drawer-head"><div className="ai-title"><span className="ai-live-icon"><Bot size={16} /></span><strong>AI 助手</strong><span className="online-status"><i /> 在线</span></div><button className="icon-button small" onClick={onClose} aria-label="关闭 AI 助手"><X size={17} /></button></div><div className="drawer-body">{messages.slice(-3).map((message) => <div className={`drawer-message ${message.role}`} key={message.id}><span className="drawer-avatar">{message.role === 'assistant' ? <Bot size={15} /> : '你'}</span><div><p>{message.content}</p>{message.citations && <CitationCard citations={message.citations.slice(0, 2)} />}</div></div>)}<div className="drawer-suggestions"><span>试试这样问</span><button onClick={() => onSend('我现在能参加哪些项目？')}>我现在能参加哪些项目？</button><button onClick={() => onSend('给我一条后端学习建议')}>给我一条后端学习建议</button></div></div><div className="drawer-composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="问问科技小组 AI..." rows={1} /><button onClick={send} aria-label="发送"><Send size={16} /></button><small>回答会标注可追溯的参考资料</small></div></motion.aside></>}</AnimatePresence>
}

type AdminSection = 'overview' | 'cohorts' | 'members' | 'content' | 'announcements' | 'personalization' | 'security' | 'logs'

type CompetitionEditorValue = {
  title: string
  type: string
  date: string
  deadline: string
  description: string
  status: CompetitionEvent['status']
  accent: string
  projects: CompetitionProject[]
}


function AdminCohortManager({ onClose, initialCohortId }: { onClose: () => void; initialCohortId?: string }) {
  const { sortedCohorts, saveCohort, removeCohort, saveTeam, removeTeam } = useClubConfig()
  const [selectedId, setSelectedId] = useState(initialCohortId ?? sortedCohorts[0]?.id ?? '')
  const [form, setForm] = useState({ year: '', generationLabel: '', status: 'draft' as 'active' | 'archived' | 'draft', description: '' })
  const [teamForm, setTeamForm] = useState({ id: '', name: '', description: '', accent: 'blue', memberCapacity: '' })
  const [teamEditorOpen, setTeamEditorOpen] = useState(false)
  const [deleteRequest, setDeleteRequest] = useState<AdminDeleteRequest | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const selected = sortedCohorts.find((cohort) => cohort.id === selectedId)
  const requiredTeamIds = ['algorithm', 'project', 'cybersecurity']

  useEffect(() => {
    if (initialCohortId && sortedCohorts.some((cohort) => cohort.id === initialCohortId)) setSelectedId(initialCohortId)
  }, [initialCohortId, sortedCohorts])

  useEffect(() => {
    const next = sortedCohorts.find((cohort) => cohort.id === selectedId)
    if (next) setForm({ year: next.year, generationLabel: next.generationLabel, status: next.status, description: next.description })
  }, [selectedId, sortedCohorts])

  const choose = (id: string) => {
    setSelectedId(id)
    setTeamEditorOpen(false)
  }
  const saveNew = () => {
    setSelectedId('')
    setForm({ year: '', generationLabel: '', status: 'draft', description: '' })
    setTeamEditorOpen(false)
  }
  const save = () => {
    if (!form.year.trim()) return
    const year = form.year.trim()
    const generation = Number(year) - 2025
    const generatedLabel = generation > 0 ? generation + ' 代 · ' + (form.status === 'active' ? '共学进行中' : form.status === 'archived' ? '已归档' : '筹备中') : year + ' 届'
    const result = saveCohort({ id: selected?.id, year, generationLabel: form.generationLabel.trim() || generatedLabel, status: form.status, description: form.description.trim() })
    setSelectedId(result.id)
  }
  const openTeamEditor = (team?: { id: string; name: string; description: string; accent: string; memberCapacity?: number; members: unknown[] }) => {
    setTeamForm(team
      ? { id: team.id, name: team.name, description: team.description, accent: team.accent, memberCapacity: String(team.memberCapacity ?? team.members.length) }
      : { id: '', name: '', description: '', accent: 'blue', memberCapacity: '' })
    setTeamEditorOpen(true)
  }
  const saveTeamDraft = () => {
    if (!selected || !teamForm.name.trim()) return
    saveTeam(selected.id, { id: teamForm.id || undefined, name: teamForm.name.trim(), description: teamForm.description.trim(), accent: teamForm.accent, memberCapacity: Math.max(0, Number(teamForm.memberCapacity) || 0) })
    setTeamEditorOpen(false)
  }
  const applyDefaultTeams = () => {
    if (!selected) return
    const defaults = [
      { id: 'algorithm', name: '算法组', description: '算法、模型与实验方向。', accent: 'violet', memberCapacity: 6 },
      { id: 'project', name: '项目组', description: '项目协作、交付与持续迭代。', accent: 'blue', memberCapacity: 7 },
      { id: 'cybersecurity', name: '网安组', description: '安全研究、攻防实践与风险防护。', accent: 'rose', memberCapacity: 2 },
    ]
    defaults.filter((item) => !selected.teams.some((team) => team.id === item.id)).forEach((item) => saveTeam(selected.id, item))
  }
  const deleteTeam = (teamId: string) => {
    if (!selected || requiredTeamIds.includes(teamId)) return
    const team = selected.teams.find((item) => item.id === teamId)
    if (!team) return
    setDeleteRequest({
      title: '删除自定义小组？',
      message: <>将删除“{team.name}”的方向配置和成员关联，其他固定小组不受影响。</>,
      cancelLabel: '保留小组',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await removeTeam(selected.id, teamId)
          setDeleteRequest(null)
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }
  const requestDeleteCohort = () => {
    if (!selected) return
    const nextId = sortedCohorts.find((item) => item.id !== selected.id)?.id ?? ''
    setDeleteRequest({
      title: '删除 ' + selected.year + ' 届？',
      message: <>将移除这一届的届次资料、方向配置和前台展示，其他届次不会受到影响。</>,
      cancelLabel: '保留届次',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await removeCohort(selected.id)
          setSelectedId(nextId)
          setDeleteRequest(null)
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }

  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}>
    <section className="admin-editor-modal admin-structure-modal" role="dialog" aria-modal="true" aria-labelledby="admin-cohort-manager-title" onClick={(event) => event.stopPropagation()}>
      <div className="admin-modal-head">
        <div><p className="eyebrow">STRUCTURE / COHORTS</p><h2 id="admin-cohort-manager-title">届次与小组</h2><p>每届默认包含算法、项目、网安三个方向，真实成员可在成员账号中补充。</p></div>
        <button className="icon-button small" onClick={onClose} aria-label="关闭届次管理"><X size={16} /></button>
      </div>
      <div className="admin-structure-layout">
        <aside className="admin-structure-list">
          <button className="admin-link-button" onClick={saveNew}><Plus size={14} /> 新增届次</button>
          {sortedCohorts.map((cohort) => <button key={cohort.id} className={selectedId === cohort.id ? 'active' : ''} onClick={() => choose(cohort.id)}>
            <strong>{cohort.year} 届</strong>
            <small>{cohort.status === 'active' ? '当前届' : cohort.status === 'archived' ? '已归档' : '草稿'} · {cohort.teams.length} 个小组</small>
          </button>)}
        </aside>
        <div className="admin-structure-editor">
          <div className="admin-editor-form">
            <div className="admin-editor-form-grid">
              <label><span>届次年份</span><input value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="2030" /></label>
              <label><span>状态</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as typeof form.status })}><option value="active">当前届</option><option value="draft">筹备中</option><option value="archived">已归档</option></select></label>
            </div>
            <label><span>届次标签</span><input value={form.generationLabel} onChange={(event) => setForm({ ...form, generationLabel: event.target.value })} placeholder="第五代 · 共学进行中" /></label>
            <label><span>届次简介</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="介绍这届小组的协作主题" /></label>
            <div className="admin-modal-foot"><span>保存后前台立即更新</span><button className="primary-button admin-small-button" onClick={save}><Save size={14} /> 保存届次</button></div>
          </div>
          {selected && <div className="admin-team-editor">
            <div className="admin-card-head">
              <div><p className="eyebrow">TEAMS / {selected.year}</p><h3>小组方向</h3></div>
              <div className="admin-card-head-actions"><span>{selected.teams.reduce((sum, team) => sum + (team.memberCapacity ?? team.members.length), 0)} 人配置</span><button className="secondary-button admin-small-button" onClick={applyDefaultTeams}><Plus size={14} /> 补齐固定小组</button></div>
            </div>
            {selected.teams.map((team) => <div className="admin-team-row" key={team.id}>
              <span className={'admin-team-icon tone-' + team.accent}><Users size={15} /></span>
              <div><strong>{team.name}</strong><small>{team.memberCapacity ?? team.members.length} 人配置 · {team.description}</small></div>
              <div className="admin-row-actions">
                <button className="admin-link-button" onClick={() => openTeamEditor(team)}>编辑</button>
                {!requiredTeamIds.includes(team.id) && <button className="admin-link-button admin-danger-link" onClick={() => deleteTeam(team.id)}>删除</button>}
              </div>
            </div>)}
            <button className="secondary-button admin-small-button admin-add-team-button" onClick={() => openTeamEditor()}><Plus size={14} /> 新增小组</button>
          </div>}
        </div>
      </div>
      <div className="admin-modal-foot">
        <span>{selected ? '届次资料已加载' : '正在创建新届次，保存后会自动生成三个固定小组'}</span>
        <div className="admin-modal-actions">
          {selected && <button className="admin-link-button admin-danger-link" onClick={requestDeleteCohort}>删除届次</button>}
          <button className="secondary-button admin-small-button" onClick={onClose}>完成</button>
        </div>
      </div>
    </section>
    {teamEditorOpen && <div className="admin-modal-scrim admin-nested-modal" role="presentation" onClick={() => setTeamEditorOpen(false)}>
      <section className="admin-form-modal admin-team-form-modal" role="dialog" aria-modal="true" aria-labelledby="admin-team-editor-title" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-head"><div><p className="eyebrow">TEAM / EDITOR</p><h2 id="admin-team-editor-title">{teamForm.id ? '编辑小组' : '新增小组'}</h2><p>调整方向信息后，届次卡片和成员页面会同步更新。</p></div><button className="icon-button small" onClick={() => setTeamEditorOpen(false)} aria-label="关闭小组编辑"><X size={16} /></button></div>
        <div className="admin-editor-form">
          <div className="admin-editor-form-grid"><label><span>小组名称</span><input value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} placeholder="例如：算法组" autoFocus /></label><label><span>成员人数</span><input type="number" min="0" value={teamForm.memberCapacity} onChange={(event) => setTeamForm({ ...teamForm, memberCapacity: event.target.value })} placeholder="例如：6" /></label></div>
          <label><span>小组简介</span><textarea rows={3} value={teamForm.description} onChange={(event) => setTeamForm({ ...teamForm, description: event.target.value })} placeholder="写清楚这个方向负责什么" /></label>
          <label><span>视觉颜色</span><select value={teamForm.accent} onChange={(event) => setTeamForm({ ...teamForm, accent: event.target.value })}><option value="blue">蓝色</option><option value="violet">紫色</option><option value="mint">薄荷绿</option><option value="rose">玫红</option><option value="orange">橙色</option></select></label>
        </div>
        <div className="admin-modal-foot"><span>保存后立即同步</span><div><button className="secondary-button admin-small-button" onClick={() => setTeamEditorOpen(false)}>取消</button><button className="primary-button admin-small-button" onClick={saveTeamDraft}><Save size={14} /> 保存小组</button></div></div>
      </section>
    </div>}
  {deleteRequest && <AdminDeleteConfirm request={deleteRequest} busy={deleteBusy} onCancel={() => { if (!deleteBusy) setDeleteRequest(null) }} />}
  </div>
}

function AdminPhotoManager({ onClose }: { onClose: () => void }) {
  const { sortedCohorts, photos, savePhoto, removePhoto } = useClubConfig()
  const [cohortId, setCohortId] = useState(sortedCohorts[0]?.id ?? '')
  const [caption, setCaption] = useState('')
  const [uploadError, setUploadError] = useState('')
  const selectedPhotos = photos.filter((photo) => photo.cohortId === cohortId)
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !cohortId) return
    if (!isSupportedImage(file, MAX_LOCAL_IMAGE_BYTES)) {
      setUploadError('请上传 PNG、JPG 或 WebP 图片，且大小不超过 10 MB。')
      event.target.value = ''
      return
    }
    setUploadError('')
    const reader = new FileReader()
    reader.onerror = () => setUploadError('照片读取失败，请重新选择文件。')
    reader.onload = () => { savePhoto({ id: 'photo-' + Date.now(), cohortId, dataUrl: String(reader.result), name: file.name, caption: caption.trim() || file.name, createdAt: new Date().toISOString(), isCover: selectedPhotos.length === 0 }); setCaption(''); event.target.value = '' }
    reader.readAsDataURL(file)
  }
  const makeCover = (id: string) => { selectedPhotos.forEach((photo) => savePhoto({ ...photo, isCover: photo.id === id })) }
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal admin-photo-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">MEDIA / PHOTO ARCHIVE</p><h2>历届合影管理</h2><p>选择届次后上传一张或多张照片，设为封面后会同步到小组风采。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭照片管理"><X size={16} /></button></div><div className="admin-editor-form-grid"><label><span>所属届次</span><select value={cohortId} onChange={(event) => setCohortId(event.target.value)}>{sortedCohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.year} 届</option>)}</select></label><label><span>照片说明</span><input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="例如：2029 届第一次全员合影" /></label></div><div className="admin-upload-box"><span><ImagePlus size={18} /></span><div><strong>上传届次合影</strong><small>支持 JPG、PNG、WebP；照片只保存在当前浏览器，接入后端后可改为对象存储。</small>{uploadError && <small className="admin-upload-error">{uploadError}</small>}</div><input id="admin-cohort-photo-upload" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} /><label className="secondary-button admin-small-button" htmlFor="admin-cohort-photo-upload">选择照片</label></div><div className="admin-photo-grid">{selectedPhotos.length ? selectedPhotos.map((photo) => <article key={photo.id}><img src={photo.dataUrl} alt={photo.caption} /><div><div className="admin-photo-meta"><strong>{photo.caption}</strong><small>{photo.isCover ? '当前封面' : '普通照片'}</small></div><div className="admin-row-actions admin-photo-actions"><button className="admin-link-button" onClick={() => makeCover(photo.id)} disabled={photo.isCover}>设为封面</button><button className="admin-link-button admin-danger-link" onClick={() => removePhoto(photo.id)}><Trash2 size={13} /> 删除</button></div></div></article>) : <div className="admin-empty"><Camera size={22} /><strong>这一届还没有照片</strong><span>上传后会出现在历届合影页。</span></div>}</div><div className="admin-modal-foot"><span>照片会在前台即时同步</span><button className="secondary-button admin-small-button" onClick={onClose}>完成</button></div></section></div>
}

function AdminCopyManager({ onClose }: { onClose: () => void }) {
  const { siteCopy, updateSiteCopy } = useClubConfig()
  const [selectedId, setSelectedId] = useState(siteCopy[0]?.id ?? '')
  const selected = siteCopy.find((item) => item.id === selectedId)
  const [draft, setDraft] = useState({ title: selected?.title ?? '', body: selected?.body ?? '', author: selected?.author ?? '' })
  useEffect(() => { if (selected) setDraft({ title: selected.title, body: selected.body, author: selected.author ?? '' }) }, [selectedId, selected])
  const save = () => { if (selected && draft.title.trim()) { updateSiteCopy(selected.id, { title: draft.title.trim(), body: draft.body.trim(), author: draft.author.trim() || undefined }); onClose() } }
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">COPY / EDITOR</p><h2>站点文案与寄语</h2><p>这里修改后会同步到工具页、首页和小组风采，不需要重新发布前端。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭文案管理"><X size={16} /></button></div><div className="admin-copy-tabs">{siteCopy.map((item) => <button key={item.id} className={selectedId === item.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}>{item.label}</button>)}</div>{selected && <div className="admin-editor-form"><label><span>标题 / 第一行</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label><span>正文 / 第二行</span><textarea rows={5} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label><label><span>署名（可选）</span><input value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} /></label></div>}<div className="admin-modal-foot"><span>保存后前台即时同步</span><div><button className="secondary-button admin-small-button" onClick={onClose}>取消</button><button className="primary-button admin-small-button" onClick={save}><Save size={14} /> 保存文案</button></div></div></section></div>
}

function AdminCompetitionManager({ events, onClose, onSave, onDelete }: { events: CompetitionEvent[]; onClose: () => void; onSave: (id: string | undefined, value: CompetitionEditorValue) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const empty: CompetitionEditorValue = { title: '', type: '', date: '', deadline: '', description: '', status: '报名中', accent: 'blue', projects: [] }
  const [selectedId, setSelectedId] = useState<string | undefined>(events[0]?.id)
  const selected = events.find((event) => event.id === selectedId)
  const toDraft = (event?: CompetitionEvent): CompetitionEditorValue => event ? { title: event.title, type: event.type, date: event.date, deadline: event.deadline, description: event.description, status: event.status, accent: event.accent, projects: (event.projects ?? []).map((project) => ({ ...project })) } : { ...empty, projects: [] }
  const [draft, setDraft] = useState<CompetitionEditorValue>(() => toDraft(events[0]))
  const [deleteRequest, setDeleteRequest] = useState<AdminDeleteRequest | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const select = (event?: CompetitionEvent) => { setSelectedId(event?.id); setDraft(toDraft(event)) }
  const updateProject = (id: string, patch: Partial<CompetitionProject>) => setDraft((current) => ({ ...current, projects: current.projects.map((project) => project.id === id ? { ...project, ...patch } : project) }))
  const addProject = () => setDraft((current) => ({ ...current, projects: [...current.projects, { id: `competition-project-${Date.now()}`, title: '', cohort: '', description: '', imageUrl: '', projectUrl: '' }] }))
  const removeProject = (id: string) => setDraft((current) => ({ ...current, projects: current.projects.filter((project) => project.id !== id) }))
  const uploadProjectImage = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!isSupportedImage(file, MAX_LOCAL_IMAGE_BYTES)) {
      setUploadError('请上传 PNG、JPG 或 WebP 图片，且大小不超过 10 MB。')
      event.target.value = ''
      return
    }
    setUploadError('')
    const reader = new FileReader()
    reader.onerror = () => setUploadError('图片读取失败，请重新选择文件。')
    reader.onload = () => { updateProject(id, { imageUrl: String(reader.result) }); event.target.value = '' }
    reader.readAsDataURL(file)
  }
  const removeSelected = () => {
    if (!selected) return
    setDeleteRequest({
      title: '删除比赛？',
      message: '将删除“' + selected.title + '”及其历届项目资料，比赛中心详情页也会同步移除。',
      cancelLabel: '保留比赛',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await onDelete(selected.id)
          setSelectedId(undefined)
          setDraft({ ...empty, projects: [] })
          setDeleteRequest(null)
        } catch {
          // The parent handler already reports the deletion error; keep the dialog open.
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }
  return <div className="admin-modal-scrim" role="presentation" onClick={onClose}><section className="admin-editor-modal admin-competition-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">COMPETITIONS / EDITOR</p><h2>比赛中心管理</h2><p>编辑赛事信息、报名时间和历届项目，保存后会同步到比赛中心详情页。</p></div><button className="icon-button small" onClick={onClose} aria-label="关闭比赛管理"><X size={16} /></button></div><div className="admin-competition-layout"><aside className="admin-structure-list"><button className="admin-link-button" onClick={() => select()}><Plus size={14} /> 新建比赛</button>{events.map((event) => <button key={event.id} className={selectedId === event.id ? 'active' : ''} onClick={() => select(event)}><strong>{event.title}</strong><small>{event.date} · {event.status}</small></button>)}</aside><div className="admin-editor-form"><label><span>比赛名称</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：2026 蓝桥杯省赛" /></label><div className="admin-editor-form-grid"><label><span>比赛类型</span><input value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} placeholder="程序设计 / 创新创业" /></label><label><span>展示状态</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as CompetitionEvent['status'] })}><option>报名中</option><option>即将开始</option><option>已结束</option></select></label></div><div className="admin-editor-form-grid"><label><span>比赛时间</span><input value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} placeholder="2026-06-18 19:00" /></label><label><span>报名截止</span><input value={draft.deadline} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} placeholder="2026-06-10 23:59" /></label></div><label><span>比赛简介</span><textarea rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="填写比赛内容、报名方式和注意事项" /></label><div className="admin-route-node-head competition-project-editor-head"><div><p className="eyebrow">COHORT PROJECTS</p><h3>历届学长姐项目</h3></div><button className="secondary-button admin-small-button" onClick={addProject}><Plus size={14} /> 添加项目</button></div><div className="competition-project-editor-list">{uploadError && <small className="admin-upload-error">{uploadError}</small>}{draft.projects.map((project) => <article className="competition-project-editor" key={project.id}><div className="competition-project-editor-fields"><div className="admin-editor-form-grid"><label><span>届次</span><input value={project.cohort} onChange={(event) => updateProject(project.id, { cohort: event.target.value })} placeholder="2029" /></label><label><span>项目名称</span><input value={project.title} onChange={(event) => updateProject(project.id, { title: event.target.value })} placeholder="例如：校园智能问答" /></label></div><label><span>项目说明</span><textarea rows={2} value={project.description} onChange={(event) => updateProject(project.id, { description: event.target.value })} placeholder="说明项目解决的问题和获奖情况" /></label><label><span>项目链接（可选）</span><input value={project.projectUrl ?? ''} onChange={(event) => updateProject(project.id, { projectUrl: event.target.value })} placeholder="https://..." /></label></div><div className="competition-project-editor-media">{project.imageUrl ? <img src={project.imageUrl} alt="项目预览" /> : <div className="competition-project-placeholder"><ImagePlus size={20} /><span>暂无图片</span></div>}<input className="admin-file-input" id={`competition-project-image-${project.id}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadProjectImage(project.id, event)} /><label className="secondary-button admin-small-button" htmlFor={`competition-project-image-${project.id}`}>上传图片</label><button type="button" className="admin-link-button admin-danger-link" onClick={() => removeProject(project.id)}><Trash2 size={13} /> 删除项目</button></div></article>)}{draft.projects.length === 0 && <div className="admin-empty competition-project-empty"><Trophy size={20} /><strong>还没有历届项目</strong><span>添加后，成员可以在比赛详情里看到往届项目与图片。</span></div>}</div><div className="admin-modal-foot"><span>{selected ? '修改后保存即可同步' : '创建后可继续编辑'}</span><div className="admin-modal-actions"><button className="admin-link-button admin-danger-link" disabled={!selected} onClick={() => void removeSelected()}><Trash2 size={13} /> 删除比赛</button><button className="secondary-button admin-small-button" onClick={onClose}>取消</button><button className="primary-button admin-small-button" onClick={() => void onSave(selectedId, draft)}><Save size={14} /> 保存比赛</button></div></div></div></div></section>{deleteRequest && <AdminDeleteConfirm request={deleteRequest} busy={deleteBusy} onCancel={() => { if (!deleteBusy) setDeleteRequest(null) }} />}</div>
}
type AdminNavItem = {
  id: AdminSection
  label: string
  description: string
  icon: LucideIcon
  leaderOnly?: boolean
}

const adminNavItems: AdminNavItem[] = [
  { id: 'overview', label: '概览', description: '权限与站点状态', icon: Gauge },
  { id: 'cohorts', label: '届次与小组', description: '管理组织结构', icon: Layers3, leaderOnly: true },
  { id: 'members', label: '成员账号', description: '资料与权限', icon: UserCog },
  { id: 'content', label: '内容管理', description: '项目、资源与面经', icon: Folder },
  { id: 'announcements', label: '公告管理', description: '发布与下线', icon: Megaphone },
  { id: 'personalization', label: '个性化设置', description: '主题与文案', icon: Palette },
  { id: 'security', label: '安全设置', description: '访问策略与会话', icon: ShieldAlert, leaderOnly: true },
  { id: 'logs', label: '操作日志', description: '审计与追踪', icon: ScrollText },
]

const adminSectionMeta: Record<AdminSection, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: 'ADMIN / OVERVIEW', title: '控制台概览', description: '从这里掌握小组内容、成员与访问策略的整体状态。' },
  cohorts: { eyebrow: 'ADMIN / STRUCTURE', title: '届次与小组', description: '维护届次、方向和负责人边界，保证每一届的内容可追溯。' },
  members: { eyebrow: 'ADMIN / ACCOUNTS', title: '成员账号', description: '管理成员资料、角色与账号状态。密码只通过安全流程重置。' },
  content: { eyebrow: 'ADMIN / CONTENT', title: '内容管理', description: '统一维护学习路线、项目、资源、面经和比赛数据。' },
  announcements: { eyebrow: 'ADMIN / BROADCAST', title: '公告管理', description: '发布、编辑和下线面向小组成员的站内公告。' },
  personalization: { eyebrow: 'ADMIN / EXPERIENCE', title: '个性化设置', description: '控制全局视觉基线，同时保留成员自己的背景与头像偏好。' },
  security: { eyebrow: 'ADMIN / SECURITY', title: '安全设置', description: '配置后台访问策略与会话规则；隧道进程由服务器运维管理。' },
  logs: { eyebrow: 'ADMIN / AUDIT', title: '操作日志', description: '查看登录、内容变更和权限调整记录，方便追溯责任。' },
}

function readAdminPreference<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeAdminPreference(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* Storage may be unavailable. */ }
}
function AdminPage({ onNavigate, theme, onThemeChange, backgroundPreference, onBackgroundPreferenceChange, backgroundImage, onBackgroundImageChange }: { onNavigate: (path: string) => void; theme: Theme; onThemeChange: () => void; backgroundPreference: BackgroundPreference; onBackgroundPreferenceChange: (value: BackgroundPreference) => void; backgroundImage: string | null; onBackgroundImageChange: (value: string | null) => void }) {
  const { user, loading, updateProfile, changePassword } = useAuth()
  const { sortedCohorts, currentCohort } = useClubConfig()
  const { data, loading: contentLoading, refresh, createAnnouncement, updateAnnouncement, deleteAnnouncement, createMember, updateMember, deleteMember, createProject, updateProject, deleteProject, createResource, updateResource, deleteResource, createInterview, updateInterview, deleteInterview, createCompetition, updateCompetition, deleteCompetition, createLearningRoute, updateLearningRoute, deleteLearningRoute } = useContent()
  const [activeSection, setActiveSection] = useState<AdminSection>('overview')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberCohortFilter, setMemberCohortFilter] = useState('全部')
  const [memberTeamFilter, setMemberTeamFilter] = useState('全部')
  const [memberPage, setMemberPage] = useState(1)
  const membersPerPage = 8
  const [globalTheme, setGlobalTheme] = useState(() => readAdminPreference('club-admin-global-theme', true))
  const [globalBackground, setGlobalBackground] = useState(() => readAdminPreference('club-admin-global-background', true))
  const [backgroundOpen, setBackgroundOpen] = useState(false)
  const [backgroundFileName, setBackgroundFileName] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileBio, setProfileBio] = useState('负责维护本届内容与成员协作')
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [toast, setToast] = useState('')
  const [deleteRequest, setDeleteRequest] = useState<AdminDeleteRequest | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const announcementItems = data.announcements.map((item) => ({ id: item.id, category: item.category, title: item.title, detail: item.detail, scope: item.scope ?? '全站公开', published: item.published !== false, date: item.date }))
  const memberItems = data.members
  const [announcementDraft, setAnnouncementDraft] = useState<AnnouncementDraft | null>(null)
  const [memberDraft, setMemberDraft] = useState<MemberDraft | null>(null)
  const [contentDraft, setContentDraft] = useState<ContentDraft | null>(null)
  const [collectionManager, setCollectionManager] = useState<AdminCollectionKind | null>(null)
  const [learningRouteOpen, setLearningRouteOpen] = useState(false)
  const [learningRouteId, setLearningRouteId] = useState('pyagent')

  const [cohortManagerOpen, setCohortManagerOpen] = useState(false)
  const [cohortManagerInitialId, setCohortManagerInitialId] = useState<string | undefined>(undefined)
  const [selectedCohortId, setSelectedCohortId] = useState(() => currentCohort?.id ?? sortedCohorts[0]?.id ?? '')
  const [photoManagerOpen, setPhotoManagerOpen] = useState(false)
  const [copyManagerOpen, setCopyManagerOpen] = useState(false)
  const [competitionManagerOpen, setCompetitionManagerOpen] = useState(false)
  const [ipRestriction, setIpRestriction] = useState(() => readAdminPreference('club-admin-ip-restriction', false))
  const [sessionPolicy, setSessionPolicy] = useState(() => readAdminPreference('club-admin-session-policy', true))
  const [tunnelStatus, setTunnelStatus] = useState(() => readAdminPreference('club-admin-tunnel-status', '未连接'))


  useEffect(() => { writeAdminPreference('club-admin-global-theme', globalTheme) }, [globalTheme])
  useEffect(() => { writeAdminPreference('club-admin-global-background', globalBackground) }, [globalBackground])
  useEffect(() => { writeAdminPreference('club-admin-ip-restriction', ipRestriction) }, [ipRestriction])
  useEffect(() => { writeAdminPreference('club-admin-session-policy', sessionPolicy) }, [sessionPolicy])
  useEffect(() => { writeAdminPreference('club-admin-tunnel-status', tunnelStatus) }, [tunnelStatus])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!sortedCohorts.some((cohort) => cohort.id === selectedCohortId)) setSelectedCohortId(sortedCohorts[0]?.id ?? '')
  }, [selectedCohortId, sortedCohorts])

  useEffect(() => {
    if (!user) return
    setProfileName(user.name)
    setProfileBio(user.bio ?? '负责维护本届内容与成员协作')
    setProfileAvatar(user.avatarUrl ?? null)
  }, [user])

  if (loading) return <div className="page admin-gate"><div className="admin-gate-card panel"><span className="admin-gate-icon"><ShieldCheck size={22} /></span><p className="eyebrow">ADMIN / SESSION</p><h1>正在读取权限</h1><p>请稍候，系统正在确认你的管理员身份。</p></div></div>

  if (!user) return <div className="page admin-gate"><div className="admin-gate-card panel"><span className="admin-gate-icon"><LockKeyhole size={22} /></span><p className="eyebrow">ADMIN / SIGN IN REQUIRED</p><h1>请先登录</h1><p>管理后台只对组长和本届负责人开放，登录后才能继续。</p><button className="primary-button" onClick={() => onNavigate('#/login')}>前往登录 <ArrowRight size={15} /></button></div></div>

  if (!canManageContent(user)) return <div className="page admin-gate"><div className="admin-gate-card panel"><span className="admin-gate-icon"><ShieldAlert size={22} /></span><p className="eyebrow">ADMIN / ACCESS DENIED</p><h1>暂时没有后台权限</h1><p>你的账号可以浏览小组内容，但组长尚未为你开放管理权限。</p><button className="secondary-button" onClick={() => onNavigate('#/tools')}>返回工作台 <ArrowRight size={15} /></button></div></div>

  const isLeader = user.role === 'Leader' || user.role === 'Admin'
  const scopeLabel = isLeader ? '全站范围' : `${user.cohort} 届范围`
  const userCohortYear = user.cohort.replace(/\D/g, '')
  const userCohortScope = `${userCohortYear} 届可见`
  const belongsToUserCohort = (cohort?: string) => isLeader || Boolean(cohort && cohort.replace(/\D/g, '') === userCohortYear)
  const canEditAnnouncement = (announcement?: { scope?: string }) => isLeader || announcement?.scope === userCohortScope
  const followTheme = backgroundPreference === 'follow'
  const selectedBackground = theme === 'dark' && backgroundPreference !== 'custom' ? 'starfield' : (backgroundPreference === 'follow' ? 'campus' : backgroundPreference)
  const effectiveBackground = selectedBackground
  const currentNav = adminNavItems.find((item) => item.id === activeSection) ?? adminNavItems[0]
  const meta = adminSectionMeta[activeSection]
  const selectedCohort = sortedCohorts.find((cohort) => cohort.id === selectedCohortId) ?? currentCohort
  const memberDirectionOptions = Array.from(new Set([...sortedCohorts.flatMap((cohort) => cohort.teams.map((team) => team.name)), ...memberItems.map((member) => member.direction).filter(Boolean)]))
  const scopedMembers = memberItems.filter((member) => isLeader || member.cohort.includes(user.cohort))
  const visibleMembers = scopedMembers.filter((member) => {
    const memberYear = member.cohort.replace(/\D/g, '')
    const matchesCohort = memberCohortFilter === '全部' || memberYear === memberCohortFilter
    const matchesTeam = memberTeamFilter === '全部' || member.direction === memberTeamFilter
    const matchesSearch = (member.name + ' ' + member.direction + ' ' + member.role).toLowerCase().includes(memberSearch.toLowerCase())
    return matchesCohort && matchesTeam && matchesSearch
  })
  const memberPageCount = Math.max(1, Math.ceil(visibleMembers.length / membersPerPage))
  const safeMemberPage = Math.min(memberPage, memberPageCount)
  const pagedMembers = visibleMembers.slice((safeMemberPage - 1) * membersPerPage, safeMemberPage * membersPerPage)
  const statCards = [
    { label: '可管理成员', value: isLeader ? data.members.length : scopedMembers.length, note: isLeader ? '跨届成员资料' : `${user.cohort} 届成员`, icon: Users, tone: 'blue' },
    { label: '内容总量', value: data.projects.length + data.resources.length + data.interviews.length, note: '项目 · 资源 · 面经', icon: Layers3, tone: 'violet' },
    { label: '待处理公告', value: announcementItems.length, note: '站内广播记录', icon: Megaphone, tone: 'orange' },
    { label: '当前届次', value: '2029', note: '第四代 · 活跃中', icon: Radio, tone: 'mint' },
  ]
  const recentLogs = [
    { time: '今天 09:42', action: '登录管理后台', target: isLeader ? '全站控制台' : `${user.cohort} 届空间`, tone: 'blue' },
    { time: '昨天 18:20', action: '更新成员方向', target: '网安组 · 2029 届', tone: 'mint' },
    { time: '05-18 14:05', action: '发布公告', target: '蓝桥杯报名通知', tone: 'orange' },
    { time: '05-16 21:11', action: '编辑项目资料', target: '校园 AI 智能助手', tone: 'violet' },
  ]
  const showToast = (message: string) => setToast(message)
  const openCohortManager = (cohortId?: string) => {
    setCohortManagerInitialId(cohortId)
    setCohortManagerOpen(true)
  }
  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!isSupportedImage(file, MAX_LOCAL_IMAGE_BYTES)) { showToast('请上传 PNG、JPG 或 WebP 图片，且大小不超过 10 MB'); event.target.value = ''; return }
    const reader = new FileReader()
    reader.onerror = () => showToast('背景图片读取失败，请重新选择文件')
    reader.onload = () => {
      onBackgroundImageChange(String(reader.result))
      setGlobalBackground(false)
      onBackgroundPreferenceChange('custom')
      setBackgroundFileName(file.name)
      event.target.value = ''
      showToast('背景图片已保存到本地，刷新后仍会保留')
    }
    reader.readAsDataURL(file)
  }
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!isSupportedImage(file, MAX_LOCAL_AVATAR_BYTES)) { showToast('请上传 PNG、JPG 或 WebP 头像，且大小不超过 5 MB'); event.target.value = ''; return }
    const reader = new FileReader()
    reader.onerror = () => showToast('头像读取失败，请重新选择文件')
    reader.onload = () => { setProfileAvatar(String(reader.result)); event.target.value = ''; showToast('头像已载入本地预览，点击保存资料后生效') }
    reader.readAsDataURL(file)
  }
  const saveProfileChanges = async () => {
    if (!profileName.trim()) { showToast('请填写显示姓名'); return }
    try {
      await updateProfile({ name: profileName.trim(), initials: profileName.trim().slice(0, 2), avatarUrl: profileAvatar ?? undefined, bio: profileBio.trim() })
      setProfileOpen(false)
      showToast('头像与简介已保存')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '资料保存失败，请稍后重试')
    }
  }
  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) { showToast('请完整填写密码字段'); return }
    if (newPassword.length < 8) { showToast('新密码至少需要 8 位'); return }
    if (newPassword !== confirmPassword) { showToast('两次输入的新密码不一致'); return }
    try {
      await changePassword(currentPassword, newPassword)
      setPasswordOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordVisible(false)
      showToast('密码已更新，请使用新密码登录')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '密码修改失败，请稍后重试')
    }
  }
  const openAnnouncementEditor = (item?: typeof announcementItems[number]) => {
    if (item && !canEditAnnouncement(item)) { showToast('本届负责人只能编辑自己届次的公告'); return }
    setAnnouncementDraft(item ? { id: item.id, category: item.category, title: item.title, detail: item.detail, scope: item.scope, published: item.published } : { category: '通知', title: '', detail: '', scope: isLeader ? '全站公开' : userCohortScope, published: true })
  }
  const saveAnnouncement = async () => {
    if (!announcementDraft?.title.trim() || !announcementDraft.detail.trim()) { showToast('请填写公告标题和内容'); return }
    if (!isLeader && (announcementDraft.scope !== userCohortScope || (announcementDraft.id && !canEditAnnouncement(announcementItems.find((item) => item.id === announcementDraft.id))))) {
      showToast('本届负责人只能发布或修改自己届次的公告')
      return
    }
    const date = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '-')
    const payload = { category: announcementDraft.category, title: announcementDraft.title.trim(), detail: announcementDraft.detail.trim(), scope: announcementDraft.scope, published: announcementDraft.published, date }
    try {
      if (announcementDraft.id) await updateAnnouncement(announcementDraft.id, payload)
      else await createAnnouncement(payload)
      setAnnouncementDraft(null)
      showToast(announcementDraft.published ? '公告已发布，公开页面已同步' : '公告草稿已保存，仅管理后台可见')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '公告保存失败，请稍后重试')
    }
  }
  const removeAnnouncement = (id: string) => {
    const announcement = announcementItems.find((item) => item.id === id)
    if (!announcement) return
    if (!canEditAnnouncement(announcement)) { showToast('本届负责人只能删除自己届次的公告'); return }
    setDeleteRequest({
      title: '删除这条公告？',
      message: <>将下线并删除“{announcement.title}”，首页和其他公开页面不会再显示这条公告。</>,
      cancelLabel: '保留公告',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await deleteAnnouncement(id)
          setDeleteRequest(null)
          showToast('公告已删除，公开页面已同步')
        } catch (error) {
          showToast(error instanceof Error ? error.message : '公告删除失败')
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }
  const removeMember = (id: string) => {
    const member = memberItems.find((item) => item.id === id)
    if (!member) return
    if (!belongsToUserCohort(member.cohort)) { showToast('不能操作其他届次的成员'); return }
    setDeleteRequest({
      title: '删除成员账号？',
      message: <>将删除“{member.name}”的账号资料，并从小组风采和项目协作中移除。</>,
      cancelLabel: '保留账号',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await deleteMember(id)
          setDeleteRequest(null)
          showToast('成员账号已删除，小组风采已同步')
        } catch (error) {
          showToast(error instanceof Error ? error.message : '成员删除失败')
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }
  const openMemberEditor = (member?: typeof memberItems[number]) => {
    if (member && !belongsToUserCohort(member.cohort)) { showToast('不能编辑其他届次的成员'); return }
    setMemberDraft(createMemberDraft(member, isLeader ? (memberCohortFilter === '全部' ? (selectedCohort?.year ?? '2029') : memberCohortFilter) : user.cohort))
  }
  const saveMember = async () => {
    if (!memberDraft?.name.trim()) { showToast('请填写成员姓名'); return }
    const cohortYear = memberDraft.cohort.replace(/\D/g, '') || (isLeader ? '2029' : userCohortYear)
    if (!isLeader && cohortYear !== userCohortYear) { showToast('本届负责人不能修改其他届次的成员'); return }
    if (!isLeader && memberDraft.id) {
      const existing = memberItems.find((item) => item.id === memberDraft.id)
      if (!existing || !belongsToUserCohort(existing.cohort)) { showToast('不能编辑其他届次的成员'); return }
    }
    const cohort = `${cohortYear} 届`
    const payload = { name: memberDraft.name.trim(), role: memberDraft.role, cohort, direction: memberDraft.direction.trim() || '待补充', initials: memberDraft.initials.trim() || memberDraft.name.trim().slice(0, 2), accent: memberDraft.accent, projects: memberDraft.projects ?? [] }
    try {
      if (memberDraft.id) await updateMember(memberDraft.id, payload)
      else await createMember(payload)
      const wasEditing = Boolean(memberDraft.id)
      setMemberDraft(null)
      showToast(wasEditing ? '成员资料已更新，小组风采已同步' : '成员账号已添加，小组风采已同步')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '成员保存失败，请稍后重试')
    }
  }
  const openContentEditor = (module = '内容') => {
    setContentDraft({ module, title: '', description: '', status: '草稿', visibility: isLeader ? '全站公开' : '成员可见' })
  }
  const saveContent = async () => {
    if (!contentDraft?.title.trim() || !contentDraft.description.trim()) { showToast('请填写标题和描述'); return }
    const title = contentDraft.title.trim()
    const description = contentDraft.description.trim()
    const now = new Date().getFullYear()
    const visibility = isLeader && contentDraft.visibility === '全站公开' ? 'public' as const : 'members' as const
    try {
      if (contentDraft.module === '项目库') {
        await createProject({ name: title, slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`, description, stack: [], members: 0, stars: 0, status: contentDraft.status === '已归档' ? '已归档' : contentDraft.status === '已发布' ? '招募中' : '维护中', difficulty: 1, year: now, category: '科技小组', accent: 'blue', icon: 'rocket', featured: false, visibility })
      } else if (contentDraft.module === '资源库') {
        await createResource({ title, description, category: '小组资料', type: '文档', tags: [], author: user.name, updated: new Date().toLocaleDateString('zh-CN'), views: 0, accent: 'blue', visibility })
      } else if (contentDraft.module === '面经墙') {
        await createInterview({ company: '待补充', role: title, author: user.name, cohort: user.cohort, date: new Date().toLocaleDateString('zh-CN'), difficulty: '中等', rounds: 1, tags: [], summary: description, visibility })
      } else if (contentDraft.module === '比赛中心') {
        await createCompetition({ title, type: '其他', date: `${now}-01-01`, deadline: `${now}-12-31`, description, status: '即将开始', accent: 'blue', visibility })
      } else if (contentDraft.module === '学习路线') {
        await createLearningRoute({ title, direction: title, description, nodes: [], featuredProjectIds: [], visibility })
      } else {
        showToast(`${contentDraft.module}属于结构配置，请先在对应模块中保存具体字段`)
        return
      }
      setContentDraft(null)
      showToast(`${contentDraft.module}已保存，公开页面已同步`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : `${contentDraft.module}保存失败，请稍后重试`)
    }
  }
  const openCollectionManager = (module: AdminCollectionKind) => setCollectionManager(module)
  const openLearningRouteEditor = (id = 'pyagent') => { setLearningRouteId(id); setLearningRouteOpen(true) }
  const openNewLearningRoute = () => { setLearningRouteId(`new-route-${Date.now()}`); setLearningRouteOpen(true) }
  const saveCollection = async (draft: CollectionDraft) => {
    if (!draft.title.trim()) { showToast('请填写内容标题'); return }
    if (!draft.description.trim()) { showToast('请填写内容简介'); return }
    const visibility = isLeader && draft.visibility === '全站公开' ? 'public' as const : 'members' as const
    const asNumber = (value: string, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
    let savedId: string | undefined
    try {
      if (draft.kind === '项目库') {
        const slug = draft.slug.trim() || `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'project'}-${Date.now()}`
        const payload = { name: draft.title.trim(), slug, description: draft.description.trim(), intro: draft.intro.trim() || draft.description.trim(), githubUrl: draft.githubUrl.trim() || undefined, docsUrl: draft.docsUrl.trim() || undefined, demoUrl: draft.demoUrl.trim() || undefined, issueUrl: draft.issueUrl.trim() || undefined, coverImage: draft.coverImage || undefined, stack: draft.stack.split(/[,，]/).map((item) => item.trim()).filter(Boolean), members: asNumber(draft.members), stars: asNumber(draft.stars), status: draft.status as Project['status'], difficulty: Math.min(5, Math.max(1, asNumber(draft.difficulty, 1))), year: asNumber(draft.year, new Date().getFullYear()), category: draft.category.trim() || '科技小组', accent: draft.accent || 'blue', icon: draft.icon || 'rocket', featured: draft.featured, memberIds: draft.memberIds, joinEnabled: draft.joinEnabled, joinNote: draft.joinNote.trim() || undefined, milestones: draft.milestones.filter((item) => item.title.trim()).map((item) => ({ ...item, year: item.year.trim(), title: item.title.trim(), summary: item.summary.trim() })), logs: draft.logs.filter((item) => item.title.trim()).map((item) => ({ ...item, date: item.date.trim(), title: item.title.trim(), detail: item.detail.trim(), author: item.author?.trim() || undefined, authorInitials: item.authorInitials?.trim() || undefined })), visibility }
        if (draft.id) savedId = (await updateProject(draft.id, payload)).id
        else savedId = (await createProject(payload)).id
      } else if (draft.kind === '资源库') {
        const payload = { title: draft.title.trim(), description: draft.description.trim(), category: draft.category.trim() || '小组资料', type: draft.type || '文档', tags: draft.tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean), author: draft.author.trim() || user.name, updated: draft.updated.trim() || new Date().toLocaleDateString('zh-CN'), views: asNumber(draft.views), accent: draft.accent || 'blue', visibility }
        if (draft.id) savedId = (await updateResource(draft.id, payload)).id
        else savedId = (await createResource(payload)).id
      } else {
        if (!isLeader && draft.cohort.replace(/\D/g, '') !== userCohortYear) { showToast('本届负责人只能维护自己届次的面经'); return }
        const payload = { company: draft.company.trim() || '待补充', role: draft.title.trim(), author: draft.author.trim() || user.name, cohort: draft.cohort.trim() || user.cohort, date: draft.date.trim() || new Date().toLocaleDateString('zh-CN'), difficulty: draft.difficulty as InterviewExperience['difficulty'], rounds: Math.max(1, asNumber(draft.rounds, 1)), tags: draft.tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean), summary: draft.description.trim(), visibility }
        if (draft.id) savedId = (await updateInterview(draft.id, payload)).id
        else savedId = (await createInterview(payload)).id
      }
      showToast(`${draft.kind}${draft.id ? '已更新' : '已创建'}，公开页面已同步`)
      return savedId ? { id: savedId } : undefined
    } catch (error) {
      showToast(error instanceof Error ? error.message : `${draft.kind}保存失败，请稍后重试`)
    }
  }
  const removeCollection = async (kind: AdminCollectionKind, id: string): Promise<boolean> => {
    try {
      if (kind === '项目库') await deleteProject(id)
      else if (kind === '资源库') await deleteResource(id)
      else await deleteInterview(id)
     showToast(`${kind}内容已删除`)
      return true
   } catch (error) {
     showToast(error instanceof Error ? error.message : '内容删除失败，请稍后重试')
      return false
   }
 }
  const saveLearningRoute = async (draft: LearningRouteDraft) => {
    if (!draft.title.trim()) { showToast('请填写学习路线名称'); return }
    try {
      const completedNodes = draft.nodes.filter((node) => node.title.trim())
      const payload = {
        title: draft.title.trim(),
        direction: draft.direction.trim() || draft.title.trim(),
        description: draft.description.trim(),
        nodes: completedNodes.map((node, index) => ({
          ...node,
          id: node.id || `node-${Date.now()}-${index}`,
          title: node.title.trim(),
          duration: node.duration.trim() || '待定',
          description: node.description?.trim(),
          projectIds: [...(node.projectIds ?? [])],
        })),
        featuredProjectIds: [...draft.featuredProjectIds],
      }
      const saved = draft.id.startsWith('new-route-') ? await createLearningRoute(payload) : await updateLearningRoute(draft.id, payload)
      setLearningRouteId(saved.id)
      showToast('当前学习路线已保存，可继续编辑其他方向')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '学习路线保存失败，请稍后重试')
    }
  }
  const removeLearningRoute = async (id: string) => {
    if (id.startsWith('new-route-')) {
      setLearningRouteOpen(false)
      showToast('未保存的学习路线已取消')
      return
    }
    if (id === 'pyagent') {
      showToast('默认 PyAgent 路线不可删除，可清空节点后重新编辑')
      return
    }
    const route = data.learningRoutes.find((item) => item.id === id)
    setDeleteRequest({
      title: '删除这条学习路线？',
      message: <>将删除“{route?.title ?? '当前路线'}”，公开学习路线页面也会同步移除。</>,
      cancelLabel: '保留路线',
      confirmLabel: '确认删除',
      onConfirm: async () => {
        setDeleteBusy(true)
        try {
          await deleteLearningRoute(id)
          setLearningRouteOpen(false)
          setDeleteRequest(null)
          showToast('学习路线已删除')
        } catch (error) {
          showToast(error instanceof Error ? error.message : '学习路线删除失败')
        } finally {
          setDeleteBusy(false)
        }
      },
    })
  }
  const saveCompetition = async (id: string | undefined, value: CompetitionEditorValue) => {
    if (!value.title.trim() || !value.date.trim() || !value.deadline.trim() || !value.description.trim()) { showToast('请填写比赛名称、比赛时间、报名截止和说明'); return }
    try {
      const payload = { title: value.title.trim(), type: value.type.trim() || '其他', date: value.date.trim(), deadline: value.deadline.trim(), description: value.description.trim(), status: value.status, accent: value.accent, projects: value.projects.filter((project) => project.title.trim()).map((project) => ({ ...project, title: project.title.trim(), cohort: project.cohort.trim() || '未标注届次', description: project.description.trim(), projectUrl: project.projectUrl?.trim() || undefined })) }
      if (id) await updateCompetition(id, payload)
      else await createCompetition(payload)
      setCompetitionManagerOpen(false)
      showToast(id ? '比赛信息已更新，比赛中心已同步' : '比赛已发布，比赛中心已同步')
    } catch (error) { showToast(error instanceof Error ? error.message : '比赛保存失败，请稍后重试') }
  }
  const removeCompetition = async (id: string) => {
    try {
      await deleteCompetition(id)
      showToast('比赛已删除，比赛中心已同步')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '比赛删除失败')
      throw error
    }
  }
  const exportLogs = () => {
    const rows = [['时间', '操作者', '动作', '对象', '结果'], ...recentLogs.map((log) => [log.time, user.name, log.action, log.target, '成功'])]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `club-admin-logs-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showToast('日志 CSV 已下载')
  }
  const selectSection = (item: AdminNavItem) => {
    if (item.leaderOnly && !isLeader) {
      showToast('该模块仅组长（超级管理员）可操作')
      return
    }
    setActiveSection(item.id)
  }

  const renderOverview = () => <>
    <div className="admin-stat-grid">
      {statCards.map(({ label, value, note, icon: StatIcon, tone }) => <article className={`admin-stat-card tone-${tone}`} key={label}><span className="admin-stat-icon"><StatIcon size={17} /></span><strong>{value}</strong><span>{label}</span><small>{note}</small></article>)}
    </div>
    <div className="admin-overview-grid">
      <section className="admin-card admin-activity-card"><div className="admin-card-head"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>最近操作</h2></div><button className="admin-link-button" onClick={() => setActiveSection('logs')}>查看完整日志 <ArrowUpRight size={14} /></button></div><div className="admin-activity-list">{recentLogs.map((log) => <div className="admin-activity-row" key={`${log.time}-${log.action}`}><span className={`admin-activity-dot tone-${log.tone}`} /><div><strong>{log.action}</strong><small>{log.target}</small></div><time>{log.time}</time></div>)}</div></section>
      <section className="admin-card admin-scope-card"><div className="admin-card-head"><div><p className="eyebrow">PERMISSION MODEL</p><h2>你的管理边界</h2></div><ShieldCheck size={18} /></div><div className="admin-scope-hero"><span className="admin-scope-avatar"><UserCog size={19} /></span><div><strong>{isLeader ? '超级管理员' : '本届管理员'}</strong><small>{user.name} · {scopeLabel}</small></div></div><div className="admin-permission-list"><span><Check size={13} /> {isLeader ? '管理全部届次与内容' : `管理 ${user.cohort} 届内容`}</span><span><Check size={13} /> 成员资料与头像维护</span><span><Check size={13} /> 公告与展示内容编辑</span>{!isLeader && <span className="is-muted"><LockKeyhole size={13} /> 全局安全策略由组长维护</span>}</div></section>
    </div>
    <section className="admin-card admin-quick-card"><div className="admin-card-head"><div><p className="eyebrow">QUICK ACTIONS</p><h2>常用操作</h2></div><span className="admin-card-hint">{contentLoading ? '同步内容中…' : '内容已持久化'}</span></div><div className="admin-quick-grid"><button onClick={() => setActiveSection('members')}><UserCog size={16} /><span><strong>管理成员</strong><small>资料、角色与账号状态</small></span><ChevronRight size={15} /></button><button onClick={() => setActiveSection('announcements')}><Megaphone size={16} /><span><strong>发布公告</strong><small>把重要信息发到首页</small></span><ChevronRight size={15} /></button><button onClick={() => setActiveSection('personalization')}><Palette size={16} /><span><strong>调整站点体验</strong><small>主题、背景与全局文案</small></span><ChevronRight size={15} /></button><button onClick={() => setActiveSection('security')} disabled={!isLeader}><ShieldAlert size={16} /><span><strong>检查安全策略</strong><small>{isLeader ? '访问限制与会话配置' : '仅组长可配置'}</small></span><ChevronRight size={15} /></button></div></section>
  </>


  const renderCohorts = () => <div className="admin-stack">
    <section className="admin-card">
      <div className="admin-card-head"><div><p className="eyebrow">COHORT DIRECTORY</p><h2>届次目录</h2></div>{isLeader && <button className="primary-button admin-small-button" onClick={() => openCohortManager()}><Plus size={15} /> 管理届次</button>}</div>
      <div className="admin-cohort-grid">
        {sortedCohorts.map((cohort) => <article
          className={'admin-cohort-card ' + (cohort.id === selectedCohort?.id ? 'active ' : '') + (cohort.status === 'active' ? 'current' : '')}
          key={cohort.id}
          role="button"
          tabIndex={0}
          aria-pressed={cohort.id === selectedCohort?.id}
          onClick={() => setSelectedCohortId(cohort.id)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedCohortId(cohort.id) } }}
        >
          <div><span className="admin-cohort-year">{cohort.year}</span><Tag tone={cohort.status === 'active' ? 'mint' : 'neutral'}>{cohort.status === 'active' ? '当前届' : cohort.status === 'draft' ? '草稿' : '已归档'}</Tag></div>
          <strong>{cohort.generationLabel}</strong>
          <div className="admin-team-tags">{cohort.teams.map((team) => <span key={team.id}>{team.name} · {team.memberCapacity ?? team.members.length}人</span>)}</div>
          <button className="admin-link-button" onClick={(event) => { event.stopPropagation(); openCohortManager(cohort.id) }}>编辑届次 <ArrowUpRight size={13} /></button>
        </article>)}
      </div>
      <p className="admin-cohort-selection-hint">点击届次卡片切换下方小组资料；点击“编辑届次”修改配置。</p>
    </section>
    <section className="admin-card">
      <div className="admin-card-head"><div><p className="eyebrow">{selectedCohort?.status === 'active' ? 'CURRENT TEAMS / ' : 'VIEWING TEAMS / '}{selectedCohort?.year ?? 'CURRENT'}</p><h2>{selectedCohort?.status === 'active' ? '本届小组' : (selectedCohort?.year ?? '') + '届小组'}</h2></div><span className="admin-card-hint">组长与负责人共同维护</span></div>
      <div className="admin-team-list">{(selectedCohort?.teams ?? []).map((team) => <div className="admin-team-row" key={team.id}><span className={'admin-team-icon tone-' + team.accent}><Users size={16} /></span><div><strong>{team.name}</strong><small>{team.memberCapacity ?? team.members.length} 人配置 · {team.description}</small></div><b>{team.members.length} 人</b><button className="icon-button small" onClick={() => openCohortManager(selectedCohort?.id)} aria-label={'管理' + team.name}><ArrowUpRight size={14} /></button></div>)}</div>
    </section>
  </div>


  const renderMembers = () => <div className="admin-stack">
    <section className="admin-card">
      <div className="admin-card-head"><div><p className="eyebrow">ACCOUNT DIRECTORY</p><h2>成员账号</h2></div><div className="admin-head-actions">{isLeader && <button className="secondary-button admin-small-button" onClick={() => openMemberEditor()}><Plus size={15} /> 添加成员</button>}<button className="primary-button admin-small-button" onClick={() => showToast('批量导入将在后端接入 CSV 接口后启用')}><UserCog size={15} /> 批量导入</button></div></div>
      <div className="admin-member-cohort-nav" aria-label="按届次查看成员"><button type="button" className={memberCohortFilter === '全部' ? 'active' : ''} onClick={() => { setMemberCohortFilter('全部'); setMemberTeamFilter('全部'); setMemberPage(1) }}><strong>全部成员</strong><small>{scopedMembers.length} 人</small></button>{sortedCohorts.filter((cohort) => isLeader || cohort.year === user.cohort.replace(" 届", "")).map((cohort) => { const count = scopedMembers.filter((member) => member.cohort.replace(/\D/g, '') === cohort.year).length; return <button type="button" key={cohort.id} className={memberCohortFilter === cohort.year ? 'active' : ''} onClick={() => { setMemberCohortFilter(cohort.year); setMemberTeamFilter('全部'); setMemberPage(1) }}><strong>{cohort.year} 届</strong><small>{count} 人</small></button> })}</div>
      <div className="admin-filter-row">
        <div className="admin-search"><Search size={15} /><input value={memberSearch} onChange={(event) => { setMemberSearch(event.target.value); setMemberPage(1) }} placeholder="搜索姓名、方向或角色" /></div>
        <div className="admin-member-filters">
          <select className="admin-filter-select" value={memberCohortFilter} onChange={(event) => { setMemberCohortFilter(event.target.value); setMemberTeamFilter('全部'); setMemberPage(1) }}><option value="全部">全部届次</option>{sortedCohorts.filter((cohort) => isLeader || cohort.year === user.cohort.replace(" 届", "")).map((cohort) => <option key={cohort.id} value={cohort.year}>{cohort.year} 届</option>)}</select>
          <select className="admin-filter-select" value={memberTeamFilter} onChange={(event) => { setMemberTeamFilter(event.target.value); setMemberPage(1) }}><option value="全部">全部小组</option>{memberDirectionOptions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}</select>
        </div>
        <span>{visibleMembers.length} 个结果 · {scopeLabel}</span>
      </div>
      {visibleMembers.length ? <><div className="admin-member-list">{pagedMembers.map((member) => <div className="admin-member-row" key={member.id}><Avatar initials={member.initials} accent={member.accent} size="sm" /><div className="admin-member-main"><strong>{member.name}</strong><small>{member.direction} · {member.cohort}</small></div><Tag tone={member.role.includes('组长') ? 'blue' : member.role === '负责人' ? 'mint' : 'neutral'}>{member.role}</Tag><span className="admin-member-status"><i /> 正常</span><div className="admin-row-actions"><button className="admin-link-button" onClick={() => openMemberEditor(member)}>编辑 <ArrowUpRight size={13} /></button>{isLeader && <button className="admin-link-button admin-danger-link" onClick={() => { void removeMember(member.id) }}>删除</button>}</div></div>)}</div>{memberPageCount > 1 && <div className="admin-member-pagination"><span>第 {safeMemberPage} / {memberPageCount} 页 · 共 {visibleMembers.length} 人</span><div><button type="button" className="secondary-button admin-small-button" disabled={safeMemberPage === 1} onClick={() => setMemberPage((page) => Math.max(1, page - 1))}>上一页</button><button type="button" className="secondary-button admin-small-button" disabled={safeMemberPage === memberPageCount} onClick={() => setMemberPage((page) => Math.min(memberPageCount, page + 1))}>下一页</button></div></div>}</> : <div className="admin-empty"><UserCog size={22} /><strong>{memberSearch ? '没有匹配的成员' : memberCohortFilter !== '全部' || memberTeamFilter !== '全部' ? '这个筛选下还没有成员' : user.cohort + '成员资料还未同步'}</strong><span>管理员登录后可在这里补充头像、简介、方向和账号状态。</span><button className="secondary-button admin-small-button" onClick={() => openMemberEditor()} disabled={!isLeader}>开始整理</button></div>}
    </section>
    <section className="admin-note-card"><LockKeyhole size={16} /><div><strong>密码安全提示</strong><p>后台不显示成员原密码。重置密码时生成一次性链接，并写入操作日志。</p></div></section>
  </div>
  const renderContent = () => {
    const modules = [{ label: '学习路线', count: data.learningRoutes.length, icon: Route, tone: 'blue', note: '路线标题与节点' }, { label: '项目库', count: data.projects.length, icon: Rocket, tone: 'violet', note: '项目状态与成员' }, { label: '资源库', count: data.resources.length, icon: Folder, tone: 'mint', note: '资料、文档与链接' }, { label: '面经墙', count: data.interviews.length, icon: MessageCircle, tone: 'orange', note: '经验、轮次与标签' }, { label: '比赛中心', count: data.competitionEvents.length, icon: Trophy, tone: 'rose', note: '赛事与报名状态' }, { label: '历届合影', count: sortedCohorts.length, icon: Camera, tone: 'blue', note: '照片墙与管理员上传' }]
    return <div className="admin-stack"><section className="admin-card"><div className="admin-card-head"><div><p className="eyebrow">CONTENT REGISTRY</p><h2>内容模块</h2></div><button className="primary-button admin-small-button" onClick={() => openCollectionManager('项目库')}><Plus size={15} /> 新建内容</button></div><div className="admin-content-grid">{modules.map(({ label, count, icon: ContentIcon, tone, note }) => <button className="admin-content-module" key={label} onClick={() => { if (label === '历届合影') setPhotoManagerOpen(true); else if (label === '比赛中心') setCompetitionManagerOpen(true); else if (label === '学习路线') openLearningRouteEditor(); else openCollectionManager(label as AdminCollectionKind) }}><span className={`admin-content-icon tone-${tone}`}><ContentIcon size={17} /></span><span><strong>{label}</strong><small>{count} 条 · {note}</small></span><ArrowUpRight size={14} /></button>)}</div></section><section className="admin-card admin-api-card"><div className="admin-api-mark"><ServerCog size={19} /></div><div><p className="eyebrow">API READY</p><h2>内容编辑器已接通</h2><p>学习路线、项目、资源和面经都通过独立 CRUD 接口保存；本地开发使用浏览器持久化，接入后端时无需重写页面。</p></div><Tag tone="mint">可直接接 API</Tag></section></div>
  }
  const renderAnnouncements = () => <div className="admin-stack"><section className="admin-card"><div className="admin-card-head"><div><p className="eyebrow">BROADCAST CENTER</p><h2>公告列表</h2></div><button className="primary-button admin-small-button" onClick={() => openAnnouncementEditor()}><Plus size={15} /> 新建公告</button></div><div className="admin-announcement-list">{announcementItems.map((announcement) => <div className="admin-announcement-row" key={announcement.id}><Tag tone={announcement.category === '重要' ? 'red' : announcement.category === '比赛' ? 'orange' : 'blue'}>{announcement.category}</Tag><div><strong>{announcement.title}</strong><small>{announcement.detail}</small></div><time>{announcement.date}</time><span className={`admin-announcement-status ${announcement.published ? 'published' : 'draft'}`}>{announcement.published ? '已发布' : '草稿'}</span><div className="admin-row-actions"><button className="admin-link-button" onClick={() => openAnnouncementEditor(announcement)}>编辑 <ArrowUpRight size={13} /></button><button className="admin-link-button admin-danger-link" onClick={() => { void removeAnnouncement(announcement.id) }}>删除</button></div></div>)}</div></section><section className="admin-card admin-publish-card"><div><p className="eyebrow">PUBLISHING RULE</p><h2>发布前检查</h2><p>公告发布后会记录发布人、发布时间和可见范围。本届负责人只能发布到自己负责的届次空间。</p></div><div className="admin-check-list"><span><Check size={13} /> 需要明确公告分类</span><span><Check size={13} /> 支持保存草稿</span><span><Check size={13} /> 发布记录可追溯</span></div></section></div>
  const renderPersonalization = () => <div className="admin-stack"><section className="admin-card"><div className="admin-card-head"><div><p className="eyebrow">GLOBAL EXPERIENCE</p><h2>全局个性化</h2></div><Tag tone="blue">组长可发布</Tag></div><div className="admin-settings-list"><div className="admin-setting-row"><span className="admin-setting-icon tone-blue"><Palette size={16} /></span><div><strong>全局主题基线</strong><small>为未自定义的成员使用浅色校园蓝主题</small></div><button disabled={!isLeader} className={`admin-switch ${globalTheme ? 'on' : ''}`} onClick={() => { setGlobalTheme((value) => !value); onThemeChange() }} aria-pressed={globalTheme}><i /></button></div><div className="admin-setting-row"><span className="admin-setting-icon tone-violet"><ImagePlus size={16} /></span><div><strong>校园背景图</strong><small>{globalBackground ? '已启用：白天校园晨曦，夜间静谧星空' : backgroundImage ? '已关闭：当前使用个人背景图片' : '已关闭：当前使用个人背景主题'}</small></div><button disabled={!isLeader} className={`admin-switch ${globalBackground ? 'on' : ''}`} onClick={() => { const next = !globalBackground; setGlobalBackground(next); onBackgroundPreferenceChange(next ? 'follow' : (backgroundImage ? 'custom' : 'mist')); showToast(next ? '校园背景已启用，个人背景暂时保留' : backgroundImage ? '校园背景已关闭，正在使用个人背景' : '校园背景已关闭，正在使用个人主题') }} aria-pressed={globalBackground}><i /></button></div><div className="admin-setting-row"><span className="admin-setting-icon tone-mint"><FileText size={16} /></span><div><strong>首页文案</strong><small>“我们的目的”与公告标题由内容服务统一管理</small></div><button disabled={!isLeader} className="secondary-button admin-small-button" onClick={() => setCopyManagerOpen(true)}>编辑文案</button></div></div></section><section className="admin-card"><div className="admin-card-head"><div><p className="eyebrow">MEMBER PREFERENCES</p><h2>成员个人设置范围</h2></div><span className="admin-card-hint">由成员自己控制</span></div><div className="admin-preference-grid"><button className="admin-preference-tile" onClick={() => setProfileOpen(true)}><UserCog size={16} /><strong>头像与简介</strong><span>每位成员可自行维护公开资料</span><ArrowUpRight size={14} /></button><button className="admin-preference-tile" onClick={() => setBackgroundOpen(true)}><Palette size={16} /><strong>背景与主题</strong><span>可覆盖全局默认，不影响他人</span><ArrowUpRight size={14} /></button><button className="admin-preference-tile" onClick={() => setPasswordOpen(true)}><KeyRound size={16} /><strong>密码与会话</strong><span>支持修改密码和退出所有设备</span><ArrowUpRight size={14} /></button></div></section></div>

  const renderSecurity = () => <div className="admin-stack"><section className="admin-card"><div className="admin-card-head"><div><p className="eyebrow">ACCESS POLICY</p><h2>安全策略</h2></div><Tag tone="orange">组长专属</Tag></div><div className="admin-security-grid"><article><span className="admin-security-icon tone-blue"><LockKeyhole size={17} /></span><strong>后台 IP 白名单</strong><small>当前：{ipRestriction ? '已启用' : '未启用'} · 建议仅允许校园网或 VPN</small><button className={`admin-switch ${ipRestriction ? "on" : ""}`} onClick={() => { setIpRestriction((value) => !value); showToast(ipRestriction ? "IP 白名单已关闭" : "IP 白名单已启用") }} aria-pressed={ipRestriction}><i /></button></article><article><span className="admin-security-icon tone-mint"><ServerCog size={17} /></span><strong>Cloudflared / FRP</strong><small>当前：{tunnelStatus} · 仅展示状态，不在网页内启动或停止隧道进程</small><button className="secondary-button admin-small-button" onClick={() => { setTunnelStatus((value) => value === "未连接" ? "运行中" : "未连接"); showToast("隧道状态已刷新") }}>刷新状态</button></article><article><span className="admin-security-icon tone-violet"><ShieldCheck size={17} /></span><strong>会话与密码</strong><small>登录过期、强密码、重置链接和多设备退出</small><button className={`admin-switch ${sessionPolicy ? "on" : ""}`} onClick={() => { setSessionPolicy((value) => !value); showToast(sessionPolicy ? "会话强制退出已关闭" : "会话强制退出已启用") }} aria-pressed={sessionPolicy}><i /></button></article></div></section><section className="admin-note-card warning"><ShieldAlert size={16} /><div><strong>安全边界</strong><p>后台只管理访问策略和隧道状态，不直接控制服务器进程。实际暴露公网、证书和防火墙由运维脚本或云平台完成。</p></div></section></div>

  const renderLogs = () => <section className="admin-card"><div className="admin-card-head"><div><p className="eyebrow">AUDIT TRAIL</p><h2>操作日志</h2></div><button className="secondary-button admin-small-button" onClick={exportLogs}><ArrowUpRight size={15} /> 导出日志</button></div><div className="admin-log-table"><div className="admin-log-head"><span>时间</span><span>操作者</span><span>动作</span><span>对象</span><span>结果</span></div>{recentLogs.concat([{ time: '05-14 10:20', action: '修改主题配置', target: '全局浅色主题', tone: 'mint' }]).map((log, index) => <div className="admin-log-row" key={`${log.time}-${log.action}`}><time>{log.time}</time><span className="admin-log-user"><Avatar initials={index === 0 ? user.initials : '组长'} size="sm" />{index === 0 ? '当前账号' : '科技小组组长'}</span><strong>{log.action}</strong><span>{log.target}</span><Tag tone="mint">成功</Tag></div>)}</div></section>

  const renderSection = () => {
    if (activeSection === 'overview') return renderOverview()
    if (activeSection === 'cohorts') return renderCohorts()
    if (activeSection === 'members') return renderMembers()
    if (activeSection === 'content') return renderContent()
    if (activeSection === 'announcements') return renderAnnouncements()
    if (activeSection === 'personalization') return renderPersonalization()
    if (activeSection === 'security') return renderSecurity()
    return renderLogs()
  }

  return <div className={`page admin-page admin-bg-${effectiveBackground}`}><div className="admin-layout"><aside className="admin-sidebar panel"><div className="admin-sidebar-title"><span className="admin-console-mark"><Settings2 size={18} /></span><div><p className="eyebrow">CONTROL ROOM</p><strong>管理后台</strong></div></div><div className="admin-sidebar-scope"><span><ShieldCheck size={13} /> 当前权限</span><strong>{isLeader ? '超级管理员' : '本届管理员'}</strong><small>{user.name} · {scopeLabel}</small></div><nav className="admin-nav" aria-label="管理后台模块">{adminNavItems.map((item) => { const NavIcon = item.icon; const locked = Boolean(item.leaderOnly && !isLeader); return <button className={activeSection === item.id ? 'active' : ''} key={item.id} onClick={() => selectSection(item)} aria-current={activeSection === item.id ? 'page' : undefined}><span className="admin-nav-icon"><NavIcon size={16} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span>{locked ? <LockKeyhole size={13} /> : <ChevronRight size={14} />}</button> })}</nav><button className="admin-back-button" onClick={() => onNavigate('#/tools')}><ChevronLeft size={15} /> 返回工作台</button></aside><section className="admin-main"><header className="admin-content-head"><div><p className="eyebrow">{meta.eyebrow}</p><h1>{meta.title}</h1><p>{meta.description}</p></div><div className="admin-head-right"><span className="admin-live-status"><i /> 内容服务已连接</span><button className="icon-button small" onClick={() => { void refresh(); showToast('正在刷新内容快照') }} aria-label="刷新内容"><RefreshCw size={15} /></button><Avatar initials={user.initials} size="sm" /></div></header><div className="admin-breadcrumb"><span>管理后台</span><ChevronRight size={13} /><strong>{currentNav.label}</strong><span className="admin-breadcrumb-scope">{scopeLabel}</span></div>{renderSection()}</section></div>{profileOpen && <div className="admin-modal-scrim" role="presentation" onClick={() => setProfileOpen(false)}><section className="admin-form-modal" role="dialog" aria-modal="true" aria-labelledby="admin-profile-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">PROFILE / PUBLIC CARD</p><h2 id="admin-profile-title">编辑头像与简介</h2><p>这些信息会展示在成员卡片、项目协作和操作日志中。</p></div><button className="icon-button small" onClick={() => setProfileOpen(false)} aria-label="关闭资料设置"><X size={16} /></button></div><div className="admin-profile-editor"><div className="admin-avatar-editor"><label className="admin-avatar-upload" htmlFor="admin-avatar-upload">{profileAvatar ? <img src={profileAvatar} alt="头像预览" /> : <Avatar initials={user.initials} accent="blue" size="lg" />}<span><Camera size={13} /> 更换头像</span></label><input id="admin-avatar-upload" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} /><small>建议使用 1:1 方形图片</small></div><div className="admin-form-fields"><label><span>显示姓名</span><input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="输入成员姓名" /></label><label><span>个人简介</span><textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} rows={4} placeholder="介绍你在小组中的方向和职责" /></label></div></div><div className="admin-modal-foot"><span>当前账号：{user.name}</span><div><button className="secondary-button admin-small-button" onClick={() => setProfileOpen(false)}>取消</button><button className="primary-button admin-small-button" onClick={() => { void saveProfileChanges() }}>保存资料</button></div></div></section></div>}
{passwordOpen && <div className="admin-modal-scrim" role="presentation" onClick={() => setPasswordOpen(false)}><section className="admin-form-modal admin-password-modal" role="dialog" aria-modal="true" aria-labelledby="admin-password-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">SECURITY / PASSWORD</p><h2 id="admin-password-title">修改密码</h2><p>新密码至少 8 位，保存后建议退出其他设备。</p></div><button className="icon-button small" onClick={() => setPasswordOpen(false)} aria-label="关闭密码设置"><X size={16} /></button></div><div className="admin-password-fields"><label><span>当前密码</span><div className="admin-password-input"><input type={passwordVisible ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="输入当前密码" /><button type="button" onClick={() => setPasswordVisible((value) => !value)} aria-label={passwordVisible ? "隐藏密码" : "显示密码"}>{passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></label><label><span>新密码</span><input type={passwordVisible ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="至少 8 位字符" /></label><label><span>确认新密码</span><input type={passwordVisible ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入新密码" /></label></div><div className="admin-password-tip"><LockKeyhole size={15} /><span>后台不会显示或保存明文密码，正式环境将通过安全接口提交。</span></div><div className="admin-modal-foot"><span>会话安全 · 可撤销其他设备</span><div><button className="secondary-button admin-small-button" onClick={() => setPasswordOpen(false)}>取消</button><button className="primary-button admin-small-button" onClick={savePassword}>保存密码</button></div></div></section></div>}{backgroundOpen && <div className="admin-modal-scrim" role="presentation" onClick={() => setBackgroundOpen(false)}><section className="admin-background-modal" role="dialog" aria-modal="true" aria-labelledby="admin-background-title" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">PERSONAL BACKGROUND</p><h2 id="admin-background-title">设置个人背景</h2><p>只影响当前成员，不会改变其他人的背景。</p></div><button className="icon-button small" onClick={() => setBackgroundOpen(false)} aria-label="关闭背景设置"><X size={16} /></button></div><div className="admin-background-mode"><div><strong>跟随日夜主题</strong><small>{followTheme ? (theme === "dark" ? "夜间模式 · 静谧星空" : "白天模式 · 校园晨曦") : "已固定个人背景"}</small></div><button className={`admin-switch ${followTheme ? "on" : ""}`} onClick={() => onBackgroundPreferenceChange(followTheme ? (theme === "dark" ? "mist" : "campus") : "follow")} aria-pressed={followTheme}><i /></button></div><p className="admin-background-hint">关闭后可手动固定一个背景；重新开启会随右上角日夜按钮自动切换。</p><div className="admin-background-options">{[{ id: "campus", label: "校园晨曦", note: "浅蓝透明 · 默认推荐" }, { id: "mist", label: "雾蓝留白", note: "柔和通透 · 适合白天" }, { id: "paper", label: "纸张留白", note: "干净克制 · 适合阅读" }].map((option) => <button className={`admin-background-option ${effectiveBackground === option.id ? "active" : ""} ${option.id}`} key={option.id} onClick={() => { setGlobalBackground(false); onBackgroundPreferenceChange(option.id as BackgroundPreference); onBackgroundImageChange(null) }}><span className="admin-background-preview" /><span><strong>{option.label}</strong><small>{option.note}</small></span>{effectiveBackground === option.id && <CheckCircle2 size={16} />}</button>)}</div><div className="admin-upload-box"><span><ImagePlus size={18} /></span><div><strong>{backgroundFileName || "上传个人背景图片"}</strong><small>{backgroundFileName ? "已保存到当前浏览器，后端接入后可同步到服务器" : "支持 JPG、PNG，建议使用 16:9 图片"}</small></div><input id="admin-background-upload" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBackgroundUpload} /><label className="secondary-button admin-small-button" htmlFor="admin-background-upload">选择图片</label></div>{backgroundImage && <div className="admin-upload-preview"><img src={backgroundImage} alt="个人背景预览" /><span>本地预览</span></div>}<div className="admin-modal-foot"><span>当前选择：{followTheme ? (theme === "dark" ? "跟随夜间 · 静谧星空" : "跟随白天 · 校园晨曦") : (backgroundPreference === "custom" ? "自定义图片" : selectedBackground === "campus" ? "校园晨曦" : selectedBackground === "mist" ? "雾蓝留白" : "纸张留白")}</span><div><button className="secondary-button admin-small-button" onClick={() => setBackgroundOpen(false)}>取消</button><button className="primary-button admin-small-button" onClick={() => { setBackgroundOpen(false); showToast(followTheme ? "已保存跟随日夜主题" : backgroundImage ? "个人背景已保存" : "个人背景偏好已保存") }}>保存设置</button></div></div></section></div>}{announcementDraft && <AdminAnnouncementModal draft={announcementDraft} onChange={setAnnouncementDraft} onClose={() => setAnnouncementDraft(null)} onSave={saveAnnouncement} />}{memberDraft && <AdminMemberModal draft={memberDraft} cohortOptions={sortedCohorts.filter((cohort) => isLeader || cohort.year === user.cohort.replace(" 届", "")).map((cohort) => cohort.year)} directionOptions={memberDirectionOptions} onChange={setMemberDraft} onClose={() => setMemberDraft(null)} onSave={saveMember} />}{learningRouteOpen && <AdminLearningRouteModal draft={learningRouteId.startsWith('new-route-') ? createLearningRouteDraft([], { id: learningRouteId, direction: '新方向', title: '新方向学习路线', description: '', nodes: [], featuredProjectIds: [] }) : createLearningRouteDraft(data.learningRoutes.find((route) => route.id === learningRouteId)?.nodes ?? data.learningNodes, data.learningRoutes.find((route) => route.id === learningRouteId) ?? data.learningRoute)} routes={data.learningRoutes} projects={data.projects} onClose={() => setLearningRouteOpen(false)} onSave={saveLearningRoute} onDelete={removeLearningRoute} onSelectRoute={openLearningRouteEditor} onNewRoute={openNewLearningRoute} />}{collectionManager && <AdminContentManagerModal members={data.members} kind={collectionManager} items={collectionManager === '项目库' ? data.projects : collectionManager === '资源库' ? data.resources : data.interviews} defaults={{ author: user.name, cohort: user.cohort }} onClose={() => setCollectionManager(null)} onSave={saveCollection} onDelete={(id) => removeCollection(collectionManager, id)} />}{contentDraft && <AdminContentModal draft={contentDraft} onChange={setContentDraft} onClose={() => setContentDraft(null)} onSave={saveContent} />}{cohortManagerOpen && <AdminCohortManager initialCohortId={cohortManagerInitialId} onClose={() => { setCohortManagerOpen(false); setCohortManagerInitialId(undefined) }} />}{photoManagerOpen && <AdminPhotoManager onClose={() => setPhotoManagerOpen(false)} />}{copyManagerOpen && <AdminCopyManager onClose={() => setCopyManagerOpen(false)} />}{competitionManagerOpen && <AdminCompetitionManager events={data.competitionEvents} onClose={() => setCompetitionManagerOpen(false)} onSave={saveCompetition} onDelete={removeCompetition} />}{deleteRequest && <AdminDeleteConfirm request={deleteRequest} busy={deleteBusy} onCancel={() => { if (!deleteBusy) setDeleteRequest(null) }} />}{toast && <div className="admin-toast"><CheckCircle2 size={15} /> {toast}</div>}</div>
}
function CommandPalette({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (path: string) => void }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const commands = useMemo(() => [...navItems.map((item) => ({ label: item.label, hint: '页面', path: item.href })), { label: '校园 AI 智能助手', hint: '项目', path: '#/projects/ai-campus' }, { label: 'FastAPI 学习路线', hint: '资源', path: '#/resources' }, { label: '学长的一封信', hint: '传承', path: '#/members' }], [])
  const results = commands.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
  useEffect(() => { if (open) { setQuery(''); setSelectedIndex(0); window.setTimeout(() => inputRef.current?.focus(), 30) } }, [open])
  useEffect(() => { setSelectedIndex((index) => Math.min(index, Math.max(results.length - 1, 0))) }, [results.length])
  useEffect(() => { if (!open) return; const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setSelectedIndex((index) => (index + 1) % results.length) }; if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setSelectedIndex((index) => (index - 1 + results.length) % results.length) }; if (event.key === 'Enter' && results[selectedIndex]) { onNavigate(results[selectedIndex].path); onClose() } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [open, onClose, onNavigate, results, selectedIndex])
  return <AnimatePresence>{open && <><motion.div className="command-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} /><motion.div className="command-palette" initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}><div className="command-input"><Search size={18} /><input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }} placeholder="搜索路线、项目、资源、成员..." /><kbd>ESC</kbd></div><div className="command-results">{results.length ? results.map((item, index) => <button className={`command-item ${index === selectedIndex ? 'selected' : ''}`} key={`${item.label}-${item.path}`} onClick={() => { onNavigate(item.path); onClose() }}><span className="command-item-icon"><Compass size={16} /></span><span><strong>{item.label}</strong><small>{item.hint}</small></span><ArrowUpRight size={14} /></button>) : <div className="command-empty"><CircleHelp size={20} /> 没有找到匹配内容</div>}</div><div className="command-footer"><span><kbd>↑↓</kbd> 选择</span><span><kbd>↵</kbd> 打开</span><span><kbd>esc</kbd> 关闭</span></div></motion.div></>}</AnimatePresence>
}

function OnboardingModal({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (path: string) => void }) {
  const [step, setStep] = useState(0)
  const [grade, setGrade] = useState('大一')
  const [interest, setInterest] = useState('AI Agent')
  if (!open) return null
  const steps = [{ title: '你现在大几？', options: ['大一', '大二', '大三', '大四'] }, { title: '你最感兴趣的方向？', options: ['AI Agent', '前端', '后端', '算法', 'AI', 'Java'] }, { title: '每周能投入多少时间？', options: ['2h', '5h', '8h', '10h+'] }]
  const current = steps[step]
  return <AnimatePresence><motion.div className="modal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section className="onboarding-modal" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }}><button className="icon-button modal-close" onClick={onClose} aria-label="关闭"><X size={18} /></button><div className="modal-progress"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div><p className="eyebrow">STARTER PATH / 0{step + 1}</p><h2>{current.title}</h2><div className="onboarding-options">{current.options.map((option) => <button key={option} className={(step === 0 ? grade : interest) === option ? 'selected' : ''} onClick={() => step === 0 ? setGrade(option) : setInterest(option)}>{option}{(step === 0 ? grade : interest) === option && <Check size={15} />}</button>)}</div><div className="modal-footer"><span>{step + 1} / {steps.length}</span><button className="primary-button" onClick={() => { if (step < steps.length - 1) setStep(step + 1); else { onClose(); onNavigate('#/learning') } }}>{step < steps.length - 1 ? '下一步' : '生成我的路线'} <ArrowRight size={15} /></button></div></motion.section></motion.div></AnimatePresence>
}

function App() {
  const { data: { projects, starterMessages } } = useContent()
  const [route, setRoute] = useState(routeFromHash())
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
  const [backgroundPreference, setBackgroundPreference] = useState<BackgroundPreference>(getStoredBackgroundPreference)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(() => {
    try { return localStorage.getItem('club-background-image') } catch { return null }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [messages, setMessages] = useState<AIMessage[]>(starterMessages)
  useEffect(() => { const updateRoute = () => { setRoute(routeFromHash()); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }; window.addEventListener('hashchange', updateRoute); return () => window.removeEventListener('hashchange', updateRoute) }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('club-theme', theme) } catch { /* file:// privacy modes may disable storage */ } }, [theme])
  useEffect(() => { try { localStorage.setItem('club-background-preference', backgroundPreference) } catch { /* file:// privacy modes may disable storage */ } }, [backgroundPreference])
  useEffect(() => { try { if (backgroundImage) localStorage.setItem('club-background-image', backgroundImage); else localStorage.removeItem('club-background-image') } catch { /* file:// privacy modes may disable storage */ } }, [backgroundImage])
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true) } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [])
  const openProject = (project: Project) => navigate(`#/projects/${project.slug}`)
  const sendMessage = (text: string, options: { openDrawer?: boolean } = {}) => {
    const userMessage: AIMessage = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages((current) => [...current, userMessage])
    if (options.openDrawer !== false) setAiOpen(true)
    void askAssistant(text)
      .then((assistant) => setMessages((current) => [...current, assistant]))
      .catch(() => setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: '暂时无法连接 AI 服务，请稍后再试。' }]))
  }
  const renderPage = () => { if (route === '/home') return <LandingPage onNavigate={navigate} />; if (route === '/tools') return <HomePage onNavigate={navigate} onOnboarding={() => setOnboardingOpen(true)} onOpenProject={openProject} />; if (route === '/login') return <LoginPage />; if (route === '/admin') return <AdminPage onNavigate={navigate} theme={theme} onThemeChange={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} backgroundPreference={backgroundPreference} onBackgroundPreferenceChange={setBackgroundPreference} backgroundImage={backgroundImage} onBackgroundImageChange={setBackgroundImage} />; if (route === '/learning') return <LearningPage onOpenProject={openProject} />; if (route === '/projects') return <ProjectsPage onOpenProject={openProject} />; if (route.startsWith('/projects/')) { const slug = route.split('/')[2]; return <ProjectDetailPage project={projects.find((item) => item.slug === slug) ?? projects[0]} onNavigate={navigate} /> }; if (route === '/events') return <EventsPage />; if (route === '/resources') return <ResourcesPage onNavigate={navigate} />; if (route === '/resources/prompts') return <PromptsPage />; if (route === '/interviews') return <InterviewsPage />; if (route === '/members/archive') return <DynamicPhotoArchivePage />; if (route === '/members') return <DynamicMembersPage />; if (route.startsWith('/members/')) { const team = route.split('/')[2]; return <DynamicMembersPage initialTeam={team} /> }; if (route === '/ai') return <AiPage messages={messages} onSend={(text) => sendMessage(text, { openDrawer: false })} onNewChat={() => setMessages([])} />; return <LandingPage onNavigate={navigate} /> }
  const isLanding = route === '/home'
  const isTools = route === '/tools'
  const isAdminRoute = route === '/admin'
  const isFullBleed = isLanding
  const siteBackground = theme === 'dark' && backgroundPreference !== 'custom' ? 'starfield' : (backgroundPreference === 'follow' ? 'campus' : backgroundPreference)
  return <div className={`app-shell ${isLanding ? 'landing-shell' : ''} ${isTools ? 'tools-shell' : ''} ${isAdminRoute ? 'admin-shell' : ''} ${!isLanding ? 'site-background-shell' : ''} site-bg-${siteBackground}`} style={{ '--site-background-image': backgroundImage ? `url(${backgroundImage})` : 'none' } as React.CSSProperties}>{!isFullBleed && <Navbar route={route} theme={theme} onTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} onSearch={() => setCommandOpen(true)} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />}<main className={`${isFullBleed ? 'full-bleed-main' : ''} ${isTools ? 'tools-main' : ''}`}><AnimatePresence mode="wait"><motion.div key={route} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }}>{renderPage()}</motion.div></AnimatePresence></main>{!isFullBleed && !isAdminRoute && <footer className="site-footer"><div><a href="#/home" className="brand footer-brand"><img className="brand-logo" src="./assets/college-logo-cropped.png" alt="南昌航空大学科技学院校徽" /><span className="brand-copy"><strong>南昌航空大学科技学院</strong><small>计算机科技小组 · Computer Science Club</small></span></a><p>学习 → 实践 → 传承。让每一届的知识都留下来。</p></div><div className="footer-links"><a href="#/members">关于我们</a><a href="#/members">加入我们</a><a href="#/resources">贡献指南</a><a href="#/home">隐私政策</a></div><span className="copyright">© 2026 南昌航空大学科技学院计算机科技小组</span></footer>}{!isFullBleed && !isAdminRoute && <button className="floating-ai" onClick={() => setAiOpen(true)} aria-label="打开 AI 助手"><Bot size={21} /></button>}<AiDrawer open={aiOpen && !isLanding} onClose={() => setAiOpen(false)} messages={messages} onSend={sendMessage} /><CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={navigate} /><OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} onNavigate={navigate} /></div>
}

export default App
