import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import './about-section.css'

interface AboutSectionProps {
  onNavigate?: (path: string) => void
  onNextSection?: () => void
  isPastTrigger?: boolean
}

/* ============================================================
   居中入场动画的「只播一次」闸门
   ------------------------------------------------------------
   需求：仅当用户【首次】从 hero 向下滑入「我们是谁」时播放一次。
   从「我们是谁」上滑回 hero、再下滑进入时，不得重播。

   判定思路 —— 这是【上升沿 + 首次】的与运算，而非单纯的布尔值：
     · risingEdge : isPastTrigger 由 false→true 的那一帧，才算"进入"
       （只认状态翻转，滑动过程中值为 true 的持续段不会重复触发）
     · hasPlayed  : 模块级持久标记。一旦播放过，任何后续上升沿都被吞掉，
       入场元素直接停在"已完成"的终态（isEntranceDone=true），不再动画。

   区分「正向进入」与「回滑再进入」：
     回滑到 hero 后 isPastTrigger 会回落为 false，但因为 hasPlayed 已是 true，
     下一次上升沿不会重新启动入场；同时用一个 0 时长的 reflow 技巧把入场元素
     "跳"到终态（不播动画），保证视觉静止。
   ============================================================ */

/** 动画完成后的静置延时：入场序列最长约 0.75s + 3×0.14s ≈ 1.2s，留足余量 */
const ENTRANCE_SETTLE_MS = 1400

const KEYWORDS = [
  {
    en: 'LEARN',
    num: '01',
    zh: '学习',
    /** 覆盖后展示的完整文案 */
    hoverText: '我们热爱学习',
  },
  {
    en: 'BUILD',
    num: '02',
    zh: '创造',
    hoverText: '我们积极创造',
  },
  {
    en: 'SHARE',
    num: '03',
    zh: '分享',
    hoverText: '我们善于分享',
  },
  {
    en: 'PASS ON',
    num: '04',
    zh: '传承',
    hoverText: '我们致力传承',
  },
]

