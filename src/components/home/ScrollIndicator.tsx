import { motion, useReducedMotion } from 'framer-motion'

interface ScrollIndicatorProps {
  onClick?: () => void
}

export function ScrollIndicator({ onClick }: ScrollIndicatorProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <button
      className="scroll-indicator"
      onClick={onClick}
      aria-label="向下滑动查看更多内容"
    >
      {/* 极简精致的鼠标轮廓与内滚轮 */}
      <div className="scroll-mouse-icon" aria-hidden="true">
        <span className="scroll-mouse-wheel" />
      </div>

      {/* 优雅垂直导向细线 */}
      <div className="scroll-stem-line" aria-hidden="true">
        {!prefersReducedMotion && (
          <motion.div
            className="scroll-stem-pulse"
            animate={{
              y: [0, 24, 0],
              opacity: [0.3, 0.9, 0.3],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>

      {/* 英文大写轻盈标签 */}
      <span className="scroll-text">SCROLL</span>
    </button>
  )
}

