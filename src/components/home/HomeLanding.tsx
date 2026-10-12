import { HeroSection } from './HeroSection'
import { CampusVisual } from './CampusVisual'
import { ScrollIndicator } from './ScrollIndicator'
import './home-redesign.css'
import './hero-poster.css'

interface HomeLandingProps {
  onScrollDown?: () => void
  onJoinClick?: () => void
  onNavigate?: (path: string) => void
  isHeroActive?: boolean
}

export function HomeLanding({
  onScrollDown,
  onJoinClick,
  onNavigate,
  isHeroActive = true,
}: HomeLandingProps) {
  return (
    <section id="story-hero" className="home-hero-viewport" aria-label="首页">
      {/* 首屏唯一一处配图：右下角圆形裁切的校园线稿。
          几何色块、流动细线、点阵徽标三套背景系统已移除（方向 C 靠留白与字号层级，不靠装饰）。 */}
      <div className="hero-corner-art">
        <CampusVisual isHeroActive={isHeroActive} />
      </div>

      {/* 左侧排版区 */}
      <div className="hero-content-stage">
        <HeroSection
          onJoinClick={onJoinClick}
          onToolsClick={() => onNavigate?.('#/tools')}
          isHeroActive={isHeroActive}
        />
      </div>

      {/* 左下方 Scroll Down 指示器 */}
      <ScrollIndicator onClick={onScrollDown} />
    </section>
  )
}
