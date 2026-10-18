import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const BLOG = 'https://blog.example.com'

/**
 * 服务层在模块加载时读 env，所以每个用例都要先重置模块再注入基址，
 * 否则断言会随开发机 .env 的内容飘。
 */
let svc: typeof import('./blog.service')

beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('VITE_BLOG_API_BASE', BLOG)
  vi.stubEnv('VITE_BLOG_SITE_URL', BLOG)
  svc = await import('./blog.service')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

/** 让 fetch 返回一个固定 JSON 响应 */
function stubJson(body: unknown, status = 200) {
  const spy = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', spy)
  return spy
}

describe('sanitizeArticleHtml', () => {
  it('空输入返回空串', () => {
    expect(svc.sanitizeArticleHtml('')).toBe('')
  })

  it('剥离可执行标签，只留正文', () => {
    const html = '<p>正文</p><script>alert(1)</script><style>p{color:red}</style><iframe src="//evil"></iframe>'
    // 整体比对：只断言「不含某子串」挡不住「整个函数返回空串」
    expect(svc.sanitizeArticleHtml(html)).toBe('<p class="drawer-paragraph">正文</p>')
  })

  it('丢弃 base / map / area / template — 它们能改写文档链接语义或绕过 a,img 清洗', () => {
    const html =
      '<base href="https://evil.example/"><map name="m"><area href="javascript:alert(1)"></map>' +
      '<template><img src=x onerror=alert(1)></template><p>正文</p>'
    const output = svc.sanitizeArticleHtml(html)
    expect(output).not.toContain('evil.example')
    expect(output).not.toContain('javascript:')
    expect(output).not.toContain('onerror')
    expect(output).toContain('正文')
  })

  it('剥掉事件属性，并拦住大小写、实体编码与控制字符三种 javascript: 变体', () => {
    const html = [
      '<img src="/upload/a.png" onerror="alert(1)">',
      '<a href="JaVaScRiPt:alert(2)">大写</a>',
      '<a href="java&#9;script:alert(3)">实体编码</a>',
      '<a href="jav&#x09;ascript:alert(4)">十六进制实体</a>',
    ].join('')
    const output = svc.sanitizeArticleHtml(html)
    expect(output).not.toContain('onerror')
    expect(output.toLowerCase()).not.toContain('javascript')
  })

  it('data: 只放行位图，不放行 svg', () => {
    const html =
      '<a href="data:image/svg+xml,<svg onload=alert(1)>">矢量图</a>' +
      '<img src="data:image/png;base64,iVBORw0KGgo=">'
    const output = svc.sanitizeArticleHtml(html)
    expect(output).not.toContain('svg+xml')
    expect(output).toContain('data:image/png;base64,iVBORw0KGgo=')
  })

  it('相对链接与图片改写成博客站绝对地址', () => {
    const output = svc.sanitizeArticleHtml('<img src="/upload/a.png"><a href="/archives/post">站内</a>')
    expect(output).toContain(`${BLOG}/upload/a.png`)
    expect(output).toContain(`${BLOG}/archives/post`)
  })

  it('只删能带外链或能执行的 style，保留正常排版', () => {
    const html =
      '<p style="text-align:center">居中</p><p style="background:url(javascript:alert(1))">坏</p>' +
      '<p style="width:expression(alert(1))">更坏</p>'
    const output = svc.sanitizeArticleHtml(html)
    expect(output).toContain('text-align:center')
    expect(output).not.toContain('url(')
    expect(output).not.toContain('expression(')
  })

  it('把正文标签映射到抽屉已有的排版类', () => {
    const output = svc.sanitizeArticleHtml('<h2>标题二</h2><h3>标题三</h3><p>段落</p>')
    expect(output).toContain('class="drawer-h2"')
    expect(output).toContain('class="drawer-h3"')
    expect(output).toContain('class="drawer-paragraph"')
  })

  it('外链一律新窗口打开并带 noopener', () => {
    const output = svc.sanitizeArticleHtml('<a href="https://example.com/post">外链</a>')
    expect(output).toContain('target="_blank"')
    expect(output).toContain('rel="noopener noreferrer"')
    expect(output).toContain('https://example.com/post')
  })

  it('没有 DOMParser 的宿主退回转义纯文本，而不是给出空正文', () => {
    vi.stubGlobal('DOMParser', undefined)
    expect(svc.sanitizeArticleHtml('<p>正文</p>')).toBe('&lt;p&gt;正文&lt;/p&gt;')
  })
})

