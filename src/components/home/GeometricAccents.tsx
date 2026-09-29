import { motion } from 'framer-motion'

export function GeometricAccents() {
  return (
    <div className="geometric-accents-layer" aria-hidden="true">
      {/* ============================================================
          右上方大型倾斜色块 (Upper-Right Ribbon / Parallelogram)
          ============================================================ */}
      <motion.div
        className="geo-ribbon geo-ribbon-top-right"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.15, ease: 'easeOut' }}
      />

      {/* ============================================================
          右下方大型倾斜色块 (Lower-Right Ribbon / Parallelogram)
          ============================================================ */}
      <motion.div
        className="geo-ribbon geo-ribbon-bottom-right"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.22, ease: 'easeOut' }}
      />

      {/* ============================================================
          左下方大型浅蓝圆弧 (Lower-Left Arc / Circle)
          ============================================================ */}
      <motion.div
        className="geo-circle-arc"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
      />

      {/* ============================================================
          左下方倾斜浅蓝梯形 (Lower-Left Trapezoid Accent)
          ============================================================ */}
      <motion.div
        className="geo-trapezoid"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, delay: 0.25, ease: 'easeOut' }}
      />
    </div>
  )
}

