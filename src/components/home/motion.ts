/* ============================================================
   入口页动效语言（token + 入场 props 工厂）
   ------------------------------------------------------------
   首屏与 02–06 共用这一套时长 / 位移 / 交错；缓动只有两条：
   进场与所有 hover 回正共用 EASE_OUT，退场（抽屉、面板切换）用 EASE_IN。
   CSS 侧同一套值的 --motion-* 变量定义在 hero-poster.css 的
   .home-story-scroll 上，两处必须同步改。

   注意单位：这里全部是秒（framer-motion 口径），CSS 变量那边是毫秒。
   ============================================================ */
import { useCallback, useState } from 'react'

/** 进场与 hover 回正共用：easeOutExpo 系，收尾干脆（= CSS --motion-ease-out） */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const
/** 退场专用：对称缓入缓出，比进场更快更安静（= CSS --motion-ease-in） */
export const EASE_IN = [0.42, 0, 0.58, 1] as const

/** 时长阶梯（秒） */
export const DUR = {
  /** hover / press / 复制反馈 —— 160ms */
  micro: 0.16,
  /** 1px 线生长、面板切换 —— 400ms */
  element: 0.4,
  /** 标题 / 段落入场 —— 850ms */
  block: 0.85,
  /** 首屏整场编排 —— 900ms */
  scene: 0.9,
} as const

/** 位移阶梯（px） */
export const SHIFT = {
  /** 图标 / 按钮 —— 4px */
  micro: 4,
  /** 文本入场 —— 16px */
  text: 16,
  /** 整块入场 —— 24px */
  block: 24,
} as const

/** 同组交错的固定间隔（秒）；单组总长压在 0.24s 内，再多就成排队了。
 *  它同时也是「内容比标题晚多久出现」—— 调它就能把上滑整体往后推。 */
export const STAGGER = 0.09

export interface EnterOptions {
  /** 进场延迟（秒）；同组内按阅读顺序以 STAGGER 递增 */
  delay?: number
  /** 入场位移（px），默认文本档 */
  distance?: number
  /** 进入视口的触发比例；整节大块用 0.2，单行元素用 0.3 */
  amount?: number
  /** 时长档：DUR.block（默认）或 DUR.scene */
  duration?: number
}

/**
 * 入场 props：展开到 motion 元素上即可。
 * reduced-motion 由 main.tsx 的 <MotionConfig reducedMotion="user"> 统一降级
 * （transform 停用、只留透明度），这里不重复判断。
 */
export function fadeUp({ delay = 0, distance = SHIFT.text, amount = 0.3, duration = DUR.block }: EnterOptions = {}) {
  return {
    initial: { opacity: 0, y: distance },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount },
    transition: { duration, delay, ease: EASE_OUT },
  }
}

/** 列表项的 variants 版：配合 custom 逐条传延迟（04、05 这种逐条交错的场景）。
 *  键名必须叫 hidden / visible —— 各节用的是 initial="hidden" whileInView="visible"。 */
export const listItemVariants = {
  hidden: { opacity: 0, y: SHIFT.block },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DUR.block, delay, ease: EASE_OUT },
  }),
}

/**
 * 眉标那条 2px 强调杠的「先落」开关。
 * 进入视口时给 eyebrow 加上 .is-rule-in，由 poster-sections.css 播一次
 * 400ms 的 scaleX 生长，标题再按 STAGGER 跟上 —— 这就是「线先落，字后到」。
 */
export function useRuleIn() {
  const [shown, setShown] = useState(false)
  const onViewportEnter = useCallback(() => setShown(true), [])
  return { shown, onViewportEnter }
}
