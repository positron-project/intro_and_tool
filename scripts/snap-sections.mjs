/* 入口页各区段截图探针：把 02-06 五个区段各截一张 1440 图 + 打印可见文案
   用法: node scripts/snap-sections.mjs [宽度x高度] */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('@playwright/test')

const [width, height] = (process.argv[2] ?? '1440x900').split('x').map(Number)
const ids = ['story-about', 'story-offer', 'story-picks', 'story-blog', 'story-join']

const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width, height } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text())
})

await page.goto('http://127.0.0.1:5173/#/home', { waitUntil: 'load' })
await page.waitForSelector('.hero-main-title', { timeout: 15000 })
await page.waitForTimeout(1200)

const report = []
for (const id of ids) {
  await page.evaluate((target) => {
    const el = document.getElementById(target)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: y + 2, behavior: 'auto' })
    if (window.__lenis) window.__lenis.scrollTo(y + 2, { immediate: true })
  }, id)
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `viz/section-${id.replace('story-', '')}.png` })

  const info = await page.evaluate((target) => {
    const el = document.getElementById(target)
    if (!el) return { id: target, missing: true }
    const cs = getComputedStyle(el)
    const cs2 = (sel) => {
      const n = el.querySelector(sel)
      if (!n) return null
      const c = getComputedStyle(n)
      return { sel, bg: c.backgroundColor, color: c.color, fontSize: c.fontSize, font: c.fontFamily.split(',')[0] }
    }
    return {
      id: target,
      cls: el.className,
      h: Math.round(el.getBoundingClientRect().height),
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage === 'none' ? 'none' : 'has-image',
      color: cs.color,
      font: cs.fontFamily.split(',')[0],
      headings: [...el.querySelectorAll('h1,h2,h3')].map((h) => h.textContent.trim().slice(0, 46)),
      sample: ['.section-eyebrow', '.about-eyebrow', '.offer-eyebrow', '.picks-title', '.blog-title', '.join-title', 'h2', 'h3']
        .map(cs2)
        .filter(Boolean),
      text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 420),
    }
  }, id)
  report.push(info)
}

console.log(JSON.stringify(report, null, 2))

/* 最后补一张整站最底部（06 footer）的截图：区段截图只覆盖首屏高度 */
await page.evaluate(() => {
  const top = document.documentElement.scrollHeight
  window.scrollTo({ top, behavior: 'auto' })
  if (window.__lenis) window.__lenis.scrollTo(top, { immediate: true })
})
await page.waitForTimeout(800)
await page.screenshot({ path: 'viz/section-footer.png' })

console.log('errors:', errors.length ? errors : 'none')
await browser.close()
