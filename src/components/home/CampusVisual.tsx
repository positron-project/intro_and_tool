import { useState } from 'react'
import { motion } from 'framer-motion'
import { HERO_ENTER_DELAY } from './motion'

interface CampusVisualProps {
  sketchSrc?: string
  sketchWebpSrc?: string
  isHeroActive?: boolean
}

export function CampusVisual({
  sketchSrc = './assets/campus/campus-line-art.png',
  sketchWebpSrc = './assets/campus/campus-line-art.webp',
  isHeroActive = true,
}: CampusVisualProps) {
  const [sketchLoaded, setSketchLoaded] = useState(true)

  return (
    <div className="campus-visual-layer" aria-hidden="true">
      <motion.div
        className="campus-sketch-container"
        initial={{ opacity: 0 }}
        animate={isHeroActive ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.0, delay: HERO_ENTER_DELAY + 0.25, ease: 'easeOut' }}
      >
        {sketchLoaded && (
          <picture>
            <source srcSet={sketchWebpSrc} type="image/webp" />
            <img
              src={sketchSrc}
              alt="南昌航空大学科技学院校训石与图书馆线稿图"
              className="campus-sketch-img"
              width="1440"
              height="900"
              decoding="async"
              onError={() => setSketchLoaded(false)}
            />
          </picture>
        )}
      </motion.div>
    </div>
  )
}
