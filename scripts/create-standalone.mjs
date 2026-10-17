import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/*
 * 把 dist 打成一个可双击打开的单文件 HTML（nchu-cs-club-standalone.html）。
 *
 * 相比早期版本的三处硬化：
 *  1. 内联**全部**样式表 —— 引入 Tailwind 后构建产物可能拆出多个 css chunk，
 *     只取第一个会静默丢掉后面的（例如 vendor-lenis.css）。
 *  2. 自动扫描 JS/CSS 里出现的每一个 assets 引用并转成 data URI，
 *     不再硬编码文件名（campus-entrance.png 被删除后，旧写法直接 ENOENT 崩掉）。
 *  3. 缺资源只警告不中断 —— 交付物能生成，缺失清单打在日志里。
 */

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const distRoot = join(projectRoot, 'dist')
const publicRoot = join(projectRoot, 'public')
const index = await readFile(join(distRoot, 'index.html'), 'utf8')

const scriptPath = index.match(/<script[^>]+src="([^"]+)"/)?.[1]
if (!scriptPath) throw new Error('Unable to locate built script or stylesheet')

const stylePaths = [...index.matchAll(/<link[^>]+href="([^"]+)"[^>]*>/g)]
  .filter((match) => match[0].includes('stylesheet'))
  .map((match) => match[1])
if (stylePaths.length === 0) throw new Error('Unable to locate built stylesheet')

const readDist = (relative) => readFile(join(distRoot, relative.replace(/^\.?\//, '')), 'utf8')

let script = await readDist(scriptPath)
let style = (await Promise.all(stylePaths.map(readDist))).join('\n')

// 内联进 <script> 的代码不能再有顶层 import/export，否则浏览器直接抛
// "Cannot use import statement outside a module" 并白屏。
// 用 `vite build --mode standalone` 打整包（vite.config.ts 里 inlineDynamicImports）。
if (/^\s*(?:import|export)\s/m.test(script)) {
  throw new Error(
    'dist 的入口脚本仍包含顶层 import/export —— 请用 `pnpm build:standalone`（vite build --mode standalone）重新构建，' +
      '不要直接拿 `pnpm build` 的多 chunk 产物来打包单文件。',
  )
}

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const assetRefs = new Set()
for (const text of [script, style]) {
  // 匹配 JS 字符串里的 "./assets/x.png" / "/assets/x.png"，
  // 以及 CSS 里的 url(../assets/x.png)（构建后 css 位于 dist/assets/，引用写成 ../assets/）
  for (const match of text.matchAll(/['"(](?:\.\.?\/|\/)assets\/([A-Za-z0-9._/-]+)['")]/g)) {
    assetRefs.add(match[1])
  }
}
// CSS assets imported from src/assets are emitted beside the stylesheet, so
// their URLs are relative to dist/assets rather than prefixed with /assets/.
for (const match of style.matchAll(/url\((['"]?)(?:\.\/)?([^'")]+\.(?:woff2?|ttf|otf))\1\)/g)) {
  assetRefs.add(match[2])
}

const inlined = []
const missing = []

for (const asset of assetRefs) {
  const extension = asset.slice(asset.lastIndexOf('.')).toLowerCase()
  const mime = MIME_BY_EXT[extension]
  if (!mime) {
    missing.push(`${asset}（未知类型，未内联）`)
    continue
  }
  let buffer
  try {
    buffer = await readFile(join(distRoot, 'assets', asset))
  } catch {
    try {
      buffer = await readFile(join(publicRoot, 'assets', asset))
    } catch {
      missing.push(asset)
      continue
    }
  }
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`
  for (const prefix of [
    `../assets/${asset}`,
    `./assets/${asset}`,
    `/assets/${asset}`,
    `../${asset}`,
    `./${asset}`,
    `/${asset}`,
  ]) {
    script = script.replaceAll(prefix, dataUri)
    style = style.replaceAll(prefix, dataUri)
  }
  inlined.push(`${asset} → ${Math.round(buffer.byteLength / 1024)} KB`)
}

script = script.replaceAll('</script>', '<\\/script>')
// 整包里若出现 import.meta，就必须以 module 形式内联（内联 module script 在 file:// 下
// 没有 CORS 限制，可正常执行）；否则用普通 script，行为与旧交付物一致。
const scriptTag = /\bimport\.meta\b/.test(script) ? `<script type="module">${script}</script>` : `<script>${script}</script>`

const standalone = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="description" content="南昌航空大学科技学院计算机科技小组" />
    <title>南昌航空大学科技学院 · 计算机科技小组</title>
    <style>${style}</style>
  </head>
  <body>
    <div id="root"></div>
    ${scriptTag}
  </body>
</html>
`

const outputPath = join(projectRoot, 'nchu-cs-club-standalone.html')
await writeFile(outputPath, standalone, 'utf8')

console.log(`Created ${basename(outputPath)}（${Math.round(standalone.length / 1024 / 1024 * 10) / 10} MB）`)
console.log(`内联样式表：${stylePaths.join(', ')}`)
console.log(`内联资源 ${inlined.length} 个：\n  ${inlined.join('\n  ')}`)
if (missing.length > 0) console.warn(`警告：${missing.length} 个资源缺失，未内联：\n  ${missing.join('\n  ')}`)
