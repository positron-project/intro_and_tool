import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowUpRight, Repeat2 } from 'lucide-react'
import { ABOUT_GROUPS, ABOUT_GROUP_ORDER, type AboutGroupId } from './about-groups'
import './about-section.css'

interface AboutSectionProps {
  onNavigate?: (path: string) => void
  onNextSection?: () => void
  isPastTrigger?: boolean
  /* 某组被真正选定后通知外层 */
  onGroupSelected?: (groupId: AboutGroupId) => void
}

/* ============================================================
   02 入场流程：悬念字 → 分组选择器 → 选定组的内容
   ------------------------------------------------------------
   需求：
     1. 首次从 hero 向下滑入「我们是谁」时，居中悬念大字淡出（只播一次）；
     2. 悬念字淡出后，原地续接出现「项目组 / 算法组」二选一选择器；
     3. 悬浮任一侧即预览该组，点击确认后选择器淡出、该组完整内容登场；
     4. 内容区留一个很轻的 SWITCH 入口，可切回选择器重选。

   实现要点：
     · 三个布尔/引用状态各自独立，互不派生动画时机：
         teaserGone    —— 悬念字是否已退场（首次越过触发线后置真，不再出现）
         isForkOpen    —— 选择器是否在场
         selectedGroup —— 已选定的组，为空表示还没做过选择
     · 「只播一次」依旧靠【上升沿 + 首次】判定：isPastTrigger 由 false→true
       的那一帧才算进入，hasEnteredRef 一旦置真，任何后续上升沿都被吞掉；
     · 回滑到 hero 再下滑时，什么都不做 —— 选择器与已选内容都保持在场，
       既不重播悬念字，也不重播内容入场（此前用零时长变体实现的
       isInstant 分支，在新流程下已无触发路径，故整体移除）；
     · 阶段切换全部交给 AnimatePresence 的 onExitComplete，不用 setTimeout
       去猜前一段动画何时结束，避免快速滚动/连点造成的竞态。
   ============================================================ */

/* ---- 选择器 / 内容切换的时间常量（统一在这里调节节奏） ---- */
/** 缓动曲线：与全站首屏一致的无「前冲」曲线 */
const EASE_OUT = [0.16, 1, 0.3, 1] as const
/** 选择器首次入场 */
const FORK_ENTER_DURATION = 0.5
/** 从内容区切回选择器（更短、不 stagger） */
const FORK_REOPEN_DURATION = 0.32
/** 选择器退场 */
const FORK_EXIT_DURATION = 0.38
/** 选择器内部两半区与文字的入场时长 */
const FORK_ITEM_DURATION = 0.55
/** 两半区之间的入场间隔 */
const FORK_ITEM_STAGGER = 0.06

