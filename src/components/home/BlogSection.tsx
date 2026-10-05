import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowDown, X, Calendar, User, Tag, Clock } from 'lucide-react'
import { useContent } from '../../services/content.context'
import type { BlogPost } from '../../types'
import './blog-section.css'

interface BlogSectionProps {
  onNavigate?: (path: string) => void
  onNextSection?: () => void
}

export function BlogSection({ onNavigate, onNextSection }: BlogSectionProps) {
  const { data: { blogPosts } } = useContent()
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const drawerRef = useRef<HTMLElement | null>(null)

  const handleOpenPost = (post: BlogPost, el?: HTMLElement) => {
    triggerRef.current = el || (document.activeElement as HTMLElement)
    setSelectedPost(post)
  }

  const handleCloseDrawer = () => {
    setSelectedPost(null)
    // 关闭后将焦点回到原先触发的文章卡片
    setTimeout(() => {
      triggerRef.current?.focus()
    }, 50)
  }

  // 监听 Esc 键快速关闭阅读抽屉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPost) {
        handleCloseDrawer()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPost])

  // 抽屉打开时：锁定 body 滚动、设置初始焦点，并维护焦点陷阱 (Focus Trap)
  useEffect(() => {
    if (selectedPost) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis
      lenis?.stop?.()

      // 初始焦点移至关闭按钮
      const timer = setTimeout(() => {
        closeBtnRef.current?.focus()
      }, 60)

      // 抽屉内键盘 Tab 焦点陷阱
      const handleTrapTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !drawerRef.current) return
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }

      window.addEventListener('keydown', handleTrapTab)

      return () => {
        clearTimeout(timer)
        document.body.style.overflow = originalOverflow
        lenis?.start?.()
        window.removeEventListener('keydown', handleTrapTab)
      }
    }
  }, [selectedPost])

  // 4 篇真实文章
  const featuredPost = blogPosts[0]
  const secondPost = blogPosts[1]
  const thirdPost = blogPosts[2]
  const fourthPost = blogPosts[3]

  const easeCurve = [0.16, 1, 0.3, 1] as const

  // 入场动画去 blur，仅保留透明度与位移，保障中低端移动端流畅度
  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (delay: number = 0.1) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.75,
        delay,
        ease: easeCurve,
      },
    }),
  }

  return (
    <section
      id="story-blog"
      className="blog-section-viewport"
      aria-label="05 · 小组博客 · 最近文章"
    >
      {/* ============================================================
          Layer 1: 背景工程排版层 (排版基线网格、刊物编号、超大浅字 BLOG)
          ============================================================ */}
      <div className="blog-bg-layer" aria-hidden="true">
        {/* 排版垂直列线与横向基准线 */}
        <div className="blog-bg-grid" />

        {/* 刊物出版物印记与卷号 (Editorial Colophon) */}
        <div className="blog-colophon-mark">
          <span>VOL. 05 // COMPUTER SCIENCE CLUB ACADEMIC JOURNAL</span>
          <span>ISSUE 2026 · ARCHIVE INDEX</span>
        </div>

        {/* 视口右侧超大极浅轮廓字 BLOG */}
        <div className="blog-watermark">BLOG</div>
      </div>

      {/* ============================================================
          主体舞台层 (Magazine Editorial Layout)
          ============================================================ */}
      <div className="blog-content-stage">
        {/* 顶部：05 章节标与主标题行 */}
        <div className="blog-header-block">
          <motion.div
            className="blog-chapter-tag"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: easeCurve }}
          >
            <span className="blog-chapter-num">05</span>
            <div className="blog-chapter-line" />
            <span className="blog-chapter-title">BLOG</span>
            <span className="blog-chapter-sub">LATEST ARTICLES</span>
          </motion.div>

          <div className="blog-heading-row">
            <motion.h2
              className="blog-main-title"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.08, ease: easeCurve }}
            >
              最近，
              <br />
              我们在写什么？
            </motion.h2>

            <motion.p
              className="blog-sub-quote"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.16, ease: easeCurve }}
            >
              一些技术、项目，
              <br />
              以及过程中留下来的想法。
            </motion.p>
          </div>
        </div>

        {/* ============================================================
            非对称编辑排版：主文章 (左侧 58%) 与 次级文章 (右侧 42%)
            ============================================================ */}
        <div className="blog-editorial-grid">
          {/* 左侧：01 / FEATURED 主文章 */}
          {featuredPost && (
            <motion.article
              className="blog-featured-article"
              role="button"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeUp}
              custom={0.1}
              onClick={(e) => handleOpenPost(featuredPost, e.currentTarget)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleOpenPost(featuredPost, e.currentTarget)
                }
              }}
              aria-label={`阅读主文章：${featuredPost.title}`}
            >
              {/* 刊物主标栏 */}
              <div className="featured-top-rule">
                <div className="featured-flag">
                  <span className="featured-num">01</span>
                  <span className="featured-badge">FEATURED ARTICLE</span>
                </div>
                <div className="featured-rule-line" />
              </div>

              {/* 标题 */}
              <h3 className="featured-title">{featuredPost.title}</h3>

              {/* 摘要 */}
              <p className="featured-excerpt">{featuredPost.excerpt}</p>

              {/* 元数据规格行 */}
              <div className="featured-meta-row">
                <span className="meta-item">
                  <time dateTime={featuredPost.date}>{featuredPost.date}</time>
                </span>
                <span className="meta-sep">//</span>
                <span className="meta-item category-text">CATEGORY / {featuredPost.category}</span>
                <span className="meta-sep">//</span>
                <span className="meta-item author-text">BY / {featuredPost.author}</span>
              </div>

              {/* 行动链接 */}
              <div className="featured-action">
                <span className="read-more-link">
                  <span>阅读全文</span>
                  <ArrowRight size={14} className="read-more-arrow" />
                </span>
              </div>
            </motion.article>
          )}

          {/* 右侧：02 & 03 次级文章垂直列表 */}
          <div className="blog-secondary-column">
            {secondPost && (
              <motion.article
                className="blog-secondary-article"
                role="button"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp}
                custom={0.18}
                onClick={(e) => handleOpenPost(secondPost, e.currentTarget)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOpenPost(secondPost, e.currentTarget)
                  }
                }}
                aria-label={`阅读文章：${secondPost.title}`}
              >
                <div className="secondary-header-rule">
                  <span className="secondary-num">02</span>
                  <div className="secondary-rule-line" />
                  <time dateTime={secondPost.date} className="secondary-date">
                    {secondPost.date}
                  </time>
                </div>

                <h4 className="secondary-title">{secondPost.title}</h4>

                <p className="secondary-excerpt">{secondPost.excerpt}</p>

                <div className="secondary-meta-row">
                  <span className="meta-category">CATEGORY / {secondPost.category}</span>
                  <span className="secondary-arrow-btn" aria-hidden="true">
                    <ArrowRight size={14} />
                  </span>
                </div>
              </motion.article>
            )}

            {thirdPost && (
              <motion.article
                className="blog-secondary-article"
                role="button"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp}
                custom={0.24}
                onClick={(e) => handleOpenPost(thirdPost, e.currentTarget)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOpenPost(thirdPost, e.currentTarget)
                  }
                }}
                aria-label={`阅读文章：${thirdPost.title}`}
              >
                <div className="secondary-header-rule">
                  <span className="secondary-num">03</span>
                  <div className="secondary-rule-line" />
                  <time dateTime={thirdPost.date} className="secondary-date">
                    {thirdPost.date}
                  </time>
                </div>

                <h4 className="secondary-title">{thirdPost.title}</h4>

                <p className="secondary-excerpt">{thirdPost.excerpt}</p>

                <div className="secondary-meta-row">
                  <span className="meta-category">CATEGORY / {thirdPost.category}</span>
                  <span className="secondary-arrow-btn" aria-hidden="true">
                    <ArrowRight size={14} />
                  </span>
                </div>
              </motion.article>
            )}
          </div>
        </div>

        {/* ============================================================
            底部通栏条目：04 横向新闻条目
            ============================================================ */}
        {fourthPost && (
          <motion.article
            className="blog-row-article"
            role="button"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            custom={0.28}
            onClick={(e) => handleOpenPost(fourthPost, e.currentTarget)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleOpenPost(fourthPost, e.currentTarget)
              }
            }}
            aria-label={`阅读周报：${fourthPost.title}`}
          >
            <div className="row-rule-top" />
            <div className="row-article-body">
              <div className="row-left">
                <span className="row-num">04</span>
                <h4 className="row-title">{fourthPost.title}</h4>
              </div>
              <div className="row-right">
                <time dateTime={fourthPost.date} className="row-date">
                  {fourthPost.date}
                </time>
                <span className="row-category">CATEGORY / {fourthPost.category}</span>
                <span className="row-arrow-btn" aria-hidden="true">
                  <ArrowRight size={14} />
                </span>
              </div>
            </div>
            <div className="row-rule-bottom" />
          </motion.article>
        )}

        {/* ============================================================
            底部：查看全部文章与 06 / JOIN US 衔接
            ============================================================ */}
        <div className="blog-footer-row">
          <div className="blog-view-all">
            <span className="view-all-label">ALL ARTICLES</span>
            <button
              type="button"
              className="blog-view-all-btn"
              onClick={() => onNavigate?.('#/resources')}
              aria-label="查看全部文章与资源"
            >
              <span>查看全部文章</span>
              <div className="view-all-extend-line" />
              <ArrowRight size={14} className="view-all-arrow" />
            </button>
          </div>

          <div className="blog-next-anchor">
            <button
              type="button"
              className="blog-next-hint"
              onClick={onNextSection}
              aria-label="向下滑动至加入我们"
            >
              <span className="next-hint-num">06</span>
              <span className="next-hint-title">JOIN US // 人与小组</span>
              <ArrowDown size={14} className="next-hint-arrow" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          沉浸式技术刊物阅读抽屉 (Editorial Reading Drawer)
          ============================================================ */}
      <AnimatePresence>
        {selectedPost && (
          <div className="blog-drawer-portal">
            <motion.div
              className="blog-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDrawer}
              aria-hidden="true"
            />

            <motion.aside
              ref={drawerRef}
              className="blog-drawer-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="drawer-title"
              data-lenis-prevent
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: easeCurve }}
            >
              {/* 抽屉顶部标尺栏 */}
              <div className="drawer-top-bar">
                <div className="drawer-bar-left">
                  <span className="drawer-vol">JOURNAL ARTICLE // {selectedPost.id.toUpperCase()}</span>
                  <span className="drawer-cat">CATEGORY / {selectedPost.category}</span>
                </div>
                <button
                  ref={closeBtnRef}
                  type="button"
                  className="drawer-close-btn"
                  onClick={handleCloseDrawer}
                  aria-label="关闭文章阅读"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 抽屉文章主体 */}
              <div className="drawer-content-scroll" data-lenis-prevent>
                <header className="drawer-article-header">
                  <h2 id="drawer-title" className="drawer-title">
                    {selectedPost.title}
                  </h2>

                  <div className="drawer-meta-panel">
                    <div className="drawer-meta-cell">
                      <Calendar size={13} />
                      <time dateTime={selectedPost.date}>{selectedPost.date}</time>
                    </div>
                    <div className="drawer-meta-cell">
                      <Clock size={13} />
                      <span>{selectedPost.readTime}</span>
                    </div>
                    <div className="drawer-meta-cell">
                      <User size={13} />
                      <span>{selectedPost.author}</span>
                    </div>
                  </div>

                  <div className="drawer-tags-list">
                    {selectedPost.tags.map((tag) => (
                      <span key={tag} className="drawer-tag-item">
                        <Tag size={11} />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>

                  <div className="drawer-lead-quote">
                    <p>{selectedPost.excerpt}</p>
                  </div>
                </header>

                <div className="drawer-article-body">
                  {/* 正文段落与代码块渲染 */}
                  {selectedPost.content.split('\n\n').map((block, idx) => {
                    if (block.startsWith('## ')) {
                      return (
                        <h2 key={idx} className="drawer-h2">
                          {block.replace('## ', '')}
                        </h2>
                      )
                    }
                    if (block.startsWith('### ')) {
                      return (
                        <h3 key={idx} className="drawer-h3">
                          {block.replace('### ', '')}
                        </h3>
                      )
                    }
                    if (block.startsWith('```')) {
                      const lines = block.split('\n')
                      const lang = lines[0].replace('```', '') || 'code'
                      const code = lines.slice(1, -1).join('\n')
                      return (
                        <div key={idx} className="drawer-code-block">
                          <div className="code-lang-tag">{lang}</div>
                          <pre>
                            <code>{code}</code>
                          </pre>
                        </div>
                      )
                    }
                    return (
                      <p key={idx} className="drawer-paragraph">
                        {block}
                      </p>
                    )
                  })}
                </div>

                <footer className="drawer-article-footer">
                  <div className="footer-line" />
                  <div className="footer-end-mark">
                    <span>— END OF ARTICLE // 计算机科技小组 —</span>
                  </div>
                </footer>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}

