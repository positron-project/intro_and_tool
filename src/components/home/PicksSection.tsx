import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowDown, Copy, Check, Play, Maximize2 } from 'lucide-react'
import './picks-section.css'

interface PicksSectionProps {
  onNavigate?: (path: string) => void
  onNextSection?: () => void
}

export function PicksSection({ onNavigate, onNextSection }: PicksSectionProps) {
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const serverAddress = 'mc.scse.club'

  const handleCopyAddress = async () => {
    setCopyFailed(false)
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(serverAddress)
        setCopiedAddress(true)
        setTimeout(() => setCopiedAddress(false), 2000)
      } else {
        // 降级使用 textarea 拷贝
        const textArea = document.createElement('textarea')
        textArea.value = serverAddress
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (success) {
          setCopiedAddress(true)
          setTimeout(() => setCopiedAddress(false), 2000)
        } else {
          setCopyFailed(true)
          setTimeout(() => setCopyFailed(false), 3000)
        }
      }
    } catch {
      setCopyFailed(true)
      setTimeout(() => setCopyFailed(false), 3000)
    }
  }

  const easeCurve = [0.16, 1, 0.3, 1] as const

  const cardVariant = {
    hidden: { opacity: 0, y: 32 },
    visible: (delay: number = 0.1) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay,
        ease: easeCurve,
      },
    }),
  }

  return (
    <section
      id="story-picks"
      className="picks-section-viewport"
      aria-label="04 · 小组力荐"
    >
      {/* ============================================================
          Layer 1 & 2: 背景工程蓝图层 (延续 03 坐标网格、轨迹虚线与超大水印)
          ============================================================ */}
      <div className="picks-bg-layer" aria-hidden="true">
        <div className="picks-bg-grid" />
        
        {/* 斜向蓝图辅助带 */}
        <div className="picks-geo-ribbon" />

        {/* 视口超大极淡背景轮廓字 */}
        <div className="picks-watermark picks-watermark-world">WORLD</div>
        <div className="picks-watermark picks-watermark-tools">TOOLS</div>

        {/* 蓝图定位十字标符 (+) */}
        <svg
          className="picks-bg-crosses"
          viewBox="0 0 1600 1200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke="#073F73" strokeWidth="0.8" opacity="0.22">
            <line x1="80" y1="120" x2="94" y2="120" />
            <line x1="87" y1="113" x2="87" y2="127" />
            <line x1="1500" y1="140" x2="1514" y2="140" />
            <line x1="1507" y1="133" x2="1507" y2="147" />
            <line x1="800" y1="620" x2="814" y2="620" />
            <line x1="807" y1="613" x2="807" y2="627" />
            <line x1="120" y1="1080" x2="134" y2="1080" />
            <line x1="127" y1="1073" x2="127" y2="1087" />
          </g>
        </svg>
      </div>

      {/* ============================================================
          主体舞台层
          ============================================================ */}
      <div className="picks-content-stage">
        {/* 顶部：04 章节标与引导文案 (大面积留白与过渡) */}
        <div className="picks-header-block">
          <motion.div
            className="picks-chapter-tag"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: easeCurve }}
          >
            <span className="picks-chapter-num">04</span>
            <div className="picks-chapter-line" />
            <span className="picks-chapter-title">OUR PICKS</span>
          </motion.div>

          <div className="picks-heading-row">
            <motion.h2
              className="picks-main-title"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.08, ease: easeCurve }}
            >
              小组力荐
            </motion.h2>

            <motion.p
              className="picks-sub-quote"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.16, ease: easeCurve }}
            >
              一些我们正在维护，
              <br />
              也真正会用到的东西。
            </motion.p>
          </div>
        </div>

        {/* ============================================================
            卡片 1：01 / MINECRAFT SERVER 手绘大卡片
            ============================================================ */}
        <motion.div
          className="sketch-card sketch-card-minecraft"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={cardVariant}
          custom={0.1}
        >
          {/* 建筑手绘四角交错延伸标线与坐标 */}
          <div className="sketch-corner-marker top-left">+ 01 / S-ALPHA</div>
          <div className="sketch-corner-marker top-right">[ VOXEL BLUEPRINT ]</div>
          <div className="sketch-corner-marker bottom-left">SEC.4.1 // WORLD</div>
          <div className="sketch-corner-marker bottom-right">+ 1600 × 900</div>

          <div className="sketch-card-inner">
            {/* 左侧分栏：SVG Logo (上) + 标题与文字介绍 (下) */}
            <div className="sketch-card-left">
              {/* 上方：专属手绘工程线稿 SVG Logo (等距立方体方块与建造镐头) */}
              <div className="sketch-logo-wrap" aria-hidden="true">
                <svg
                  className="sketch-logo-svg"
                  viewBox="0 0 160 140"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* 手绘等距网格立方体 (Isometric Voxel Wireframe) */}
                  <g stroke="#073F73" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    {/* 主等距立方体 */}
                    <path d="M80 18 L136 50 L80 82 L24 50 Z" strokeDasharray="none" />
                    <path d="M24 50 L24 104 L80 136 L136 104 L136 50" />
                    <path d="M80 82 L80 136" />
                    
                    {/* 内部手绘结构细线 */}
                    <path d="M52 34 L108 66" strokeWidth="0.9" opacity="0.45" strokeDasharray="3 3" />
                    <path d="M108 34 L52 66" strokeWidth="0.9" opacity="0.45" strokeDasharray="3 3" />
                    <path d="M80 50 L80 109" strokeWidth="0.9" opacity="0.45" strokeDasharray="3 3" />
                    <path d="M52 66 L52 120" strokeWidth="0.8" opacity="0.35" />
                    <path d="M108 66 L108 120" strokeWidth="0.8" opacity="0.35" />

                    {/* 手绘辅助延伸延长线 */}
                    <line x1="80" y1="6" x2="80" y2="18" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="136" y1="50" x2="148" y2="57" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="24" y1="50" x2="12" y2="57" strokeWidth="1" strokeDasharray="2 2" />
                  </g>

                  {/* 浅青蓝定位节点与方块核心 */}
                  <g fill="#9FD1DE" stroke="#073F73" strokeWidth="1">
                    <circle cx="80" cy="18" r="2.8" />
                    <circle cx="136" cy="50" r="2.8" />
                    <circle cx="24" cy="50" r="2.8" />
                    <circle cx="80" cy="82" r="3.2" fill="#82BED3" />
                    <circle cx="80" cy="136" r="2.8" />
                    <circle cx="24" cy="104" r="2.8" />
                    <circle cx="136" cy="104" r="2.8" />
                  </g>

                  {/* 小型浮空微方块 (象征建造中的方块) */}
                  <g stroke="#073F73" strokeWidth="1" opacity="0.6">
                    <path d="M128 20 L144 29 L128 38 L112 29 Z" />
                    <path d="M112 29 L112 43 L128 52 L144 43 L144 29" />
                    <path d="M128 38 L128 52" />
                  </g>
                </svg>
                <span className="sketch-logo-badge">VOXEL ARCHITECTURE</span>
              </div>

              {/* 下方：标题、介绍与真实规格 */}
              <div className="sketch-text-body">
                <div className="sketch-item-meta">
                  <span className="sketch-item-num">01</span>
                  <span className="sketch-item-tag">MINECRAFT SERVER</span>
                </div>

                <h3 className="sketch-item-title">属于小组自己的世界</h3>

                <p className="sketch-item-desc">
                  在写代码之外，这里也是大家一起建造、探索，
                  以及单纯放松的地方。
                </p>

                {/* 蓝图式规格元信息 */}
                <div className="sketch-specs-table">
                  <div className="sketch-spec-row">
                    <span className="sketch-spec-label">ADDRESS</span>
                    <div className="sketch-spec-copyable">
                      <code className="sketch-spec-val">{serverAddress}</code>
                      <button
                        type="button"
                        className="sketch-copy-btn"
                        onClick={handleCopyAddress}
                        aria-label="复制服务器地址"
                      >
                        {copiedAddress ? (
                          <>
                            <Check size={12} className="text-success" />
                            <span className="copied-tip">已复制</span>
                          </>
                        ) : copyFailed ? (
                          <>
                            <span className="copied-tip" style={{ color: '#d9534f' }}>复制失败，请手动选择</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>复制</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="sketch-spec-row">
                    <span className="sketch-spec-label">ACCESS</span>
                    <span className="sketch-spec-val">CAMPUS NETWORK &amp; DEDICATED HOST</span>
                  </div>
                </div>

                {/* 行动文字链接 */}
                <div className="sketch-action-line">
                  <a
                    href="#/projects"
                    className="sketch-text-link"
                    onClick={(e) => {
                      e.preventDefault()
                      onNavigate?.('#/projects')
                    }}
                  >
                    <span>查看服务器介绍</span>
                    <ArrowRight size={14} className="sketch-link-arrow" />
                  </a>
                </div>
              </div>
            </div>

            {/* 右侧分栏：视频/图片手绘取景框占位视窗 (移除无意义的 tabIndex，避免干扰键盘导航) */}
            <div className="sketch-card-right">
              <div className="sketch-media-viewport" aria-label="Minecraft 服务器实景占位视窗">
                {/* 顶部工程图纸取景框栏 */}
                <div className="sketch-viewport-topbar">
                  <div className="viewport-status-dot" />
                  <span className="viewport-code-label">VIEWPORT // MC_SURVIVAL_FRAME_01.RAW</span>
                  <span className="viewport-dim-label">16:9 REC</span>
                </div>

                {/* 画面中央手绘占位构图 */}
                <div className="sketch-viewport-stage">
                  {/* 对焦准星标与十字网格 */}
                  <div className="viewport-crosshairs top-left" />
                  <div className="viewport-crosshairs top-right" />
                  <div className="viewport-crosshairs bottom-left" />
                  <div className="viewport-crosshairs bottom-right" />
                  <div className="viewport-center-target" />

                  {/* 占位中心徽标与说明 */}
                  <div className="viewport-placeholder-content">
                    <div className="viewport-play-indicator">
                      <Play size={24} strokeWidth={1.4} className="viewport-play-icon" />
                    </div>
                    <span className="viewport-placeholder-title">MEDIA PLACEHOLDER</span>
                    <span className="viewport-placeholder-desc">
                      [ MINECRAFT IN-GAME SCREENSHOT / VIDEO ]
                    </span>
                    <span className="viewport-placeholder-spec">
                      1920 × 1080 · ARCHITECTURAL CAPTURE
                    </span>
                  </div>

                  {/* 融入全站色系的浅青蓝/米白淡透蒙版 */}
                  <div className="viewport-color-veil" />
                </div>

                {/* 底部参数刻度栏 */}
                <div className="sketch-viewport-footer">
                  <span>SCALE: 1.0</span>
                  <span>GRID: 16PX VOXEL</span>
                  <span>FPS: SYNC</span>
                  <Maximize2 size={12} className="viewport-expand-icon" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================
            卡片间过渡指示：方块草图演进为 UI 栅格
            ============================================================ */}
        <div className="sketch-inter-transition" aria-hidden="true">
          <div className="inter-line" />
          <div className="inter-badge">
            <span className="inter-dot" />
            <span>FROM PLAY TO UTILITY</span>
            <span className="inter-dot" />
          </div>
          <div className="inter-line" />
        </div>

        {/* ============================================================
            卡片 2：02 / TOOLS 手绘大卡片
            ============================================================ */}
        <motion.div
          className="sketch-card sketch-card-tools"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={cardVariant}
          custom={0.15}
        >
          {/* 建筑手绘四角交错延伸标线与坐标 */}
          <div className="sketch-corner-marker top-left">+ 02 / S-BETA</div>
          <div className="sketch-corner-marker top-right">[ INTERFACE MATRIX ]</div>
          <div className="sketch-corner-marker bottom-left">SEC.4.2 // TOOLS</div>
          <div className="sketch-corner-marker bottom-right">+ 1600 × 900</div>

          <div className="sketch-card-inner">
            {/* 左侧分栏：SVG Logo (上) + 标题与文字介绍 (下) */}
            <div className="sketch-card-left">
              {/* 上方：专属手绘工程线稿 SVG Logo (终端命令行光标与标尺网格) */}
              <div className="sketch-logo-wrap" aria-hidden="true">
                <svg
                  className="sketch-logo-svg"
                  viewBox="0 0 160 140"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* 手绘工程规尺与界面窗口线框 */}
                  <g stroke="#073F73" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    {/* 主外框窗口 */}
                    <rect x="22" y="24" width="116" height="92" strokeDasharray="none" />
                    {/* 顶栏分割线 */}
                    <line x1="22" y1="46" x2="138" y2="46" />
                    
                    {/* 窗口三圆标 */}
                    <circle cx="36" cy="35" r="2.5" fill="#9FD1DE" />
                    <circle cx="48" cy="35" r="2.5" fill="#9FD1DE" />
                    <circle cx="60" cy="35" r="2.5" fill="#9FD1DE" />

                    {/* 终端命令行提示符 >_ */}
                    <path d="M38 64 L50 74 L38 84" strokeWidth="1.8" />
                    <line x1="58" y1="84" x2="74" y2="84" strokeWidth="2" />

                    {/* 规尺刻度线 (底部与右侧) */}
                    <line x1="22" y1="116" x2="138" y2="116" strokeWidth="0.9" />
                    <line x1="42" y1="110" x2="42" y2="116" strokeWidth="0.8" />
                    <line x1="62" y1="106" x2="62" y2="116" strokeWidth="1" />
                    <line x1="82" y1="110" x2="82" y2="116" strokeWidth="0.8" />
                    <line x1="102" y1="106" x2="102" y2="116" strokeWidth="1" />
                    <line x1="122" y1="110" x2="122" y2="116" strokeWidth="0.8" />

                    {/* 侧边层叠小面板 */}
                    <path d="M138 60 L150 60 L150 100 L138 100" strokeWidth="1" strokeDasharray="2 2" />
                  </g>

                  {/* 浅青蓝辅助点与游标标尺 */}
                  <g fill="#9FD1DE" stroke="#073F73" strokeWidth="1">
                    <circle cx="102" cy="70" r="3" />
                    <circle cx="120" cy="70" r="3" />
                  </g>
                </svg>
                <span className="sketch-logo-badge">INTERFACE UTILITY</span>
              </div>

              {/* 下方：标题、介绍与真实规格 */}
              <div className="sketch-text-body">
                <div className="sketch-item-meta">
                  <span className="sketch-item-num">02</span>
                  <span className="sketch-item-tag">TOOLS</span>
                </div>

                <h3 className="sketch-item-title">小组工具页</h3>
                <p className="sketch-item-sub">把常用的小东西，放在一个地方。</p>

                <p className="sketch-item-desc">
                  我们把学习、开发和日常使用中
                  经常需要的小工具整理到了一起。
                  减少重复操作，也让一些事情简单一点。
                </p>

                {/* 蓝图式规格元信息 */}
                <div className="sketch-specs-table">
                  <div className="sketch-spec-row">
                    <span className="sketch-spec-label">CATEGORY</span>
                    <span className="sketch-spec-val">DEVELOPMENT &amp; ACADEMIC SUITE</span>
                  </div>

                  <div className="sketch-spec-row">
                    <span className="sketch-spec-label">STATUS</span>
                    <span className="sketch-spec-val">ONLINE · IN-HOUSE UTILITIES</span>
                  </div>
                </div>

                {/* 行动文字链接 */}
                <div className="sketch-action-line">
                  <button
                    type="button"
                    className="sketch-text-link"
                    onClick={() => onNavigate?.('#/tools')}
                  >
                    <span>打开工具页</span>
                    <ArrowRight size={14} className="sketch-link-arrow" />
                  </button>
                </div>
              </div>
            </div>

            {/* 右侧分栏：视频/图片手绘取景框占位视窗 (移除无意义的 tabIndex) */}
            <div className="sketch-card-right">
              <div className="sketch-media-viewport" aria-label="小组工具页实景占位视窗">
                {/* 顶部工程图纸取景框栏 */}
                <div className="sketch-viewport-topbar">
                  <div className="viewport-status-dot" />
                  <span className="viewport-code-label">VIEWPORT // TOOLS_INTERFACE_FRAME_02.RAW</span>
                  <span className="viewport-dim-label">16:9 UI</span>
                </div>

                {/* 画面中央手绘占位构图 */}
                <div className="sketch-viewport-stage">
                  {/* 对焦准星标与十字网格 */}
                  <div className="viewport-crosshairs top-left" />
                  <div className="viewport-crosshairs top-right" />
                  <div className="viewport-crosshairs bottom-left" />
                  <div className="viewport-crosshairs bottom-right" />
                  <div className="viewport-center-target" />

                  {/* 错位技术界面框架底纹 (模拟 2~3 个精细窗口拼贴) */}
                  <div className="tools-wireframe-collage" aria-hidden="true">
                    <div className="wireframe-window-back" />
                    <div className="wireframe-window-front">
                      <div className="wireframe-row">
                        <span className="wireframe-pill" />
                        <span className="wireframe-line w-40" />
                        <span className="wireframe-line w-20" />
                      </div>
                      <div className="wireframe-row">
                        <span className="wireframe-line w-60" />
                        <span className="wireframe-line w-30" />
                      </div>
                    </div>
                  </div>

                  {/* 占位中心徽标与说明 */}
                  <div className="viewport-placeholder-content">
                    <div className="viewport-play-indicator">
                      <Play size={24} strokeWidth={1.4} className="viewport-play-icon" />
                    </div>
                    <span className="viewport-placeholder-title">MEDIA PLACEHOLDER</span>
                    <span className="viewport-placeholder-desc">
                      [ TOOLS UI SCREENSHOT / DEMO VIDEO ]
                    </span>
                    <span className="viewport-placeholder-spec">
                      1920 × 1080 · PRODUCT SHOWCASE
                    </span>
                  </div>

                  {/* 融入全站色系的浅青蓝/米白淡透蒙版 */}
                  <div className="viewport-color-veil" />
                </div>

                {/* 底部参数刻度栏 */}
                <div className="sketch-viewport-footer">
                  <span>LAYOUT: COMPACT</span>
                  <span>ROUTE: #/TOOLS</span>
                  <span>THEME: WARM NAVY</span>
                  <Maximize2 size={12} className="viewport-expand-icon" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================================
            底部：与 05 / BLOG 的平滑衔接区
            ============================================================ */}
        <div className="picks-footer-anchor">
          <div className="picks-baseline-grid" />
          <button
            type="button"
            className="picks-next-hint"
            onClick={onNextSection}
            aria-label="向下滑动至博客"
          >
            <span className="picks-hint-num">05</span>
            <span className="picks-hint-title">BLOG // LATEST ARTICLES</span>
            <ArrowDown size={14} className="picks-hint-arrow" />
          </button>
        </div>
      </div>
    </section>
  )
}

