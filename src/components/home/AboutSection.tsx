import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ABOUT_CAPABILITIES,
  ABOUT_GROUPS,
  ABOUT_GROUP_ORDER,
  type AboutCapability,
  type AboutCapabilityId,
  type AboutGroupContent,
  type AboutGroupId,
} from './about-groups'
import { fadeUp, SHIFT, STAGGER, useRuleIn } from './motion'
import './about-section.css'

/* ============================================================
   02 我们各有特色 —— 多组并置
   ------------------------------------------------------------
   2026-10 改版：原来是「左侧切换栏 + 右侧规格卡」的 tab 结构，
   一次只能看到一组（tablist / roving tabindex / layoutId 指示块 /
   AnimatePresence 面板切换 / 高度锚点层整套都在这一版里删掉）。
   现在两个一组、同时可读：栏头（组名）→ 18×2 强调色横杠 →
   组标 → 两行短句 → 一句短语 → 栏尾四格。
   两栏顶对齐等高起头，栏与栏之间只有一条 1px 竖线
   （画在父栏的 ::before 上，到该行底部就终止）。

   数据全部来自 about-groups.ts：往 ABOUT_GROUP_ORDER 里加 id 即可
   多一组；两个一格自动分列，一行落单时本文件补一格 pending 占位。

   栏尾四格（2×2，无外框、只有中间一横一竖）：图标 + 特性名，
   数据来自 ABOUT_CAPABILITIES[groupId]，每组一份。
   ============================================================ */

/* 两栏入场：栏头（组名）→ 栏内小标 → 短句 → 正文整块，比标题晚一档 */
function GroupColumn({
  group,
  delay,
  children,
}: {
  group: AboutGroupContent
  delay: number
  children?: ReactNode
}) {
  return (
    <motion.article className="about-pair-col" {...fadeUp({ delay, distance: SHIFT.block, amount: 0.2 })}>
      {/* 栏头：组名 */}
      <h3 className="about-pair-name">{group.name}</h3>

      {/* 栏内唯一的强调色落点：与眉标同一根 18×2 横杠 */}
      <span className="about-pair-rule" aria-hidden="true" />

      <span className="poster-eyebrow poster-eyebrow--plain">{group.chapterLabel}</span>

      {/* 第二视觉焦点：两行醒目短句 */}
      <div className="about-focal-quote">
        <span className="about-quote-line">{group.quoteLines[0]}</span>
        <span className="about-quote-line about-quote-line--sub">{group.quoteLines[1]}</span>
      </div>

      {/* 栏内唯一一句短语（原来这里是两段正文） */}
      <p className="about-body-narrative">{group.motto}</p>

      {/* 栏尾附加内容：每组一份四格 */}
      {children}
    </motion.article>
  )
}

/* ------------------------------------------------------------
   「我们做什么」四格图标
   ------------------------------------------------------------
   24×24 描边线稿，1.5 线宽 + 圆收口，只吃 currentColor（墨黑），
   不引入第二种颜色。viewBox 与笔触跟首屏圆形线稿是同一套。
   ------------------------------------------------------------ */
