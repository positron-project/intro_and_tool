import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const distRoot = join(projectRoot, 'dist')
const index = await readFile(join(distRoot, 'index.html'), 'utf8')
const scriptPath = index.match(/<script[^>]+src="([^"]+)"/)?.[1]
const stylePath = index.match(/<link[^>]+href="([^"]+)"/)?.[1]

if (!scriptPath || !stylePath) throw new Error('Unable to locate built script or stylesheet')

let script = await readFile(join(distRoot, scriptPath.replace(/^\.\//, '')), 'utf8')
let style = await readFile(join(distRoot, stylePath.replace(/^\.\//, '')), 'utf8')
const campus = (await readFile(join(distRoot, 'assets', 'campus-entrance.png'))).toString('base64')
const campusTools = (await readFile(join(distRoot, 'assets', 'campus-tools-bg.png'))).toString('base64')
const logo = (await readFile(join(distRoot, 'assets', 'college-logo-cropped.png'))).toString('base64')

script = script
  .replaceAll('./assets/campus-entrance.png', `data:image/png;base64,${campus}`)
  .replaceAll('./assets/college-logo-cropped.png', `data:image/png;base64,${logo}`)
  .replaceAll('</script>', '<\\/script>')

style = style.replaceAll('/assets/campus-tools-bg.png', `data:image/png;base64,${campusTools}`)

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
    <script>${script}</script>
  </body>
</html>
`

await writeFile(join(projectRoot, 'nchu-cs-club-standalone.html'), standalone, 'utf8')
console.log(`Created ${basename(join(projectRoot, 'nchu-cs-club-standalone.html'))}`)
