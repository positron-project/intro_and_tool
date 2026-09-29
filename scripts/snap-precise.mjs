import { spawn } from 'child_process'
import fs from 'fs'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9588

const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=' + port,
  '--window-size=1440,900',
  'http://localhost:5174/#/home'
])

async function run() {
  await new Promise(r => setTimeout(r, 2000))
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const target = list.find(t => t.type === 'page' && t.url.includes('5174')) || list[0]
  console.log('Target found:', target.url)

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 1; const map = new Map()
  ws.onmessage = e => { const m = JSON.parse(e.data); if (map.has(m.id)) { map.get(m.id)(m.result); map.delete(m.id) } }
  const send = (m, p={}) => new Promise(r => { const c = id++; map.set(c, r); ws.send(JSON.stringify({id:c, method:m, params:p})) })
  await new Promise(r => ws.onopen = r)
  await send('Page.enable')

  // 等待页面完全加载与动画就绪
  await new Promise(r => setTimeout(r, 1500))

  // 1. 截取首屏 (Hero)
  const heroShot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('precise-hero.png', Buffer.from(heroShot.data, 'base64'))
  console.log('Saved precise-hero.png')

  // 2. 滚动定位到 02 / ABOUT US 板块
  const scrollRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const about = document.getElementById('story-about');
      if (about) {
        about.scrollIntoView({ behavior: 'instant', block: 'start' });
        return { success: true, top: about.getBoundingClientRect().top, scrollY: window.scrollY };
      }
      return { success: false };
    })()`,
    returnByValue: true
  })
  console.log('Scroll result:', scrollRes.result.value)

  // 等待渲染与元素进入视口后的状态
  await new Promise(r => setTimeout(r, 800))

  const aboutShot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('precise-about.png', Buffer.from(aboutShot.data, 'base64'))
  console.log('Saved precise-about.png')

  // 3. 移动端视口 (390x844)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  })
  await new Promise(r => setTimeout(r, 600))
  await send('Runtime.evaluate', {
    expression: `document.getElementById('story-about')?.scrollIntoView({ behavior: 'instant', block: 'start' })`
  })
  await new Promise(r => setTimeout(r, 600))
  const mobileShot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('precise-mobile.png', Buffer.from(mobileShot.data, 'base64'))
  console.log('Saved precise-mobile.png')

  proc.kill()
  process.exit(0)
}

run().catch(e => {
  console.error(e)
  proc.kill()
  process.exit(1)
})

