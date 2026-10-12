import { expect, test, type Page } from '@playwright/test'

/** 收集页面上的真实报错：控制台错误、未捕获异常、以及非字体类的资源 4xx/5xx */
function collectPageErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    // "Failed to load resource" 自身不带 URL，具体资源交给下面的 response 监听记录，
    // 否则同一个 404 会被重复计一次且无法定位
    if (text.includes('Failed to load resource')) return
    if (text.includes('ERR_NAME_NOT_RESOLVED') || text.includes('ERR_INTERNET')) return
    errors.push(text)
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('response', (response) => {
    const status = response.status()
    if (status < 400) return
    const url = response.url()
    // 字体文件（开发态由 styles.css 里的 ./fonts/... 相对路径解析，允许缺失）与需要后端
    // 在 8000 端口运行的接口请求不计入；其余资源 404 视为真实回归
    if (/\.woff2?(\?|$)/.test(url)) return
    if (/\/api\/|\/uploads\//.test(url)) return
    errors.push(`${status} ${url}`)
  })
  return errors
}

test('入口页首屏渲染且无控制台报错', async ({ page }) => {
  const errors = collectPageErrors(page)

  await page.goto('/#/home')
  await expect(page.locator('.hero-sticky-frame')).toBeVisible()
  await expect(page.locator('.site-header')).toBeVisible()

  // 首屏文案（改版后仍应保留「计算机科技小组」这个身份标识）
  await expect(page.locator('body')).toContainText('计算机科技小组')

  // 首屏主标题不应出现单字折行：标题行的实际宽度必须小于容器宽度
  const titleOverflow = await page.evaluate(() => {
    const lines = Array.from(document.querySelectorAll('.hero-title-line'))
    return lines
      .filter((line) => {
        const rect = line.getBoundingClientRect()
        return rect.width > 0 && line.scrollWidth > Math.ceil(rect.width) + 1
      })
      .map((line) => line.textContent ?? '')
  })
  expect(titleOverflow, `标题出现折行：${titleOverflow.join(' / ')}`).toEqual([])

  await page.screenshot({ path: 'e2e/.artifacts/home-1440.png', fullPage: false })

  expect(errors, errors.join('\n')).toEqual([])
})

test('滚动到 02 关于我们后导航高亮跟随', async ({ page }) => {
  const errors = collectPageErrors(page)
  await page.goto('/#/home')
  await page.locator('.site-nav-item', { hasText: '关于我们' }).first().click()
  await expect(page.locator('#story-about')).toBeInViewport({ ratio: 0.15 })
  expect(errors, errors.join('\n')).toEqual([])
})

test('入口页强调色收敛到电光蓝，且只有一个实心蓝面', async ({ page }) => {
  const errors = collectPageErrors(page)
  await page.goto('/#/home')
  await expect(page.locator('.home-story-scroll')).toHaveCount(1)

  const tokens = await page.evaluate(async () => {
    const root = document.querySelector('.home-story-scroll')
    const cta = document.querySelector('.hero-btn-primary')
    const hero = document.querySelector('.home-hero-viewport')
    if (!root || !cta || !hero) return null
    const cs = getComputedStyle(root)
    const heroCs = getComputedStyle(hero)
    const glow = await fetch('/assets/home-hero-glow.webp')
    return {
      accent: cs.getPropertyValue('--poster-accent').trim().toLowerCase(),
      deep: cs.getPropertyValue('--poster-accent-deep').trim().toLowerCase(),
      on: cs.getPropertyValue('--poster-accent-on').trim().toLowerCase(),
      tint: cs.getPropertyValue('--poster-accent-tint').trim(),
      wash: cs.getPropertyValue('--poster-accent-wash').trim(),
      ctaBackground: getComputedStyle(cta).backgroundColor,
      heroBackground: heroCs.backgroundImage,
      heroBlend: heroCs.backgroundBlendMode,
      glowBytes: glow.ok ? (await glow.arrayBuffer()).byteLength : 0,
    }
  })

  expect(tokens, '没找到 .home-story-scroll / .hero-btn-primary / .home-hero-viewport').not.toBeNull()
  expect(tokens!.accent).toBe('#2b5cff')
  expect(tokens!.deep).toBe('#1e43cc')
  expect(tokens!.on).toBe('#ffffff')
  expect(tokens!.tint).toBe('rgba(43, 92, 255, 0.14)')
  expect(tokens!.wash).toBe('rgba(43, 92, 255, 0.18)')
  // 退役的暖红不许再挂在任何一处强调色 token 上
  expect(JSON.stringify(tokens)).not.toContain('e8442a')
  // 首屏 CTA 是入口页唯一的实心强调色面
  expect(tokens!.ctaBackground).toBe('rgb(43, 92, 255)')

  // 首屏柔光：两层背景（3KB 纹理 + 径向渐变），且必须同层相乘
  // ——纯渐变在 8bit 下会出 792px 硬色带，独立层会把光整片洗掉
  expect(tokens!.heroBackground).toContain('home-hero-glow.webp')
  expect(tokens!.heroBackground).toContain('radial-gradient')
  expect(tokens!.heroBackground).toContain('rgba(43, 92, 255, 0.18)')
  expect(tokens!.heroBlend).toBe('multiply, normal')
  expect(tokens!.glowBytes).toBeGreaterThan(1024)

  expect(errors, errors.join('\n')).toEqual([])
})

test('工作台路由可用', async ({ page }) => {
  const errors = collectPageErrors(page)
  await page.goto('/#/tools')
  await expect(page.locator('.app-shell')).toBeVisible()
  expect(errors, errors.join('\n')).toEqual([])
})
