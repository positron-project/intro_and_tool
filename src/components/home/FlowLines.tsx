import { motion, useReducedMotion } from 'framer-motion'

export function FlowLines() {
  const prefersReducedMotion = useReducedMotion()
  return (
    <div className="flow-lines-layer" aria-hidden="true">
      <svg
        className="flow-lines-svg"
        viewBox="0 0 1600 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* 线性渐变：从左向右自然延伸 */}
          <linearGradient id="flowGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8FC7D9" stopOpacity="0.1" />
            <stop offset="30%" stopColor="#8FC7D9" stopOpacity="0.55" />
            <stop offset="85%" stopColor="#82BED3" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8FC7D9" stopOpacity="0.2" />
          </linearGradient>

          {/* 箭头标记 */}
          <marker
            id="flowArrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M1 2 L8 5 L1 8" fill="none" stroke="#8FC7D9" strokeWidth="1.2" strokeLinecap="round" />
          </marker>
        </defs>

        {/* ------------------------------------------------------------
            Line 1: 穿行主线 (左中偏下 → 右上角)
            ------------------------------------------------------------ */}
        <path
          d="M 60 720 L 1520 180"
          stroke="url(#flowGrad1)"
          strokeWidth="1.1"
          markerEnd="url(#flowArrow)"
        />

        {/* ------------------------------------------------------------
            Line 2: 略低角度斜线 (左下 → 右中偏上)
            ------------------------------------------------------------ */}
        <path
          d="M 140 840 L 1560 360"
          stroke="url(#flowGrad1)"
          strokeWidth="0.95"
          opacity="0.85"
        />

        {/* ------------------------------------------------------------
            Line 3: 较高角度斜线 (左下偏中 → 右上)
            ------------------------------------------------------------ */}
        <path
          d="M 0 560 L 1480 80"
          stroke="url(#flowGrad1)"
          strokeWidth="0.9"
          opacity="0.7"
          markerEnd="url(#flowArrow)"
        />

        {/* ------------------------------------------------------------
            Line 4: 底部延伸细线 (左下底部 → 右下中段)
            ------------------------------------------------------------ */}
        <path
          d="M 280 880 L 1600 520"
          stroke="url(#flowGrad1)"
          strokeWidth="0.85"
          opacity="0.6"
        />

        {/* ------------------------------------------------------------
            Line 5: 顶部轻灵平行线
            ------------------------------------------------------------ */}
        <path
          d="M 320 460 L 1380 90"
          stroke="url(#flowGrad1)"
          strokeWidth="0.8"
          strokeDasharray="6 4"
          opacity="0.5"
        />

        {/* ------------------------------------------------------------
            节点微动效组：缓慢沿着轨道行进 (8s ~ 16s 周期)
            若开启减少动态效果，直接作为静态点呈现
            ------------------------------------------------------------ */}
        {/* Line 1 上的动态实心圆点 */}
        {!prefersReducedMotion ? (
          <motion.circle
            r="3"
            fill="#073F73"
            stroke="#8FC7D9"
            strokeWidth="1.5"
            animate={{
              x: [200, 1400],
              y: [670, 220],
            }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ) : (
          <circle cx="800" cy="445" r="3" fill="#073F73" stroke="#8FC7D9" strokeWidth="1.5" />
        )}

        {/* Line 1 上的空心环节点 */}
        <circle cx="850" cy="425" r="4.5" fill="#FAF8F2" stroke="#8FC7D9" strokeWidth="1.4" />

        {/* Line 2 上的细小菱形/方块 */}
        {!prefersReducedMotion ? (
          <motion.g
            animate={{
              x: [380, 1300],
              y: [760, 440],
            }}
            transition={{
              duration: 16,
              repeat: Infinity,
              ease: 'linear',
              delay: 3,
            }}
          >
            <rect
              width="5"
              height="5"
              fill="#8FC7D9"
              transform="rotate(45 2.5 2.5)"
            />
          </motion.g>
        ) : (
          <g transform="translate(840, 600)">
            <rect width="5" height="5" fill="#8FC7D9" transform="rotate(45 2.5 2.5)" />
          </g>
        )}

        {/* Line 2 上的静态小圆点 */}
        <circle cx="580" cy="690" r="2.5" fill="#8FC7D9" />
        <circle cx="1120" cy="510" r="2" fill="#8FC7D9" opacity="0.8" />

        {/* Line 3 上的空心小圆环 */}
        {!prefersReducedMotion ? (
          <motion.circle
            r="4"
            fill="#FAF8F2"
            stroke="#073F73"
            strokeWidth="1.2"
            animate={{
              x: [300, 1200],
              y: [460, 170],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'linear',
              delay: 1.5,
            }}
          />
        ) : (
          <circle cx="750" cy="315" r="4" fill="#FAF8F2" stroke="#073F73" strokeWidth="1.2" />
        )}

        {/* Line 4 上的静止小端点 */}
        <circle cx="700" cy="760" r="2.2" fill="#8FC7D9" />
      </svg>
    </div>
  )
}