const CAPABILITY_ICONS: Record<AboutCapabilityId, ReactNode> = {
  /* 前端：浏览器窗口 + 一对尖括号 */
  frontend: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M3 9h18" />
      <path d="M6.1 6.7h.01M8.3 6.7h.01" />
      <path d="M7.4 12.6 5.6 14.7l1.8 2.1" />
      <path d="M12.2 12.6l1.8 2.1-1.8 2.1" />
    </>
  ),
  /* 后端：两层机架 */
  backend: (
    <>
      <rect x="3.5" y="4" width="17" height="6" rx="1.6" />
      <rect x="3.5" y="14" width="17" height="6" rx="1.6" />
      <path d="M6.6 7h.01M6.6 17h.01" />
      <path d="M10.4 7h6.4M10.4 17h6.4" />
    </>
  ),
  /* 团队：两个人 */
  teamwork: (
    <>
      <circle cx="9" cy="7.8" r="3" />
      <path d="M3.4 19.2c0-3.1 2.5-5.2 5.6-5.2s5.6 2.1 5.6 5.2" />
      <path d="M15.8 5.4a3 3 0 0 1 0 5.6" />
      <path d="M17.2 14.2c2 .6 3.4 2.3 3.4 4.4" />
    </>
  ),
  /* 项目管理：看板三列 */
  management: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M9 4.5v15M15 4.5v15" />
      <path d="M5.4 8h1.2M11.4 8h1.2M17.4 8h1.2" />
      <path d="M5.4 11.5h1.2M11.4 11.5h1.2" />
    </>
  ),
  /* 赛事：奖杯 */
  contest: (
    <>
      <path d="M7.5 4h9v4.6a4.5 4.5 0 0 1-9 0z" />
      <path d="M7.5 5.8H5.2a2.6 2.6 0 0 0 2.6 2.6" />
      <path d="M16.5 5.8h2.3a2.6 2.6 0 0 1-2.6 2.6" />
      <path d="M12 13.1V16" />
      <path d="M9.6 19.5h4.8l-.8-3.5h-3.2z" />
    </>
  ),
  /* 赛制：秒表 */
  rules: (
    <>
      <circle cx="12" cy="13.8" r="7.2" />
      <path d="M12 13.8V9.6" />
      <path d="M9.9 2.8h4.2" />
      <path d="M12 2.8v3.8" />
      <path d="M18.2 8.2l1.6-1.6" />
    </>
  ),
  /* 算法：三个节点连成的图 */
  algorithm: (
    <>
      <circle cx="6" cy="6.6" r="2.6" />
      <circle cx="18" cy="6.6" r="2.6" />
      <circle cx="12" cy="18" r="2.6" />
      <path d="M6 6.6h12" />
      <path d="M8.1 8.6 10.7 15.8M15.9 8.6 13.3 15.8" />
    </>
  ),
  /* 训练：一路往上走的折线 + 箭头 */
  training: (
    <>
      <path d="M3.6 19.6h16.8" />
      <path d="M4.6 15.6 8.8 11.4l3.2 3.2 5.6-6" />
      <path d="M14.6 8.6h3v3" />
    </>
  ),
  /* PWN：带裂口的方块 */
  pwn: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.4" />
      <path d="M13.8 6.6 11.4 11.4h3.2l-2.4 4.8" />
    </>
  ),
  /* Reverse：放大镜里的一对尖括号 */
  reverse: (
    <>
      <circle cx="10.4" cy="10.4" r="6.4" />
      <path d="M15.2 15.2 20.4 20.4" />
      <path d="M8.6 9.2 7.1 10.7l1.5 1.5" />
      <path d="M12.2 9.2l1.5 1.5-1.5 1.5" />
    </>
  ),
  /* Web：地球 */
  web: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M3.8 12h16.4" />
      <path d="M12 3.8c2.4 2.3 3.7 5.2 3.7 8.2s-1.3 5.9-3.7 8.2c-2.4-2.3-3.7-5.2-3.7-8.2S9.6 6.1 12 3.8z" />
    </>
  ),
  /* Crypto：挂锁 */
  crypto: (
    <>
      <rect x="4.6" y="10.4" width="14.8" height="9.6" rx="2.2" />
      <path d="M8.2 10.4V8a3.8 3.8 0 0 1 7.6 0v2.4" />
      <path d="M12 14.4v2.4" />
    </>
  ),
  /* 申请教室：登记板 + 日历页（借教室） */
  'apply-room': (
    <>
      <rect x="3.6" y="4.4" width="9.6" height="15.2" rx="1.8" />
      <rect x="6.8" y="2.8" width="3.2" height="3.2" rx="1.2" />
      <path d="M6.2 9.6h4.4M6.2 12.4h4.4M6.2 15.2h2.8" />
      <rect x="14.6" y="9.4" width="6.4" height="6.6" rx="1.4" />
      <path d="M16.2 9.4v1.8M19.4 9.4v1.8" />
      <path d="M16.3 12.8h.01M18.6 12.8h.01M16.3 14.6h.01M18.6 14.6h.01" />
    </>
  ),
  /* 批经费：一叠硬币 + 印章 */
  'apply-budget': (
    <>
      <ellipse cx="7.4" cy="9" rx="4.2" ry="1.8" />
      <path d="M3.2 11.2c0 1 1.9 1.8 4.2 1.8s4.2-.8 4.2-1.8" />
      <path d="M3.2 13.3c0 1 1.9 1.8 4.2 1.8s4.2-.8 4.2-1.8" />
      <circle cx="16.8" cy="15.4" r="5" />
      <path d="M14.7 14.2l1.2 1.1 2.7-2" />
      <path d="M16 10.2V8.6h1.6v1.6" />
    </>
  ),
  /* 申请批假：日历 + 纸飞机 */
  'apply-leave': (
    <>
      <rect x="3.4" y="6.4" width="12.6" height="13.2" rx="1.8" />
      <path d="M3.4 10h12.6" />
      <path d="M6.6 4.6v3.4M12.8 4.6v3.4" />
      <path d="M6.4 13h.01M9 13h.01M11.6 13h.01M6.4 15.6h.01M11.6 15.6h.01M9 18h.01" />
      <circle cx="7.6" cy="16.8" r="1.2" />
      <circle cx="11.4" cy="14.6" r="1.2" />
      <path d="M8.7 16l1.7-.9" />
      <path d="M13.4 6.6c1.8-1.6 4.2-2.4 6.6-2.4-1.4 2-3.2 3.4-5.4 4.2z" />
      <path d="M14.6 8.4l1.4 1.4" />
    </>
  ),
  /* 管理考核：列图 + 对钩 */
  'apply-review': (
    <>
      <rect x="3.6" y="7.4" width="11.4" height="12.4" rx="1.8" />
      <path d="M6.6 17h5.4" />
      <path d="M6.6 17v-3.2M9.8 17V9.8M13 17v-4.4" />
      <circle cx="16.8" cy="15.8" r="4.6" />
      <path d="M14.9 15.8l1.4 1.4 2.4-2.6" />
    </>
  ),
}

