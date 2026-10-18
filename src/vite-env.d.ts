/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TIMEOUT_MS?: string
  readonly VITE_CONTENT_SOURCE?: 'mock' | 'api'
  readonly VITE_TURNSTILE_SITE_KEY?: string
  /** Halo 站点根地址，留空表示不接入博客系统（博客区回落 mock 数据） */
  readonly VITE_BLOG_API_BASE?: string
  /** 博客站公开地址，用于拼接文章链接；留空时回落 VITE_BLOG_API_BASE */
  readonly VITE_BLOG_SITE_URL?: string
  /** 首页博客区拉取的文章数，默认 4 */
  readonly VITE_BLOG_PAGE_SIZE?: string
  /** 博客接口超时毫秒数，默认 8000 */
  readonly VITE_BLOG_TIMEOUT_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
