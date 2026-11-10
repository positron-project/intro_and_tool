import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Check,
  Copy,
  Users,
  Compass,
  Code2,
  ShieldCheck,
  MapPin,
  Clock,
  Mail,
  ExternalLink,
  Lock,
  Database,
  EyeOff,
  UserCheck,
  Sparkles,
  GitPullRequest,
  Terminal,
} from 'lucide-react'
import { useContent } from '../services/content.context'
import './footer-modals.css'

export type FooterModalType = 'about' | 'join' | 'contribute' | 'privacy'

interface FooterInfoModalProps {
  type: FooterModalType | null
  onClose: () => void
  onNavigate?: (path: string) => void
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function FooterInfoModal({ type, onClose, onNavigate }: FooterInfoModalProps) {
  const {
    data: { contactInfo },
  } = useContent()
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // 锁定背景滚动，并把键盘焦点限制在弹窗内部。
  useEffect(() => {
    if (!type) return

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

    setCopied(false)
    setCopyError('')

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true })
    })
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return
      const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null,
      )
      if (!focusableElements.length) {
        e.preventDefault()
        dialog.focus({ preventScroll: true })
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      if (previousActiveElement && document.contains(previousActiveElement)) {
        previousActiveElement.focus({ preventScroll: true })
      }
    }
  }, [type, onClose])

  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
      }
    } catch {
      // Clipboard API 可能因 file://、权限或浏览器策略失败，继续尝试兼容方案。
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copiedWithFallback = document.execCommand('copy')
    textarea.remove()
    if (!copiedWithFallback) throw new Error('copy failed')
  }

  const handleCopyQQ = async () => {
    setCopyError('')
    try {
      await copyText(contactInfo.qqGroup)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
      setCopyError('复制失败，请手动复制群号')
    }
  }

  const handleNavigateTo = (path: string) => {
    onClose()
    if (onNavigate) {
      onNavigate(path)
    } else {
      window.location.hash = path
    }
  }

  return (
    <AnimatePresence>
      {type && (
        <motion.div
          key={type}
          className="footer-modal-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            ref={dialogRef}
            className="footer-modal-dialog"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-modal-title"
            tabIndex={-1}
          >
            {/* 1. 关于我们 */}
            {type === 'about' && (
              <>
                <div className="footer-modal-header">
                  <div>
                    <p className="footer-modal-eyebrow">ABOUT US / 01</p>
                    <h3 id="footer-modal-title" className="footer-modal-title">
                      关于计算机科技小组
                    </h3>
                  </div>
                  <button type="button" className="footer-modal-close" ref={closeButtonRef} onClick={onClose} aria-label="关闭窗口">
                    <X size={16} />
                  </button>
                </div>

                <div className="footer-modal-body">
                  <p className="footer-modal-intro">
                    南昌航空大学科技学院计算机科技小组（CS Club）是面向全校计算机相关专业学生的技术社团。我们以“学习 → 实践 →
                    传承”为主线，通过项目实践、技术交流和经验分享，把学习变成可以交付的成果。
                  </p>

                  <div className="footer-modal-features">
                    <div className="footer-modal-feature-card">
                      <h4 className="footer-modal-feature-title">
                        <Code2 size={16} /> 比赛训练
                      </h4>
                      <p className="footer-modal-feature-desc">围绕算法竞赛和技术挑战进行训练、组队与复盘。</p>
                    </div>
                    <div className="footer-modal-feature-card">
                      <h4 className="footer-modal-feature-title">
                        <Users size={16} /> 项目协作
                      </h4>
                      <p className="footer-modal-feature-desc">从需求、分工到交付，和队友一起完成真实项目。</p>
                    </div>
                    <div className="footer-modal-feature-card">
                      <h4 className="footer-modal-feature-title">
                        <Terminal size={16} /> 三个方向
                      </h4>
                      <p className="footer-modal-feature-desc">算法组、项目组、网安组，按兴趣和能力选择方向。</p>
                    </div>
                    <div className="footer-modal-feature-card">
                      <h4 className="footer-modal-feature-title">
                        <Compass size={16} /> 经验传承
                      </h4>
                      <p className="footer-modal-feature-desc">把比赛记录、项目经验和学习资料留给下一届。</p>
                    </div>
                  </div>

                  <div className="footer-modal-info-grid">
                    <div className="footer-modal-info-item">
                      <span className="footer-modal-info-label">
                        <MapPin size={13} />
                        线下基地：
                      </span>
                      <span className="footer-modal-info-value">南昌航空大学科技学院 实验实训大楼 · G305 · G312（科技小组专属基地）</span>
                    </div>
                    <div className="footer-modal-info-item">
                      <span className="footer-modal-info-label">
                        <Clock size={13} />
                        研讨开放：
                      </span>
                      <span className="footer-modal-info-value">{contactInfo.openTime}</span>
                    </div>
                    <div className="footer-modal-info-item">
                      <span className="footer-modal-info-label">
                        <Mail size={13} />
                        联络邮箱：
                      </span>
                      <span className="footer-modal-info-value">{contactInfo.email}</span>
                    </div>
                    <div className="footer-modal-info-item">
                      <span className="footer-modal-info-label">
                        <Users size={13} />
                        组织：
                      </span>
                      <span className="footer-modal-info-value">南航科院计算机科技小组</span>
                    </div>
                  </div>
                </div>

                <div className="footer-modal-actions">
                  <button type="button" className="footer-action-secondary" onClick={() => handleNavigateTo('#/projects')}>
                    浏览小组项目库
                  </button>
                  <button type="button" className="footer-action-primary" onClick={() => handleNavigateTo('#/members')}>
                    查看历届成员档案
                  </button>
                </div>
              </>
            )}

            {/* 2. 加入我们 */}
            {type === 'join' && (
              <>
                <div className="footer-modal-header">
                  <div>
                    <p className="footer-modal-eyebrow">JOIN US / 02</p>
                    <h3 id="footer-modal-title" className="footer-modal-title">
                      加入计算机科技小组
                    </h3>
                  </div>
                  <button type="button" className="footer-modal-close" ref={closeButtonRef} onClick={onClose} aria-label="关闭窗口">
                    <X size={16} />
                  </button>
                </div>

                <div className="footer-modal-body">
                  <p className="footer-modal-intro">
                    加入小组需要完成三轮考核。考核过程中，你会参加培训、完成阶段任务，并和其他同学一起协作。通过三轮考核后，正式成为小组成员。
                  </p>

                  <p className="footer-modal-note">
                    <strong>特招通道：</strong>
                    如果你已有项目并掌握相关计算机知识，在有项目需求时可以申请特招；完成前两轮培训后即可进入小组。
                  </p>

                  <div className="footer-join-highlight">
                    <div className="footer-join-highlight-text">
                      <span className="footer-join-highlight-label">招新与技术交流 QQ 群</span>
                      <span className="footer-join-highlight-group">{contactInfo.qqGroup}</span>
                      {copyError && (
                        <span className="footer-copy-error" role="alert">
                          {copyError}
                        </span>
                      )}
                    </div>
                    <button type="button" className={`footer-copy-btn ${copied ? 'is-copied' : ''}`} onClick={handleCopyQQ}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? '已复制群号' : '一键复制群号'}
                    </button>
                  </div>

                  <div className="footer-steps-list">
                    <div className="footer-step-item">
                      <span className="footer-step-badge">1</span>
                      <div className="footer-step-content">
                        <strong>参加培训</strong>
                        <p>了解小组规则、基础要求和三个方向。</p>
                      </div>
                    </div>
                    <div className="footer-step-item">
                      <span className="footer-step-badge">2</span>
                      <div className="footer-step-content">
                        <strong>完成阶段任务</strong>
                        <p>在培训中完成对应任务，展示你的学习和协作方式。</p>
                      </div>
                    </div>
                    <div className="footer-step-item">
                      <span className="footer-step-badge">3</span>
                      <div className="footer-step-content">
                        <strong>通过考核，正式进组</strong>
                        <p>完成三轮考核后，正式成为小组成员。</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="footer-modal-actions">
                  <button type="button" className="footer-action-secondary" onClick={onClose}>
                    稍后再说
                  </button>
                  <button type="button" className="footer-action-primary" onClick={() => handleNavigateTo('#/learning')}>
                    去看看学习路线
                  </button>
                </div>
              </>
            )}

            {/* 3. 贡献指南 */}
            {type === 'contribute' && (
              <>
                <div className="footer-modal-header">
                  <div>
                    <p className="footer-modal-eyebrow">OPEN SOURCE / 03</p>
                    <h3 id="footer-modal-title" className="footer-modal-title">
                      开源与内容共建指南
                    </h3>
                  </div>
                  <button type="button" className="footer-modal-close" ref={closeButtonRef} onClick={onClose} aria-label="关闭窗口">
                    <X size={16} />
                  </button>
                </div>

                <div className="footer-modal-body">
                  <p className="footer-modal-intro">
                    这个网站不是一个人的作品，而是几位同学围绕设计、后端、服务器和实际功能一起完成的项目。我们也希望后来加入的同学，继续维护和完善它。
                  </p>

                  <div className="footer-modal-features">
                    <div className="footer-modal-feature-card">
                      <h4 className="footer-modal-feature-title">
                        <GitPullRequest size={16} /> 后端与工具页
                      </h4>
                      <p className="footer-modal-feature-desc">小王同学（29 届）：负责后端开发和工具页 UI 设计。</p>
                    </div>
                    <div className="footer-modal-feature-card">
                      <h4 className="footer-modal-feature-title">
                        <Code2 size={16} /> 宣传页与基础设施
                      </h4>
                      <p className="footer-modal-feature-desc">
                        小何同学（29 届）：负责宣传页设计、服务器、域名，以及工具页的部分功能建议。
                      </p>
                    </div>
                    <div className="footer-modal-feature-card">
                      <h4 className="footer-modal-feature-title">
                        <Mail size={16} /> 邮件服务与用户体验
                      </h4>
                      <p className="footer-modal-feature-desc">小许同学（28 届）：负责第三方邮件发送配置，以及发送到用户收件箱的界面。</p>
                    </div>
                    <div className="footer-modal-feature-card">
                      <h4 className="footer-modal-feature-title">
                        <Sparkles size={16} /> 继续参与共建
                      </h4>
                      <p className="footer-modal-feature-desc">欢迎提交功能建议、修复问题、补充学习资源，或参与后续功能开发。</p>
                    </div>
                  </div>
                </div>

                <div className="footer-modal-actions">
                  <button type="button" className="footer-action-secondary" onClick={() => handleNavigateTo('#/resources')}>
                    前往资源库投稿
                  </button>
                  <a href={contactInfo.github} target="_blank" rel="noreferrer" className="footer-action-primary">
                    <span>访问 GitHub 仓库</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </>
            )}

            {/* 4. 隐私政策 */}
            {type === 'privacy' && (
              <>
                <div className="footer-modal-header">
                  <div>
                    <p className="footer-modal-eyebrow">PRIVACY &amp; DATA / 04</p>
                    <h3 id="footer-modal-title" className="footer-modal-title">
                      数据与隐私保护声明
                    </h3>
                  </div>
                  <button type="button" className="footer-modal-close" ref={closeButtonRef} onClick={onClose} aria-label="关闭窗口">
                    <X size={16} />
                  </button>
                </div>

                <div className="footer-modal-body">
                  <p className="footer-modal-intro">
                    本网站只在提供账号、登录、邮箱验证、内容投稿等功能时保存必要信息。用户主动提交的项目、资源、面经和留言，会按照对应页面的公开范围展示。管理员只会在账号维护、内容审核和系统维护范围内访问必要信息。
                  </p>

                  <div className="footer-policy-list">
                    <div className="footer-policy-item">
                      <Lock size={18} className="footer-policy-icon" />
                      <div className="footer-policy-text">
                        <strong>账号信息</strong>
                        <p>注册和登录所需的信息，仅用于账号识别、登录和相关服务。</p>
                      </div>
                    </div>

                    <div className="footer-policy-item">
                      <EyeOff size={18} className="footer-policy-icon" />
                      <div className="footer-policy-text">
                        <strong>用户投稿</strong>
                        <p>项目、资源、面经和留言会按照你提交时选择的可见范围展示。</p>
                      </div>
                    </div>

                    <div className="footer-policy-item">
                      <Database size={18} className="footer-policy-icon" />
                      <div className="footer-policy-text">
                        <strong>本地草稿</strong>
                        <p>未提交的表单草稿保存在当前浏览器中，清理浏览器数据后会被移除。</p>
                      </div>
                    </div>

                    <div className="footer-policy-item">
                      <UserCheck size={18} className="footer-policy-icon" />
                      <div className="footer-policy-text">
                        <strong>邮箱验证</strong>
                        <p>邮箱验证码用于确认账号归属，以及完成注册或登录流程。</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="footer-modal-actions">
                  <button type="button" className="footer-action-primary" onClick={onClose}>
                    <ShieldCheck size={14} /> 我已知晓
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
