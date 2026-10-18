import fs from 'fs'
import path from 'path'

const appTsxPath = path.resolve('src/App.tsx')
const content = fs.readFileSync(appTsxPath, 'utf-8')

// 找到 function AboutUsSection 的开始位置
const startMarker = 'function AboutUsSection('
const startIndex = content.indexOf(startMarker)
if (startIndex === -1) {
  console.error('Could not find start marker:', startMarker)
  process.exit(1)
}

// 找到 function ContactFooter 的结束位置
const endMarker = 'type StorySection = {'
const endIndex = content.indexOf(endMarker)
if (endIndex === -1) {
  console.error('Could not find end marker:', endMarker)
  process.exit(1)
}

// 提取要备份的代码
const legacySectionsCode = content.slice(startIndex, endIndex)
const archivePath = path.resolve('src/components/home/legacy-sections-archive.txt')
fs.writeFileSync(archivePath, legacySectionsCode, 'utf-8')
console.log('Saved legacy sections to:', archivePath)

// 准备替换后的 ExpandedHomePage
// 找到 ExpandedHomePage 的范围
const expandedStartMarker = 'function ExpandedHomePage('
const expandedStartIndex = content.indexOf(expandedStartMarker)

const appFunctionMarker = 'function App() {'
const appFunctionIndex = content.indexOf(appFunctionMarker)

if (expandedStartIndex === -1 || appFunctionIndex === -1) {
  console.error('Could not find ExpandedHomePage or App() boundaries')
  process.exit(1)
}

const newExpandedHomePage = `function ExpandedHomePage({ onNavigate, onOpenProject, theme, onTheme, onSearch, mobileOpen, setMobileOpen }: { onNavigate: (path: string) => void; onOpenProject: (project: Project) => void; theme: Theme; onTheme: () => void; onSearch: () => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const heroFrameRef = useRef<HTMLDivElement | null>(null)
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    })

    lenisRef.current = lenis
    ;(window as any).__lenis = lenis

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      delete (window as any).__lenis
    }
  }, [])

  const scrollToSection = (target: number | string) => {
    const targetId = typeof target === 'number' ? 'story-hero' : target.replace(/^#/, '')
    const targetElement = document.getElementById(targetId)
    if (targetElement) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(targetElement, { offset: 0, duration: 1.2 })
      } else {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="home-story-scroll" data-active-screen={activeIndex}>
      {/* 顶部全局悬浮导航 */}
      <SiteHeader
        onNavigate={onNavigate}
        onScrollToSection={(sectionId) => scrollToSection(sectionId)}
      />

      <div className="hero-sticky-container">
        <div ref={heroFrameRef} className="hero-sticky-frame">
          <HomeLanding
            onNavigate={onNavigate}
            onScrollDown={() => scrollToSection('story-hero')}
            onScrollToSection={(sectionId) => scrollToSection(sectionId)}
          />
        </div>
      </div>
    </div>
  )
}

`

// 组装新的 App.tsx 内容
const newContent = content.slice(0, startIndex) +
  content.slice(endIndex, expandedStartIndex) +
  newExpandedHomePage +
  content.slice(appFunctionIndex)

fs.writeFileSync(appTsxPath, newContent, 'utf-8')
console.log('Updated App.tsx successfully')

