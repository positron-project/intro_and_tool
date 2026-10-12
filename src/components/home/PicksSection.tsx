import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Copy, Check } from 'lucide-react'
import { fadeUp, listItemVariants, SHIFT, STAGGER, useRuleIn } from './motion'
import './picks-section.css'

interface PicksSectionProps {
  onNavigate?: (path: string) => void
}

const serverAddress = 'mc.scse.club'

interface PickSpec {
  label: string
  value: string
  /** 值后面挂一个复制按钮（服务器地址） */
  copyable?: boolean
}

interface Pick {
  /** 两位序号，同时用在左侧编号栏与移动端图上的角标 */
  num: string
  eyebrow: string
  title: string
  desc: string
  specs: PickSpec[]
  action: { label: string; path: string }
  /** public/assets 下的文件名 */
  image: string
  /** 封面贴左缘、正文右移的镜像条目（与上一条交替） */
  reverse?: boolean
}

/* 两条推荐。封面一律是各自的真实界面截图，第一条贴右、第二条贴左（镜像）。 */
const PICKS: Pick[] = [
  {
    num: '01',
    eyebrow: 'Minecraft server',
    title: '属于小组自己的世界',
    desc: '写代码写累了，可以上去盖房子、挖矿，或者随便走走。',
    specs: [
      { label: '地址', value: serverAddress, copyable: true },
      { label: '访问', value: '校园网或独立主机' },
    ],
    action: { label: '在项目库中查看介绍', path: '#/projects' },
    image: 'picks-minecraft-base.webp',
  },
  {
    num: '02',
    eyebrow: 'Tools',
    title: '小组工具页',
    desc: '把平时学习和开发时常用的小工具放在一起，省得每次到处找。',
    specs: [
      { label: '内容', value: '开发与学习用的小工具' },
      { label: '状态', value: '已经上线，组内自己维护' },
    ],
    action: { label: '打开工作台', path: '#/tools' },
    image: 'picks-tools-page.webp',
    reverse: true,
  },
]

export function PicksSection({ onNavigate }: PicksSectionProps) {
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

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

  const rule = useRuleIn()

  return (
    <section id="story-picks" className="picks-section-viewport" aria-label="小组推荐">
      <div className="picks-content-stage">
        {/* 顶部：区段眉标 + 标题与引言 */}
        <div className="picks-header-block">
          {/* 眉标那条 2px 杠先进场（线先落），标题与引言再跟 */}
          <motion.span
            className={`poster-eyebrow${rule.shown ? ' is-rule-in' : ''}`}
            onViewportEnter={rule.onViewportEnter}
            viewport={{ once: true, amount: 0.6 }}
          >
            Our picks
          </motion.span>

          <div className="picks-heading-row">
            <motion.h2
              className="picks-main-title poster-section-title"
              {...fadeUp({ delay: STAGGER, distance: SHIFT.block, amount: 0.3 })}
            >
              小组推荐
            </motion.h2>

            <motion.p className="picks-sub-quote" {...fadeUp({ delay: STAGGER * 2, amount: 0.3 })}>
              一些我们在维护，
              <br />
              自己也一直在用的东西。
            </motion.p>
          </div>
        </div>

        {/* 两条推荐：左边序号与英文小标，右边标题、说明与真实信息 */}
        <div className="picks-list">
          {PICKS.map((pick, index) => (
            <motion.article
              key={pick.num}
              className={[
                'picks-item',
                'picks-item--visual',
                pick.reverse ? 'picks-item--visual-reverse' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={listItemVariants}
              // 逐条跟进：0.05s 一档，与原 01 / 02 的节奏一致
              custom={0.1 + index * 0.05}
            >
              {/* 桌面端序号（默认贴本条左上，镜像条由 CSS 挪到右上） */}
              <div className="picks-item-meta">
                <span className="picks-item-num">{pick.num}</span>
              </div>

              <div className="picks-item-main">
                {/* 英文小标挪到正文列顶部：编号栏因此能收到只容纳序号（2026-10） */}
                <span className="poster-eyebrow poster-eyebrow--plain">{pick.eyebrow}</span>

                <h3 className="picks-item-title">{pick.title}</h3>

                <p className="picks-item-desc">{pick.desc}</p>

                <div className="picks-specs">
                  {pick.specs.map((spec) => (
                    <div className="picks-spec-row" key={spec.label}>
                      <span className="picks-spec-label">{spec.label}</span>
                      {spec.copyable ? (
                        <>
                          <code className="picks-spec-val">{spec.value}</code>
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
                        </>
                      ) : (
                        <span className="picks-spec-val picks-spec-val--text">{spec.value}</span>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="picks-item-link"
                  onClick={() => onNavigate?.(pick.action.path)}
                >
                  <span>{pick.action.label}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>

              {/* 封面图容器：桌面端贴半边（默认右、镜像条左），移动端在介绍下方并标出编号 */}
              <div className="picks-item-cover">
                <img
                  className="picks-item-photo"
                  src={`./assets/${pick.image}`}
                  alt=""
                  aria-hidden="true"
                />
                <div className="picks-item-cover-badge" aria-hidden="true">
                  <span className="picks-item-cover-num">{pick.num}</span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