export function AboutSection({
  onNavigate,
  onNextSection,
  isPastTrigger = true,
  onGroupSelected,
}: AboutSectionProps) {
  /* 选择器是否在场：默认不打开全屏选择器，保留 SWITCH 入口可唤出 */
  const [isForkOpen, setIsForkOpen] = useState(false)
  /* 已选定的组；默认选中项目组 */
  const [selectedGroup, setSelectedGroup] = useState<AboutGroupId>('project')
  /* 选择器的入场方式：first=首次（带 stagger），reopen=从内容区切回（更短、不 stagger） */
  const [forkEntryMode, setForkEntryMode] = useState<'first' | 'reopen'>('reopen')
  /* 当前被悬浮/聚焦预览的组：鼠标与键盘共用同一状态，用于让另一侧变暗 */
  const [previewGroup, setPreviewGroup] = useState<AboutGroupId | null>(null)
  /* 选择器退场结束后要不要把焦点交给内容层里的重选按钮（见下方 useEffect）。 */
  const [handoffFocus, setHandoffFocus] = useState(false)

  /* 点击某一侧的瞬间先记下目标组 */
  const pendingSelectRef = useRef<AboutGroupId | null>(null)
  /* 两半区与「重选」按钮的 DOM 引用，仅用于焦点管理 */
  const halfRefs = useRef<Array<HTMLButtonElement | null>>([])
  const switchBtnRef = useRef<HTMLButtonElement | null>(null)

  /* 初始通知外层选定项目组 */
  useEffect(() => {
    onGroupSelected?.('project')
  }, [onGroupSelected])

  /* 选择器打开时支持按 Esc 键关闭 */
  useEffect(() => {
    if (!isForkOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsForkOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isForkOpen])

  /* 无障碍：系统开启「减少动态效果」时，把所有位移/模糊的时长归零（只保留瞬时切换） */
  const prefersReducedMotion = useReducedMotion()
  const dur = useCallback(
    (value: number) => (prefersReducedMotion ? 0 : value),
    [prefersReducedMotion]
  )

  /* 选择器退场完成 → 若确实选了组，这时才让该组内容入场（两段动画不重叠） */
  const handleForkExitComplete = useCallback(() => {
    const picked = pendingSelectRef.current
    if (!picked) return
    pendingSelectRef.current = null
    setSelectedGroup(picked)
    onGroupSelected?.(picked)
    setHandoffFocus(true)
  }, [onGroupSelected])

  /* 选定某一组：先关掉选择器，等它退场后再由 handleForkExitComplete 让内容登场。

     ⚠️ 这里**只**挡「退场动画进行中」的重复点击，绝不因为 id 等于当前已选组就提前 return：
     重选同一组也必须走完整条「关选择器 → onExitComplete → 落 state」链路，
     否则选择器不退场、onExitComplete 不触发，内容层会永远停在 inert + opacity 0，
     而重选按钮就在那层 inert 子树里 —— 用户会彻底卡死（只能改选另一组或刷新）。 */
  const handleSelectGroup = useCallback((id: AboutGroupId) => {
    if (pendingSelectRef.current) return
    pendingSelectRef.current = id
    setPreviewGroup(null)
    setIsForkOpen(false)
  }, [])

  /* 重新选择：内容淡出，选择器以更短的动画回到场内
     （mode 必须切成 'reopen'：不走 stagger 延迟，用 FORK_REOPEN_DURATION）

     重选按钮本身就在即将被 inert + aria-hidden 的内容层里：若它此刻仍持有焦点，
     同一帧给祖先加 aria-hidden 属于违规（Chrome 会告警且可能忽略该属性）。
     因此先显式交出焦点，焦点随后由下面的 useEffect 交给上次选中的那一半区。 */
  const handleReopenFork = useCallback(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement && active.closest('.about-content-stage')) {
      active.blur()
    }
    setForkEntryMode('reopen')
    setIsForkOpen(true)
  }, [])

  /* 选择器以「重选」方式回到场内时，把焦点送到上次选中的那一半区：
     键盘用户在重选后不必再从文档头开始 Tab（只需一个 Enter 即可确认原选择）。 */
  useEffect(() => {
    if (!isForkOpen || forkEntryMode !== 'reopen') return
    const index = selectedGroup === 'algorithm' ? 1 : 0
    halfRefs.current[index]?.focus({ preventScroll: true })
  }, [isForkOpen, forkEntryMode, selectedGroup])

  /* ============================================================
     当前呈现的组内容

     内容可见性只由「选择器是否在场」与「是否已选定」决定，与滚动状态无关：
     一旦选定，上滑回 hero 再下滑回来，contentVisible 始终为 true，
     元素停在终态，不会重播入场（这正是旧版 isInstant 分支要解决的问题）。
     ============================================================ */
  const group = selectedGroup ? ABOUT_GROUPS[selectedGroup] : null
  const contentVisible = !isForkOpen && selectedGroup !== null

  /* 焦点交接：选定完成、内容层已脱离 inert 之后，把焦点交给章节列里的重选按钮。
     不接管的话，两半区卸载会把焦点丢到 body，键盘用户得从文档头重新 Tab。 */
  useEffect(() => {
    if (!handoffFocus || !contentVisible) return
    switchBtnRef.current?.focus({ preventScroll: true })
    setHandoffFocus(false)
  }, [handoffFocus, contentVisible])

  /* ============================================================
     1. 图二变体：左侧章节系统（02 / ABOUT US）率先从左侧滑入淡入
     ============================================================ */
  const chapterVariant = {
    /* hidden 也带 transition：按「重选」退回时（contentVisible → false）走的是这条，
       不写的话会落到 Framer 默认过渡上，reduced-motion 归零就管不住它 */
    hidden: { opacity: 0, x: -46, transition: { duration: dur(0.25), ease: EASE_OUT } },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: dur(0.65),
        delay: dur(0.08),
        ease: EASE_OUT,
      },
    },
  }

  /* ============================================================
     2. 剩下内容变体：主标题、引言、正文——在图二淡入完毕后触发
        从下往上升起（不带昂贵的 filter: blur，保障中低端手机流畅度）
     ============================================================ */
  const mainContentVariant = {
    hidden: { opacity: 0, y: 38, transition: { duration: dur(0.25), ease: EASE_OUT } },
    visible: (customDelay: number = 0.5) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: dur(0.8),
        delay: dur(customDelay),
        ease: EASE_OUT,
      },
    }),
  }

  /* ============================================================
     3. 图三四大关键词变体：从左到右逐个显示
     ============================================================ */
  const keywordVariant = {
    hidden: { opacity: 0, y: 30, transition: { duration: dur(0.25), ease: EASE_OUT } },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: dur(0.7),
        delay: dur(0.75 + index * 0.14), // 从左至右阶梯式触发
        ease: EASE_OUT,
      },
    }),
  }

  /* 说明：旧版为了处理「回滑再进入不得重播」，在这里按 isInstant 解析出
     两套变体（带动画的 / 零位移终态的）。新流程下内容可见性只由
     「是否已选定 + 选择器是否在场」决定，回滑再进入不会翻转 contentVisible，
     没有触发路径了，因此整体移除（变体自身的 transition 依旧优先于组件级）。

     补充：未选定分组时 group 为 null，正文层整块不挂载 —— 默认 DOM 里
     不存在任何一组的正文（旧版是挂载项目组数据再用 opacity 0 遮住）。 */

  return (
    <section
      id="story-about"
      className="about-section-viewport"
      data-entrance-state={
        isForkOpen ? (forkEntryMode === 'reopen' ? 'reopen' : 'fork') : contentVisible ? 'content' : 'idle'
      }
      aria-label={contentVisible && group ? `02 · 我们是谁 · ${group.name}` : '02 · 我们是谁'}
    >
      {/* ============================================================
          Layer 1 & 2: 背景装饰层 (坐标网格、建筑线稿底纹、延续轨迹线、超大水印)
          ============================================================ */}
      <div className="about-bg-layer" aria-hidden="true">
        {/* 极浅坐标图纸网格 */}
        <div className="about-bg-grid" />

        {/* 浅青蓝几何色带与柔和圆弧 */}
        <div className="about-geo-ribbon" />
        <div className="about-geo-circle" />

        {/* 右侧超大镂空建筑图号文字 ABOUT */}
        <div className="about-bg-watermark">
          ABOUT
        </div>

        {/* 延续首屏的斜向知识流动轨迹 */}
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

          {/* 轨迹 1: 主导承接线 */}
          <path
            d="M -20 120 L 1620 540"
            stroke="url(#aboutFlowGrad1)"
            strokeWidth="1.1"
            markerEnd="url(#aboutFlowArrow)"
          />

          {/* 轨迹 2: 略低角度辅助虚线 */}
          <path
            d="M 60 40 L 1580 720"
            stroke="url(#aboutFlowGrad2)"
            strokeWidth="0.95"
            strokeDasharray="8 6"
            opacity="0.8"
          />

          {/* 轨迹 3: 底部引申线 */}
          <path
            d="M 240 260 L 1650 860"
            stroke="url(#aboutFlowGrad2)"
            strokeWidth="0.85"
            opacity="0.55"
          />

          {/* 轨迹上的几何节点 */}
          <circle cx="380" cy="222" r="4.5" fill="none" stroke="#073F73" strokeWidth="1.5" opacity="0.6" />
          <circle cx="860" cy="345" r="3.5" fill="#073F73" opacity="0.4" />
          <circle cx="1280" cy="452" r="5" fill="none" stroke="#82BED3" strokeWidth="1.6" opacity="0.7" />
          <circle cx="1280" cy="452" r="2" fill="#073F73" opacity="0.7" />

          {/* 坐标十字定位符 (+) */}
          <g stroke="#073F73" strokeWidth="0.8" opacity="0.18">
            <line x1="220" y1="360" x2="232" y2="360" />
            <line x1="226" y1="354" x2="226" y2="366" />
            <line x1="1120" y1="180" x2="1132" y2="180" />
            <line x1="1126" y1="174" x2="1126" y2="186" />
            <line x1="740" y1="680" x2="752" y2="680" />
            <line x1="746" y1="674" x2="746" y2="686" />
          </g>
        </svg>

        {/* 极淡教学楼建筑工程线稿 */}
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
          第二段：分组选择器（上：项目组 / 下：算法组）

          形态是上下两条等高的横条，行内排成三列：
            ① 编号 + 组名/英文组标   ② 方向   ③ 人数 + 箭头
          静止时两条各占一半；悬浮任一条即预览该组（深蓝自下而上填满整条、
          文字转纸面色、该条长到约 3/4 而另一条收拢，另一条变暗），
          点击确认 → 选择器退场 → 由 onExitComplete 交出该组内容。
          键盘：Tab 聚焦半区 = 悬浮态（onFocus/onBlur 同步同一个 previewGroup），
          Enter/Space = 选择，与鼠标走完全相同的路径。
          ============================================================ */}
      <AnimatePresence onExitComplete={handleForkExitComplete}>
        {isForkOpen && (
          <motion.div
            className="about-fork-stage"
            key="about-fork"
            data-mode={forkEntryMode}
            style={{ pointerEvents: isForkOpen ? 'auto' : 'none' }}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{
              duration: dur(forkEntryMode === 'reopen' ? FORK_REOPEN_DURATION : FORK_ENTER_DURATION),
              ease: EASE_OUT,
            }}
          >
            {/* 小标题：与悬念字同位同字体族，字号降下来 */}
            <div className="about-fork-title">
              <span className="about-fork-title-zh">我们各有特色</span>
              <span className="about-fork-title-en">EACH WITH OUR OWN STRENGTH · SELECT A DIRECTION</span>
              <button
                type="button"
                className="about-fork-close-btn"
                onClick={() => setIsForkOpen(false)}
                aria-label="关闭选择器并返回当前介绍"
              >
                ✕ 返回正文 (ESC)
              </button>
            </div>

            <div className="about-fork-halves">
              {ABOUT_GROUP_ORDER.map((groupId, index) => {
                const item = ABOUT_GROUPS[groupId]
                const side = index === 0 ? 'left' : 'right'
                /* 未悬浮/未聚焦的一侧变暗。
                   ⚠️ 这里必须由 Framer 来控 opacity：进场时 motion 会把
                   opacity 写成行内样式，CSS 的 [data-dimmed] 规则永远赢不了。
                   因此变暗/恢复都由 animate 目标值决定，data-* 只留给
                   CSS 做非 opacity 的样式钩子。 */
                const isDimmed = previewGroup !== null && previewGroup !== groupId
                const itemDelay = forkEntryMode === 'reopen' ? 0 : 0.08 + index * FORK_ITEM_STAGGER
                return (
                  <motion.button
                    key={groupId}
                    type="button"
                    ref={(el) => {
                      halfRefs.current[index] = el
                    }}
                    className={`about-fork-half about-fork-half--${side}`}
                    data-hovered={previewGroup === groupId ? 'true' : undefined}
                    data-dimmed={isDimmed ? 'true' : undefined}
                    aria-label={`选择${item.name}`}
                    aria-pressed={selectedGroup === groupId}
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, y: 18 }
                    }
                    animate={{ opacity: isDimmed ? 0.42 : 1, y: 0 }}
                    /* opacity 不参与 stagger、时长固定：
                       它是运行期反馈（悬浮变暗 / 移开复原），必须立刻响应；
                       位移与模糊仍走带 stagger 的入场过渡。 */
                    transition={{
                      opacity: { duration: dur(0.3), ease: EASE_OUT },
                      default: { duration: dur(FORK_ITEM_DURATION), delay: dur(itemDelay), ease: EASE_OUT },
                    }}
                    onMouseEnter={() => setPreviewGroup(groupId)}
                    onMouseLeave={() => setPreviewGroup(null)}
                    onFocus={() => setPreviewGroup(groupId)}
                    onBlur={() => setPreviewGroup(null)}
                    onClick={() => handleSelectGroup(groupId)}
                  >
                    {/* 填色层：深蓝自下而上长满整条（文字在其上层，故 z-index 0） */}
                    <span className="about-fork-fill" aria-hidden="true" />

                    {/* 第一列：编号 + 组名/英文组标（竖排成簇） */}
                    <span className="about-fork-cell">
                      <span className="about-fork-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="about-fork-nameblock">
                        <span className="about-fork-name">{item.name}</span>
                        <span className="about-fork-en">{item.chapterLabel}</span>
                      </span>
                    </span>

                    {/* 第二列：方向（常显，两条对齐成列） */}
                    <span className="about-fork-preview">{item.preview}</span>

                    {/* 第三列：规模 + 进入箭头（纯装饰，悬浮时右移并亮起） */}
                    <span className="about-fork-info">
                      <span className="about-fork-meta">{item.meta}</span>
                      <span className="about-fork-arrow" aria-hidden="true">
                        <ArrowUpRight size={12} strokeWidth={1.6} />
                      </span>
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          主体内容排版层 (在首次滑入越过触发线后，分阶段启动入场动画)
          ============================================================ */}
      {/* 未做任何选择前这一层整块不挂载（group 为 null）——
         默认既不显示、DOM 里也不存在任何一组的正文 */}
      {group && (
        <div
          className="about-content-stage"
          style={{
            opacity: contentVisible ? 1 : 0,
            transition: 'opacity 0.25s ease',
            pointerEvents: contentVisible ? 'auto' : 'none',
          }}
          /* 未选定分组时该层只是"待命"：opacity 0 并不会从无障碍树与 Tab 序列中移除
             里面的元素（章节列里的 SWITCH 按钮就是可聚焦的），
             因此显式 inert + aria-hidden，避免读到/切到看不见的控件 */
          inert={!contentVisible}
          aria-hidden={!contentVisible}
        >
          {/* 上半部：左章节标 + 中部叙事 */}
          <div className="about-top-grid">
            {/* 【图二元素】：左侧章节系统（02 / 细蓝线 / 当前组名）——率先从左侧淡入 */}
            <motion.div
              className="about-chapter-column"
              initial="hidden"
              animate={contentVisible ? "visible" : "hidden"}
              variants={chapterVariant}
            >
              <span className="about-chapter-num">02</span>
              <div className="about-chapter-rule" />
              <span className="about-chapter-label">{group.chapterLabel}</span>
              {/* 当前所在分组：始终读出"我在看哪一组" */}
              <span className="about-chapter-group">{group.name}</span>
  
              {/* 很轻的重选入口：内容淡出、选择器重新回来 */}
              <button
                type="button"
                ref={switchBtnRef}
                className="about-chapter-switch"
                onClick={handleReopenFork}
                aria-label="重新选择分组：项目组或算法组"
              >
                <Repeat2 size={12} />
                {/* 章节列只有 clamp(90px,9vw,150px) 宽，长标签会溢出：
                    文案收成一个 mono 微标签，完整语义交给 aria-label */}
                <span>SWITCH</span>
              </button>
            </motion.div>
  
            {/* 【剩下内容】：在图二淡入完毕后触发，从下往上升起，带有动态运动模糊 */}
            <div className="about-main-column">
              {/* 主标题行 */}
              <motion.div
                className="about-title-row"
                initial="hidden"
                animate={contentVisible ? "visible" : "hidden"}
                variants={mainContentVariant}
                custom={0.45}
              >
                <h2 className="about-main-title">{group.title}</h2>
                <div className="about-title-aside" aria-hidden="true">
                  <span className="about-title-aside-en">WHO<br />WE ARE</span>
                  <span className="about-title-aside-dot" />
                </div>
              </motion.div>
  
              {/* 第二视觉焦点：醒目短句 */}
              <motion.div
                className="about-focal-quote"
                initial="hidden"
                animate={contentVisible ? "visible" : "hidden"}
                variants={mainContentVariant}
                custom={0.58}
              >
                <span className="about-quote-line">{group.quoteLines[0]}</span>
                <span className="about-quote-line">{group.quoteLines[1]}</span>
              </motion.div>
  
              {/* 正文内容 */}
              <motion.div
                className="about-body-narrative"
                initial="hidden"
                animate={contentVisible ? "visible" : "hidden"}
                variants={mainContentVariant}
                custom={0.7}
              >
                {group.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </motion.div>
            </div>
          </div>
  
          {/* 【图三四大关键词】：从左到右逐个显示，同样带有动态运动模糊 */}
          <div className="about-keywords-stage">
            {/* 结构标尺微线与坐标十字 */}
            <div className="about-keywords-ruler" aria-hidden="true">
              <span className="about-ruler-mark">+ 001</span>
              <span className="about-ruler-mark">+ 002</span>
              <span className="about-ruler-mark">+ 003</span>
              <span className="about-ruler-mark">+ 004</span>
            </div>
  
            <div className="about-keywords-grid">
              {group.keywords.map((item, index) => (
                <motion.div
                  key={item.en}
                  className="about-kw-item"
                  initial="hidden"
                  animate={contentVisible ? "visible" : "hidden"}
                  variants={keywordVariant}
                  custom={index}
                >
                  {/* 辅助细引线与编号 */}
                  <div className="about-kw-guide" aria-hidden="true">
                    <span className="about-kw-dot" />
                    <span className="about-kw-line" />
                    <span className="about-kw-num">{item.num}</span>
                  </div>
  
                  {/* ============================================================
                      悬停交互层（四个框结构完全一致，仅文案不同）
  
                      层序（从下到上）：
                        · about-kw-title  —— 英文大词（LEARN / BUILD / SHARE / PASS ON）
                          标题【始终存在】，扫过时被色块压在下层，靠
                          mix-blend-mode 保持可见（见 CSS 注释）
                        · about-kw-zh     —— 原始中文释义（学习 / 创造 / 分享 / 传承）
                        · about-kw-sweep  —— 覆盖框：从左往右扫入（transform: scaleX）
                          底色 = 该框文字色 #073F73 的互补色 #734007，
                          字体色 = 页面背景色
                      ============================================================ */}
                  <div className="about-kw-body">
                    <span className="about-kw-en">{item.en}</span>
                    <span className="about-kw-zh">{item.zh}</span>
  
                    <span className="about-kw-sweep" aria-hidden="true">
                      <span className="about-kw-sweep-text">{item.hoverText}</span>
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

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
