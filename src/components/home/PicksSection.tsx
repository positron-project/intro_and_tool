import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowDown, Copy, Check } from 'lucide-react'
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

  const itemVariant = {
    hidden: { opacity: 0, y: 28 },
    visible: (delay: number = 0.1) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        delay,
        ease: easeCurve,
      },
    }),
  }

  return (
    <section id="story-picks" className="picks-section-viewport" aria-label="小组推荐">
      <div className="picks-content-stage">
        {/* 顶部：区段眉标 + 标题与引言 */}
        <div className="picks-header-block">
          <span className="poster-eyebrow">Our picks</span>

          <div className="picks-heading-row">
            <motion.h2
              className="picks-main-title poster-section-title"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.08, ease: easeCurve }}
            >
              小组推荐
            </motion.h2>

            <motion.p
              className="picks-sub-quote"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.16, ease: easeCurve }}
            >
              一些我们在维护，
              <br />
              自己也一直在用的东西。
            </motion.p>
          </div>
        </div>

        {/* 两条推荐：左边序号与英文小标，右边标题、说明与真实信息 */}
        <div className="picks-list">
          <motion.article
            className="picks-item"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={itemVariant}
            custom={0.1}
          >
            <div className="picks-item-meta">
              <span className="picks-item-num">01</span>
              <span className="poster-eyebrow poster-eyebrow--plain">Minecraft server</span>
            </div>

            <div className="picks-item-main">
              <h3 className="picks-item-title">属于小组自己的世界</h3>

              <p className="picks-item-desc">
                写代码写累了，可以上去盖房子、挖矿，或者随便走走。
              </p>

              <div className="picks-specs">
                <div className="picks-spec-row">
                  <span className="picks-spec-label">地址</span>
                  <code className="picks-spec-val">{serverAddress}</code>
                  <button
                    type="button"
                    className="picks-copy-btn"
                    onClick={handleCopyAddress}
                    aria-label="复制服务器地址"
                  >
                    {copiedAddress ? (
                      <>
                        <Check size={12} aria-hidden="true" />
                        <span>已复制</span>
                      </>
                    ) : copyFailed ? (
                      <span className="picks-copy-error">复制失败，请手动选择</span>
                    ) : (
                      <>
                        <Copy size={12} aria-hidden="true" />
                        <span>复制</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="picks-spec-row">
                  <span className="picks-spec-label">访问</span>
                  <span className="picks-spec-val picks-spec-val--text">
                    校园网或独立主机
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="picks-item-link"
                onClick={() => onNavigate?.('#/projects')}
              >
                <span>在项目库中查看介绍</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </motion.article>

          <motion.article
            className="picks-item"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={itemVariant}
            custom={0.15}
          >
            <div className="picks-item-meta">
              <span className="picks-item-num">02</span>
              <span className="poster-eyebrow poster-eyebrow--plain">Tools</span>
            </div>

            <div className="picks-item-main">
              <h3 className="picks-item-title">小组工具页</h3>

              <p className="picks-item-desc">
                把平时学习和开发时常用的小工具放在一起，省得每次到处找。
              </p>

              <div className="picks-specs">
                <div className="picks-spec-row">
                  <span className="picks-spec-label">内容</span>
                  <span className="picks-spec-val picks-spec-val--text">
                    开发与学习用的小工具
                  </span>
                </div>

                <div className="picks-spec-row">
                  <span className="picks-spec-label">状态</span>
                  <span className="picks-spec-val picks-spec-val--text">
                    已经上线，组内自己维护
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="picks-item-link"
                onClick={() => onNavigate?.('#/tools')}
              >
                <span>打开工作台</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </motion.article>
        </div>

        {/* 底部：与 05 / BLOG 的衔接 */}
        <div className="picks-footer-anchor">
          <button
            type="button"
            className="picks-next-hint poster-next"
            onClick={onNextSection}
            aria-label="继续向下：小组博客"
          >
            <span>小组博客</span>
            <ArrowDown size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}
