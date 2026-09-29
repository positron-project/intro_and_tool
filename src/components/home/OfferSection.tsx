import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import './offer-section.css'

interface OfferSectionProps {
  onNavigate?: (path: string) => void
  onNextSection?: () => void
}

interface OfferRow {
  index: string
  enTag: string
  headline: string
  description: string
  chips: string[]
}

const OFFER_ROWS: OfferRow[] = [
  {
    index: '01',
    enTag: 'ENVIRONMENT & SPACE',
    headline: '专属实验室 · 随时自习，不受打扰',
    description:
      '我们在实验楼有一间属于自己的实验室。你可以随时过来安静自习、专心做项目，不怕外部打扰；也可以叫上组员一起讨论交流、动手开发。',
    chips: ['INDEPENDENT LAB', 'QUIET STUDY', 'TEAM WORK'],
  },
  {
    index: '02',
    enTag: 'PROJECT & CREATIVITY',
    headline: '动手做项目 · 只要你有想法，大家都会响应',
    description:
      '组里有很多经验丰富又热爱技术的伙伴。如果你想做项目，只要把点子提出来，大家都会积极响应，陪你一起把想法落地变成真实作品。',
    chips: ['IDEA TO LAUNCH', 'HANDS-ON', 'PEER SUPPORT'],
  },
  {
    index: '03',
    enTag: 'COMPETITION & CAREER',
    headline: '组队打比赛 · 实战拿奖，为简历锦上添花',
    description:
      '我们会不定期组织大家组队参加各类比赛。和队友一起实战练手、积累经验；在比赛中收获成果与奖项，让你的个人简历更加出彩。',
    chips: ['TEAM CONTESTS', 'AWARDS', 'RESUME BOOST'],
  },
]

export function OfferSection({ onNavigate, onNextSection }: OfferSectionProps) {
  const easeCurve = [0.16, 1, 0.3, 1] as const

  const rowVariant = {
    hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
    visible: (customDelay: number = 0.15) => ({
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
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
      aria-label="03 · 我们可以给你带来什么"
    >
      {/* ============================================================
          Layer 1 & 2: 背景工程蓝图层 (坐标网格、超大背景字、坐标十字标)
          ============================================================ */}
      <div className="offer-bg-layer" aria-hidden="true">
        {/* 72px 极浅工程网格 */}
        <div className="offer-bg-grid" />

        {/* 极浅几何斜向色带：承袭 01/02 视觉系统 */}
        <div className="offer-geo-ribbon" />

        {/* 右下角极淡超大轮廓字 OFFER */}
        <div className="offer-bg-watermark">
          OFFER
        </div>

        {/* 背景坐标定位十字标 (+) */}
        <svg
          className="offer-bg-crosses"
          viewBox="0 0 1600 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke="#073F73" strokeWidth="0.8" opacity="0.22">
            <line x1="140" y1="240" x2="152" y2="240" />
            <line x1="146" y1="234" x2="146" y2="246" />
            <line x1="960" y1="260" x2="972" y2="260" />
            <line x1="966" y1="254" x2="966" y2="266" />
            <line x1="1420" y1="560" x2="1432" y2="560" />
            <line x1="1426" y1="554" x2="1426" y2="566" />
            <line x1="280" y1="780" x2="292" y2="780" />
            <line x1="286" y1="774" x2="286" y2="786" />
          </g>
        </svg>
      </div>

      {/* ============================================================
          主体内容排版层 (单列行状图纸流 · 绝无卡片外框)
          ============================================================ */}
      <div className="offer-content-stage">
        {/* 第一段：03 统一章节系统 + 醒目主标题 */}
        <div className="offer-header-grid">
          {/* 左侧章节标 */}
          <motion.div
            className="offer-chapter-column"
            initial={{ opacity: 0, x: -36 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: easeCurve }}
          >
            <span className="offer-chapter-num">03</span>
            <div className="offer-chapter-rule" />
            <span className="offer-chapter-label">WHAT WE OFFER</span>
          </motion.div>

          {/* 主标题行 */}
          <div className="offer-title-wrap">
            <motion.h2
              className="offer-main-title"
              initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: 0.1, ease: easeCurve }}
            >
              我们可以
              <br />
              给你带来什么？
            </motion.h2>

            <motion.div
              className="offer-title-aside"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              aria-hidden="true"
            >
              <span className="offer-aside-en">
                NOT JUST
                <br />
                LEARNING.
              </span>
              <span className="offer-aside-dot" />
            </motion.div>
          </div>
        </div>

        {/* 杂志式错位第二视觉焦点：醒目辅助短句 */}
        <motion.div
          className="offer-focal-row"
          initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, delay: 0.18, ease: easeCurve }}
        >
          <div className="offer-focal-quote">
            <span>「学到的，要有地方去。」</span>
            <span className="offer-focal-tag">● CONTINUUM</span>
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
              {/* 左侧规格标号栏 */}
              <div className="offer-row-meta">
                <span className="offer-row-num">{row.index}</span>
                <span className="offer-row-en-tag">{row.enTag}</span>
                <div className="offer-row-meta-line" />
              </div>

              {/* 右侧核心内容栏 */}
              <div className="offer-row-main">
                <h3 className="offer-row-headline">{row.headline}</h3>
                <p className="offer-row-desc">{row.description}</p>
                <div className="offer-row-chips">
                  {row.chips.map((chip) => (
                    <span key={chip} className="offer-row-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 第三段：底部微引导与 04 / OUR PICKS 视觉预埋框 */}
        <div className="offer-footer-guide">
          <div className="offer-picks-framework">
            <div className="offer-framework-box" />
            <span>BUILD TRAJECTORY → SHOWCASE FRAME</span>
          </div>

          <div className="offer-footer-preview">
            <button
              type="button"
              className="offer-footer-target"
              onClick={onNextSection}
              aria-label="前往 04 小组力荐"
            >
              <span>04 OUR PICKS · WHAT WE&apos;RE BUILDING &amp; USING</span>
              <ArrowDown size={14} className="offer-footer-arrow" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
