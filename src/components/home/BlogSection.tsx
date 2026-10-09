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
  const {
    data: { blogPosts },
  } = useContent()
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
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
    <section id="story-blog" className="blog-section-viewport" aria-label="小组博客">
      <div className="blog-content-stage">
        {/* 顶部：区段眉标 + 标题与引言 */}
        <div className="blog-header-block">
          <span className="poster-eyebrow">Blog</span>

          <div className="blog-heading-row">
            <motion.h2
              className="blog-main-title poster-section-title"
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

        {/* 主文章 + 次级文章：一张大卡带两条短条目 */}
        <div className="blog-editorial-grid">
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
              <div className="blog-item-flag">
                <span className="blog-item-num">01</span>
                <span className="poster-eyebrow poster-eyebrow--plain">Featured</span>
              </div>

              <h3 className="featured-title">{featuredPost.title}</h3>

              <p className="featured-excerpt">{featuredPost.excerpt}</p>

              <div className="blog-meta-row">
                <time dateTime={featuredPost.date}>{featuredPost.date}</time>
                <span className="blog-meta-sep" aria-hidden="true">
                  ·
                </span>
                <span>{featuredPost.category}</span>
                <span className="blog-meta-sep" aria-hidden="true">
                  ·
                </span>
                <span>{featuredPost.author}</span>
              </div>

              <span className="blog-read-more">
                <span>阅读全文</span>
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </motion.article>
          )}

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
                <div className="blog-item-flag">
                  <span className="blog-item-num">02</span>
                  <time className="blog-item-date" dateTime={secondPost.date}>
                    {secondPost.date}
                  </time>
                </div>

                <h4 className="secondary-title">{secondPost.title}</h4>

                <p className="secondary-excerpt">{secondPost.excerpt}</p>

                <div className="blog-meta-row">
                  <span>{secondPost.category}</span>
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
                <div className="blog-item-flag">
                  <span className="blog-item-num">03</span>
                  <time className="blog-item-date" dateTime={thirdPost.date}>
                    {thirdPost.date}
                  </time>
                </div>

                <h4 className="secondary-title">{thirdPost.title}</h4>

                <p className="secondary-excerpt">{thirdPost.excerpt}</p>

                <div className="blog-meta-row">
                  <span>{thirdPost.category}</span>
                </div>
              </motion.article>
            )}
          </div>
        </div>

        {/* 底部通栏：04 一条横排 */}
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
            aria-label={`阅读文章：${fourthPost.title}`}
          >
            <div className="blog-item-flag">
              <span className="blog-item-num">04</span>
              <time className="blog-item-date" dateTime={fourthPost.date}>
                {fourthPost.date}
              </time>
            </div>

            <h4 className="row-title">{fourthPost.title}</h4>

            <span className="row-category">{fourthPost.category}</span>

            <ArrowRight size={14} className="row-arrow" aria-hidden="true" />
          </motion.article>
        )}

        {/* 底部：左侧统一是「继续下一节」，右侧是真实入口 */}
        <div className="blog-footer-row">
          <button type="button" className="blog-next-hint poster-next" onClick={onNextSection} aria-label="继续向下：加入我们">
            <span>加入我们</span>
            <ArrowDown size={14} aria-hidden="true" />
          </button>

          <button type="button" className="blog-footer-link" onClick={() => onNavigate?.('#/resources')} aria-label="查看全部文章与资源">
            <span>查看全部文章</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ============================================================
          文章阅读抽屉
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
              <div className="drawer-top-bar">
                <span className="drawer-cat">{selectedPost.category}</span>
                <button ref={closeBtnRef} type="button" className="drawer-close-btn" onClick={handleCloseDrawer} aria-label="关闭文章阅读">
                  <X size={18} />
                </button>
              </div>

              <div className="drawer-content-scroll" data-lenis-prevent>
                <header className="drawer-article-header">
                  <h2 id="drawer-title" className="drawer-title">
                    {selectedPost.title}
                  </h2>

                  <div className="drawer-meta-panel">
                    <div className="drawer-meta-cell">
                      <Calendar size={13} aria-hidden="true" />
                      <time dateTime={selectedPost.date}>{selectedPost.date}</time>
                    </div>
                    <div className="drawer-meta-cell">
                      <Clock size={13} aria-hidden="true" />
                      <span>{selectedPost.readTime}</span>
                    </div>
                    <div className="drawer-meta-cell">
                      <User size={13} aria-hidden="true" />
                      <span>{selectedPost.author}</span>
                    </div>
                  </div>

                  <div className="drawer-tags-list">
                    {selectedPost.tags.map((tag) => (
                      <span key={tag} className="drawer-tag-item">
                        <Tag size={11} aria-hidden="true" />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>

                  <div className="drawer-lead-quote">
                    <p>{selectedPost.excerpt}</p>
                  </div>
                </header>

                <div className="drawer-article-body">
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
                  <span className="footer-end-mark">计算机科技小组</span>
                </footer>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