export function AboutSection({
  onNavigate,
  onNextSection,
  isPastTrigger = true,
}: AboutSectionProps) {
  /* 是否已完成入场（已完成 = 元素处于终态静止，不再参与动画） */
  const [isEntranceDone, setIsEntranceDone] = useState(false)
  /* 本次上升沿是否应当真正播放动画 */
  const [isEntrancePlaying, setIsEntrancePlaying] = useState(false)

  /* 是否已经播放过入场动画 —— 用 ref 而非 state：
     它只需在生命周期内持久记录，不参与渲染，避免额外的重渲染 */
  const hasPlayedEntranceRef = useRef(false)
  /* 上一次的 isPastTrigger，用于检测上升沿 */
  const prevPastTriggerRef = useRef(false)
  /* 定时器句柄 */
  const settleTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const prev = prevPastTriggerRef.current
    prevPastTriggerRef.current = isPastTrigger

    /* ---- 情况 A：下滑进入（false → true 上升沿） ---- */
    if (!prev && isPastTrigger) {
      if (hasPlayedEntranceRef.current) {
        /* 回滑后再进入：标记为已完成，元素直接静置在终态，不播动画 */
        setIsEntrancePlaying(false)
        setIsEntranceDone(true)
      } else {
        /* 首次正向进入：播放 */
        hasPlayedEntranceRef.current = true
        setIsEntranceDone(false)
        setIsEntrancePlaying(true)

        if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current)
        settleTimerRef.current = window.setTimeout(() => {
          /* 播放结束 → 落到终态静止 */
          setIsEntrancePlaying(false)
          setIsEntranceDone(true)
        }, ENTRANCE_SETTLE_MS)
      }
      return
    }

    /* ---- 情况 B：回到 hero（true → false 下降沿） ----
       只记录标记，不动 hasPlayedEntranceRef；元素保持终态避免闪烁 */
    if (prev && !isPastTrigger) {
      return
    }
  }, [isPastTrigger])

  /* 卸载时清掉定时器，避免在已卸载组件上 setState */
  useEffect(() => {
    return () => {
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current)
    }
  }, [])

  /* ============================================================
     入场是否应当呈现为"已展开"（决定插值终态）

     ⚠️ 这里刻意【不再】与 isPastTrigger 做与运算：
     一旦入场开始（或已完成），它就是不可逆的。
     否则用户在动画播到一半时上滑回 hero，contentVisible 会翻回 false，
     元素跟着退回 hidden —— 下次进入时 hasPlayedEntranceRef 已是 true，
     于是动画永远停在半途、再也播不完整（这正是"回滑再进入动画静止不动"的来源）。
     ============================================================ */
  const contentVisible = isEntrancePlaying || isEntranceDone

  /* ============================================================
     1. 图二变体：左侧章节系统（02 / ABOUT US）率先从左侧滑入淡入
     ============================================================ */
  const chapterVariant = {
    hidden: { opacity: 0, x: -46, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.65,
        delay: 0.08,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  }

  /* ============================================================
     2. 剩下内容变体：主标题、引言、正文——在图二淡入完毕后触发
        从下往上升起，且带有极为细腻的动态运动模糊 (filter: blur)
     ============================================================ */
  const mainContentVariant = {
    hidden: { opacity: 0, y: 38, filter: 'blur(14px)' },
    visible: (customDelay: number = 0.5) => ({
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.8,
        delay: customDelay,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    }),
  }

  /* ============================================================
     3. 图三四大关键词变体：从左到右逐个显示，同样带有动态运动模糊
     ============================================================ */
  const keywordVariant = {
    hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.7,
        delay: 0.75 + index * 0.14, // 从左至右阶梯式触发
        ease: [0.16, 1, 0.3, 1] as const,
      },
    }),
  }

  /* 回滑再进入时（已完成但未在播放），需要把元素【瞬间】放到终态、
     不产生任何动画。

     ⚠️ 不能用组件上的 `transition` prop 去覆盖 —— Framer Motion 里
     变体自带的 `transition` 优先级高于组件级 `transition`，会被忽略。
     唯一可靠的做法是把终态直接写进变体本身，因此这里按 `isInstant`
     解析出两套变体（播放用带动画的，静置用零位移的纯终态）。 */
  const isInstant = contentVisible && !isEntrancePlaying

  const chapterVariantResolved = isInstant
    ? {
        hidden: { opacity: 1, x: 0, filter: 'blur(0px)' },
        visible: { opacity: 1, x: 0, filter: 'blur(0px)' },
      }
    : chapterVariant

  const mainContentVariantResolved = isInstant
    ? {
        hidden: { opacity: 1, y: 0, filter: 'blur(0px)' },
        visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
      }
    : mainContentVariant

  const keywordVariantResolved = isInstant
    ? {
        hidden: { opacity: 1, y: 0, filter: 'blur(0px)' },
        visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
      }
    : keywordVariant

  return (
    <section
      id="story-about"
      className="about-section-viewport"
      data-entrance-state={isEntrancePlaying ? 'playing' : isEntranceDone ? 'done' : 'idle'}
      aria-label="02 · 关于项目组介绍"
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
          前置居中悬念大字：在 02 入场区域（红箭头所指高度与居中位置）纯净呈现
          当用户向下滚动越过触发线后，此字平滑模糊淡出，02 完整系统随即有序展开

          ⚠️ 只播一次：contentVisible 为真即表示"已经播放过或正在播放"，
          回滑再进入时 contentVisible 恒为 true，AnimatePresence 不会重新挂载该节点
          （key 稳定），因此悬念字保持已淡出的静止状态，不重播
          ============================================================ */}
      <AnimatePresence>
        {!contentVisible && (
          <motion.div
            className="about-teaser-centered"
            key="about-teaser-center"
            initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(16px)' }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="about-teaser-title">我们是谁？</span>
            <span className="about-teaser-en">WHO WE ARE</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          主体内容排版层 (在首次滑入越过触发线后，分阶段启动入场动画)
          ============================================================ */}
      <div
        className="about-content-stage"
        style={{
          opacity: contentVisible ? 1 : 0,
          transition: isInstant ? 'none' : 'opacity 0.25s ease',
          pointerEvents: contentVisible ? 'auto' : 'none',
        }}
      >
        {/* 上半部：左章节标 + 中部叙事 */}
        <div className="about-top-grid">
          {/* 【图二元素】：左侧章节系统（02 / 细蓝线 / ABOUT US）——率先从左侧淡入 */}
          <motion.div
            className="about-chapter-column"
            initial="hidden"
            animate={contentVisible ? "visible" : "hidden"}
            variants={chapterVariantResolved}
          >
            <span className="about-chapter-num">02</span>
            <div className="about-chapter-rule" />
            <span className="about-chapter-label">ABOUT US</span>
          </motion.div>

          {/* 【剩下内容】：在图二淡入完毕后触发，从下往上升起，带有动态运动模糊 */}
          <div className="about-main-column">
            {/* 主标题行 */}
            <motion.div
              className="about-title-row"
              initial="hidden"
              animate={contentVisible ? "visible" : "hidden"}
              variants={mainContentVariantResolved}
              custom={0.45}
            >
              <h2 className="about-main-title">我们是谁？</h2>
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
              variants={mainContentVariantResolved}
              custom={0.58}
            >
              <span className="about-quote-line">从学习一门技术，</span>
              <span className="about-quote-line">到真正做出一个东西。</span>
            </motion.div>

            {/* 正文内容 */}
            <motion.div
              className="about-body-narrative"
              initial="hidden"
              animate={contentVisible ? "visible" : "hidden"}
              variants={mainContentVariantResolved}
              custom={0.7}
            >
              <p>
                计算机小组 · 项目组，是一群喜欢技术、也喜欢把想法真正做出来的同学。
              </p>
              <p>
                我们一起学习、开发和维护属于自己的项目，在实践中积累经验，也把过程中沉淀下来的知识、工具和资源分享给后来的人。
              </p>
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
            {KEYWORDS.map((item, index) => (
              <motion.div
                key={item.en}
                className="about-kw-item"
                initial="hidden"
                animate={contentVisible ? "visible" : "hidden"}
                variants={keywordVariantResolved}
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
