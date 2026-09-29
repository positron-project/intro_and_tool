import { useState } from 'react'
import { motion } from 'framer-motion'

interface CampusVisualProps {
  sketchSrc?: string
}

export function CampusVisual({
  sketchSrc = './assets/campus/campus-line-art.png',
}: CampusVisualProps) {
  const [sketchLoaded, setSketchLoaded] = useState(true)

  return (
    <div className="campus-visual-layer" aria-hidden="true">
      <motion.div
        className="campus-sketch-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.0, delay: 0.1, ease: 'easeOut' }}
      >
        {sketchLoaded && (
          <img
            src={sketchSrc}
            alt="南昌航空大学科技学院校训石与图书馆线稿图"
            className="campus-sketch-img"
            onError={() => setSketchLoaded(false)}
          />
        )}
      </motion.div>
    </div>
  )
}
