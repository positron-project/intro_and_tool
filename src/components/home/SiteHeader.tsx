import { useState, useRef, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

export interface StorySectionItem {
  id: string
  label: string
}

interface SiteHeaderProps {
  activeIndex?: number
  sections?: StorySectionItem[]
  onScrollToSection?: (sectionIndex: number) => void
  onNavigate?: (path: string) => void
}

const DEFAULT_SECTIONS: StorySectionItem[] = [
  { id: 'story-hero', label: '01 / 首页' },
  { id: 'story-about', label: '02 / 关于我们' },
  { id: 'story-offer', label: '03 / 能带来什么' },
  { id: 'story-picks', label: '04 / 小组推荐' },
  { id: 'story-blog', label: '05 / 小组博客' },
  { id: 'story-join', label: '06 / 加入我们' },
]

export function SiteHeader({
  activeIndex = 0,
  sections = DEFAULT_SECTIONS,
  onScrollToSection,
  onNavigate,
}: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const scrolledRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      const isPastTop = (window.scrollY || 0) > 20
      if (isPastTop === scrolledRef.current) return
      scrolledRef.current = isPastTop
      setScrolled(isPastTop)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`} role="banner">
      {/* 键盘与读屏支持：跳到主要内容 */}
      <a
        href="#story-about"
        className="skip-to-main-link"
        onClick={(e) => {
          e.preventDefault()
          onScrollToSection?.(1)
        }}
      >
        跳到主要内容
      </a>

      <div className="site-header-inner">
        {/* 左侧品牌区：改为语义化 <a> 标签 */}
        <a
          href="#/home"
          className="site-brand"
          onClick={(e) => {
            e.preventDefault()
            onScrollToSection?.(0)
            setMobileMenuOpen(false)
          }}
          aria-label="返回首页顶部"
        >
          <img
            className="site-brand-mark"
            src="./assets/brand-mark.svg"
            alt=""
            aria-hidden="true"
            draggable={false}
          />
          <span className="site-brand-lockup">
            <img
              className="site-brand-college"
              src="./assets/college-wordmark.svg"
              alt="南昌航空大学科技学院"
              draggable={false}
            />
            <span className="site-brand-rule" aria-hidden="true" />
            <span className="site-brand-name">计算机科技小组</span>
          </span>
        </a>

        {/* 中间区段导航（桌面端） */}
        <nav className="site-nav" aria-label="页面区段导航">
          {sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              className={`site-nav-item ${activeIndex === index ? 'is-active' : ''}`}
              onClick={() => onScrollToSection?.(index)}
              aria-current={activeIndex === index ? 'true' : undefined}
            >
              {section.label}
            </button>
          ))}
        </nav>

        {/* 右侧常驻主按钮与移动端切换 */}
        <div className="site-header-actions">
          <a
            href="#/tools"
            className="site-tools-btn"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault()
                onNavigate('#/tools')
              }
            }}
          >
            <span>进入工作台</span>
            <span className="site-tools-arrow" aria-hidden="true">→</span>
          </a>

          <button
            type="button"
            className="site-mobile-toggle"
            aria-label={mobileMenuOpen ? '关闭菜单' : '打开导航菜单'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* 移动端汉堡抽屉 */}
        {mobileMenuOpen && (
          <div className="site-mobile-drawer" role="navigation" aria-label="移动端区段导航">
            <div className="site-mobile-nav">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  className={`site-mobile-item ${activeIndex === index ? 'is-active' : ''}`}
                  onClick={() => {
                    onScrollToSection?.(index)
                    setMobileMenuOpen(false)
                  }}
                >
                  {section.label}
                </button>
              ))}
              <a
                href="#/tools"
                className="site-mobile-tools-btn"
                onClick={(e) => {
                  setMobileMenuOpen(false)
                  if (onNavigate) {
                    e.preventDefault()
                    onNavigate('#/tools')
                  }
                }}
              >
                进入工作台 →
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
