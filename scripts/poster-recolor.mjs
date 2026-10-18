/**
 * poster-recolor.mjs — 把入口页五个区段的配色机械换到首屏「克制」的一套（纯白 / 墨黑 / 中性灰）。
 *
 * 为什么是就地替换而不是外挂覆盖表：
 *   六个区段样式表里 90% 的颜色是字面量（#073F73、rgba(7,63,115,·)、浅蓝装饰组），
 *   只有一半是 var(--home-navy) 这种变量。变量能在 :root 一处改掉，字面量必须逐处改。
 *   如果改成「后加载的覆盖表」，本文件的媒体查询会盖住各区段自己的断点（层叠陷阱，首屏已经踩过一次），
 *   而且旧色会作为死代码留在仓库里。
 *
 * 用法：node scripts/poster-recolor.mjs [--check]
 *   --check 只打印将要发生的替换，不写文件。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const home = resolve(root, 'src/components/home')

const FILES = [
  'home-redesign.css',
  'about-section.css',
  'offer-section.css',
  'picks-section.css',
  'blog-section.css',
  'join-section.css',
].map((f) => resolve(home, f))

/* 军蓝 → 墨黑；浅蓝装饰 → 中性灰；暖纸 → 纯白。alpha 原样保留（明暗层次不变）。
   六个文件里 hex 大小写混用（:root 用大写、区段里用小写），故统一走 i 标志。 */
const REPLACEMENTS = [
  // 深蓝家族（字号/线条/前景）
  [/rgba\(7,\s*63,\s*115,/gi, (m) => m.replace(/7,\s*63,\s*115/, '17, 17, 17')],
  [/#073f73/gi, '#111111'],
  [/#063e70/gi, '#000000'],
  [/#0a477b/gi, '#111111'],
  [/#0b5a9e/gi, '#111111'],
  [/#042749/gi, '#111111'],
  [/#06284a/gi, '#111111'],
  // 浅蓝装饰组（渐变光晕、细线、点阵、立方体节点）
  [/rgba\(159,\s*209,\s*222,/gi, (m) => m.replace(/159,\s*209,\s*222/, '17, 17, 17')],
  [/rgba\(183,\s*221,\s*229,/gi, (m) => m.replace(/183,\s*221,\s*229/, '17, 17, 17')],
  [/rgba\(143,\s*199,\s*217,/gi, (m) => m.replace(/143,\s*199,\s*217/, '17, 17, 17')],
  [/#9fd1de/gi, '#d4d4d4'],
  [/#82bed3/gi, '#c9c9c9'],
  [/#b7dde5/gi, '#dedede'],
  [/#8fc7d9/gi, '#c9c9c9'],
  [/#e6f1f5/gi, '#ffffff'],
  // 暖纸底
  [/#faf8f2/gi, '#ffffff'],
  [/#f9f6ee/gi, '#f7f7f7'],
  // 暖纸底的 rgba 形式（第一轮只覆盖了 hex，这几个是后面实测 computed style 抓出来的）
  [/rgba\(250,\s*248,\s*242,/gi, (m) => m.replace(/250,\s*248,\s*242/, '255, 255, 255')],
  // 残余浅蓝（130,190,211）与中性蓝 #4A6E8D、奶油色 #F4F1E8
  [/rgba\(130,\s*190,\s*211,/gi, (m) => m.replace(/130,\s*190,\s*211/, '17, 17, 17')],
  [/#4a6e8d/gi, '#4a4a4a'],
  [/#f4f1e8/gi, '#ffffff'],
  // 唯一非海报色：04 的「已复制」绿，收进墨黑
  [/#0d845e/gi, '#111111'],
]

/* 各区段根节点的装饰性背景（两团浅蓝径向光晕 + 网格底纹）在海报里没有位置，整条声明删掉。 */
const DECOR_PROPS = /^\s*(background-image|background-size|mask-image):/

function stripDecorBackgrounds(css) {
  const lines = css.split('\n')
  const out = []
  let removed = 0
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!DECOR_PROPS.test(line)) {
      out.push(line)
      continue
    }
    // background-image 常是多行（多个 gradient 逗号续行）：整条吞掉，删到声明结束的分号为止。
    // 其余两条（background-size / mask-image）都是单行，只影响被删掉的背景，一并去掉。
    if (!/;\s*$/.test(line)) {
      let j = i
      while (j < lines.length && !/;\s*$/.test(lines[j])) j += 1
      removed += j - i + 1
      i = j
    } else {
      removed += 1
    }
  }
  return { css: out.join('\n'), removed }
}

const checkOnly = process.argv.includes('--check')
let totalReplacements = 0
let totalRemoved = 0

for (const file of FILES) {
  let css = readFileSync(file, 'utf8')
  const tally = []

  for (const [pattern, to] of REPLACEMENTS) {
    const hits = css.match(pattern)
    if (!hits) continue
    css = css.replace(pattern, to)
    tally.push(`${pattern.source}×${hits.length}`)
    totalReplacements += hits.length
  }

  const stripped = stripDecorBackgrounds(css)
  css = stripped.css
  const removed = stripped.removed
  totalRemoved += removed

  if (!checkOnly) writeFileSync(file, css)

  const rel = `src/components/home/${file.split(/[\\/]/).pop()}`
  console.log(`${rel}\n  换色 ${tally.join('  ') || '（无）'}\n  删除装饰背景声明 ${removed} 条`)
}

console.log(
  `\n${checkOnly ? '[check] 未写文件' : '已写回 6 个文件'}：共 ${totalReplacements} 处换色、${totalRemoved} 条装饰背景声明`,
)
