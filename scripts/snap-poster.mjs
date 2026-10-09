/* 入口页首屏截图探针（临时用，验证方向 C 的 1440 效果）
   用法: node scripts/snap-poster.mjs [文件名后缀]
   输出: viz/poster-1440.png、viz/poster-1440-scrolled.png */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('@playwright/test')

const suffix = process.argv[2] ?? '1440'
const [width, height] = (process.argv[3] ?? '1440x900').split('x').map(Number)
const base = 'http://127.0.0.1:5173/#/home'

const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width, height } })

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text())
})

await page.goto(base, { waitUntil: 'load' })
await page.waitForSelector('.hero-main-title', { timeout: 15000 })
await page.waitForTimeout(1600)

await page.screenshot({ path: `viz/poster-${suffix}.png` })

/* 记录关键元素的实测尺寸，供数值核对（不依赖肉眼） */
const metrics = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      text: (el.textContent || '').trim().slice(0, 40),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fontSize: cs.fontSize,
      color: cs.color,
      bg: cs.backgroundColor,
    }
  }
  const title = document.querySelector('.hero-main-title')
  const lines = [...document.querySelectorAll('.hero-title-line')].map((el) => ({
    text: el.textContent.trim(),
    scrollW: el.scrollWidth,
    rectW: Math.round(el.getBoundingClientRect().width),
  }))
  return {
    bodyBg: getComputedStyle(document.body).backgroundColor,
    viewportBg: (() => {
      const el = document.querySelector('.home-hero-viewport')
      return el ? getComputedStyle(el).backgroundColor : null
    })(),
    title: pick('.hero-main-title'),
    titleFontFamily: title ? getComputedStyle(title).fontFamily : null,
    lines,
    sub: pick('.hero-sub-title'),
    desc: pick('.hero-value-desc'),
    primary: pick('.hero-btn-primary'),
    secondary: pick('.hero-btn-secondary'),
    cornerArt: pick('.hero-corner-art'),
    navActive: pick('.site-nav-item.is-active'),
    toolsBtn: pick('.site-tools-btn'),
    scrollText: pick('.scroll-text'),
    statsPresent: !!document.querySelector('.hero-stats-row'),
    headerBg: (() => {
      const el = document.querySelector('.site-header')
      return el ? getComputedStyle(el).backgroundColor : null
    })(),
  }
})

const brief = {
  viewportBg: metrics.viewportBg,
  title: metrics.title && { text: metrics.title.text, x: metrics.title.x, y: metrics.title.y, fontSize: metrics.title.fontSize, color: metrics.title.color },
  titleFontFamily: metrics.titleFontFamily,
  lines: metrics.lines,
  sub: metrics.sub && { text: metrics.sub.text, y: metrics.sub.y, fontSize: metrics.sub.fontSize, color: metrics.sub.color },
  navActiveColor: metrics.navActive && metrics.navActive.color,
  toolsBtnColor: metrics.toolsBtn && metrics.toolsBtn.color,
  toolsBtnBg: metrics.toolsBtn && metrics.toolsBtn.bg,
  cornerArt: metrics.cornerArt && { x: metrics.cornerArt.x, y: metrics.cornerArt.y, w: metrics.cornerArt.w },
  statsPresent: metrics.statsPresent,
}
console.log(JSON.stringify(brief, null, 2))
console.log('errors:', errors.length ? errors : 'none')

/* 再截一张滚动后的（看首屏与下一段的衔接） */
await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.9 }))
await page.waitForTimeout(1200)
await page.screenshot({ path: `viz/poster-${suffix}-scrolled.png` })

await browser.close()
