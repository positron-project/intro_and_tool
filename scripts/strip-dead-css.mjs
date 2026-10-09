/**
 * strip-dead-css.mjs — 删掉已经没有任何 DOM 对应的样式规则。
 *
 * 海报化改造把各区段的装饰元素从 TSX 里删掉之后，样式表里会留下一批永远不会匹配的规则。
 * 手工删容易漏、也容易顺手删掉还在用的兄弟规则，所以按「选择器 token 精确匹配」来删：
 * 只有选择器里出现完整的 .about-bg-layer（后面不能紧跟字母/数字/-/_）才整条删除，
 * 因此 .about-spec 不会误伤 .about-spec-card。
 *
 * 选择器列表里混着死活两半时（`.a-index, .a-body`）只剔掉死的那半，规则保住 ——
 * 否则会连带删掉兄弟选择器仍在用的样式。规则本身上下紧邻的注释块会随规则一起删。
 *
 * 实现上是「前向扫描、边扫边拼输出」，不做「先记下标再回删」——
 * 后者在遇到剔选择器（长度变化）时会让后面所有下标失效，静默漏删或删错。
 *
 * 用法：node scripts/strip-dead-css.mjs <css 文件> <选择器> [<选择器> ...] [--check]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const argv = process.argv.slice(2)
const checkOnly = argv.includes('--check')
const [file, ...selectors] = argv.filter((a) => a !== '--check')

if (!file || selectors.length === 0) {
  console.error('用法：node scripts/strip-dead-css.mjs <css 文件> <选择器> [<选择器> ...] [--check]')
  process.exit(2)
}

const path = resolve(file)
const original = readFileSync(path, 'utf8')

const matchers = selectors.map((sel) => ({
  sel,
  re: new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`),
}))
const hitOf = (part) => matchers.find((m) => m.re.test(part))

/** 从 index 处的 `{` 开始，返回配对 `}` 的下标（跳过注释与字符串里的花括号） */
function matchBrace(text, openIndex) {
  let depth = 0
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      i = end === -1 ? text.length : end + 1
      continue
    }
    if (ch === '"' || ch === "'") {
      const end = text.indexOf(ch, i + 1)
      i = end === -1 ? text.length : end
      continue
    }
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * 去掉选择器开头的全部注释与空白。
 * 必须做这件事：`/* 移动端说明 *⼠ @media (max-width: 900px) { … }` 这类带标题注释的
 * at-rule，如果直接拿 `selector.startsWith('@')` 判类型就会把它当普通规则处理，
 * 于是整块 @media 被原样保留、里面的死规则一条也删不掉。
 */
function withoutLeadingComments(s) {
  let out = s
  for (;;) {
    const t = out.replace(/^\s+/, '')
    if (!t.startsWith('/*')) return t
    const end = t.indexOf('*/')
    if (end === -1) return t
    out = t.slice(end + 2)
  }
}

const stats = { removedRules: [], prunedRules: [], droppedComments: [], removedMedia: 0 }

/**
 * 删掉一条规则（或一整块空 @media）时，紧挨在它前面的那段注释要不要跟着删？
 * 只有当注释后面再也没有活着的规则时才删 —— 注释通常是给同一节里其它活规则看的，
 * 抢先删掉会把别人的文档一起带走。
 */
function leadCommentIsOrphan(selectorPrefix, src, from) {
  if (!/^\s*\/\*/.test(selectorPrefix)) return false
  const open = src.indexOf('{', from)
  if (open === -1) return true
  const sel = withoutLeadingComments(src.slice(from, open).trim())
  if (sel.startsWith('@')) return false
  const parts = sel
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  return !parts.some((p) => !hitOf(p))
}

/**
 * 前导文本：孤儿注释就丢掉，否则原样保留
 */
const keepOrDropComment = (head, selectorPrefix, src, from) => {
  if (leadCommentIsOrphan(selectorPrefix, src, from)) {
    stats.droppedComments.push(selectorPrefix.trim().split('\n')[0])
    return head
  }
  return head + selectorPrefix
}

function strip(src) {
  const out = []
  let i = 0
  while (i < src.length) {
    const open = src.indexOf('{', i)
    if (open === -1) {
      out.push(src.slice(i))
      break
    }
    const lead = src.slice(i, open)
    const rawSelector = lead.trim()
    const selector = withoutLeadingComments(rawSelector)
    const selectorPrefix = rawSelector.slice(0, rawSelector.length - selector.length)
    const close = matchBrace(src, open)
    if (close === -1) {
      out.push(src.slice(i))
      break
    }

    /* head 只能是「选择器之前的缩进空白」。
       不能用 `lead.length - rawSelector.length`：rawSelector 是 trim 过的，
       那个差值把 `{` 前的尾随空白也算进来，于是 head 会多咬掉选择器开头同样多的字符
       （实测会留下孤立的 `.`、并把前导注释咬成 `//*` 从而让整条规则被浏览器丢弃）。 */
    const head = lead.slice(0, lead.length - lead.trimStart().length)

    if (selector.startsWith('@')) {
      if (/^@(media|supports|layer|container)/.test(selector)) {
        const inner = src.slice(open + 1, close)
        const innerStripped = strip(inner)
        if (innerStripped.trim() === '' && selector.startsWith('@media')) {
          stats.removedMedia += 1
          out.push(keepOrDropComment(head, selectorPrefix, src, close + 1))
          i = close + 1
          continue
        }
        out.push(lead, '{', innerStripped, '}')
        i = close + 1
        continue
      }
      out.push(src.slice(i, close + 1))
      i = close + 1
      continue
    }

    const parts = selector
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    const dead = parts.filter((p) => hitOf(p))

    if (dead.length === parts.length) {
      stats.removedRules.push({ sel: selector.replace(/\s+/g, ' '), by: hitOf(selector).sel })
      out.push(keepOrDropComment(head, selectorPrefix, src, close + 1))
      i = close + 1
      continue
    }
    if (dead.length > 0) {
      const live = parts.filter((p) => !dead.includes(p)).join(', ')
      stats.prunedRules.push({ was: selector.replace(/\s+/g, ' '), now: live, by: dead.join(' / ') })
      out.push(head + selectorPrefix + live, src.slice(open, close + 1))
      i = close + 1
      continue
    }

    out.push(src.slice(i, close + 1))
    i = close + 1
  }
  return out.join('')
}

const text = strip(original)
if (!checkOnly && text !== original) writeFileSync(path, text)

const rel = path.replace(/\\/g, '/').split('/repo/').pop()
console.log(
  `${rel}：删除 ${stats.removedRules.length} 条规则、${stats.prunedRules.length} 条规则剔掉死选择器后保留、` +
    `${stats.droppedComments.length} 段随行注释、${stats.removedMedia} 个空 @media`,
)
for (const r of stats.removedRules) console.log(`  - ${r.sel}   (命中 ${r.by})`)
for (const r of stats.prunedRules) console.log(`  ~ ${r.was}  →  ${r.now}   (剔除 ${r.by})`)
const before = original.split('\n').length
const after = text.split('\n').length
console.log(`  行数 ${before} → ${after}${checkOnly ? '（--check 未写文件）' : ''}`)
const openBraces = (text.match(/\{/g) || []).length
const closeBraces = (text.match(/\}/g) || []).length
if (openBraces !== closeBraces) {
  console.error(`  ✗ 花括号不平衡：{ ${openBraces} / } ${closeBraces}`)
  process.exit(1)
}
