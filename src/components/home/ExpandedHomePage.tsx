import { memo, useCallback, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

import { SiteHeader } from './SiteHeader'
import { HomeLanding } from './HomeLanding'
import { AboutSection } from './AboutSection'
import { OfferSection } from './OfferSection'
import { PicksSection } from './PicksSection'
import { BlogSection } from './BlogSection'
import { JoinSection } from './JoinSection'
/* 02–06 五节共用的海报原子件（eyebrow / 节标题 / 正文色 / 分隔线 / 继续往下） */
import './poster-sections.css'

type StorySection = {
  id: string
  label: string
}

const STORY_SECTIONS: StorySection[] = [
  { id: 'story-hero', label: '首页' },
  { id: 'story-about', label: '关于我们' },
  { id: 'story-offer', label: '能带来什么' },
  { id: 'story-picks', label: '小组推荐' },
  { id: 'story-blog', label: '小组博客' },
  { id: 'story-join', label: '加入我们' },
]

/* 跳转手感：时长随距离自适应（不再是固定 1.2s），缓动换成无“前冲”的 easeInOutCubic */
const JUMP_MIN_DURATION = 0.55
const JUMP_MAX_DURATION = 1.3
const JUMP_EASING = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const getJumpDuration = (distance: number) => Math.min(JUMP_MAX_DURATION, Math.max(JUMP_MIN_DURATION, 0.45 + distance / 5200))

/* 首屏滚动热路径：各区段 memo 化，配合稳定的回调身份，
   让 isPastTrigger / activeIndex 翻转时只重渲染真正需要的那一块 */
const MemoSiteHeader = memo(SiteHeader)
const MemoHomeLanding = memo(HomeLanding)
const MemoAboutSection = memo(AboutSection)
const MemoOfferSection = memo(OfferSection)
const MemoPicksSection = memo(PicksSection)
const MemoBlogSection = memo(BlogSection)
const MemoJoinSection = memo(JoinSection)

export function ExpandedHomePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const heroFrameRef = useRef<HTMLDivElement | null>(null)
  const lenisRef = useRef<Lenis | null>(null)

  /* 导航区段滚动偏移常量（与 SiteHeader 高度呼应） */
  const HEADER_OFFSET = -70

  useEffect(() => {
    /* 减少动态效果遵循：系统开启 reduced-motion 时不初始化 Lenis，由原生滚动接管 */
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* Lenis 滚动与原生滚动共用一个入口 */
    const applyScrollState = (scroll: number) => {
      const vh = window.innerHeight || 800
      const frame = heroFrameRef.current
      if (frame) {
        if (scroll <= vh * 1.4) {
          // 在 0 ~ 0.6vh 保持高清晰度可读，0.6vh ~ 1.3vh 平滑视差淡出离场
          const exitProgress = Math.min(1, Math.max(0, (scroll - vh * 0.6) / (vh * 0.7)))
          const scaleProgress = Math.min(1, Math.max(0, scroll / (vh * 1.2)))
          frame.style.transform = `translate3d(0, ${scroll * 0.16}px, 0) scale(${1 - scaleProgress * 0.03})`
          frame.style.opacity = String(Math.max(0, 1 - exitProgress))
          frame.style.visibility = 'visible'
        } else {
          frame.style.visibility = 'hidden'
        }
      }
    }

    if (prefersReducedMotion) {
      const handleNativeScroll = () => applyScrollState(window.scrollY)
      window.addEventListener('scroll', handleNativeScroll, { passive: true })
      applyScrollState(window.scrollY)
      return () => {
        window.removeEventListener('scroll', handleNativeScroll)
      }
    }

    const lenis = new Lenis({
      /* 滚轮/触摸走 lerp 模式：由输入驱动、松手自然衰减（lenis 默认 0.1，0.08–0.12 为常用区间）；
         跳转动画不走这里，改由 scrollToSection 按距离传入 duration/easing */
      lerp: 0.1,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    })

    lenisRef.current = lenis
    ;(window as any).__lenis = lenis

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    lenis.on('scroll', ({ scroll }: { scroll: number }) => applyScrollState(scroll))

    const handleNativeScroll = () => applyScrollState(window.scrollY)
    window.addEventListener('scroll', handleNativeScroll, { passive: true })

    /* 挂载时同步一次（兜底）：刷新、前进/后退、滚动恢复等情况下，
       页面挂载时就可能已经停在 50vh 之下，而此后不会再有 scroll 事件 ——
       阈值永远不翻转，02 会停在 idle 不播入场。
       深链 #/story-* 另有下面 350ms 的 hash 定位兜底，这里补的是"本来就在下面"的情况。
       applyScrollState 内部只在真正翻转时才 setState，重复调用幂等。 */
    applyScrollState(window.scrollY)
    /* 浏览器的滚动恢复可能发生在挂载之后，故下一帧再补判一次 */
    const syncRaf = requestAnimationFrame(() => applyScrollState(window.scrollY))

    return () => {
      cancelAnimationFrame(rafId)
      cancelAnimationFrame(syncRaf)
      window.removeEventListener('scroll', handleNativeScroll)
      lenis.destroy()
      delete (window as any).__lenis
    }
  }, [])

  /* 观察当前处于哪一屏 */
  useEffect(() => {
    const sectionIds = STORY_SECTIONS.map((s) => s.id)
    const elements = sectionIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = sectionIds.indexOf(entry.target.id)
            if (idx !== -1) {
              setActiveIndex(idx)
            }
          }
        })
      },
      {
        threshold: 0.15,
        rootMargin: '-5% 0px -20% 0px',
      },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  /* 初始哈希锚点平滑定位 */
  useEffect(() => {
    const rawHash = window.location.hash.replace(/^#/, '')
    if (rawHash && rawHash !== 'story-hero') {
      const timer = setTimeout(() => {
        scrollToSection(rawHash)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [])

  const scrollToSection = useCallback((target: number | string) => {
    let targetId: string
    if (typeof target === 'number') {
      targetId = STORY_SECTIONS[target]?.id ?? ''
    } else {
      targetId = target.replace(/^#/, '')
    }
    if (!targetId) return
    const lenis = lenisRef.current
    const currentScroll = window.scrollY
    if (targetId === 'story-hero') {
      if (lenis) {
        lenis.scrollTo(0, { duration: getJumpDuration(currentScroll), easing: JUMP_EASING })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }
    const targetElement = document.getElementById(targetId)
    if (targetElement) {
      const targetScroll = targetElement.getBoundingClientRect().top + currentScroll + HEADER_OFFSET
      const distance = Math.abs(targetScroll - currentScroll)
      if (lenis) {
        lenis.scrollTo(targetElement, {
          offset: HEADER_OFFSET,
          duration: getJumpDuration(distance),
          easing: JUMP_EASING,
        })
      } else {
        const topPos = targetElement.getBoundingClientRect().top + window.scrollY + HEADER_OFFSET
        window.scrollTo({ top: topPos, behavior: 'smooth' })
      }
    }
  }, [])

  /* 稳定的回调身份：memo 化的区段不会因为父组件重渲染而被连带重渲染 */
  const handleHeaderScrollToSection = useCallback((sectionIndex: number) => scrollToSection(sectionIndex), [scrollToSection])
  const handleHeroScrollDown = useCallback(() => scrollToSection('story-about'), [scrollToSection])
  const handleNextOffer = useCallback(() => scrollToSection('story-offer'), [scrollToSection])
  const handleNextPicks = useCallback(() => scrollToSection('story-picks'), [scrollToSection])
  const handleNextBlog = useCallback(() => scrollToSection('story-blog'), [scrollToSection])
  const handleNextJoin = useCallback(() => scrollToSection('story-join'), [scrollToSection])
  const handleJoinScrollToTop = useCallback(() => scrollToSection('story-hero'), [scrollToSection])
  const handleJoinScrollToSection = useCallback((sectionId: string) => scrollToSection(sectionId), [scrollToSection])

  return (
    <div className="home-story-scroll" data-active-screen={activeIndex}>
      {/* 顶部全局悬浮导航 */}
      <MemoSiteHeader
        activeIndex={activeIndex}
        sections={STORY_SECTIONS}
        onScrollToSection={handleHeaderScrollToSection}
        onNavigate={onNavigate}
      />

      <div className="hero-sticky-container">
        <div ref={heroFrameRef} className="hero-sticky-frame">
          <MemoHomeLanding onScrollDown={handleHeroScrollDown} onJoinClick={handleNextJoin} onNavigate={onNavigate} />
        </div>
      </div>

      {/* 02 / ABOUT US (项目组介绍) */}
      <MemoAboutSection onNavigate={onNavigate} onNextSection={handleNextOffer} />

      {/* 03 之后的内容区：始终挂载显示，分组切换只改变 02 正文 */}
      {/* 03 / WHAT WE OFFER (我们可以给你带来什么) */}
      <MemoOfferSection onNextSection={handleNextPicks} />

      {/* 04 / OUR PICKS (小组力荐) */}
      <MemoPicksSection onNavigate={onNavigate} onNextSection={handleNextBlog} />

      {/* 05 / BLOG (小组博客 · 最近文章) */}
      <MemoBlogSection onNavigate={onNavigate} onNextSection={handleNextJoin} />

      {/* 06 / JOIN US (加入我们 & 整站一体化 Footer) */}
      <MemoJoinSection
        onNavigate={onNavigate}
        onScrollToTop={handleJoinScrollToTop}
        onScrollToSection={handleJoinScrollToSection}
        qrCodeSrc="./assets/qq-group-qrcode.svg"
      />
    </div>
  )
}
