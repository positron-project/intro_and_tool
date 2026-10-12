import { useState, useEffect, useRef, useCallback } from 'react'
import { Code2, FolderGit2, Server, Trophy } from 'lucide-react'
import './home-loading.css'

interface HomeLoadingScreenProps {
  onComplete?: () => void
  onUnmount?: () => void
}

/** 预加载图片资源清单（全站核心素材） */
const IMAGES_TO_PRELOAD = [
  // 首屏与品牌
  '/assets/home-hero-glow.webp',
  './assets/campus/campus-line-art.webp',
  './assets/campus/campus-line-art.png',
  '/assets/brand-mark.svg',
  '/assets/college-wordmark.svg',
  // 作品展示精选截图
  '/assets/showcase/shop-01-home.webp',
  '/assets/showcase/lijing-01-home.webp',
  '/assets/showcase/acg-hut-01-home.webp',
  '/assets/showcase/data-board-01-home.webp',
  '/assets/showcase/genshin-concert-01-home.webp',
  '/assets/showcase/music-app-01-home.webp',
  // 小组推荐配图
  '/assets/picks-minecraft-base.webp',
  '/assets/picks-tools-page.webp',
  // 能力图谱与联系方式
  './assets/capabilities/frontend.webp',
  './assets/capabilities/backend.webp',
  './assets/capabilities/teamwork.webp',
  './assets/capabilities/management.webp',
  './assets/capabilities/contest.webp',
  './assets/capabilities/rules.webp',
  './assets/capabilities/algorithm.webp',
  './assets/capabilities/training.webp',
  './assets/capabilities/pwn.webp',
  './assets/capabilities/reverse.webp',
  './assets/capabilities/web.webp',
  './assets/capabilities/crypto.webp',
  './assets/project-group-qrcode.png',
]

/** 居中轮播元素定义：程序 + 项目 + 服务器 + 奖杯 + 南航科院logo（0.2秒一个） */
type CarouselItem = {
  id: string
  label: string
  type: 'icon' | 'logo'
  icon?: typeof Code2
}

const CAROUSEL_ITEMS: CarouselItem[] = [
  { id: 'code', label: '程序', type: 'icon', icon: Code2 },
  { id: 'project', label: '项目', type: 'icon', icon: FolderGit2 },
  { id: 'server', label: '服务器', type: 'icon', icon: Server },
  { id: 'trophy', label: '奖杯', type: 'icon', icon: Trophy },
  { id: 'nchu-logo', label: '南航科院', type: 'logo' },
]

/** 左下方栈事件日志（关键节点 + 趣味极客文案，随进度依次压栈） */
interface LogMilestone {
  threshold: number
  tag: string
  text: string
}

const LOG_MILESTONES: LogMilestone[] = [
  { threshold: 4, tag: 'INIT', text: 'HTML DOM 骨架解析完成' },
  { threshold: 12, tag: 'SYS', text: '唤醒沉睡的编译器与技术灵感' },
  { threshold: 20, tag: 'CONN', text: '正在建立与南航科院的神经连接...' },
  { threshold: 28, tag: 'CACHE', text: '读取往届学长留下的传家宝代码' },
  { threshold: 36, tag: 'WARN', text: '检测到 1 个祖传彩蛋，正在小心绕过...' },
  { threshold: 45, tag: 'IMG', text: '正在下载首屏背景与校园线稿图...' },
  { threshold: 54, tag: 'SYS', text: '正在为南航科院服务器浇水以提升主频...' },
  { threshold: 62, tag: 'RES', text: '绿易坊与精选作品展示截图就绪' },
  { threshold: 70, tag: 'STYLE', text: '注入暖白纸底与深青蓝交互光晕' },
  { threshold: 78, tag: 'DEBUG', text: '正在将 Bug 重新命名为「系统特性」...' },
  { threshold: 85, tag: 'ASSET', text: '小组方向矩阵与能力图谱下载完毕' },
  { threshold: 92, tag: 'TEST', text: '编译通过：0 错误，0 警告（骗你的）' },
  { threshold: 97, tag: 'IMG', text: '全站所需核心图片资源下载完成 (100%)' },
  { threshold: 100, tag: 'READY', text: '准备就绪，欢迎来到计算机科技小组！' },
]

interface StackLogItem {
  id: string
  tag: string
  text: string
}

