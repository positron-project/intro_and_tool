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

      {/* 副标题与收尾短横线 */}
      <motion.div
        className="hero-subtitle-group"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="hero-sub-title">计算机科技小组</div>
        <div className="hero-sub-rule" aria-hidden="true" />
      </motion.div>

      {/* 核心价值说明 */}
      <motion.p
        className="hero-value-desc"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        南昌航空大学科技学院计算机科技小组：一起学技术、做项目，把经验传给下一届。
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
          <span>进入工具站</span>
          <span className="hero-btn-arrow" aria-hidden="true">→</span>
        </a>
      </motion.div>

      {/* 事实数据指标 */}
      <motion.div
        className="hero-stats-row"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="hero-stat-item">
          <span className="hero-stat-number">280+</span>
          <span className="hero-stat-label">历届成员</span>
        </div>
        <div className="hero-stat-divider" aria-hidden="true" />
        <div className="hero-stat-item">
          <span className="hero-stat-number">5届</span>
          <span className="hero-stat-label">从没断过</span>
        </div>
        <div className="hero-stat-divider" aria-hidden="true" />
        <div className="hero-stat-item">
          <span className="hero-stat-number">60+</span>
          <span className="hero-stat-label">项目存档</span>
        </div>
      </motion.div>
    </div>
  )
}
