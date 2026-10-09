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
      {/* 顶部小标：原来的「SPEC · 组标 · 规模」去掉 SPEC 前缀
          以及与左侧选择器重复的规模，只留组标 */}
      <span className="poster-eyebrow poster-eyebrow--plain">{group.chapterLabel}</span>
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
      aria-label={`02 · 关于我们 · ${group.name}`}
    >

      {/* ============================================================
          主体内容排版层：版块标题 + 左分组栏 / 右组特性卡
          ============================================================ */}
      <div className="about-content-stage">
        {/* 版块标题：显示当前组的 title */}
        <div className="about-title-row">
          <span className="poster-eyebrow">About</span>
          <h2 className="about-main-title poster-section-title">{group.title}</h2>
        </div>

        <div className="about-layout">
          {/* ---------------- 左：分组栏（浮层，桌面端吸顶） ---------------- */}
          <div className="about-group-rail">
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

                    <span className="about-tab-body">
                      <span className="about-tab-name">{item.name}</span>
                      <span className="about-tab-meta">{item.meta}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ---------------- 右：组特性卡（蓝图规格卡） ---------------- */}
          <div className="about-spec-card">

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
        <button
          className="about-footer-preview poster-next"
          onClick={() => {
            if (onNextSection) {
              onNextSection()
            } else if (onNavigate) {
              onNavigate('#story-offer')
            }
          }}
          aria-label="继续向下：能带来什么"
        >
          <span className="about-footer-preview-label">能带来什么</span>
          <span className="about-footer-arrow">
            <ArrowDown size={13} />
          </span>
        </button>
      </div>
    </section>
  )
}
