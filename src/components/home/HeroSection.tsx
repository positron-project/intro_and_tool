import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { DUR, EASE_OUT, SHIFT } from './motion'

interface HeroSectionProps {
  onJoinClick?: () => void
  onToolsClick?: () => void
}

export function HeroSection({ onJoinClick, onToolsClick }: HeroSectionProps) {
  const handleJoin = (e: React.MouseEvent) => {
    if (onJoinClick) {
      e.preventDefault()
      onJoinClick()
    } else {
      const el = document.getElementById('story-join')
      if (el) {
        e.preventDefault()
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const handleTools = (e: React.MouseEvent) => {
    if (onToolsClick) {
      e.preventDefault()
      onToolsClick()
    }
  }

  return (
    <div className="hero-typography-container">
      {/* 主标题入场动画 */}
      <motion.div
        className="hero-heading-group"
        initial={{ opacity: 0, y: SHIFT.block }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.scene, ease: EASE_OUT }}
      >
        <h1 className="hero-main-title">
          <span className="hero-title-line">学点技术</span>
          <span className="hero-title-line">做点东西</span>
        </h1>
      </motion.div>

      {/* 副标题 */}
      <motion.div
        className="hero-subtitle-group"
        initial={{ opacity: 0, y: SHIFT.text }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.scene, delay: 0.15, ease: EASE_OUT }}
      >
        <div className="hero-sub-title">计算机科技小组</div>
      </motion.div>

      {/* 一句话说明 */}
      <motion.p
        className="hero-value-desc"
        initial={{ opacity: 0, y: SHIFT.text }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.scene, delay: 0.25, ease: EASE_OUT }}
      >
        学技术、做项目，把经验传给下一届。
      </motion.p>

      {/* 行动按钮群 */}
      <motion.div
        className="hero-cta-group"
        initial={{ opacity: 0, y: SHIFT.text }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.scene, delay: 0.35, ease: EASE_OUT }}
      >
        <a
          href="#story-join"
          className="hero-btn-primary"
          onClick={handleJoin}
        >
          <span>加入我们</span>
          <ArrowUpRight size={15} className="hero-btn-icon" />
        </a>
        <a
          href="#/tools"
          className="hero-btn-secondary"
          onClick={handleTools}
        >
          <span>打开工作台</span>
          <span className="hero-btn-arrow" aria-hidden="true">→</span>
        </a>
      </motion.div>

    </div>
  )
}
