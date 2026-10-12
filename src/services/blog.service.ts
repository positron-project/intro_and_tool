import type { BlogPost } from '../types'

/**
 * Halo 站点根地址。留空表示未接入博客系统，博客区回落 src/data/mock.ts 的演示数据。
 * 例：VITE_BLOG_API_BASE=https://blog.example.com
 */
const baseUrl = (import.meta.env.VITE_BLOG_API_BASE ?? '').trim().replace(/\/+$/, '')
/** 文章链接与相对资源使用的站点地址，默认与接口地址同域 */
const siteUrl = ((import.meta.env.VITE_BLOG_SITE_URL ?? '').trim() || baseUrl).replace(/\/+$/, '')
const pageSize = Math.min(20, Math.max(1, Math.floor(Number(import.meta.env.VITE_BLOG_PAGE_SIZE ?? '4') || 4)))
const timeoutMs = Math.max(1000, Number(import.meta.env.VITE_BLOG_TIMEOUT_MS ?? '8000') || 8000)

/** Halo Public Content API，匿名可读，不需要任何密钥 */
const POSTS_ENDPOINT = '/apis/api.content.halo.run/v1alpha1/posts'

/** 列表接口返回的摘要与正文都在，只有详情接口才有正文；这两个键名易混，统一在映射层收口 */
interface HaloNamed {
  spec?: { displayName?: string; name?: string }
  status?: { permalink?: string }
}

interface HaloPost {
  metadata?: { name?: string }
  spec?: {
    title?: string
    slug?: string
    owner?: string
    publishTime?: string
    excerpt?: { raw?: string; autoGenerate?: boolean }
  }
  /** 摘要字符串在这里，spec.excerpt 是 {autoGenerate, raw} 对象 */
  status?: { excerpt?: string; permalink?: string }
  owner?: { displayName?: string; name?: string }
  categories?: HaloNamed[]
  tags?: HaloNamed[]
  /** 仅详情接口返回 */
  content?: { content?: string; raw?: string }
}

interface HaloListEnvelope {
  items?: HaloPost[]
  total?: number
  hasNext?: boolean
}

export interface BlogPostDetail {
  /** 清洗前的 HTML 正文，渲染前必须过 sanitizeArticleHtml */
  content: string
  readTime: string
}

/** 未配置博客地址时，官网继续用 mock 数据，本地开发与静态单文件版不受影响 */
export function isBlogSourceEnabled(): boolean {
  return baseUrl.length > 0
}

export function getBlogSiteUrl(): string {
  return siteUrl
}

function absolute(path: string): string {
  if (!path) return ''
  if (/^(https?:)?\/\//i.test(path)) return path
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

/** Halo 的 publishTime 是带纳秒的 ISO 串，前端只用到「年.月.日」 */
function formatDate(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  // 兜底也要给出全站统一的「年.月.日」，否则同一条数据会出现两种日期样式
  if (Number.isNaN(date.getTime())) return value.slice(0, 10).replace(/-/g, '.')
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

async function requestJson<T>(url: string): Promise<T> {
  const controller = typeof AbortController === 'undefined' ? null : new AbortController()
  const timer = controller ? globalThis.setTimeout(() => controller.abort(), timeoutMs) : 0
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as T
  } finally {
    if (timer) globalThis.clearTimeout(timer)
  }
}

function toBlogPost(item: HaloPost): BlogPost {
  const permalink = item.status?.permalink ?? ''
  return {
    id: item.metadata?.name ?? '',
    category: item.categories?.[0]?.spec?.displayName ?? '小组动态',
    title: item.spec?.title ?? '',
    // status.excerpt 存在但为空串时还要继续回落到 spec.excerpt.raw，所以用 || 而不是 ??
    excerpt: item.status?.excerpt?.trim() || item.spec?.excerpt?.raw || '',
    date: formatDate(item.spec?.publishTime),
    // 列表接口不返回正文，读完时长要等详情接口，先留空
    readTime: '',
    author: item.owner?.displayName ?? item.spec?.owner ?? '',
    tags: (item.tags ?? [])
      .map((tag) => tag.spec?.displayName ?? '')
      .filter((name) => name.length > 0),
    content: '',
    // 没有 permalink 时留空，否则抽屉里的「阅读原文」会指向博客站首页而不是这一篇
    url: absolute(permalink),
  }
}

/**
 * 拉取首页博客区要展示的最新 N 篇。
 * Halo 未确证支持 sort 参数，因此排序在这里本地兜底（date 是 YYYY.MM.DD，可直接比较）。
 */
export async function listBlogPosts(): Promise<BlogPost[]> {
  if (!isBlogSourceEnabled()) return []
  const envelope = await requestJson<HaloListEnvelope>(
    `${baseUrl}${POSTS_ENDPOINT}?page=1&size=${pageSize}`,
  )
  // 按原始 publishTime（ISO）排序，而不是格式化后的「年.月.日」——后者只精确到天，同天多篇会乱序
  return (envelope.items ?? [])
    .slice()
    .sort((a, b) => (b.spec?.publishTime ?? '').localeCompare(a.spec?.publishTime ?? ''))
    .map(toBlogPost)
    .filter((post) => post.id && post.title)
}

/** 点开抽屉时才拉正文，避免首屏多打一轮请求 */
export async function getBlogPostDetail(name: string): Promise<BlogPostDetail | null> {
  if (!isBlogSourceEnabled() || !name) return null
  const item = await requestJson<HaloPost>(`${baseUrl}${POSTS_ENDPOINT}/${encodeURIComponent(name)}`)
  // 同样用 ||：content.content 为空串时还要试 content.raw
  const html = item.content?.content || item.content?.raw || ''
  return { content: html, readTime: estimateReadTime(html) }
}

function estimateReadTime(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ')
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) ?? []).length
  const words = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9_'’-]+/g) ?? []).length
  // 正文为空时不编造时长，交给上层把那格隐掉
  if (cjk === 0 && words === 0) return ''
  return `${Math.max(1, Math.round(cjk / 350 + words / 220))} 分钟阅读`
}

