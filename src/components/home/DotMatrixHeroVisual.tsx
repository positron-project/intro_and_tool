import { useEffect, useRef, useCallback } from 'react'

interface Particle {
  originX: number
  originY: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseColor: string
  normX: number
  normY: number
}

interface AmbientMote {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  phase: number
  pulseSpeed: number
  isCrossStar: boolean
}

/*
 * ===== ak.hypergryph.com「点阵」交互模型 =====
 * 每帧对每颗点做三件事，顺序固定：
 *   1. 斥力：力 = ((R - d) / R)² × REPULSION_FORCE，方向由指针指向该点，累加到速度
 *   2. 归位：v += (origin - pos) × RETURN_SPEED（极弱的复位弹力，不是弹簧式急停）
 *   3. 摩擦：v ×= (1 - FRICTION)
 * 组合结果是「点被推开 → 带惯性滑行一段 → 从容漂回原位」。
 *
 * ⚠️ R 是**指针周围那个"完全不动"的核心**半径，不是"影响范围"。
 * 力的衰减是平方的（边缘趋近 0），所以真实的吃水感远比 R 小。
 * 现在按 520px 徽标标定为 70px（系数 0.135），观感是光标周围一个 ~70px 的小坑，
 * 而不是一个大空洞 —— 早期 0.23（≈105px）配 1.8 的力太猛，会撑出一大片空白。
 */
const REPULSION_RADIUS_RATIO = 0.135 // × 徽标显示边长（520px 徽标 ≈ 70px）
const REPULSION_RADIUS_MIN = 56
const REPULSION_RADIUS_MAX = 90
const REPULSION_FORCE = 1.3 // 力的强度；与半径一起决定坑的大小，调好吃水感要靠实测
const FRICTION = 0.15
const RETURN_SPEED = 0.01
const FRAME_MS = 1000 / 60
const MAX_FRAME_MS = 50 // 掉帧时钳制步长，避免一次性炸开
// 指针落在容器外这个距离内仍视为有效，让边缘的点阵不会突然失去受力
const EDGE_MARGIN = 36
const PARALLAX_RANGE = 4.5
// 点阵颗粒大小（半径 px）：越小颗粒越分明、留白越足，越接近官网那种细密星点观感
const DOT_RADIUS_BASE = 1.15
const DOT_RADIUS_JITTER = 0.2

/*
 * 边缘软化参数。
 * 源图边缘本来带着抗锯齿的覆盖率，但硬阈值会把它压成 0/1，斜边于是成为台阶。
 * 改成按网格单元的平均覆盖率取一段斜坡：覆盖率 ≤ LO 完全不画，≥ HI 按满强度画，
 * 中间线性过渡，并把过渡区颗粒的半径与不透明度一起收窄，
 * 让边界读起来是渐隐而不是切断。LO 取 0.2 是因为硬阈值 85 只对应约 33% 覆盖率，
 * 等于刚过三成就在满强度落点，斜边被向外撑出一圈。
 */
const COVERAGE_LO = 0.2
const COVERAGE_HI = 0.62
const EDGE_RADIUS_MIN = 0.62
const EDGE_ALPHA_MIN = 0.35

const DOT_BASE_COLORS: Array<[number, number, number, number]> = [
  [7, 63, 115, 0.86], // 品牌学术深蓝
  [14, 116, 144, 0.88], // 湖蓝
  [130, 190, 211, 0.82], // 冰蓝
]

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v)

