import { useState, useRef, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

interface SiteHeaderProps {
  onNavigate: (path: string) => void
  onScrollToSection?: (sectionId: string) => void
}

interface NavItem {
  key: string
  label: string
  href: string
  sectionId?: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: '首页', href: '#/home', sectionId: 'story-hero' },
  { key: 'projects', label: '项目', href: '#/projects', sectionId: 'story-projects' },
  { key: 'team', label: '团队', href: '#/members', sectionId: 'story-about' },
  { key: 'events', label: '活动', href: '#/events' },
  { key: 'about', label: '关于', href: '#/home', sectionId: 'story-about' },
]

export function SiteHeader({ onNavigate, onScrollToSection }: SiteHeaderProps) {
  const [activeKey, setActiveKey] = useState('home')
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 })
  const navContainerRef = useRef<HTMLDivElement>(null)
  const navItemRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const targetKey = hoverKey || activeKey

  useEffect(() => {
    const handleScroll = () => {
      const isPastTop = (window.scrollY || 0) > 20
      setScrolled(isPastTop)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const activeEl = navItemRefs.current.get(targetKey)
    const container = navContainerRef.current
    if (activeEl && container) {
      const containerRect = container.getBoundingClientRect()
      const itemRect = activeEl.getBoundingClientRect()
      // underline 长度适度短一点，约文字宽度的 70% 或居中短横线
      const underlineWidth = Math.max(28, itemRect.width * 0.68)
      const underlineLeft = itemRect.left - containerRect.left + (itemRect.width - underlineWidth) / 2
      setUnderlineStyle({ left: underlineLeft, width: underlineWidth })
    }
  }, [targetKey])

  const handleClick = (item: NavItem) => {
    setActiveKey(item.key)
    setMobileMenuOpen(false)
    if (item.sectionId && onScrollToSection && document.getElementById(item.sectionId)) {
      onScrollToSection(item.sectionId)
    } else {
      onNavigate(item.href)
    }
  }

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`} role="banner">
      <div className="site-header-inner">
        {/* 左侧代码符号 Logo 与名称 */}
        <div className="site-brand" onClick={() => handleClick(NAV_ITEMS[0])} role="button" tabIndex={0}>
          <span className="site-brand-symbol" aria-hidden="true">&lt;/&gt;</span>
          <span className="site-brand-name">计算机小组 · 项目组</span>
        </div>

        {/* 中间主要导航项 */}
        <nav className="site-nav" aria-label="主要导航" ref={navContainerRef}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeKey === item.key
            return (
              <button
                key={item.key}
                ref={(el) => {
                  if (el) navItemRefs.current.set(item.key, el)
                  else navItemRefs.current.delete(item.key)
                }}
                className={`site-nav-item ${isActive ? 'is-active' : ''}`}
                onClick={() => handleClick(item)}
                onMouseEnter={() => setHoverKey(item.key)}
                onMouseLeave={() => setHoverKey(null)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </button>
            )
          })}
          {/* 深蓝色滑动的短 underline */}
          <div
            className="site-nav-underline"
            style={{
              transform: `translateX(${underlineStyle.left}px)`,
              width: `${underlineStyle.width}px`,
            }}
            aria-hidden="true"
          />
        </nav>

        {/* 右侧品牌标语 */}
        <div className="site-slogan" aria-label="品牌标语">
          <span className="site-slogan-text">用代码 连接想法 · 用项目 创造价值</span>
        </div>

        {/* 移动端汉堡菜单按钮 */}
        <button
          className="site-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* 移动端抽屉导航 */}
      {mobileMenuOpen && (
        <div className="site-mobile-drawer">
          <nav className="site-mobile-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`site-mobile-item ${activeKey === item.key ? 'is-active' : ''}`}
                onClick={() => handleClick(item)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="site-mobile-slogan">
            用代码 连接想法 · 用项目 创造价值
          </div>
        </div>
      )}
    </header>
  )
}

