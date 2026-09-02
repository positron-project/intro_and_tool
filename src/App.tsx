import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Camera,
  CalendarDays,
  Check,
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
  FileText,
  Filter,
  Folder,
  Github,
  History,
  Home,
  ImagePlus,
  LayoutDashboard,
  Map,
  Menu,
  MessageCircle,
  Moon,
  PanelLeft,
  Quote,
  Rocket,
  Route,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Target,
  Terminal,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import {
  announcements,
  citations,
  competitionEvents,
  growthStats,
  interviews,
  learningNodes,
  members,
  projects,
  prompts,
  resources,
  starterMessages,
} from './data/mock'
import type { AIMessage, AnnouncementCategory, LearningNode, Project, Resource } from './types'

type Theme = 'light' | 'dark'

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

function routeFromHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/home'
  return raw.replace(/\/$/, '') || '/home'
}

function navigate(path: string) {
  window.location.hash = path.startsWith('#') ? path.slice(1) : path
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('club-theme') as Theme | null
    return stored === 'dark' || stored === 'light' ? stored : 'light'
  } catch {
    return 'light'
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
          <button className="profile-button" aria-label="打开个人菜单"><Avatar initials="ZY" size="sm" /><ChevronDown size={14} /></button>
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

function AnnouncementPanel() {
  return <section className="panel announcements-panel"><SectionHeading eyebrow="LIVE / CAMPUS" title="最新公告" action="查看全部" onAction={() => navigate('#/events')} /><div className="announcement-list">{announcements.map((item) => <button className="announcement-row" key={item.id}><span className={`category-badge ${categoryClass[item.category]}`}>{item.category}</span><span className="announcement-main"><strong>{item.title}</strong><small>{item.detail}</small></span><time>{item.date}</time></button>)}</div></section>
}

function ProjectVisual({ project, compact = false }: { project: Project; compact?: boolean }) {
  const accent = project.accent
  return <div className={`project-visual visual-${accent} ${compact ? 'compact' : ''}`}><div className="visual-noise" /><span className="visual-icon"><Icon name={project.icon} size={compact ? 21 : 28} /></span><div className="visual-lines"><i /><i /><i /><i /></div><span className="visual-code">{project.category === 'AI' ? 'retrieval.graph()' : project.category === 'Web' ? 'ship — iterate' : 'reserve.lab()'}</span></div>
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: (project: Project) => void }) {
  return <motion.article className="project-card" whileHover={{ y: -3 }} transition={{ duration: 0.18 }} onClick={() => onOpen(project)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(project)}><ProjectVisual project={project} /><div className="project-card-body"><div className="project-card-top"><Tag tone={project.status === '招募中' ? 'mint' : project.status === '维护中' ? 'blue' : 'neutral'}>{project.status}</Tag><span className="project-year">{project.year}</span></div><h3>{project.name}</h3><p>{project.description}</p><div className="project-tags">{project.stack.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div><div className="project-meta"><span><Users size={14} /> {project.members} 人</span><span><Star size={14} /> {project.stars}</span><span className="project-arrow"><ArrowUpRight size={15} /></span></div></div></motion.article>
}

function FeaturedProjects({ onOpen }: { onOpen: (project: Project) => void }) {
  const [start, setStart] = useState(0)
  const visible = projects.filter((item) => item.featured)
  const selected = [0, 1, 2].map((offset) => visible[(start + offset) % visible.length])
  return <section className="panel featured-panel"><div className="section-heading"><div><p className="eyebrow">CURATED BY MEMBERS</p><h2><span className="title-spark">✦</span> 推荐项目</h2></div><div className="carousel-actions"><button className="icon-button small" onClick={() => setStart((start - 1 + visible.length) % visible.length)} aria-label="上一个项目"><ChevronLeft size={16} /></button><button className="icon-button small" onClick={() => setStart((start + 1) % visible.length)} aria-label="下一个项目"><ChevronRight size={16} /></button></div></div><div className="project-grid">{selected.map((project) => <ProjectCard key={`${project.id}-${start}`} project={project} onOpen={onOpen} />)}</div></section>
}

function ClubDirections() {
  const directions = [
    { label: '算法组', count: '6 人', description: '算法训练 · 竞赛 · 模型实践', icon: Target, tone: 'blue' },
    { label: '项目组', count: '7 人', description: '产品开发 · 协作交付 · 作品沉淀', icon: Rocket, tone: 'violet' },
  ]

  return <section className="panel direction-panel"><SectionHeading eyebrow="TEAM MAP / 2029" title="小组方向" action="了解风采" onAction={() => navigate('#/members')} /><div className="direction-list">{directions.map(({ label, count, description, icon: DirectionIcon, tone }) => <button className="direction-row" key={label} onClick={() => navigate('#/members')}><span className={`direction-icon direction-${tone}`}><DirectionIcon size={17} /></span><span className="direction-copy"><strong>{label}</strong><small>{description}</small></span><span className="direction-count">{count}</span><ArrowUpRight size={14} className="direction-arrow" /></button>)}</div><div className="direction-footer"><span><Users size={14} /> 第四代 · 2029 届</span><button className="text-button" onClick={() => navigate('#/members')}>查看小组风采 <ArrowRight size={14} /></button></div></section>
}

function RecentUpdates() {
  const updates = [{ title: 'FastAPI 学习路线', date: '05-15', icon: 'route', accent: 'blue' }, { title: 'Docker 从入门到实践', date: '05-14', icon: 'terminal', accent: 'mint' }, { title: 'LangChain 中文文档整理', date: '05-13', icon: 'book', accent: 'violet' }]
  return <section className="panel updates-panel"><SectionHeading eyebrow="KNOWLEDGE LOG" title="最近更新" action="查看全部" onAction={() => navigate('#/resources')} /><div className="update-list">{updates.map((item) => <button className="update-row" key={item.title} onClick={() => navigate('#/resources')}><span className={`update-icon accent-${item.accent}`}><Icon name={item.icon} size={16} /></span><strong>{item.title}</strong><time>{item.date}</time></button>)}</div></section>
}

function GrowthStats() {
  return <section className="growth-section"><SectionHeading eyebrow="SINCE 2021" title="我们的成长" /><div className="growth-grid">{growthStats.map((item) => <div className={`growth-stat stat-${item.accent}`} key={item.label}><span className="growth-icon"><Icon name={item.icon} size={17} /></span><strong>{item.value}</strong><span>{item.label}</span><small>{item.note}</small></div>)}</div></section>
}

function QuoteCard() {
  return <aside className="quote-card"><Quote size={22} /><p>“代码是写给人看的，附带能在机器上运行。”</p><span>— Harold Abelson</span><div className="quote-mark">/ 今日名言</div></aside>
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

function HomePage({ onNavigate, onOnboarding, onOpenProject }: { onNavigate: (path: string) => void; onOnboarding: () => void; onOpenProject: (project: Project) => void }) {
  return <div className="page home-page"><Hero onNavigate={onNavigate} onOnboarding={onOnboarding} /><div className="dashboard-grid"><div className="dashboard-main"><AnnouncementPanel /><FeaturedProjects onOpen={onOpenProject} /><GrowthStats /></div><div className="dashboard-side"><ClubDirections /><RecentUpdates /><QuoteCard /></div></div></div>
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-intro-action">{action}</div>}</div>
}

function LearningPage({ onOpenProject }: { onOpenProject: (project: Project) => void }) {
  const [active, setActive] = useState('PyAgent')
  const tracks = ['PyAgent', '前端', '后端', '算法', '人工智能', 'Java', 'DevOps']
  return <div className="page learning-page"><PageIntro eyebrow="LEARNING OS / 01" title="学习路线" description="选择你的技术方向，从基础走向真实项目。" action={<button className="secondary-button"><Settings2 size={16} /> 自定义路线</button>} /><div className="learning-layout"><aside className="track-sidebar"><div className="sidebar-label">TECH TRACKS</div>{tracks.map((track, index) => <button key={track} className={`track-button ${active === track ? 'active' : ''}`} onClick={() => setActive(track)}><span className="track-number">0{index + 1}</span>{track}{active === track && <ChevronRight size={15} />}</button>)}<div className="sidebar-tip"><Sparkles size={16} /><strong>给下一步留一点空间</strong><span>路线是参考地图，学习内容可以来自你信任的平台。</span></div></aside><main className="roadmap-wrap"><div className="roadmap-topline"><div><span className="live-dot" /> {active} · 进阶路径</div><span>{learningNodes.length} 个学习节点</span></div><div className="roadmap"><div className="roadmap-line" />{learningNodes.map((node, index) => <LearningNodeCard key={node.id} node={node} index={index} onOpenProject={onOpenProject} />)}</div></main><aside className="learning-aside"><section className="panel route-guide"><p className="eyebrow">ROUTE GUIDE</p><h3>把路线当作地图</h3><p>按自己的节奏选择课程、资源和项目，不记录个人完成度。</p><div className="route-guide-steps"><span><b>01</b>基础</span><span><b>02</b>实践</span><span><b>03</b>交付</span></div></section><section className="panel next-project"><p className="eyebrow">PROJECT ENTRY</p><div className="next-project-icon"><Rocket size={20} /></div><h3>校园 AI 智能助手</h3><p>从一个真实项目开始，把路线里的知识带进协作。</p><button className="text-button" onClick={() => onOpenProject(projects[0])}>查看项目入口 <ArrowRight size={14} /></button></section></aside></div></div>
}

function LearningNodeCard({ node, index, onOpenProject }: { node: LearningNode; index: number; onOpenProject: (project: Project) => void }) {
  return <motion.div className="learning-node" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}><div className="node-marker"><span>{String(index + 1).padStart(2, '0')}</span></div><div className="node-card"><div className="node-card-heading"><div><span className="node-status">学习节点 {String(index + 1).padStart(2, '0')}</span><h3>{node.title}</h3></div><span className="node-duration"><Clock3 size={13} /> {node.duration}</span></div><p>{node.description}</p><div className="node-card-meta"><span><BookOpen size={14} /> {node.resources} 个资源</span><span><Rocket size={14} /> {node.projects} 个相关项目</span>{node.id === 'fastapi' && <button className="project-entry" onClick={() => onOpenProject(projects[0])}><Rocket size={13} /> 项目入口 <ArrowUpRight size={13} /></button>}</div></div></motion.div>
}

function FilterBar({ search, setSearch, filters, activeFilter, setActiveFilter }: { search: string; setSearch: (value: string) => void; filters: string[]; activeFilter: string; setActiveFilter: (value: string) => void }) {
  return <div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索项目..." aria-label="搜索" /></div><div className="filter-pills">{filters.map((filter) => <button key={filter} className={`filter-pill ${activeFilter === filter ? 'active' : ''}`} onClick={() => setActiveFilter(filter)}>{filter}</button>)}</div><button className="filter-sort"><Filter size={15} /> 最新 <ChevronDown size={14} /></button></div>
}

function ProjectsPage({ onOpenProject }: { onOpenProject: (project: Project) => void }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部')
  const filtered = projects.filter((p) => (filter === '全部' || p.category === filter) && `${p.name}${p.description}${p.stack.join('')}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page listing-page"><PageIntro eyebrow="PROJECT OS / 02" title="项目库" description="探索历届优秀项目，在真实实践中成长。" action={<button className="primary-button" onClick={() => onOpenProject(projects[0])}>提交项目 <ArrowUpRight size={16} /></button>} /><FilterBar search={search} setSearch={setSearch} filters={['全部', 'AI', 'Web', 'Backend', 'Algorithm', 'Tools']} activeFilter={filter} setActiveFilter={setFilter} /><div className="listing-grid">{filtered.map((project) => <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />)}</div>{filtered.length === 0 && <div className="empty-state"><CircleHelp size={28} /><strong>没有找到匹配的项目</strong><span>试试更短的关键词，或者换一个方向。</span></div>}</div>
}

function EventsPage() {
  return <div className="page listing-page events-page"><PageIntro eyebrow="COMPETITION HUB / 08" title="比赛中心" description="把学习带进赛场，在一次次交付里找到自己的节奏。" action={<button className="secondary-button"><CalendarDays size={16} /> 加入赛事提醒</button>} /><div className="event-banner"><div><p className="eyebrow">UP NEXT</p><h2>本学期，和队友一起交付一次。</h2><p>从练习题到一个完整 Demo，比赛会让你的能力变得可见。</p></div><Trophy size={65} /></div><div className="event-grid">{competitionEvents.map((event) => <article className={`event-card event-${event.accent}`} key={event.id}><div className="event-card-top"><Tag tone={event.status === '报名中' ? 'mint' : 'violet'}>{event.status}</Tag><span>{event.type}</span></div><div className="event-date"><strong>{event.date.split('.')[0]}</strong><span>．{event.date.split('.')[1]}<small>2026</small></span></div><h3>{event.title}</h3><p>{event.description}</p><div className="event-meta"><span><Clock3 size={13} /> {event.deadline}</span><button className="text-button">查看详情 <ArrowUpRight size={13} /></button></div></article>)}</div></div>
}

function ProjectDetailPage({ project, onNavigate }: { project: Project; onNavigate: (path: string) => void }) {
  return <div className="page project-detail-page"><button className="back-link" onClick={() => onNavigate('#/projects')}><ChevronLeft size={16} /> 返回项目库</button><div className="detail-hero"><div><div className="detail-kicker"><Tag tone="mint">{project.status}</Tag><span>{project.year} · {project.category}</span></div><h1>{project.name}</h1><p>{project.description}。这是一个由不同届成员共同维护的真实项目，欢迎从一个 Issue 开始认识它。</p><div className="detail-actions"><button className="primary-button"><Github size={16} /> 查看 GitHub</button><button className="secondary-button"><FileText size={16} /> 项目文档</button></div></div><ProjectVisual project={project} /></div><div className="detail-grid"><main><section className="panel detail-section"><SectionHeading eyebrow="PROJECT STORY" title="项目介绍" /><p className="prose">校园 AI 智能助手将小组历届沉淀的通知、路线与项目文档组织成可检索的知识空间。每一次贡献都会被记录，下一届可以从真实的上下文里继续前进。</p><div className="detail-tags">{project.stack.map((tag) => <Tag tone="blue" key={tag}>{tag}</Tag>)}</div></section><section className="panel detail-section"><SectionHeading eyebrow="PROJECT HISTORY" title="项目族谱" /><div className="project-timeline"><div className="timeline-item"><span className="timeline-year">2024</span><div><strong>校园问答 v1</strong><span>关键词检索 · Vue · Flask</span></div></div><div className="timeline-item"><span className="timeline-year">2025</span><div><strong>RAG v2</strong><span>向量检索 · FastAPI · PostgreSQL</span></div></div><div className="timeline-item active"><span className="timeline-year">2026</span><div><strong>Agent v3 <Tag tone="violet">进行中</Tag></strong><span>LangGraph · 工具调用 · 评测集</span></div></div></div></section><section className="panel detail-section"><SectionHeading eyebrow="SHIP LOG" title="开发日志" action="查看全部" /><div className="log-row"><span className="log-date">05-16</span><strong>新增校园地点检索工具</strong><span className="log-author"><Avatar initials="HY" size="sm" /> 何宇辰</span></div><div className="log-row"><span className="log-date">05-12</span><strong>完成回答引用卡片</strong><span className="log-author"><Avatar initials="ZY" size="sm" /> 周一帆</span></div></section></main><aside className="detail-aside"><section className="panel match-card"><p className="eyebrow">你的项目匹配度</p><div className="match-score"><strong>72%</strong><span>适合现在加入</span></div><div className="skill-bars"><SkillBar label="Python" value={80} tone="mint" /><SkillBar label="FastAPI" value={60} tone="blue" /><SkillBar label="RAG" value={70} tone="violet" /><SkillBar label="Vue" value={30} tone="orange" /><SkillBar label="Docker" value={40} tone="rose" /></div><div className="match-copy"><strong>你已经掌握</strong><div><Tag tone="mint">Python</Tag><Tag tone="mint">FastAPI</Tag></div><strong>建议补充</strong><div><Tag tone="orange">RAG</Tag><Tag tone="orange">Docker</Tag></div></div><button className="primary-button full-button" onClick={() => onNavigate('#/learning')}>生成学习计划 <ArrowRight size={15} /></button></section><section className="panel team-card"><p className="eyebrow">PROJECT CREW</p><div className="team-avatars"><Avatar initials="LZ" accent="blue" /><Avatar initials="HY" accent="orange" /><Avatar initials="ZY" accent="violet" /><span>+9</span></div><strong>12 位成员正在协作</strong><small>前端 · 后端 · 算法 · 产品</small><button className="secondary-button full-button">申请加入</button></section></aside></div></div>
}

function SkillBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="skill-bar"><div><span>{label}</span><strong>{value}%</strong></div><span className="bar-track"><i className={`bar-${tone}`} style={{ width: `${value}%` }} /></span></div>
}

function ResourcesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部')
  const filters = ['全部', '前端', '后端', '算法', 'Python', 'AI', 'Agent', '数据库', 'DevOps']
  const visible = resources.filter((item) => (filter === '全部' || item.category === filter) && `${item.title}${item.description}${item.tags.join('')}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page listing-page"><PageIntro eyebrow="KNOWLEDGE BASE / 03" title="资源库" description="学习资料、路线与实践文档，来自每一届成员的真实积累。" action={<button className="secondary-button" onClick={() => onNavigate('#/resources/prompts')}><Sparkles size={16} /> Prompt 模板库</button>} /><div className="filter-bar"><div className="filter-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索资源、标签..." aria-label="搜索资源" /></div><div className="filter-pills">{filters.map((f) => <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}</div><button className="filter-sort"><Filter size={15} /> 热门 <ChevronDown size={14} /></button></div><div className="resource-list">{visible.map((item) => <ResourceRow key={item.id} resource={item} />)}</div>{visible.length === 0 && <div className="empty-state"><CircleHelp size={28} /><strong>还没有这类资源</strong><span>换个关键词，或者向小组贡献一份吧。</span></div>}</div>
}

function ResourceRow({ resource }: { resource: Resource }) {
  return <article className="resource-row"><span className={`resource-icon accent-${resource.accent}`}><Icon name={resource.type === '学习路线' ? 'route' : resource.type === 'GitHub' ? 'code' : 'file'} size={18} /></span><div className="resource-main"><div className="resource-title-line"><h3>{resource.title}</h3><Tag tone="blue">{resource.type}</Tag></div><p>{resource.description}</p><div className="resource-meta"><span>{resource.category}</span>{resource.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}<span>由 {resource.author} 更新</span></div></div><div className="resource-stats"><span><Clock3 size={14} /> {resource.updated}</span><span><Users size={14} /> {resource.views.toLocaleString()}</span><button className="icon-button small" aria-label={`打开 ${resource.title}`}><ArrowUpRight size={15} /></button></div></article>
}

function PromptsPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const copyPrompt = async (prompt: string, id: string) => { try { await navigator.clipboard.writeText(prompt) } catch { /* clipboard may be unavailable in preview */ } setCopied(id); window.setTimeout(() => setCopied(null), 1600) }
  return <div className="page listing-page"><PageIntro eyebrow="PROMPT LIBRARY / 04" title="Prompt 模板库" description="把好问题保存下来，让每一次思考都更接近答案。" action={<button className="primary-button"><Copy size={16} /> 提交模板</button>} /><div className="prompt-categories">{['全部', '编程', '代码 Review', 'Debug', '学习', '论文', '数据分析', 'Agent'].map((item, index) => <button className={index === 0 ? 'active' : ''} key={item}>{item}</button>)}</div><div className="prompt-grid">{prompts.map((prompt) => <article className="prompt-card" key={prompt.id}><div className="prompt-card-head"><Tag tone="violet">{prompt.category}</Tag><span>{prompt.model}</span></div><h3>{prompt.title}</h3><p>{prompt.usage}</p><div className="prompt-preview"><span>›</span>{prompt.preview}</div><button className={`secondary-button copy-button ${copied === prompt.id ? 'copied' : ''}`} onClick={() => copyPrompt(prompt.preview, prompt.id)}>{copied === prompt.id ? <><Check size={15} /> 已复制</> : <><Copy size={15} /> 复制 Prompt</>}</button></article>)}</div></div>
}

function InterviewsPage() {
  return <div className="page listing-page"><PageIntro eyebrow="INTERVIEW WALL / 05" title="面经墙" description="把一次面试的经验，变成下一次更从容的准备。" action={<button className="primary-button"><MessageCircle size={16} /> 分享一篇面经</button>} /><div className="interview-filters"><button className="filter-pill active">全部</button><button className="filter-pill">实习</button><button className="filter-pill">校招</button><button className="filter-pill">前端</button><button className="filter-pill">后端</button><button className="filter-pill">AI</button><span className="filter-spacer" /><button className="filter-sort"><Filter size={15} /> 最新</button></div><div className="interview-list">{interviews.map((item) => <article className="interview-card" key={item.id}><div className="company-logo">{item.company.slice(0, 1)}</div><div className="interview-main"><div className="interview-title"><h3>{item.company} · {item.role}</h3><Tag tone={item.difficulty === '困难' ? 'red' : item.difficulty === '中等' ? 'orange' : 'mint'}>{item.difficulty}</Tag></div><p>{item.summary}</p><div className="interview-meta"><span><Avatar initials={item.author.slice(0, 2)} size="sm" /> {item.author} · {item.cohort}</span><span>{item.date}</span><span>{item.rounds} 轮面试</span>{item.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div></div><button className="icon-button small" aria-label="打开面经"><ArrowUpRight size={16} /></button></article>)}</div></div>
}

type CohortMember = { id: string; name: string; role: '组长' | '负责人' | '组员'; direction: string; initials: string; accent: string }
type CohortTeam = { id: 'algorithm' | 'project'; name: string; count: number; description: string; accent: string; members: CohortMember[] }
type CohortConfig = { year: string; memberLabel: string; teamCount?: number }

const currentCohortYear = '2029'

// 届次是独立配置：以后新增一届时，在这里追加一项即可，时间轴和合影墙会自动读取。
const cohortCatalog: CohortConfig[] = [
  { year: '2026', memberLabel: '人数待补充' },
  { year: '2027', memberLabel: '人数待补充' },
  { year: '2028', memberLabel: '人数待补充' },
  { year: '2029', memberLabel: '13 人', teamCount: 2 },
]
const cohortYears = cohortCatalog
  .map((cohort) => cohort.year)
  .sort((a, b) => Number(b) - Number(a))
const cohortArchiveMeta: Record<string, string> = cohortCatalog.reduce((result, cohort) => {
  result[cohort.year] = cohort.memberLabel
  return result
}, {} as Record<string, string>)
const cohortTeams: CohortTeam[] = [
  {
    id: 'algorithm',
    name: '算法组',
    count: 6,
    description: '用算法、模型与实验，把问题拆成可验证的答案。',
    accent: 'violet',
    members: [
      { id: 'algorithm-lead', name: '算法组长', role: '组长', direction: '方向规划 · 代码评审', initials: '组长', accent: 'violet' },
      { id: 'algorithm-owner', name: '算法负责人', role: '负责人', direction: '模型实验 · 资料沉淀', initials: '负责', accent: 'blue' },
      { id: 'algorithm-member-1', name: '算法组员 01', role: '组员', direction: 'Python · 机器学习', initials: '01', accent: 'mint' },
      { id: 'algorithm-member-2', name: '算法组员 02', role: '组员', direction: '数据分析 · 评测', initials: '02', accent: 'orange' },
      { id: 'algorithm-member-3', name: '算法组员 03', role: '组员', direction: '深度学习 · 复现', initials: '03', accent: 'rose' },
      { id: 'algorithm-member-4', name: '算法组员 04', role: '组员', direction: 'Agent · Prompt', initials: '04', accent: 'blue' },
    ],
  },
  {
    id: 'project',
    name: '项目组',
    count: 7,
    description: '把想法推到真实场景，负责协作、交付和持续迭代。',
    accent: 'blue',
    members: [
      { id: 'project-lead', name: '项目组长', role: '组长', direction: '项目规划 · 协作推进', initials: '组长', accent: 'blue' },
      { id: 'project-owner', name: '项目负责人', role: '负责人', direction: '需求拆解 · 发布管理', initials: '负责', accent: 'mint' },
      { id: 'project-member-1', name: '项目组员 01', role: '组员', direction: '前端工程 · 交互', initials: '01', accent: 'violet' },
      { id: 'project-member-2', name: '项目组员 02', role: '组员', direction: '后端服务 · API', initials: '02', accent: 'orange' },
      { id: 'project-member-3', name: '项目组员 03', role: '组员', direction: '测试 · 文档', initials: '03', accent: 'rose' },
      { id: 'project-member-4', name: '项目组员 04', role: '组员', direction: '部署 · 运维', initials: '04', accent: 'blue' },
      { id: 'project-member-5', name: '项目组员 05', role: '组员', direction: '视觉 · 内容', initials: '05', accent: 'mint' },
    ],
  },
]

const cohortTeamsByYear: Record<string, CohortTeam[]> = { [currentCohortYear]: cohortTeams }

const cohortPhotoStorageKey = 'nchu-cs-club-cohort-photos'
function getStoredCohortPhotos(): Record<string, string> {
  try {
    const raw = localStorage.getItem(cohortPhotoStorageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {}
  } catch {
    return {}
  }
}

function PhotoArchivePage() {
  const [photos] = useState<Record<string, string>>(getStoredCohortPhotos)

  return <div className="page archive-page">
    <PageIntro eyebrow="PEOPLE / 06 · ARCHIVE" title="历届合影" description="把每一届的共同记忆留在同一面照片墙里，随时回看小组一路走来的足迹。" action={<button className="secondary-button" onClick={() => navigate('#/members')}><ChevronLeft size={16} /> 返回小组风采</button>} />
    <section className="photo-archive archive-page-panel">
      <div className="archive-heading"><div><p className="eyebrow">PHOTO ARCHIVE</p><h2>每一届，都值得被记住</h2><p>照片由管理员整理维护，后续可以持续补充。</p></div><span><ShieldCheck size={14} /> 登录后由管理员维护</span></div>
      <div className="archive-grid">{cohortYears.map((year) => <article className="archive-card" key={year}>{photos[year] ? <img src={photos[year]} alt={`${year}届历届合影`} /> : <div className="archive-empty"><Camera size={28} /><span>暂无合影</span></div>}<div className="archive-card-meta"><strong>{year} 届</strong><span>· {cohortArchiveMeta[year]}</span></div></article>)}</div>
    </section>
  </div>
}

function MembersPage() {
  const [cohort, setCohort] = useState(currentCohortYear)
  const [activeTeam, setActiveTeam] = useState<CohortTeam['id']>('algorithm')
  const [photos] = useState<Record<string, string>>(getStoredCohortPhotos)
  const selectedPhoto = photos[cohort]
  const selectedCohort = cohortCatalog.find((item) => item.year === cohort) ?? cohortCatalog[0]
  const selectedTeams = cohortTeamsByYear[cohort] ?? []
  const selectedTeam = selectedTeams.find((team) => team.id === activeTeam)
  const selectedMemberCount = selectedTeams.reduce((total, team) => total + team.count, 0)

  return <div className="page members-page members-page-redesign">
     <PageIntro eyebrow="PEOPLE / 06" title="小组风采" description="按届次认识一起写代码、做项目、把经验交给下一届的人。" action={<button className="secondary-button" onClick={() => navigate('#/members/archive')}><ImagePlus size={16} /> 历届合影</button>} />
    <div className="members-layout">
      <aside className="cohort-rail" aria-label="届次选择">
        <div className="cohort-rail-list">{cohortYears.map((year) => <button key={year} className={cohort === year ? 'active' : ''} onClick={() => setCohort(year)} aria-current={cohort === year ? 'page' : undefined}><span>{year}届</span></button>)}</div>
      </aside>
      <div className="members-content">
        <section className="cohort-showcase">
          <div className="cohort-showcase-copy"><p className="eyebrow">{cohort} COHORT</p><h2>{cohort} 届成员档案</h2><p>这一届的成员资料和合影正在由管理员整理，欢迎补充属于这一届的记录。</p><div className="cohort-stat-line"><span><strong>{selectedCohort.memberLabel}</strong>成员</span><i /><span><strong>{selectedCohort.teamCount ?? (selectedTeams.length || '—')}</strong>技术组</span><i /><span><strong>{selectedPhoto ? '已上传' : '待上传'}</strong>合影</span></div></div>
          <div className={`cohort-photo-frame ${selectedPhoto ? 'has-photo' : ''}`}>{selectedPhoto ? <><img src={selectedPhoto} alt={`${cohort}届小组合影`} /><div className="cohort-photo-overlay"><span>{cohort} 届 · 合影</span></div></> : <div className="cohort-photo-empty"><span className="photo-empty-icon"><Camera size={25} /></span><strong>还没有 {cohort} 届合影</strong><span>合影正在由管理员整理，敬请期待。</span></div>}</div>
        </section>

        {selectedTeams.length > 0 ? <section className="teams-section"><div className="teams-heading"><div><p className="eyebrow">{cohort} · TEAMS</p><h2>两支小组，协作完成一件事</h2></div><span>共 {selectedMemberCount} 位成员</span></div><div className="team-switcher">{selectedTeams.map((team) => <button key={team.id} className={activeTeam === team.id ? `active accent-${team.accent}` : ''} onClick={() => setActiveTeam(team.id)}><span><strong>{team.name}</strong><small>{team.description}</small></span><b>{team.count}<em>人</em></b><ChevronRight size={16} /></button>)}</div>{selectedTeam && <div className={`team-detail accent-${selectedTeam.accent}`}><div className="team-detail-head"><div><span className="team-detail-kicker"><i /> {selectedTeam.id === 'algorithm' ? 'ALGORITHM TRACK' : 'PROJECT TRACK'}</span><h3>{selectedTeam.name}</h3><p>{selectedTeam.description}</p></div><div className="team-role-counts"><span><strong>1</strong>组长</span><span><strong>1</strong>负责人</span><span><strong>{selectedTeam.count - 2}</strong>组员</span></div></div><div className="cohort-member-grid">{selectedTeam.members.map((member) => <article className="cohort-member-card" key={member.id}><Avatar initials={member.initials} accent={member.accent} size="md" /><div><strong>{member.name}</strong><span>{member.role}</span><small>{member.direction}</small></div><i className={`member-role-dot role-${member.role === '组长' ? 'lead' : member.role === '负责人' ? 'owner' : 'member'}`} /></article>)}</div></div>}</section> : <section className="cohort-data-empty"><div><span className="data-empty-icon"><Users size={22} /></span><h3>这一届的成员资料还在整理</h3><p>登录页面开放后，管理员可以补充成员分组和个人资料。</p></div></section>}

        <section className="letter-section members-letter"><div className="letter-copy"><p className="eyebrow">PASS IT ON</p><h2>把这一届的经验，留给下一届。</h2><p>“你不需要在大一就知道自己最终会去哪里，先和身边的人一起把一个项目做完。”</p><span>— 传承寄语 · 计算机科技小组</span></div><div className="letter-stamp"><span>TO</span><strong>NEXT<br />COHORT</strong><small>{cohort} → {String(Number(cohort) + 1)}</small></div></section>
      </div>
    </div>
  </div>
}

function AiPage({ messages, onSend }: { messages: AIMessage[]; onSend: (text: string) => void }) {
  const [input, setInput] = useState('')
  const send = () => { if (!input.trim()) return; onSend(input.trim()); setInput('') }
  return <div className="page ai-page"><div className="ai-layout"><aside className="ai-history panel"><div className="ai-history-head"><div><span className="eyebrow">AI WORKSPACE</span><h2>历史会话</h2></div><button className="icon-button small" aria-label="新建会话"><Sparkles size={16} /></button></div><button className="new-chat"><span><MessageCircle size={15} /> 新建会话</span><kbd>⌘ N</kbd></button><div className="history-group"><span>今天</span><button className="history-item active">FastAPI 学习建议</button><button className="history-item">项目匹配度分析</button></div><div className="history-group"><span>昨天</span><button className="history-item">蓝桥杯准备清单</button><button className="history-item">Agent 路线怎么选</button></div><div className="ai-history-footer"><Settings2 size={15} /> AI 助手设置</div></aside><main className="ai-chat panel"><div className="ai-chat-head"><div><div className="ai-title"><span className="ai-live-icon"><Bot size={17} /></span><strong>科技小组 AI 助手</strong><span className="online-status"><i /> 在线</span></div><small>连接学习路线、项目、资源与面经</small></div><button className="icon-button small"><PanelLeft size={16} /></button></div><div className="chat-stream">{messages.map((message) => <div className={`chat-message ${message.role}`} key={message.id}><div className="message-avatar">{message.role === 'assistant' ? <Bot size={16} /> : <Avatar initials="ZY" size="sm" />}</div><div className="message-content"><p>{message.content.split('\n').map((line) => <span key={line}>{line}<br /></span>)}</p>{message.citations && <CitationCard citations={message.citations} />}</div></div>)}<div className="suggestion-row"><button onClick={() => onSend('我现在能参加哪些项目？')}>我现在能参加哪些项目？ <ArrowUpRight size={13} /></button><button onClick={() => onSend('如何学习 FastAPI？')}>如何学习 FastAPI？ <ArrowUpRight size={13} /></button><button onClick={() => onSend('有没有 Java 后端面经？')}>有没有 Java 后端面经？ <ArrowUpRight size={13} /></button></div></div><div className="chat-composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="问问科技小组 AI...（Enter 发送，Shift + Enter 换行）" rows={1} /><button className="send-button" onClick={send} aria-label="发送"><Send size={17} /></button></div></main></div></div>
}

function CitationCard({ citations: sourceList }: { citations: typeof citations }) {
  return <div className="citation-card"><div className="citation-heading"><span><BookOpen size={14} /> 参考资料</span><span>RAG SOURCES</span></div>{sourceList.map((source, index) => <button key={source.id} onClick={() => navigate(source.path)}><span className="citation-index">[{index + 1}]</span><span><strong>{source.title}</strong><small>{source.type}</small></span><ArrowUpRight size={14} /></button>)}</div>
}

function AiDrawer({ open, onClose, messages, onSend }: { open: boolean; onClose: () => void; messages: AIMessage[]; onSend: (text: string) => void }) {
  const [input, setInput] = useState('')
  const send = () => { if (!input.trim()) return; onSend(input.trim()); setInput('') }
  return <AnimatePresence>{open && <><motion.div className="drawer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} /><motion.aside className="ai-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.24, ease: 'easeOut' }}><div className="drawer-head"><div className="ai-title"><span className="ai-live-icon"><Bot size={16} /></span><strong>AI 助手</strong><span className="online-status"><i /> 在线</span></div><button className="icon-button small" onClick={onClose} aria-label="关闭 AI 助手"><X size={17} /></button></div><div className="drawer-body">{messages.slice(-3).map((message) => <div className={`drawer-message ${message.role}`} key={message.id}><span className="drawer-avatar">{message.role === 'assistant' ? <Bot size={15} /> : '你'}</span><div><p>{message.content}</p>{message.citations && <CitationCard citations={message.citations.slice(0, 2)} />}</div></div>)}<div className="drawer-suggestions"><span>试试这样问</span><button onClick={() => onSend('我现在能参加哪些项目？')}>我现在能参加哪些项目？</button><button onClick={() => onSend('给我一条后端学习建议')}>给我一条后端学习建议</button></div></div><div className="drawer-composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="问问科技小组 AI..." rows={1} /><button onClick={send} aria-label="发送"><Send size={16} /></button><small>回答会标注可追溯的参考资料</small></div></motion.aside></>}</AnimatePresence>
}

function CommandPalette({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (path: string) => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const commands = useMemo(() => [...navItems.map((item) => ({ label: item.label, hint: '页面', path: item.href })), { label: '校园 AI 智能助手', hint: '项目', path: '#/projects/ai-campus' }, { label: 'FastAPI 学习路线', hint: '资源', path: '#/resources' }, { label: '学长的一封信', hint: '传承', path: '#/members' }], [])
  const results = commands.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
  useEffect(() => { if (open) { setQuery(''); window.setTimeout(() => inputRef.current?.focus(), 30) } }, [open])
  useEffect(() => { if (!open) return; const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); if (event.key === 'Enter' && results[0]) { onNavigate(results[0].path); onClose() } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [open, onClose, onNavigate, results])
  return <AnimatePresence>{open && <><motion.div className="command-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} /><motion.div className="command-palette" initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}><div className="command-input"><Search size={18} /><input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索路线、项目、资源、成员..." /><kbd>ESC</kbd></div><div className="command-results">{results.length ? results.map((item, index) => <button className={`command-item ${index === 0 ? 'selected' : ''}`} key={`${item.label}-${item.path}`} onClick={() => { onNavigate(item.path); onClose() }}><span className="command-item-icon"><Compass size={16} /></span><span><strong>{item.label}</strong><small>{item.hint}</small></span><ArrowUpRight size={14} /></button>) : <div className="command-empty"><CircleHelp size={20} /> 没有找到匹配内容</div>}</div><div className="command-footer"><span><kbd>↑↓</kbd> 选择</span><span><kbd>↵</kbd> 打开</span><span><kbd>esc</kbd> 关闭</span></div></motion.div></>}</AnimatePresence>
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
  const [route, setRoute] = useState(routeFromHash())
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [messages, setMessages] = useState<AIMessage[]>(starterMessages)
  useEffect(() => { const updateRoute = () => { setRoute(routeFromHash()); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }; window.addEventListener('hashchange', updateRoute); return () => window.removeEventListener('hashchange', updateRoute) }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('club-theme', theme) } catch { /* file:// privacy modes may disable storage */ } }, [theme])
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true) } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [])
  const openProject = (project: Project) => navigate(`#/projects/${project.slug}`)
  const sendMessage = (text: string) => { const userMessage: AIMessage = { id: `u-${Date.now()}`, role: 'user', content: text }; const assistant: AIMessage = { id: `a-${Date.now()}`, role: 'assistant', content: text.includes('项目') ? '结合你选择的方向，可以先从校园 AI 智能助手的前端协作任务开始，再逐步参与接口联调。' : text.includes('FastAPI') ? '建议先用一周完成 Python 工程基础和 FastAPI 路由，再把知识放进一个小项目。路线里已经为你标记了项目入口。' : '我已经把这个问题拆进学习路线、项目和资源中。先选择一个方向，我们一起找到可执行的下一步。', citations }; setMessages((current) => [...current, userMessage, assistant]); setAiOpen(true) }
  const renderPage = () => { if (route === '/home') return <LandingPage onNavigate={navigate} />; if (route === '/tools') return <HomePage onNavigate={navigate} onOnboarding={() => setOnboardingOpen(true)} onOpenProject={openProject} />; if (route === '/learning') return <LearningPage onOpenProject={openProject} />; if (route === '/projects') return <ProjectsPage onOpenProject={openProject} />; if (route.startsWith('/projects/')) { const slug = route.split('/')[2]; return <ProjectDetailPage project={projects.find((item) => item.slug === slug) ?? projects[0]} onNavigate={navigate} /> }; if (route === '/events') return <EventsPage />; if (route === '/resources') return <ResourcesPage onNavigate={navigate} />; if (route === '/resources/prompts') return <PromptsPage />; if (route === '/interviews') return <InterviewsPage />; if (route === '/members/archive') return <PhotoArchivePage />; if (route === '/members') return <MembersPage />; if (route === '/ai') return <AiPage messages={messages} onSend={sendMessage} />; return <LandingPage onNavigate={navigate} /> }
  const isLanding = route === '/home'
  const isTools = route === '/tools'
  const isFullBleed = isLanding
  return <div className={`app-shell ${isLanding ? 'landing-shell' : ''} ${isTools ? 'tools-shell' : ''}`}>{!isFullBleed && <Navbar route={route} theme={theme} onTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} onSearch={() => setCommandOpen(true)} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />}<main className={`${isFullBleed ? 'full-bleed-main' : ''} ${isTools ? 'tools-main' : ''}`}><AnimatePresence mode="wait"><motion.div key={route} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }}>{renderPage()}</motion.div></AnimatePresence></main>{!isFullBleed && <footer className="site-footer"><div><a href="#/home" className="brand footer-brand"><img className="brand-logo" src="./assets/college-logo-cropped.png" alt="南昌航空大学科技学院校徽" /><span className="brand-copy"><strong>南昌航空大学科技学院</strong><small>计算机科技小组 · Computer Science Club</small></span></a><p>学习 → 实践 → 传承。让每一届的知识都留下来。</p></div><div className="footer-links"><a href="#/members">关于我们</a><a href="#/members">加入我们</a><a href="#/resources">贡献指南</a><a href="#/home">隐私政策</a></div><span className="copyright">© 2026 南昌航空大学科技学院计算机科技小组</span></footer>}{!isFullBleed && <button className="floating-ai" onClick={() => setAiOpen(true)} aria-label="打开 AI 助手"><Bot size={21} /></button>}<AiDrawer open={aiOpen && !isLanding} onClose={() => setAiOpen(false)} messages={messages} onSend={sendMessage} /><CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={navigate} /><OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} onNavigate={navigate} /></div>
}

export default App
