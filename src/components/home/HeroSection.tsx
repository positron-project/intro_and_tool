import { motion } from 'framer-motion'

export function HeroSection() {
  return (
    <div className="hero-typography-container">
      {/* 主标题入场动画 */}
      <motion.div
        className="hero-heading-group"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="hero-main-title">
          <span className="hero-title-line">让知识</span>
          <span className="hero-title-line">持续发生</span>
        </h1>
      </motion.div>

      {/* 副标题与收尾短横线 */}
      <motion.div
        className="hero-subtitle-group"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="hero-sub-title">计算机小组-项目组</div>
        <div className="hero-sub-rule" aria-hidden="true" />
      </motion.div>
    </div>
  )
}
