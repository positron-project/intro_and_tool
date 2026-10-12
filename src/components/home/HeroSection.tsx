import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { DUR, EASE_OUT, HERO_ENTER_DELAY } from './motion'

interface HeroSectionProps {
  onJoinClick?: () => void
  onToolsClick?: () => void
  isHeroActive?: boolean
}

export function HeroSection({ onJoinClick, onToolsClick, isHeroActive = true }: HeroSectionProps) {
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
      {/* 主标题入场动画：从左往右淡入 */}
      <motion.div
        className="hero-heading-group"
        initial={{ opacity: 0, x: -48 }}
        animate={isHeroActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -48 }}
        transition={{ duration: DUR.scene, delay: HERO_ENTER_DELAY, ease: EASE_OUT }}
      >
        <h1 className="hero-main-title">
          <span className="hero-title-line">学点技术</span>
          <span className="hero-title-line">做点东西</span>
        </h1>
      </motion.div>

      {/* 内容元素：从上往下淡入，先淡入上面的再淡入下面的 */}
      {/* 1. 副标题 */}
      <motion.div
        className="hero-subtitle-group"
        initial={{ opacity: 0, y: -24 }}
        animate={isHeroActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
        transition={{ duration: DUR.block, delay: HERO_ENTER_DELAY + 0.18, ease: EASE_OUT }}
      >
        <div className="hero-sub-title">计算机科技小组</div>
      </motion.div>

      {/* 2. 一句话说明 */}
      <motion.p
        className="hero-value-desc"
        initial={{ opacity: 0, y: -20 }}
        animate={isHeroActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: DUR.block, delay: HERO_ENTER_DELAY + 0.34, ease: EASE_OUT }}
      >
        学技术、做项目，把经验传给下一届。
      </motion.p>

      {/* 3. 行动按钮群 */}
      <motion.div
        className="hero-cta-group"
        initial={{ opacity: 0, y: -20 }}
        animate={isHeroActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: DUR.block, delay: HERO_ENTER_DELAY + 0.5, ease: EASE_OUT }}
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