export function DotMatrixHeroVisual() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const motesRef = useRef<AmbientMote[]>([])
  const repulsionRadiusRef = useRef(REPULSION_RADIUS_MIN)
  const mouseRef = useRef({
    x: -9999,
    y: -9999,
    active: false,
    tiltX: 0,
    tiltY: 0,
    targetTiltX: 0,
    targetTiltY: 0,
  })

  const animFrameId = useRef<number>(0)

  // 1. 初始化明日方舟 World 风格环境浮游星芒微粒
  const initAmbientMotes = useCallback((w: number, h: number) => {
    const motes: AmbientMote[] = []
    const count = 16
    for (let i = 0; i < count; i++) {
      motes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22 - 0.04,
        radius: Math.random() * 1.3 + 0.8,
        alpha: Math.random() * 0.45 + 0.2,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.02,
        isCrossStar: Math.random() > 0.55,
      })
    }
    motesRef.current = motes
  }, [])

  // 2. 核心点阵采样：正方形精密紧凑网格
  const sampleLogo = useCallback((w: number, h: number, img: HTMLImageElement) => {
    const offscreen = document.createElement('canvas')
    const offCtx = offscreen.getContext('2d')
    if (!offCtx) return

    const logoSize = Math.floor(Math.min(w * 0.88, h * 0.88, 520))
    offscreen.width = logoSize
    offscreen.height = logoSize

    offCtx.clearRect(0, 0, logoSize, logoSize)
    offCtx.drawImage(img, 0, 0, logoSize, logoSize)

    const imgData = offCtx.getImageData(0, 0, logoSize, logoSize)
    const data = imgData.data

    // 斥力半径随徽标实际显示尺寸等比缩放，保证各断点手感一致
    repulsionRadiusRef.current = Math.min(
      REPULSION_RADIUS_MAX,
      Math.max(REPULSION_RADIUS_MIN, logoSize * REPULSION_RADIUS_RATIO),
    )

    const step = logoSize < 360 ? 5.0 : 5.8
    const offsetX = (w - logoSize) / 2
    const offsetY = (h - logoSize) / 2

    const particles: Particle[] = []

    for (let y = 0; y < logoSize; y += step) {
      for (let x = 0; x < logoSize; x += step) {
        // 取整个网格单元的平均覆盖率，而不是单元格左上角那一个像素：
        // step 不是整数，单像素取样会让相位逐行漂移，把斜边切成参差的毛刺。
        const xEnd = Math.min(logoSize, Math.floor(x + step))
        const yEnd = Math.min(logoSize, Math.floor(y + step))
        let coverageSum = 0
        let coverageCount = 0
        for (let sy = Math.floor(y); sy < yEnd; sy += 1) {
          for (let sx = Math.floor(x); sx < xEnd; sx += 1) {
            const si = (sy * imgData.width + sx) * 4
            coverageSum +=
              (data[si] * 0.299 + data[si + 1] * 0.587 + data[si + 2] * 0.114) *
              (data[si + 3] / 255)
            coverageCount += 1
          }
        }

        // coverage：0 = 完全在形状外，1 = 完全在形状内；k 是软化后的边缘强度
        const coverage = coverageCount > 0 ? coverageSum / coverageCount / 255 : 0
        const k = clamp((coverage - COVERAGE_LO) / (COVERAGE_HI - COVERAGE_LO), 0, 1)
        if (k > 0) {
          const originX = offsetX + x
          const originY = offsetY + y
          const normX = x / logoSize
          const normY = y / logoSize

          let palette = DOT_BASE_COLORS[0]
          if (normX > 0.65 || normY < 0.35) {
            palette = DOT_BASE_COLORS[1]
          } else if (Math.random() > 0.78) {
            palette = DOT_BASE_COLORS[2]
          }
          const [cr, cg, cb, ca] = palette

          particles.push({
            originX,
            originY,
            x: originX,
            y: originY,
            vx: 0,
            vy: 0,
            // 半径与不透明度都随 k 收窄：边界上的颗粒更小更淡，读起来是渐隐而非切断
            radius:
              (DOT_RADIUS_BASE + Math.random() * DOT_RADIUS_JITTER * k) *
              (EDGE_RADIUS_MIN + (1 - EDGE_RADIUS_MIN) * k),
            baseColor: `rgba(${cr}, ${cg}, ${cb}, ${(
              ca * (EDGE_ALPHA_MIN + (1 - EDGE_ALPHA_MIN) * k)
            ).toFixed(3)})`,
            normX,
            normY,
          })
        }
      }
    }

    particlesRef.current = particles
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let currentW = container.clientWidth
    let currentH = container.clientHeight

    // 朝向的参考系 = 整个 hero 视口，而不是点阵自己那个小画布。
    // 这样鼠标在 hero 页任意位置（左侧文案、底部、甚至画布外）都能带动点阵朝向，
    // 而不是只有指针贴着画布时才响应。
    let heroRect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
    let canvasRect = { left: 0, top: 0 }

    const measureRects = () => {
      if (!container || !canvas) return
      const hero =
        container.closest('#story-hero') ||
        container.closest('.home-hero-viewport') ||
        container.parentElement
      const heroEl = hero instanceof HTMLElement ? hero : null
      if (heroEl) {
        const r = heroEl.getBoundingClientRect()
        heroRect = { left: r.left, top: r.top, width: r.width || 1, height: r.height || 1 }
      } else {
        heroRect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
      }
      const cr = canvas.getBoundingClientRect()
      canvasRect = { left: cr.left, top: cr.top }
    }

    const logoImg = new Image()
    logoImg.src = './assets/hero-dot-logo.png'

    const handleResize = () => {
      if (!container || !canvas) return
      const rect = container.getBoundingClientRect()
      currentW = Math.max(rect.width, 320)
      currentH = Math.max(rect.height, 320)

      // 半径约 1px 的小圆在 1× 屏（含 Windows 125% 缩放）上只有 1× 的落笔精度，
      // 颗粒自身也发毛。把下限提到 2 让浏览器缩采样，代价只是填充面积 ×4。
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)
      canvas.width = currentW * dpr
      canvas.height = currentH * dpr
      canvas.style.width = `${currentW}px`
      canvas.style.height = `${currentH}px`
      ctx.resetTransform?.()
      ctx.scale(dpr, dpr)

      measureRects()

      initAmbientMotes(currentW, currentH)
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        sampleLogo(currentW, currentH, logoImg)
      }
    }

    logoImg.onload = () => {
      handleResize()
    }

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(container)

    /*
     * 指针处理分两件事，参考系刻意不同：
     *   1. 朝向（视差）：以**整个 hero 视口**为参考系，鼠标在 hero 页任何位置都能带动点阵朝向
     *   2. 受力（斥力球）：以**画布**为参考系，只有指针贴着点阵时才施加力，半径恒定
     * 两者都只取决于指针当前位置，不涉及位移/速度。
     */
    const handlePointerSample = (clientX: number, clientY: number) => {
      const m = mouseRef.current

      // --- 朝向：hero 视口归一化坐标 → 倾斜目标 ---
      const heroCx = heroRect.left + heroRect.width / 2
      const heroCy = heroRect.top + heroRect.height / 2
      const halfHeroW = heroRect.width / 2 || 1
      const halfHeroH = heroRect.height / 2 || 1
      // 水平方向用整个 hero 宽度；垂直方向因为 hero 很高（有时是 100vh+），
      // 直接用半高会太迟钝，所以收窄到画布尺度再放大，手感更跟手
      const rangeX = PARALLAX_RANGE
      const rangeY = PARALLAX_RANGE * 1.6
      m.targetTiltX = clamp(((clientX - heroCx) / halfHeroW) * rangeX, -rangeX, rangeX)
      m.targetTiltY = clamp(((clientY - heroCy) / halfHeroH) * rangeY, -rangeY, rangeY)

      // --- 受力：画布局部坐标 ---
      const nx = clientX - canvasRect.left
      const ny = clientY - canvasRect.top
      m.x = nx
      m.y = ny
      m.active =
        nx > -EDGE_MARGIN &&
        nx < currentW + EDGE_MARGIN &&
        ny > -EDGE_MARGIN &&
        ny < currentH + EDGE_MARGIN
    }

    const handleMouseMove = (e: MouseEvent) => {
      // 布局可能因为页面滚动/其他版块展开而变动，按需重测（不每帧测，避免强制 layout）
      if (e.clientX < heroRect.left - 1 || e.clientX > heroRect.left + heroRect.width + 1) {
        measureRects()
      }
      handlePointerSample(e.clientX, e.clientY)
    }

    const deactivatePointer = () => {
      const m = mouseRef.current
      m.active = false
      m.targetTiltX = 0
      m.targetTiltY = 0
    }

    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      measureRects()
      handlePointerSample(touch.clientX, touch.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', measureRects, { passive: true })
    document.documentElement.addEventListener('mouseleave', deactivatePointer)
    window.addEventListener('blur', deactivatePointer)
    window.addEventListener('resize', measureRects)
    container.addEventListener('touchstart', handleTouch, { passive: true })
    container.addEventListener('touchmove', handleTouch, { passive: true })
    container.addEventListener('touchend', deactivatePointer, { passive: true })
    container.addEventListener('touchcancel', deactivatePointer, { passive: true })

    // 动画动力学循环
    let lastTime = performance.now()

    const render = (now: number) => {
      const dt = Math.min(Math.max(now - lastTime, 1), MAX_FRAME_MS)
      lastTime = now
      // 把物理常数（按 60fps 标定）换算到真实帧间隔，120Hz/掉帧时手感一致
      const dtScale = dt / FRAME_MS

      ctx.clearRect(0, 0, currentW, currentH)

      const mouse = mouseRef.current
      const particles = particlesRef.current
      const motes = motesRef.current
      const radius = repulsionRadiusRef.current

      // 视差平滑跟随
      const tiltK = Math.min(1, 0.08 * dtScale)
      mouse.tiltX += (mouse.targetTiltX - mouse.tiltX) * tiltK
      mouse.tiltY += (mouse.targetTiltY - mouse.tiltY) * tiltK

      // 1. 绘制明日方舟风格等边三角几何底图
      ctx.save()
      ctx.strokeStyle = 'rgba(130, 190, 211, 0.13)'
      ctx.lineWidth = 0.65
      const triSize = 64
      const rowHeight = (triSize * Math.sqrt(3)) / 2

      ctx.beginPath()
      for (let y = -rowHeight; y <= currentH + rowHeight; y += rowHeight) {
        ctx.moveTo(0, y)
        ctx.lineTo(currentW, y)
      }
      for (let x = -currentH; x <= currentW + currentH; x += triSize) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x + currentH / Math.sqrt(3), currentH)
      }
      for (let x = -currentH; x <= currentW + currentH; x += triSize) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x - currentH / Math.sqrt(3), currentH)
      }
      ctx.stroke()
      ctx.restore()

      // 2. 绘制明日方舟 World 风格环境浮游微粒
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i]
        m.x += m.vx
        m.y += m.vy
        m.phase += m.pulseSpeed

        if (m.x < 0) m.x = currentW
        if (m.x > currentW) m.x = 0
        if (m.y < 0) m.y = currentH
        if (m.y > currentH) m.y = 0

        const pulseAlpha = Math.max(0.12, m.alpha * (0.65 + Math.sin(m.phase) * 0.35))
        ctx.fillStyle = `rgba(130, 190, 211, ${pulseAlpha})`

        if (m.isCrossStar && Math.sin(m.phase) > 0.4) {
          const r = m.radius * 1.5
          ctx.beginPath()
          ctx.moveTo(m.x - r, m.y)
          ctx.lineTo(m.x + r, m.y)
          ctx.moveTo(m.x, m.y - r)
          ctx.lineTo(m.x, m.y + r)
          ctx.strokeStyle = `rgba(143, 199, 217, ${pulseAlpha * 0.95})`
          ctx.lineWidth = 0.8
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // 3. 点阵受力与积分
      // 斥力球**只认指针当前位置**这一个点：半径恒为 radius，不随移动速度或滑动过程变化。
      // （早先用「上一帧位置→当前位置」的线段来算，等价于把球拉长成胶囊 ——
      //  滑动中有效作用范围会被撑大、停手后又缩回，这正是要避免的现象。）
      const repX = mouse.x
      const repY = mouse.y

      // 逐帧算一次的粗筛包围盒，绝大多数远离指针的点可跳过 sqrt
      const boundMinX = repX - radius
      const boundMaxX = repX + radius
      const boundMinY = repY - radius
      const boundMaxY = repY + radius

      const damping = Math.pow(1 - FRICTION, dtScale)
      const returnStep = RETURN_SPEED * dtScale
      const forceScale = REPULSION_FORCE * dtScale
      const active = mouse.active

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // 视差基准点（目标的最终归位位置）
        const restX = p.originX + mouse.tiltX * (1 + p.normX * 0.4)
        const restY = p.originY + mouse.tiltY * (1 + p.normY * 0.4)

        if (
          active &&
          p.x >= boundMinX &&
          p.x <= boundMaxX &&
          p.y >= boundMinY &&
          p.y <= boundMaxY
        ) {
          const dx = p.x - repX
          const dy = p.y - repY
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < radius) {
            const ratio = (radius - dist) / radius
            const force = ratio * ratio * forceScale
            const inv = force / (dist || 1)
            p.vx += dx * inv
            p.vy += dy * inv
          }
        }

        // 极弱复位弹力：推得越远回得越快，但全过程都不急停
        p.vx += (restX - p.x) * returnStep
        p.vy += (restY - p.y) * returnStep

        // 摩擦衰减
        p.vx *= damping
        p.vy *= damping

        p.x += p.vx * dtScale
        p.y += p.vy * dtScale

        // 完全静止后吸附回原位，消除长期亚像素抖动
        if (
          !active &&
          Math.abs(mouse.tiltX) < 0.02 &&
          Math.abs(mouse.tiltY) < 0.02 &&
          Math.abs(p.x - restX) < 0.05 &&
          Math.abs(p.y - restY) < 0.05 &&
          Math.abs(p.vx) < 0.01 &&
          Math.abs(p.vy) < 0.01
        ) {
          p.x = restX
          p.y = restY
          p.vx = 0
          p.vy = 0
        }

        ctx.fillStyle = p.baseColor
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      animFrameId.current = requestAnimationFrame(render)
    }

    animFrameId.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animFrameId.current)
      resizeObserver.disconnect()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', measureRects)
      window.removeEventListener('resize', measureRects)
      document.documentElement.removeEventListener('mouseleave', deactivatePointer)
      window.removeEventListener('blur', deactivatePointer)
      container.removeEventListener('touchstart', handleTouch)
      container.removeEventListener('touchmove', handleTouch)
      container.removeEventListener('touchend', deactivatePointer)
      container.removeEventListener('touchcancel', deactivatePointer)
    }
  }, [initAmbientMotes, sampleLogo])

  return (
    <div
      ref={containerRef}
      className="dot-matrix-hero-visual"
      aria-label="计算机科技小组 · 点阵徽标"
      role="img"
    >
      <canvas ref={canvasRef} className="dot-matrix-canvas" />
    </div>
  )
}