export function HomeLoadingScreen({ onComplete, onUnmount }: HomeLoadingScreenProps) {
  // 居中轮播状态（0.2秒一个）
  const [carouselIndex, setCarouselIndex] = useState(0)

  // 进度状态（0 - 100）
  const [progress, setProgress] = useState(0)

  // 左下方栈状态（最多 8 项）
  const [stack, setStack] = useState<StackLogItem[]>([])

  // 是否正在淡出退场
  const [isExiting, setIsExiting] = useState(false)

  // 引用追踪已触发的日志阈值，防止重复触发
  const triggeredMilestonesRef = useRef<Set<number>>(new Set())

  // 是否已完成全部图片下载
  const imagesDoneRef = useRef(false)
  const isCompletedRef = useRef(false)

  // 1. 居中元素 0.2 秒轮播一个
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % CAROUSEL_ITEMS.length)
    }, 200)
    return () => clearInterval(timer)
  }, [])

  // 推入栈日志：往最下面放入；达到第 8 个时最顶上的删除，下方继续推入
  const pushStackMessage = useCallback((tag: string, text: string) => {
    const newItem: StackLogItem = {
      id: `${Date.now()}-${Math.random()}`,
      tag,
      text,
    }
    setStack((prev) => {
      if (prev.length >= 8) {
        // 最顶上的删除，新的推入最底部，维持最多 8 个
        return [...prev.slice(1), newItem]
      }
      return [...prev, newItem]
    })
  }, [])

  // 2. 真实图片预加载
  useEffect(() => {
    let loadedCount = 0
    const total = IMAGES_TO_PRELOAD.length

    const handleSingleImageLoaded = () => {
      loadedCount++
      if (loadedCount >= total) {
        imagesDoneRef.current = true
      }
    }

    IMAGES_TO_PRELOAD.forEach((src) => {
      const img = new Image()
      img.onload = handleSingleImageLoaded
      img.onerror = handleSingleImageLoaded
      img.src = src
    })
  }, [])

  // 3. 平滑推进进度与栈动画
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          return 100
        }

        // 当达到 95% 时，等待图片真实下载完成才冲刺到 100%
        if (prev >= 95 && !imagesDoneRef.current) {
          return 95
        }

        const step = prev < 50 ? 2 : prev < 85 ? 2 : 1
        const next = Math.min(100, prev + step)
        if (next >= 100) {
          clearInterval(timer)
        }
        return next
      })
    }, 45)

    return () => clearInterval(timer)
  }, [])

  // 4. 监听进度推进栈动画
  useEffect(() => {
    LOG_MILESTONES.forEach((milestone) => {
      if (progress >= milestone.threshold && !triggeredMilestonesRef.current.has(milestone.threshold)) {
        triggeredMilestonesRef.current.add(milestone.threshold)
        pushStackMessage(milestone.tag, milestone.text)
      }
    })
  }, [progress, pushStackMessage])

  // 5. 加载完成触发淡出
  useEffect(() => {
    if (progress >= 100 && !isCompletedRef.current) {
      isCompletedRef.current = true
      let unmountTimer: ReturnType<typeof setTimeout> | undefined

      // 稍作停顿让用户看到 100% 和最后的 READY 日志
      const finishTimer = setTimeout(() => {
        setIsExiting(true)
        onComplete?.()

        // 淡出动画（0.6s）完成后卸载
        unmountTimer = setTimeout(() => {
          onUnmount?.()
        }, 600)
      }, 350)

      return () => {
        clearTimeout(finishTimer)
        if (unmountTimer) {
          clearTimeout(unmountTimer)
        }
      }
    }
  }, [progress, onComplete, onUnmount])

  // 支持点击或按键快速完成
  const handleFastForward = () => {
    if (isCompletedRef.current) return
    imagesDoneRef.current = true
    setProgress(100)
  }

  // 构造纯文字形式的加载进度条：[\\\\\\\          ]50%
  const totalSlots = 20
  const filledSlots = Math.min(totalSlots, Math.max(0, Math.round((progress / 100) * totalSlots)))
  const emptySlots = totalSlots - filledSlots
  const filledChars = '\\'.repeat(filledSlots)
  const emptyChars = ' '.repeat(emptySlots)

  const activeItem = CAROUSEL_ITEMS[carouselIndex]
  const IconComponent = activeItem.icon

  return (
    <div
      className={`home-loading-overlay ${isExiting ? 'is-exiting' : ''}`}
      onClick={handleFastForward}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') handleFastForward()
      }}
      role="progressbar"
      aria-label="网站首页资源加载中"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
    >
      {/* 居中两个元素 */}
      <div className="home-loading-center">
        {/* 元素一：程序 + 项目 + 服务器 + 奖杯 + 南航科院logo，0.2秒轮播一个 */}
        <div className="home-loading-carousel-stage">
          <div className="home-loading-carousel-icon-box">
            {activeItem.type === 'logo' ? (
              <span className="loading-carousel-brand-mark" aria-label="南昌航空大学科技学院校徽" />
            ) : IconComponent ? (
              <IconComponent size={48} strokeWidth={1.8} />
            ) : null}
          </div>
          <div className="home-loading-carousel-label">{activeItem.label}</div>
        </div>

        {/* 元素二：纯文字形式的加载进度条 ([\\\\\\\          ]50%) */}
        <div className="home-loading-progress-block">
          <div className="home-loading-ascii-bar">
            <span className="ascii-bracket">[</span>
            <span className="ascii-filled">{filledChars}</span>
            <span className="ascii-empty">{emptyChars}</span>
            <span className="ascii-bracket">]</span>
            <span className="ascii-percent">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* 左下方加载状态的栈动画（关键节点推入，第8个时最顶上删除，下方继续推入） */}
      <div className="home-loading-stack" aria-live="polite">
        <div className="home-loading-stack-header">
          <span className="home-loading-stack-badge">STACK_LOG</span>
          <span>RESOURCE STREAM ({stack.length}/8)</span>
        </div>
        <div className="home-loading-stack-list">
          {stack.map((item, index) => {
            const isLatest = index === stack.length - 1
            const opacity = Math.max(0.42, 0.42 + (index / 8) * 0.58)
            return (
              <div
                key={item.id}
                className={`home-loading-stack-item ${isLatest ? 'is-latest' : ''}`}
                style={{ opacity }}
              >
                <span className="stack-item-tag">[{item.tag}]</span>
                <span className="stack-item-text">{item.text}</span>
                {isLatest && <span className="stack-item-cursor">_</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* 右下方优雅跳过提示 */}
      <div className="home-loading-skip-hint">点击任意处或按空格快速进入 →</div>
    </div>
  )
}