describe('listBlogPosts', () => {
  it('未配置博客基址时返回空数组且不发请求', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_BLOG_API_BASE', '')
    vi.stubEnv('VITE_BLOG_SITE_URL', '')
    const fresh = await import('./blog.service')
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    expect(fresh.isBlogSourceEnabled()).toBe(false)
    await expect(fresh.listBlogPosts()).resolves.toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('映射字段：空串摘要回落后备摘要、缺分类用默认值、permalink 拼成绝对链接', async () => {
    stubJson({
      items: [
        {
          metadata: { name: 'older' },
          spec: { title: '旧文', publishTime: '2026-01-02T00:00:00.000000000Z', excerpt: { raw: '后备摘要' } },
          status: { excerpt: '', permalink: '/archives/older' },
          owner: { displayName: '李四' },
          categories: [],
          tags: [],
        },
      ],
    })

    const [post] = await svc.listBlogPosts()
    expect(post.id).toBe('older')
    expect(post.title).toBe('旧文')
    // status.excerpt 是空串时不能就此停住，要继续回落到 spec.excerpt.raw
    expect(post.excerpt).toBe('后备摘要')
    expect(post.category).toBe('小组动态')
    expect(post.author).toBe('李四')
    expect(post.date).toBe('2026.01.02')
    expect(post.url).toBe(`${BLOG}/archives/older`)
  })

  it('按原始 publishTime 降序排列，同一天的先后由 ISO 串决定', async () => {
    stubJson({
      items: [
        { metadata: { name: 'a' }, spec: { title: '早', publishTime: '2026-01-02T00:00:00Z' }, status: {}, categories: [], tags: [] },
        { metadata: { name: 'b' }, spec: { title: '晚', publishTime: '2026-03-05T00:00:00Z' }, status: {}, categories: [], tags: [] },
      ],
    })

    expect((await svc.listBlogPosts()).map((post) => post.title)).toEqual(['晚', '早'])
  })

  it('丢掉没有 id 或标题的条目', async () => {
    stubJson({
      items: [
        { metadata: {}, spec: { title: '无 id' }, status: {}, categories: [], tags: [] },
        { metadata: { name: 'ok' }, spec: {}, status: {}, categories: [], tags: [] },
        { metadata: { name: 'good' }, spec: { title: '正常' }, status: {}, categories: [], tags: [] },
      ],
    })

    expect((await svc.listBlogPosts()).map((post) => post.id)).toEqual(['good'])
  })
})

describe('getBlogPostDetail', () => {
  it('content.content 为空串时回落到 content.raw', async () => {
    stubJson({ content: { content: '', raw: '<p>raw 正文</p>' } })

    const detail = await svc.getBlogPostDetail('x')
    expect(detail?.content).toBe('<p>raw 正文</p>')
    expect(detail?.readTime).toBe('1 分钟阅读')
  })

  it('正文为空时不编造阅读时长', async () => {
    stubJson({ content: { content: '', raw: '' } })
    await expect(svc.getBlogPostDetail('x')).resolves.toEqual({ content: '', readTime: '' })
  })

  it('非 2xx 抛错', async () => {
    stubJson('nope', 500)
    await expect(svc.getBlogPostDetail('x')).rejects.toThrow('HTTP 500')
  })

  it('超过 timeoutMs 会 abort 掉请求', async () => {
    vi.useFakeTimers()
    let captured: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        captured = init?.signal ?? undefined
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        })
      }),
    )

    const pending = svc.listBlogPosts()
    const assertion = expect(pending).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(8000)
    await assertion
    expect(captured?.aborted).toBe(true)
  })
})
