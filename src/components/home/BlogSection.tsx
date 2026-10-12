import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Calendar, User, Tag, Clock } from 'lucide-react'
import { useContent } from '../../services/content.context'
import { getBlogPostDetail, getBlogSiteUrl, isBlogSourceEnabled, sanitizeArticleHtml } from '../../services/blog.service'
import type { BlogPost } from '../../types'
import { DUR, EASE_IN, fadeUp, listItemVariants, SHIFT, STAGGER, useRuleIn } from './motion'
import './blog-section.css'

interface BlogSectionProps {
  onNavigate?: (path: string) => void
}

export function BlogSection({ onNavigate }: BlogSectionProps) {
  const {
    data: { blogPosts },
  } = useContent()
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [detail, setDetail] = useState<{ id: string; content: string; readTime: string } | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const drawerRef = useRef<HTMLElement | null>(null)

  const handleOpenPost = (post: BlogPost, el?: HTMLElement) => {
    triggerRef.current = el || (document.activeElement as HTMLElement)
    setSelectedPost(post)
  }

  // Halo 源的正文不在列表接口里，开抽屉时按需补拉；mock 源自带正文，直接跳过
  useEffect(() => {
    // 先清空：正文连同文章 id 一起存，避免换文章时短暂渲染上一篇的正文与时长
    setDetail(null)
    if (!selectedPost || !isBlogSourceEnabled() || selectedPost.content) return
    let cancelled = false
    void getBlogPostDetail(selectedPost.id)
      .then((result) => {
        if (!cancelled && result) setDetail({ ...result, id: selectedPost.id })
      })
      .catch(() => {
        if (!cancelled) setDetail(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedPost])

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

  const rule = useRuleIn()

  // 接了博客站就把「查看全部文章」指向它，否则维持原来的站内跳转
  const blogSiteUrl = isBlogSourceEnabled() ? getBlogSiteUrl() : ''

  // 详情已拉到、且确实属于当前这篇时，正文才算 HTML。用「详情是否命中当前文章」
  // 判断来源，而不是嗅探首字符 —— Halo 正文若以文本节点开头会整篇落进 Markdown 分支。
  const postDetail = detail && selectedPost && detail.id === selectedPost.id ? detail : null
  const articleBody = postDetail?.content || selectedPost?.content || ''
  const isHtmlBody = Boolean(postDetail?.content)
  // 清洗要跑一整轮 DOMParser，抽屉开着时任意 re-render 都会重来，所以缓存住
  const sanitizedBody = useMemo(
    () => (isHtmlBody ? sanitizeArticleHtml(articleBody) : ''),
    [isHtmlBody, articleBody],
  )

  return (
    <section id="story-blog" className="blog-section-viewport" aria-label="小组博客">
      <div className="blog-content-stage">
        {/* 顶部：区段眉标 + 标题与引言 */}
        <div className="blog-header-block">
          {/* 眉标那条 2px 杠先进场（线先落），标题与引言再按 STAGGER 跟上 */}
          <motion.span
            className={`poster-eyebrow${rule.shown ? ' is-rule-in' : ''}`}
            onViewportEnter={rule.onViewportEnter}
            viewport={{ once: true, amount: 0.6 }}
          >
            Blog
          </motion.span>

          <div className="blog-heading-row">
            <motion.h2
              className="blog-main-title poster-section-title"
              {...fadeUp({ delay: STAGGER, distance: SHIFT.block, amount: 0.3 })}
            >
              最近，
              <br />
              我们在做什么？
            </motion.h2>

            <motion.p className="blog-sub-quote" {...fadeUp({ delay: STAGGER * 2, amount: 0.3 })}>
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
              variants={listItemVariants}
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
                variants={listItemVariants}
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
                variants={listItemVariants}
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

            {/* 04 原来在栅格下方单独占一条通栏行，看着像掉进来的一行；
                现在并进右列，四条共用同一套对齐与编号范式。 */}
            {fourthPost && (
              <motion.article
                className="blog-secondary-article"
                role="button"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={listItemVariants}
                custom={0.3}
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

                <h4 className="secondary-title">{fourthPost.title}</h4>

                <p className="secondary-excerpt">{fourthPost.excerpt}</p>

                <div className="blog-meta-row">
                  <span>{fourthPost.category}</span>
                </div>
              </motion.article>
            )}
          </div>
        </div>

        {/* 底部：真实入口。接了博客站就外链过去，否则维持原来的站内跳转 */}
        <div className="blog-footer-row">
          <button
            type="button"
            className="blog-footer-link"
            onClick={() => {
              if (blogSiteUrl) window.open(`${blogSiteUrl}/archives`, '_blank', 'noopener,noreferrer')
              else onNavigate?.('#/resources')
            }}
            aria-label="查看全部文章"
          >
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
              transition={{ duration: DUR.element, ease: EASE_IN }}
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
                    {(postDetail?.readTime || selectedPost.readTime) && (
                      <div className="drawer-meta-cell">
                        <Clock size={13} aria-hidden="true" />
                        <span>{postDetail?.readTime || selectedPost.readTime}</span>
                      </div>
                    )}
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

                <div
                  className="drawer-article-body"
                  {...(isHtmlBody ? { dangerouslySetInnerHTML: { __html: sanitizedBody } } : {})}
                >
                  {isHtmlBody ? null : articleBody.split('\n\n').map((block, idx) => {
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
                  {selectedPost.url && (
                    <a
                      className="blog-footer-link"
                      href={selectedPost.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      在博客站阅读原文
                      <ArrowRight size={14} aria-hidden="true" />
                    </a>
                  )}
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
