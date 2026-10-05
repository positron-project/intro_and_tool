import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import {
  ABOUT_GROUPS,
  ABOUT_GROUP_ORDER,
  type AboutGroupContent,
  type AboutGroupId,
} from './about-groups'
import './about-section.css'

interface AboutSectionProps {
  onNavigate?: (path: string) => void
  onNextSection?: () => void
  isPastTrigger?: boolean
  /* 某组被选定后通知外层 */
  onGroupSelected?: (groupId: AboutGroupId) => void
}

/* ============================================================
   02 我们是谁 —— 左侧悬浮分组栏 + 右侧蓝图规格卡
   ------------------------------------------------------------
   交互：所有组始终可见，点一次即切换，右侧卡片原地换内容。

   高度稳定选【方案 A】：所有组的面板用 CSS grid 叠在同一格里，
   其中一整份不可见（.about-spec-anchors，只承担高度），
   可见的一份由 <AnimatePresence mode="wait"> 驱动退场/入场。
   这样卡片外框高度恒等于「最高的那一组」，切换时绝不跳动，
   也不依赖任何预估出来的 min-height。

   数据驱动：组数、组名、文案全部来自 about-groups.ts，
   新增第三组只需往 ABOUT_GROUP_ORDER 里加 id，本文件无需改动。
   ============================================================ */

/* ---- 动效常量（统一在这里调节节奏） ---- */
/** 缓动曲线：与全站一致的「无前冲」曲线 */
const EASE_OUT = [0.16, 1, 0.3, 1] as const
/** 卡片内容入场 */
const PANEL_ENTER_DURATION = 0.28
/** 卡片内容退场 */
const PANEL_EXIT_DURATION = 0.18
/** 左侧深蓝指示块在两项之间滑动 */
const INDICATOR_DURATION = 0.35

/* ------------------------------------------------------------
   一组的面板内容：元信息条 → 主文案 → 正文

   animated=false 时渲染的是「高度锚点」那份：结构、宽度、
   换行完全一致，但不参与任何动画，只负责把卡片撑到该有的高度。
   ------------------------------------------------------------ */
