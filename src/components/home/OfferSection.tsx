import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import './offer-section.css'

interface OfferSectionProps {
  onNextSection?: () => void
}

interface OfferRow {
  index: string
  enTag: string
  headline: string
  description: string
}

const OFFER_ROWS: OfferRow[] = [
  {
    index: '01',
    enTag: 'ENVIRONMENT & SPACE',
    headline: '实验楼有间自己的屋子，没课就能来',
    description:
      '我们在实验楼有一间自己的屋子，没课的时候可以过来写代码、自习，或者叫上组员一起讨论。',
  },
  {
    index: '02',
    enTag: 'PROJECT & CREATIVITY',
    headline: '有想法就说出来，一般会有人一起做',
    description:
      '组里有人做前端、后端，也有人管部署和测试。你想做什么，在群里说一声，通常会有几个人感兴趣，一起做出来。',
  },
  {
    index: '03',
    enTag: 'COMPETITION & CAREER',
    headline: '组队打比赛，练手顺便攒简历',
    description:
      '比赛的消息一般发在群里，想去的自己组队。赛前会一起看点往年的题，赛后把踩过的坑记下来。',
  },
]

export function OfferSection({ onNextSection }: OfferSectionProps) {
  const easeCurve = [0.16, 1, 0.3, 1] as const

  const rowVariant = {
    hidden: { opacity: 0, y: 24 },
    visible: (customDelay: number = 0.15) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        delay: customDelay,
        ease: easeCurve,
      },
    }),
  }

  return (
    <section
      id="story-offer"
      className="offer-section-viewport"
      aria-label="能带来什么"
    >
      {/* ============================================================
          主体内容排版层 (单列行状图纸流 · 绝无卡片外框)
          ============================================================ */}
      <div className="offer-content-stage">
        {/* 第一段：区块眉标 + 醒目主标题 */}
        <div className="offer-header-grid">
          <span className="poster-eyebrow">What we offer</span>

          {/* 主标题行 */}
          <div className="offer-title-wrap">
            <motion.h2
              className="offer-main-title poster-section-title"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: 0.1, ease: easeCurve }}
            >
              来了以后
              <br />
              能得到什么？
            </motion.h2>
          </div>
        </div>

        {/* 杂志式错位第二视觉焦点：醒目辅助短句 */}
        <motion.div
          className="offer-focal-row"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, delay: 0.18, ease: easeCurve }}
        >
          <div className="offer-focal-quote">
            <span>学了的东西，得有地方用。</span>
          </div>
        </motion.div>

        {/* 第二段：每行一个 (单列 3 大行展开 · 纯蓝图排版架构) */}
        <div className="offer-rows-container">
          {OFFER_ROWS.map((row, idx) => (
            <motion.div
              key={row.index}
              className="offer-row-item"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={rowVariant}
              custom={0.25 + idx * 0.12}
            >
              {/* 左侧标号栏：序号 + 英文小标 */}
              <div className="offer-row-meta">
                <span className="offer-row-num">{row.index}</span>
                <span className="poster-eyebrow poster-eyebrow--plain">{row.enTag}</span>
              </div>

              {/* 右侧核心内容栏 */}
              <div className="offer-row-main">
                <h3 className="offer-row-headline">{row.headline}</h3>
                <p className="offer-row-desc">{row.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 第三段：底部继续往下的引导 */}
        <div className="offer-footer-guide">
          <button
            type="button"
            className="offer-footer-target poster-next"
            onClick={onNextSection}
            aria-label="继续向下：小组推荐"
          >
            <span>小组推荐</span>
            <ArrowDown size={14} className="offer-footer-arrow" />
          </button>
        </div>
      </div>
    </section>
  )
}
