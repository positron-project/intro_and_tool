import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

/*
 * 校验单文件交付物：用系统 Edge 以 file:// 打开 nchu-cs-club-standalone.html，
 * 要求应用真的挂载出来（#root 有子节点 + 首屏 .hero-sticky-frame 可见）。
 *
 * 用法：pnpm build:standalone && pnpm verify:standalone [路径]
 * 退出码非 0 表示交付物不可用，可直接接进 CI。
 */
const target = process.argv[2] ?? 'nchu-cs-club-standalone.html'
const url = pathToFileURL(target).href

const fileSize = readFileSync(target).byteLength
const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`)
})

await page.goto(url)
await page.waitForTimeout(3000)

const report = await page.evaluate(() => ({
  title: document.title,
  rootChildren: document.getElementById('root')?.childElementCount ?? -1,
  heroFrameVisible: (() => {
    const frame = document.querySelector('.hero-sticky-frame')
    if (!frame) return false
    const rect = frame.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  })(),
  brandText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 60),
}))

await browser.close()

// file:// 下没有后端，接口类报错不算失败（standalone 走 mock 数据）
const realErrors = pageErrors.filter(
  (text) => !/file:\/\/\/api\/|Failed to load resource|ERR_FAILED|CORS policy/.test(text),
)

const ok = report.rootChildren > 0 && report.heroFrameVisible && realErrors.length === 0

console.log(`单文件交付物：${target}（${(fileSize / 1024 / 1024).toFixed(1)} MB）`)
console.log(`  标题      ${report.title}`)
console.log(`  #root     ${report.rootChildren} 个子节点`)
console.log(`  首屏      ${report.heroFrameVisible ? '已渲染 .hero-sticky-frame' : '未渲染'}`)
console.log(`  可见文案  ${report.brandText}`)
if (realErrors.length > 0) console.error(`  运行时错误：\n    ${realErrors.join('\n    ')}`)
console.log(ok ? '结果：通过' : '结果：失败')

process.exit(ok ? 0 : 1)