/**
 * 直接丢弃的标签。`base` 会改写文档级 baseURI（站内所有相对 URL 跟着改向），
 * `area` 携带 href 但走不到下面的 a/img 清洗；`template` 的内容不在文档树里、
 * querySelectorAll 遍历不到；`noscript` 同理。
 */
const DROPPED_TAGS =
  'script, style, iframe, object, embed, link, meta, form, input, button, svg, base, area, map, template, noscript'
/** 这些属性都携带 URL，统一过一遍协议白名单 */
const URL_ATTRIBUTES = new Set(['href', 'src', 'srcset', 'cite', 'poster', 'action', 'formaction', 'xlink:href'])
/** 允许的写法：http(s) / mailto / tel / 页内锚点 / 站内相对路径 */
const SAFE_URL_PREFIX = /^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i
/** 只放行位图，不放行 data:image/svg+xml —— SVG 可以内嵌脚本 */
const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|avif|bmp);base64,/i
/** 把 Halo 正文的裸标签映射到抽屉已有的排版类，避免为博客正文再引一套 CSS */
const CLASS_MAP: Record<string, string> = {
  H2: 'drawer-h2',
  H3: 'drawer-h3',
  P: 'drawer-paragraph',
}
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' }

/** 浏览器会忽略 URL 里的空白与控制字符，判定前先剔干净（用 \p{Cc} 避开 no-control-regex） */
function stripControls(value: string): string {
  return value.replace(/[\p{Cc}\s]/gu, '')
}

/**
 * 判定 URL 是否可用。控制字符会被浏览器忽略，所以先剔掉再判断，
 * 否则 `java\tscript:` 这类写法能骗过前缀匹配。
 * 既不是安全前缀、也不是白名单图片、又长得像 `scheme:` 的，一律拒绝。
 */
function isUnsafeUrl(value: string): boolean {
  const probe = stripControls(value)
  if (SAFE_URL_PREFIX.test(probe) || SAFE_DATA_IMAGE.test(probe)) return false
  return /^[a-z][a-z0-9+.-]*:/i.test(probe)
}

/**
 * 博客正文来自站点编辑器，渲染进官网之前先剥掉可执行内容与事件属性。
 * 相对链接与图片会改写成博客站绝对地址，否则在官网域名下点击必然 404。
 */
export function sanitizeArticleHtml(html: string): string {
  if (!html) return ''
  // 没有 DOMParser 的宿主里退回转义纯文本，而不是静默给出空正文
  if (typeof DOMParser === 'undefined') {
    return html.replace(/[&<>]/g, (char) => ESCAPES[char] ?? char)
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll(DROPPED_TAGS).forEach((node) => node.remove())

  doc.querySelectorAll('a, img').forEach((node) => {
    const attribute = node.tagName === 'A' ? 'href' : 'src'
    const value = node.getAttribute(attribute) ?? ''
    if (!value || isUnsafeUrl(value)) {
      node.removeAttribute(attribute)
      return
    }
    // 相对路径在官网域名下必然 404，改写成博客站的绝对地址
    if (!/^(https?:|mailto:|tel:|#|data:)/i.test(stripControls(value))) {
      node.setAttribute(attribute, absolute(value))
    }
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })

  doc.querySelectorAll('*').forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on') || name === 'srcdoc') {
        node.removeAttribute(attribute.name)
        continue
      }
      if (URL_ATTRIBUTES.has(name) && isUnsafeUrl(attribute.value)) {
        node.removeAttribute(attribute.name)
        continue
      }
      // 只删能带外链或能执行的那部分 style，保留 text-align / 图片宽度这类正常排版
      if (name === 'style' && /url\(|expression\(|javascript:|@import/i.test(attribute.value)) {
        node.removeAttribute(attribute.name)
      }
    }
    const mapped = CLASS_MAP[node.tagName]
    if (mapped) {
      const existing = node.getAttribute('class')
      node.setAttribute('class', existing ? `${existing} ${mapped}` : mapped)
    }
  })

  return doc.body.innerHTML
}
