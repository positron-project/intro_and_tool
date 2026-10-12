/* 02 第二行（网安组 / 行政办）视觉校验：滚到该行截图 + 打印每格尺寸与素材加载状态。
   用法: node scripts/snap-about-row2.mjs [宽x高] */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('@playwright/test')

const [width, height] = (process.argv[2] ?? '1440x900').split('x').map(Number)

const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width, height } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text())
})

await page.goto('http://127.0.0.1:5173/#/home', { waitUntil: 'load' })
await page.waitForSelector('.hero-main-title', { timeout: 15000 })
await page.waitForTimeout(1000)

/* 4 组的 pair 容器里第 3/4 个子元素就是第二行 */
await page.evaluate(() => {
  const cols = document.querySelectorAll('.about-pair .about-pair-col')
  const target = cols[2]
  const y = target.getBoundingClientRect().top + window.scrollY - 120
  window.scrollTo({ top: y, behavior: 'auto' })
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true })
})
await page.waitForTimeout(1600)
await page.screenshot({ path: 'viz/about-row2.png' })

const rows = await page.evaluate(() =>
  [...document.querySelectorAll('.about-pair .about-pair-col')].map((col) => ({
    name: col.querySelector('.about-pair-name')?.textContent,
    label: col.querySelector('.poster-eyebrow')?.textContent,
    quote: [...col.querySelectorAll('.about-quote-line')].map((n) => n.textContent),
    motto: col.querySelector('.about-body-narrative')?.textContent,
    height: Math.round(col.getBoundingClientRect().height),
    cells: [...col.querySelectorAll('.about-capability-cell')].map((cell) => {
      const img = cell.querySelector('.about-capability-media img')
      const box = cell.getBoundingClientRect()
      return {
        name: cell.querySelector('.about-capability-name')?.textContent,
        cell: `${Math.round(box.width)}x${Math.round(box.height)}`,
        src: img?.getAttribute('src'),
        loaded: img ? img.complete && img.naturalWidth > 0 : false,
        natural: img ? `${img.naturalWidth}x${img.naturalHeight}` : null,
      }
    }),
  })),
)

console.log(JSON.stringify(rows, null, 2))
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