function SpecPanel({ group }: { group: AboutGroupContent }) {
  return (
    <div className="about-spec-panel">
      {/* 顶部元信息条 */}
      <div className="about-spec-meta">
        SPEC · {group.chapterLabel} · {group.meta}
      </div>
      <div className="about-spec-rule" aria-hidden="true" />

      {/* 第二视觉焦点：两行醒目短句 */}
      <div className="about-focal-quote">
        <span className="about-quote-line">{group.quoteLines[0]}</span>
        <span className="about-quote-line about-quote-line--sub">{group.quoteLines[1]}</span>
      </div>

      {/* 正文内容 */}
      <div className="about-body-narrative">
        {group.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  )
}

export function AboutSection({
  onNavigate,
  onNextSection,
  isPastTrigger = true,
  onGroupSelected,
}: AboutSectionProps) {
  /* 已选定的组：默认项目组 */
  const [selectedGroup, setSelectedGroup] = useState<AboutGroupId>('project')
  /* 与 state 同步的镜像，供「真的换了组才通知外层」的判定使用 */
  const selectedGroupRef = useRef<AboutGroupId>('project')
  /* 分组按钮的 DOM 引用，仅用于 roving tabindex 的焦点管理 */
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  /* 无障碍：系统开启「减少动态效果」时，把所有时长归零（只保留瞬时切换） */
  const prefersReducedMotion = useReducedMotion()
  const reduced = !!prefersReducedMotion
  const dur = useCallback((value: number) => (reduced ? 0 : value), [reduced])

  /* 挂载时通知外层选定项目组 */
  useEffect(() => {
    onGroupSelected?.('project')
  }, [onGroupSelected])

  /* 选中某一组：只在真的发生切换时才落 state 并通知外层 */
  const selectGroup = useCallback(
    (id: AboutGroupId) => {
      if (selectedGroupRef.current === id) return
      selectedGroupRef.current = id
      setSelectedGroup(id)
      onGroupSelected?.(id)
    },
    [onGroupSelected]
  )

  /* 键盘：↑/↓ 与 ←/→ 都能切换组并移动焦点，到头后循环；Home/End 跳首尾。
     方向键在竖向 tablist 上是约定俗成的操作，因此同样 preventDefault，
     避免顺带触发页面滚动。 */
  const handleTabKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
      const last = ABOUT_GROUP_ORDER.length - 1
      let next: number
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          next = index === last ? 0 : index + 1
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          next = index === 0 ? last : index - 1
          break
        case 'Home':
          next = 0
          break
        case 'End':
          next = last
          break
        default:
          return
      }
      event.preventDefault()
      selectGroup(ABOUT_GROUP_ORDER[next])
      tabRefs.current[next]?.focus({ preventScroll: true })
    },
    [selectGroup]
  )

  const group = ABOUT_GROUPS[selectedGroup]

  return (
    <section
      id="story-about"
      className="about-section-viewport"
      /* 已经没有「悬念字 / 选择器 / 内容」三段式了，固定为 content */
      data-entrance-state="content"
      aria-label={`02 · 我们是谁 · ${group.name}`}
    >
      {/* ============================================================
          Layer 1 & 2: 背景装饰层 (坐标网格、建筑线稿底纹、延续轨迹线、超大水印)
          保持不变
          ============================================================ */}
      <div className="about-bg-layer" aria-hidden="true">
        <div className="about-bg-grid" />
        <div className="about-geo-ribbon" />
        <div className="about-geo-circle" />
        <div className="about-bg-watermark">ABOUT</div>

        <svg
          className="about-flow-svg"
          viewBox="0 0 1600 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="aboutFlowGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8FC7D9" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#82BED3" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#073F73" stopOpacity="0.12" />
            </linearGradient>

            <linearGradient id="aboutFlowGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8FC7D9" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#8FC7D9" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#82BED3" stopOpacity="0.15" />
            </linearGradient>

            <marker
              id="aboutFlowArrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto-start-reverse"
            >
              <path d="M1 2 L8 5 L1 8" fill="none" stroke="#8FC7D9" strokeWidth="1.2" strokeLinecap="round" />
            </marker>
          </defs>

          <path
            d="M -20 120 L 1620 540"
            stroke="url(#aboutFlowGrad1)"
            strokeWidth="1.1"
            markerEnd="url(#aboutFlowArrow)"
          />
          <path
            d="M 60 40 L 1580 720"
            stroke="url(#aboutFlowGrad2)"
            strokeWidth="0.95"
            strokeDasharray="8 6"
            opacity="0.8"
          />
          <path
            d="M 240 260 L 1650 860"
            stroke="url(#aboutFlowGrad2)"
            strokeWidth="0.85"
            opacity="0.55"
          />
          <circle cx="380" cy="222" r="4.5" fill="none" stroke="#073F73" strokeWidth="1.5" opacity="0.6" />
          <circle cx="860" cy="345" r="3.5" fill="#073F73" opacity="0.4" />
          <circle cx="1280" cy="452" r="5" fill="none" stroke="#82BED3" strokeWidth="1.6" opacity="0.7" />
          <circle cx="1280" cy="452" r="2" fill="#073F73" opacity="0.7" />

          <g stroke="#073F73" strokeWidth="0.8" opacity="0.18">
            <line x1="220" y1="360" x2="232" y2="360" />
            <line x1="226" y1="354" x2="226" y2="366" />
            <line x1="1120" y1="180" x2="1132" y2="180" />
            <line x1="1126" y1="174" x2="1126" y2="186" />
            <line x1="740" y1="680" x2="752" y2="680" />
            <line x1="746" y1="674" x2="746" y2="686" />
          </g>
        </svg>

        <svg
          className="about-sketch-svg"
          viewBox="0 0 800 480"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke="#073F73" strokeWidth="0.85" opacity="0.065" strokeLinecap="round" strokeLinejoin="round">
            <line x1="40" y1="440" x2="780" y2="440" />
            <line x1="0" y1="452" x2="800" y2="452" strokeDasharray="4 4" />
            <rect x="180" y="160" width="460" height="280" />
            <line x1="180" y1="220" x2="640" y2="220" />
            <line x1="180" y1="280" x2="640" y2="280" />
            <line x1="180" y1="340" x2="640" y2="340" />
            <line x1="180" y1="400" x2="640" y2="400" />
            {Array.from({ length: 14 }).map((_, i) => (
              <line key={`win-col-${i}`} x1={212 + i * 31} y1="160" x2={212 + i * 31} y2="440" strokeWidth="0.5" />
            ))}
            <path d="M 370 160 L 410 110 L 450 160 Z" />
            <rect x="390" y="70" width="40" height="90" />
            <path d="M 390 70 L 410 40 L 430 70 Z" />
            <circle cx="410" cy="115" r="12" strokeWidth="0.75" />
          </g>
        </svg>
      </div>

      {/* ============================================================
          主体内容排版层：版块标题 + 左分组栏 / 右组特性卡
          ============================================================ */}
      <div className="about-content-stage">
        {/* 版块标题：显示当前组的 title */}
        <div className="about-title-row">
          <h2 className="about-main-title">{group.title}</h2>
          <div className="about-title-aside" aria-hidden="true">
            <span className="about-title-aside-en">
              WHO
              <br />
              WE ARE
            </span>
            <span className="about-title-aside-dot" />
          </div>
        </div>

        <div className="about-layout">
          {/* ---------------- 左：分组栏（浮层，桌面端吸顶） ---------------- */}
          <div className="about-group-rail">
            <div className="about-rail-head" aria-hidden="true">
              <span className="about-chapter-num">02</span>
              <div className="about-chapter-rule" />
              <span className="about-chapter-label">ABOUT US</span>
            </div>

            <div
              className="about-group-list"
              role="tablist"
              aria-orientation="vertical"
              aria-label="选择小组"
            >
              {ABOUT_GROUP_ORDER.map((groupId, index) => {
                const item = ABOUT_GROUPS[groupId]
                const isActive = groupId === selectedGroup
                return (
                  <button
                    key={groupId}
                    id={`about-tab-${groupId}`}
                    ref={(el) => {
                      tabRefs.current[index] = el
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`about-panel-${groupId}`}
                    /* roving tabindex：只有选中项在 Tab 序列里 */
                    tabIndex={isActive ? 0 : -1}
                    data-active={isActive ? 'true' : undefined}
                    className="about-group-tab"
                    onClick={() => selectGroup(groupId)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                  >
                    {/* 选中态的背景块：独立的 motion.span，靠 layoutId 在各项之间滑动 */}
                    {isActive && (
                      <motion.span
                        className="about-group-indicator"
                        aria-hidden="true"
                        layoutId="about-group-indicator"
                        transition={{ duration: dur(INDICATOR_DURATION), ease: EASE_OUT }}
                      />
                    )}

                    <span className="about-tab-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="about-tab-body">
                      <span className="about-tab-name">{item.name}</span>
                      <span className="about-tab-chapter">{item.chapterLabel}</span>
                      <span className="about-tab-meta">{item.meta}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ---------------- 右：组特性卡（蓝图规格卡） ---------------- */}
          <div className="about-spec-card">
            {/* 四角定位标 */}
            <span className="about-spec-corner about-spec-corner--tl" aria-hidden="true" />
            <span className="about-spec-corner about-spec-corner--tr" aria-hidden="true" />
            <span className="about-spec-corner about-spec-corner--bl" aria-hidden="true" />
            <span className="about-spec-corner about-spec-corner--br" aria-hidden="true" />

            {/* 方案 A：所有组的面板叠在同一格里 */}
            <div className="about-spec-stack">
              {/* 高度锚点层：每一组各一份，不可见、不可聚焦、不进无障碍树，
                  只负责把外框高度锁在「最高的那一组」 */}
              <div className="about-spec-anchors" aria-hidden="true" inert>
                {ABOUT_GROUP_ORDER.map((groupId) => (
                  <SpecPanel key={groupId} group={ABOUT_GROUPS[groupId]} />
                ))}
              </div>

              {/* 可见层：一次只挂一位，退场结束后才换人 */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={group.id}
                  id={`about-panel-${group.id}`}
                  role="tabpanel"
                  aria-labelledby={`about-tab-${group.id}`}
                  className="about-spec-live"
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: dur(PANEL_ENTER_DURATION), ease: EASE_OUT },
                    },
                    exit: {
                      opacity: 0,
                      y: -8,
                      transition: { duration: dur(PANEL_EXIT_DURATION), ease: EASE_OUT },
                    },
                  }}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <SpecPanel group={group} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          底部衔接微引导 (引向下一屏 03 / WHAT WE OFFER)
          ============================================================ */}
      <div className="about-footer-nav">
        <div className="about-footer-path" aria-hidden="true">
          <div className="about-footer-line" />
        </div>

        <button
          className="about-footer-preview"
          onClick={() => {
            if (onNextSection) {
              onNextSection()
            } else if (onNavigate) {
              onNavigate('#story-offer')
            }
          }}
          aria-label="继续向下浏览：03 / 我们能提供什么"
        >
          <span className="about-footer-preview-num">03</span>
          <span className="about-footer-preview-label">WHAT WE OFFER</span>
          <span className="about-footer-arrow">
            <ArrowDown size={13} />
          </span>
        </button>
      </div>
    </section>
  )
}
