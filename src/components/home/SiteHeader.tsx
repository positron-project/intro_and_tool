import { useState, useRef, useEffect } from 'react'

interface SiteHeaderProps {
  onScrollToSection?: (sectionIndex: number) => void
}

/* ============================================================
   首页顶栏（仅用于 #/home 的滚动叙事页）
   ------------------------------------------------------------
   按需求收敛为「只保留左侧标识」：
     · 中部区段导航（首页/关于我们/带来什么/小组力荐/小组博客/加入我们）
       整块移除，连带它的滑动下划线测量逻辑；
     · 移动端汉堡按钮与抽屉导航一并移除；
     · 保留校园标识 lockup（logo 图形 + 院校名 + 细线 + 小组名），
       品牌区仍可点击 —— 回到首屏顶部。
   区段下标含义由 src/App.tsx 的 STORY_SECTIONS 定义，0 即 story-hero。
   ============================================================ */
const HERO_SECTION_INDEX = 0

export function SiteHeader({ onScrollToSection }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  /* 上一次的"已离开顶部"，用于把滚动热路径上的 setState 收敛到只翻转一次 */
  const scrolledRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      const isPastTop = (window.scrollY || 0) > 20
      /* 滚动事件每帧都来：值没变直接返回。
         同值 setState 虽然会被 bail out，但每次仍要走一遍调度与比对 */
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
      <div className="site-header-inner">
        {/* 左侧圆形标记 Logo + 院校名 / 小组名上下排布 */}
        <div
          className="site-brand"
          onClick={() => onScrollToSection?.(HERO_SECTION_INDEX)}
          /* 导航整块移除后，品牌区就是顶栏唯一的控件：
             既然给了 role="button" + tabIndex，键盘也要能激活它
             （Enter/Space 与点击同义；统一走这个函数，避免两处逻辑漂移） */
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return
            event.preventDefault()
            onScrollToSection?.(HERO_SECTION_INDEX)
          }}
          role="button"
          tabIndex={0}
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
            {/* 上下两行之间的分隔细线 */}
            <span className="site-brand-rule" aria-hidden="true" />
            <span className="site-brand-name">计算机小组</span>
          </span>
        </div>
      </div>
    </header>
  )
}
