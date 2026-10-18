import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUp, ArrowUpRight, Check, Copy } from 'lucide-react'
import { useContent } from '../../services/content.context'
import { fadeUp, SHIFT, STAGGER, useRuleIn } from './motion'
import './join-section.css'

interface JoinSectionProps {
  onNavigate?: (path: string) => void
  onScrollToTop?: () => void
  onScrollToSection?: (sectionId: string) => void
  qrCodeSrc?: string
}

/* 三步只留真实信息：序号 + 做什么 */
const JOIN_STEPS = [
  { num: '01', text: '加入 QQ 群' },
  { num: '02', text: '认识大家' },
  { num: '03', text: '一起做东西' },
]

export function JoinSection({
  onNavigate,
  onScrollToTop,
  onScrollToSection,
  qrCodeSrc = './assets/project-group-qrcode.png',
}: JoinSectionProps) {
  const {
    data: { contactInfo },
  } = useContent()
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

  const rule = useRuleIn()

  return (
    <section id="story-join" className="join-section-viewport" aria-label="加入我们">
      <div className="join-content-stage">
        {/* 头部：眉标 + 大字标题与右对齐说明 */}
        <div className="join-header-block">
          {/* 眉标那条 2px 杠先进场（线先落），标题与说明再按 STAGGER 跟上 */}
          <motion.span
            className={`poster-eyebrow${rule.shown ? ' is-rule-in' : ''}`}
            onViewportEnter={rule.onViewportEnter}
            viewport={{ once: true, amount: 0.6 }}
          >
            Join us
          </motion.span>
          <div className="join-heading-row">
            <motion.h2
              className="join-main-title poster-section-title"
              {...fadeUp({ delay: STAGGER, distance: SHIFT.block, amount: 0.2 })}
            >
              一起，
              <br />
              做点有意思的东西。
            </motion.h2>
            <motion.p className="join-sub-quote" {...fadeUp({ delay: STAGGER * 2, amount: 0.2 })}>
              刚开始学也行，
              <br />
              已经有方向也行，先来认识一下。
            </motion.p>
          </div>
        </div>

        {/* 主体：左侧一句说明 + 三步，右侧二维码与群号 */}
        <div className="join-main-grid">
          <motion.div className="join-copy-column" {...fadeUp({ distance: SHIFT.block, amount: 0.25 })}>
            <p className="join-lead-copy">如果你想学点技术，想找人一起做东西，或者有个想法一直放着，都可以来群里看看。</p>

            <div className="join-steps" aria-label="加入步骤：01 加入 QQ 群，02 认识大家，03 一起做东西">
              {JOIN_STEPS.map((step) => (
                <div className="join-step" key={step.num}>
                  <span className="join-step-num">{step.num}</span>
                  <span className="join-step-text">{step.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="join-action-column"
            {...fadeUp({ delay: STAGGER * 2, distance: SHIFT.block, amount: 0.25 })}
          >
            <figure className="join-qr-card">
              <div className="join-qr-frame">
                {qrCodeSrc ? (
                  <img src={qrCodeSrc} alt="科技小组项目组群二维码" className="join-qr-image" />
                ) : (
                  <div className="join-qr-placeholder">二维码待补充</div>
                )}
              </div>

              <figcaption className="join-group-info">
                <span className="join-group-label">QQ 群 · 项目组交流群</span>
                <span className="join-group-number" aria-label={`QQ 群号 ${contactInfo.qqGroup}`}>
                  {contactInfo.qqGroup}
                </span>

                <button
                  type="button"
                  className={`join-copy-btn ${copied ? 'is-copied' : ''}`}
                  onClick={handleCopyQQ}
                  aria-label={copied ? '已复制 QQ 群号' : '复制 QQ 群号'}
                >
                  {copied ? (
                    <>
                      <Check size={13} className="copy-icon" aria-hidden="true" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} className="copy-icon" aria-hidden="true" />
                      <span>复制群号</span>
                    </>
                  )}
                </button>

                {/* 无障碍实时反馈通道 */}
                <span className="sr-only" aria-live="polite">
                  {copied ? 'QQ群号已复制到剪贴板' : ''}
                </span>
              </figcaption>
            </figure>
          </motion.div>
        </div>
      </div>

      {/* 整站 FOOTER 底栏 */}
      <footer className="join-footer-block" role="contentinfo">
        <div className="footer-content-inner">
          {/* 左侧：品牌与组织定位 */}
          <div className="footer-brand-col">
            <span className="footer-brand-title">计算机科技小组</span>
            <span className="footer-brand-en">COMPUTER SCIENCE &amp; TECHNOLOGY GROUP</span>
            <p className="footer-brand-school">南昌航空大学科技学院 · 计算机科技小组</p>
            <p className="footer-brand-motto">看看我们之前的成果</p>
          </div>

          {/* 中间：站内真实导航锚点 */}
          <div className="footer-nav-col">
            <span className="poster-eyebrow poster-eyebrow--plain">Navigation</span>
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
                作品展示
              </a>
              <a
                href="#story-picks"
                className="footer-nav-link"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick('story-picks', '#/home')
                }}
              >
                小组推荐
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
              <a
                href="#/projects"
                className="footer-nav-link"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault()
                    onNavigate('#/projects')
                  }
                }}
              >
                浏览项目库
              </a>
              <a
                href="#/resources"
                className="footer-nav-link"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault()
                    onNavigate('#/resources')
                  }
                }}
              >
                浏览资源库
              </a>
              <a
                href="#/tools"
                className="footer-nav-link"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault()
                    onNavigate('#/tools')
                  }
                }}
              >
                工作台
              </a>
            </nav>
          </div>

          {/* 右侧：真实外部连接与联系 */}
          <div className="footer-connect-col">
            <span className="poster-eyebrow poster-eyebrow--plain">Connect</span>
            <div className="footer-connect-list">
              <a href={contactInfo.github} target="_blank" rel="noreferrer" className="footer-connect-item">
                <span>GitHub</span>
                <ArrowUpRight size={13} className="connect-arrow" aria-hidden="true" />
              </a>
              <button type="button" className="footer-connect-item footer-connect-btn" onClick={handleCopyQQ} title="点击复制 QQ 群号">
                <span>QQ 群（{contactInfo.qqGroup}）</span>
                <Copy size={12} className="connect-arrow" aria-hidden="true" />
              </button>
              <a href={`mailto:${contactInfo.email}`} className="footer-connect-item">
                <span>{contactInfo.email}</span>
                <ArrowUpRight size={13} className="connect-arrow" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {/* 最底端：版权与回到顶部 */}
        <div className="footer-bottom-bar">
          <span className="footer-copyright">© {new Date().getFullYear()} Computer Group. All rights reserved.</span>

          <button
            type="button"
            className="footer-back-to-top"
            onClick={onScrollToTop || (() => handleNavClick('story-hero', '#/home'))}
            aria-label="回到顶部"
          >
            <span>回到顶部</span>
            <ArrowUp size={13} className="back-arrow" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </section>
  )
}
