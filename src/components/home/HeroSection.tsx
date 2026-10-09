import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

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
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="hero-main-title">
          <span className="hero-title-line">学点技术</span>
          <span className="hero-title-line">做点东西</span>
        </h1>
      </motion.div>

      {/* 副标题 */}
      <motion.div
        className="hero-subtitle-group"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="hero-sub-title">计算机科技小组</div>
      </motion.div>

      {/* 一句话说明 */}
      <motion.p
        className="hero-value-desc"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        学技术、做项目，把经验传给下一届。
      </motion.p>

      {/* 行动按钮群 */}
      <motion.div
        className="hero-cta-group"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