/* 一格：插画层（默认全透明）→ 图标 → 特性名，入场按阅读顺序逐格跟进。
   插画层写在最前面：两者都是定位元素，DOM 顺序就是它们的压叠顺序。 */
function CapabilityCell({ item, delay }: { item: AboutCapability; delay: number }) {
  return (
    <motion.li
      className="about-capability-cell"
      {...fadeUp({ delay, distance: SHIFT.text, amount: 0.2 })}
    >
      {/* 悬停淡入：整张插画按 contain 缩放，压在图标与特性名下面（装饰层，不进无障碍树） */}
      <span className="about-capability-media" aria-hidden="true">
        <img src={item.image} alt="" loading="lazy" decoding="async" />
      </span>
      <span className="about-capability-glyph" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          {CAPABILITY_ICONS[item.id]}
        </svg>
      </span>
      <h4 className="about-capability-name">{item.name}</h4>
    </motion.li>
  )
}

/* 栏尾四格：无外框、无标题，按阅读顺序逐格进场 */
function CapabilityBlock({ groupId }: { groupId: AboutGroupId }) {
  return (
    <ul className="about-capability-grid">
      {ABOUT_CAPABILITIES[groupId].map((item, index) => (
        <CapabilityCell key={item.id} item={item} delay={STAGGER * (4 + index)} />
      ))}
    </ul>
  )
}

export function AboutSection() {
  const rule = useRuleIn()

  return (
    <section id="story-about" className="about-section-viewport" aria-label="02 · 我们各有特色">
      <div className="about-content-stage">
        {/* 版块标题：两组共用一句（about-groups.ts 里两组的 title 相同） */}
        <div className="about-title-row">
          {/* 眉标那条 2px 杠先进场（线先落），标题再跟（字后到） */}
          <motion.span
            className={`poster-eyebrow${rule.shown ? ' is-rule-in' : ''}`}
            onViewportEnter={rule.onViewportEnter}
            viewport={{ once: true, amount: 0.6 }}
          >
            About
          </motion.span>
          <motion.h2
            className="about-main-title poster-section-title"
            {...fadeUp({ delay: STAGGER, distance: SHIFT.block, amount: 0.2 })}
          >
            {ABOUT_GROUPS.project.title}
          </motion.h2>
        </div>

        {/* 每行两组：左项目 / 右算法，右栏下移错位；网安组另起一行 */}
        <div className="about-pair">
          {ABOUT_GROUP_ORDER.map((groupId, index) => (
            <GroupColumn key={groupId} group={ABOUT_GROUPS[groupId]} delay={STAGGER * (2 + index)}>
              {/* 每组栏尾都挂自己的四格 */}
              <CapabilityBlock groupId={groupId} />
            </GroupColumn>
          ))}

          {/* 一行的两个位置没填满时补一格占位，留给以后的第四个组 */}
          {ABOUT_GROUP_ORDER.length % 2 === 1 ? (
            <motion.div
              className="about-pair-col about-pair-col--pending"
              aria-hidden="true"
              {...fadeUp({ delay: STAGGER * 3, distance: SHIFT.block, amount: 0.2 })}
            >
              <span className="about-pending">pending…</span>
            </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
