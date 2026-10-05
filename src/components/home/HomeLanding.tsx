import { HeroSection } from './HeroSection'
import { CampusVisual } from './CampusVisual'
import { GeometricAccents } from './GeometricAccents'
import { FlowLines } from './FlowLines'
import { DotMatrixHeroVisual } from './DotMatrixHeroVisual'
import { ScrollIndicator } from './ScrollIndicator'
import './home-redesign.css'

interface HomeLandingProps {
  onScrollDown?: () => void
  onJoinClick?: () => void
  onNavigate?: (path: string) => void
}

export function HomeLanding({
  onScrollDown,
  onJoinClick,
  onNavigate,
}: HomeLandingProps) {
  return (
    <section id="story-hero" className="home-hero-viewport" aria-label="计算机小组 · 品牌首页">
      {/* Layer 1: 暖白背景色（由 .home-hero-viewport 样式提供） */}

      {/* Layer 2: 建筑线稿背景 */}
      {/* Layer 5: 校园实景主体 */}
      <CampusVisual />

      {/* Layer 3: 浅蓝几何背景（平行色块与大圆弧） */}
      <GeometricAccents />

      {/* Layer 4: 动态蓝色流动细线与知识节点 */}
      <FlowLines />

      {/* Layer 4.5: 右侧点阵风格 Logo 交互矩阵 (明日方舟 World 风格) */}
      <DotMatrixHeroVisual />

      {/* Layer 6: 左侧 Hero 排版（让知识 持续发生） */}
      <div className="hero-content-stage">
        <HeroSection
          onJoinClick={onJoinClick}
          onToolsClick={() => onNavigate?.('#/tools')}
        />
      </div>

      {/* 左下方 Scroll Down 指示器 */}
      <ScrollIndicator onClick={onScrollDown} />
    </section>
  )
}
