import { useState, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { projects } from '../../data/mock'
import './offer-section.css'

/* ============================================================
   03 / OUR PROJECTS（我们做出来的东西）
   ------------------------------------------------------------
   形态是「左侧项目切换器 + 右侧单项目封面」：
   左栏只放序号与项目名，右栏只有封面区 + 一行入口
   （「在项目库中看这个项目」）。
   封面以下的元信息行 / 一句说明 / 规格行已按 YG 要求整段删除，
   info 都收进项目库详情页，这一节只负责「看见东西」与「点进去」。

   封面区是项目自己的界面截图（Project.coverImage）。宽高比在 figure 上写死
   （1440/820，绿易坊那张截图的真实比例），img 用 height:100% 填进去 ——
   不靠元素固有尺寸，截图加载完成时封面不会先矮后高抖一下，换图也不会。
   没有截图的数据不给占位图、不塞生成图，封面区留空，等真实素材到了再补。

   数据来自 data/mock.ts 的 projects（featured 的三条），
   后端接入后换 service 层即可，组件内不直接 fetch。
   ============================================================ */

const FEATURED = projects.filter((project) => project.featured).sort((a, b) => b.year - a.year)

export function OfferSection({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const easeCurve = [0.16, 1, 0.3, 1] as const

  const active = FEATURED[activeIndex] ?? FEATURED[0]

  const handleSwitchKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const next = event.key === 'ArrowDown' ? activeIndex + 1 : activeIndex - 1
    setActiveIndex((next + FEATURED.length) % FEATURED.length)
  }

  if (!active) return null

  const coverSrc = active.coverImage || active.galleryImages?.[0]

  return (
    <section id="story-offer" className="offer-section-viewport" aria-label="我们做出来的东西">
      <div className="offer-content-stage">
        {/* 第一段：眉标 + 主标题 + 一句承接 */}
        <div className="offer-header-block">
          <span className="poster-eyebrow">Our projects</span>

          <motion.h2
            className="offer-main-title poster-section-title"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, delay: 0.08, ease: easeCurve }}
          >
            我们做出来的东西
          </motion.h2>

          <motion.p
            className="offer-thesis"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, delay: 0.16, ease: easeCurve }}
          >
            做过的东西都留着，下一届接着用。
          </motion.p>
        </div>

        {/* 第二段：左切换器 + 右详情 */}
        <div className="offer-stage">
          <div
            className="offer-switch"
            role="group"
            aria-label="项目列表"
            onKeyDown={handleSwitchKeyDown}
          >
            {FEATURED.map((project, index) => (
              <button
                key={project.id}
                type="button"
                className="offer-switch-item"
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              >
                <span className="offer-switch-num">{String(index + 1).padStart(2, '0')}</span>
                <span className="offer-switch-name">{project.name}</span>
              </button>
            ))}
          </div>

          <motion.article
            key={active.id}
            className="offer-detail"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easeCurve }}
          >
            <figure className="offer-cover">
              {coverSrc ? (
                <img src={coverSrc} alt={`${active.name} 的界面截图`} />
              ) : null}
            </figure>

            {onNavigate ? (
              <button
                type="button"
                className="offer-detail-link"
                onClick={() => onNavigate(`#/projects/${active.slug}`)}
              >
                <span>在项目库中看这个项目</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            ) : null}
          </motion.article>
        </div>
      </div>
    </section>
  )
}
