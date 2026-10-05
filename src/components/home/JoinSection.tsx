import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUp, ArrowUpRight, Check, Copy } from 'lucide-react'
import { useContent } from '../../services/content.context'
import './join-section.css'

interface JoinSectionProps {
  onNavigate?: (path: string) => void
  onScrollToTop?: () => void
  onScrollToSection?: (sectionId: string) => void
  qrCodeSrc?: string
}

export function JoinSection({
  onNavigate,
  onScrollToTop,
  onScrollToSection,
  qrCodeSrc = './assets/qq-group-qrcode.svg',
}: JoinSectionProps) {
  const { data: { contactInfo } } = useContent()
  const [copied, setCopied] = useState(false)

  const handleCopyQQ = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(contactInfo.qqGroup)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = contactInfo.qqGroup
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // 容错降级
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  const handleNavClick = (sectionId: string, fallbackHash: string) => {
    if (onScrollToSection) {
      onScrollToSection(sectionId)
    } else if (onNavigate) {
      onNavigate(fallbackHash)
    } else {
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const easeCurve = [0.16, 1, 0.3, 1] as const

  return (
    <section
      id="story-join"
      className="join-section-viewport"
      aria-label="06 · 加入我们与全站结尾"
    >
      {/* ============================================================
          Layer 1 & 2: 背景蓝图工程层 (基线网格、轨迹终点、建筑线稿局部)
          ============================================================ */}
      <div className="join-bg-layer" aria-hidden="true">
        {/* 排版网格：从上至下由清晰逐渐融入底部自然淡出 */}
        <div className="join-bg-grid" />

        {/* 校园建筑线稿局部轮廓（呼应 01 首页，极低透明度） */}
        <svg
          className="join-bg-campus-sketch"
          viewBox="0 0 1200 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <g stroke="#073F73" strokeWidth="0.8" opacity="0.08" strokeLinecap="round">
            {/* 建筑窗格与立柱局部结构 */}
            <line x1="820" y1="80" x2="1180" y2="80" />
            <line x1="820" y1="130" x2="1180" y2="130" />
            <line x1="820" y1="180" x2="1180" y2="180" />
            <line x1="820" y1="230" x2="1180" y2="230" />
            <line x1="820" y1="280" x2="1180" y2="280" />
            <line x1="860" y1="80" x2="860" y2="340" />
            <line x1="910" y1="80" x2="910" y2="340" />
            <line x1="960" y1="80" x2="960" y2="340" />
            <line x1="1010" y1="80" x2="1010" y2="340" />
            <line x1="1060" y1="80" x2="1060" y2="340" />
            <line x1="1110" y1="80" x2="1110" y2="340" />
            <line x1="1160" y1="80" x2="1160" y2="340" />
            {/* 钟楼顶角坡度 */}
            <path d="M960 20 L1010 80 L910 80 Z" strokeWidth="1" />
          </g>
        </svg>

        {/* 蓝图定位十字角标 (+) */}
        <svg
          className="join-bg-crosses"
          viewBox="0 0 1600 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke="#073F73" strokeWidth="0.8" opacity="0.2">
            <line x1="60" y1="90" x2="74" y2="90" />
            <line x1="67" y1="83" x2="67" y2="97" />
            <line x1="1520" y1="120" x2="1534" y2="120" />
            <line x1="1527" y1="113" x2="1527" y2="127" />
            <line x1="720" y1="420" x2="734" y2="420" />
            <line x1="727" y1="413" x2="727" y2="427" />
          </g>
        </svg>

        {/* 贯穿全站主轨迹线的最终汇聚收束 */}
        <svg
          className="join-flow-svg"
          viewBox="0 0 1600 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="joinFlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8FC7D9" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#82BED3" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#073F73" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {/* 从 05 页面左上方延伸入屏，最终指向二维码框架区 */}
          <path
            d="M 0 120 L 780 280 L 1180 280"
            stroke="url(#joinFlowGrad)"
            strokeWidth="1.1"
            strokeDasharray="4 3"
          />
        </svg>
      </div>

      {/* ============================================================
          06 / JOIN US 主体舞台区 (约 80vh ~ 100vh)
          ============================================================ */}
      <div className="join-content-stage">
        {/* 顶部：章节编号系统 (06 / JOIN US · 加入我们) */}
        <div className="join-header-block">
          <motion.div
            className="join-chapter-tag"
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, ease: easeCurve }}
          >
            <span className="join-chapter-num">06</span>
            <div className="join-chapter-line" />
            <span className="join-chapter-title">JOIN US</span>
            <span className="join-chapter-sub">加入我们</span>
          </motion.div>
        </div>

        {/* 主体非对称三区布局：左侧巨型文字 | 中间标题文案 | 右侧行动中心 */}
        <div className="join-main-grid">
          {/* 1. 左侧：超大 JOIN US 视觉排版 (占据视觉张力核心) */}
          <div className="join-mega-hero">
            <div className="join-mega-row">
              <motion.span
                className="join-mega-text"
                initial={{ y: 28, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.8, ease: easeCurve }}
              >
                JOIN
              </motion.span>
            </div>
            <div className="join-mega-row">
              <motion.span
                className="join-mega-text"
                initial={{ y: 28, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.8, delay: 0.1, ease: easeCurve }}
              >
                US.
              </motion.span>
            </div>
          </div>

          {/* 2. 中间：主标题、核心说明、加入门槛、轻量轨迹线 */}
          <div className="join-middle-column">
            <motion.div
              className="join-statement-block"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.75, delay: 0.12, ease: easeCurve }}
            >
              <h2 className="join-main-title">
                一起，
                <br />
                做点有意思的东西。
              </h2>

              <p className="join-lead-copy">
                如果你也喜欢技术，
                <br />
                愿意学习、分享，
                <br />
                或者只是想把一个想法真正做出来，
                <br />
                欢迎来和我们一起。
              </p>

              <div className="join-threshold-note">
                <span className="threshold-prefix">—</span>
                <p className="threshold-text">
                  无论你刚开始学习，还是已经有自己的方向，都欢迎来认识我们。
                </p>
              </div>
            </motion.div>

            {/* 3 步极简轻量轨迹（非卡片形式） */}
            <motion.div
              className="join-steps-track"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.75, delay: 0.2, ease: easeCurve }}
              aria-label="加入步骤：01 加入 QQ 群，02 认识大家，03 一起做东西"
            >
              <div className="steps-flow-line">
                <div className="step-node">
                  <span className="step-num">01</span>
                  <span className="step-dot" />
                  <span className="step-label-en">JOIN</span>
                  <span className="step-label-zh">加入 QQ 群</span>
                </div>
                <div className="step-divider-line" />
                <div className="step-node">
                  <span className="step-num">02</span>
                  <span className="step-dot" />
                  <span className="step-label-en">MEET</span>
                  <span className="step-label-zh">认识大家</span>
                </div>
                <div className="step-divider-line" />
                <div className="step-node">
                  <span className="step-num">03</span>
                  <span className="step-dot" />
                  <span className="step-label-en">BUILD</span>
                  <span className="step-label-zh">一起做东西</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 3. 右侧：行动中心 (蓝图式 QR Code 架构框 + QQ 群号与复制) */}
          <motion.div
            className="join-action-column"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.75, delay: 0.18, ease: easeCurve }}
          >
            {/* 轨迹终点标示 */}
            <div className="join-trajectory-endpoint">
              <span className="endpoint-dot" />
              <span className="endpoint-text">START HERE</span>
            </div>

            {/* 蓝图式二维码框架 */}
            <div className="join-blueprint-frame">
              {/* 顶部蓝图标尺栏 */}
              <div className="blueprint-top-bar">
                <span className="blueprint-code">06.01</span>
                <span className="blueprint-tag">SCAN TO JOIN</span>
              </div>

              {/* 定位框与二维码容器 */}
              <div className="blueprint-box">
                {/* 四角建筑图纸十字标 */}
                <span className="box-corner corner-tl" aria-hidden="true" />
                <span className="box-corner corner-tr" aria-hidden="true" />
                <span className="box-corner corner-bl" aria-hidden="true" />
                <span className="box-corner corner-br" aria-hidden="true" />

                {/* 框体内容：真实二维码存在时渲染图片，不存在时展示标准工程蓝图占位 */}
                <div className="blueprint-qr-container">
                  {qrCodeSrc ? (
                    <img
                      src={qrCodeSrc}
                      alt="计算机小组项目组 QQ 群二维码"
                      className="blueprint-qr-image"
                    />
                  ) : (
                    <div className="blueprint-qr-placeholder" aria-label="QQ 群二维码占位">
                      <div className="qr-inner-target" />
                      <span className="qr-placeholder-text">QR CODE</span>
                      <span className="qr-placeholder-sub">SCAN TO JOIN</span>
                    </div>
                  )}
                </div>

                {/* 蓝图边角尺寸规格标注 */}
                <div className="blueprint-dimensions" aria-hidden="true">
                  <span>W: 196</span>
                  <span>//</span>
                  <span>H: 196</span>
                </div>
              </div>

              {/* 二维码下方：QQ 群号信息区 */}
              <div className="join-group-info">
                <div className="group-meta-title">
                  <span>QQ GROUP</span>
                  <span className="group-club-name">项目组交流群</span>
                </div>

                <div className="group-number-row">
                  <span className="group-digits" aria-label={`QQ 群号 ${contactInfo.qqGroup}`}>
                    {contactInfo.qqGroup}
                  </span>

                  <button
                    type="button"
                    className={`group-copy-btn ${copied ? 'is-copied' : ''}`}
                    onClick={handleCopyQQ}
                    aria-label={copied ? '已复制 QQ 群号' : '复制 QQ 群号'}
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="copy-icon" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="copy-icon" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 无障碍实时反馈通道 */}
                <div className="sr-only" aria-live="polite">
                  {copied ? 'QQ群号已复制到剪贴板' : ''}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 底部：技术方向关键词纯文字排版 (错位呼应，无 Pill Tag) */}
        <div className="join-tracks-row" aria-label="小组主要技术方向">
          <span className="tracks-label">FOCUS /</span>
          <span className="track-keyword">ALGORITHM</span>
          <span className="track-sep">/</span>
          <span className="track-keyword">FRONTEND</span>
          <span className="track-sep">/</span>
          <span className="track-keyword">BACKEND</span>
          <span className="track-sep">/</span>
          <span className="track-keyword">AI & LLM</span>
          <span className="track-sep">/</span>
          <span className="track-keyword">PROJECTS</span>
          <span className="track-sep">/</span>
          <span className="track-keyword">OPEN SOURCE</span>
        </div>
      </div>

      {/* ============================================================
          一体化整站 FOOTER 底栏 (与 06 连续相接，犹如刊物封底)
          ============================================================ */}
      <footer className="join-footer-block" role="contentinfo">
        {/* 顶部 1px 低透明度深蓝分割线 */}
        <div className="footer-rule-top" />

        <div className="footer-content-inner">
          {/* 左侧：品牌与组织定位 */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <span className="footer-brand-title">计算机小组 · 项目组</span>
              <span className="footer-brand-en">COMPUTER GROUP // PROJECT TEAM</span>
            </div>
            <p className="footer-brand-school">
              南昌航空大学科技学院 · 计算机科技小组
            </p>
            <p className="footer-brand-motto">
              学习 · 实践 · 传承 — 让每一届的知识都留下来。
            </p>
          </div>

          {/* 中间：站内真实导航锚点 */}
          <div className="footer-nav-col">
            <span className="footer-col-caption">NAVIGATION</span>
            <nav className="footer-nav-list" aria-label="页脚导航">
              <a
                href="#story-hero"
                className="footer-nav-link"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick('story-hero', '#/home')
                }}
              >
                首页
              </a>
              <a
                href="#story-about"
                className="footer-nav-link"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick('story-about', '#/home')
                }}
              >
                关于我们
              </a>
              <a
                href="#story-offer"
                className="footer-nav-link"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick('story-offer', '#/home')
                }}
              >
                带来什么
              </a>
              <a
                href="#story-picks"
                className="footer-nav-link"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick('story-picks', '#/home')
                }}
              >
                小组力荐
              </a>
              <a
                href="#story-blog"
                className="footer-nav-link"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick('story-blog', '#/home')
                }}
              >
                小组博客
              </a>
              <a
                href="#story-join"
                className="footer-nav-link"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick('story-join', '#/home')
                }}
              >
                加入我们
              </a>
            </nav>
          </div>

          {/* 右侧：真实外部连接与联系 */}
          <div className="footer-connect-col">
            <span className="footer-col-caption">CONNECT</span>
            <div className="footer-connect-list">
              <a
                href={contactInfo.github}
                target="_blank"
                rel="noreferrer"
                className="footer-connect-item"
              >
                <span>GitHub</span>
                <ArrowUpRight size={13} className="connect-arrow" />
              </a>
              <button
                type="button"
                className="footer-connect-item footer-connect-btn"
                onClick={handleCopyQQ}
                title="点击复制 QQ 群号"
              >
                <span>QQ 群 ({contactInfo.qqGroup})</span>
                <Copy size={12} className="connect-arrow" />
              </button>
              <a
                href={`mailto:${contactInfo.email}`}
                className="footer-connect-item"
              >
                <span>{contactInfo.email}</span>
                <ArrowUpRight size={13} className="connect-arrow" />
              </a>
            </div>
          </div>
        </div>

        {/* 最底端：版权、刊号、回到顶部 */}
        <div className="footer-bottom-bar">
          <div className="footer-bottom-left">
            <span className="footer-copyright">
              © {new Date().getFullYear()} Computer Group. All rights reserved.
            </span>
          </div>

          <div className="footer-bottom-right">
            <span className="footer-page-index">06 / 06</span>
            <button
              type="button"
              className="footer-back-to-top"
              onClick={onScrollToTop || (() => handleNavClick('story-hero', '#/home'))}
              aria-label="平滑滚动回到顶部"
            >
              <span>BACK TO TOP</span>
              <ArrowUp size={13} className="back-arrow" />
            </button>
          </div>
        </div>
      </footer>
    </section>
  )
}

