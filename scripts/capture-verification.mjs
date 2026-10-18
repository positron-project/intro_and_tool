import { spawn } from 'child_process'
import fs from 'fs'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9566

const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=' + port,
  '--window-size=1440,900',
  'about:blank'
])

async function run() {
  await new Promise(r => setTimeout(r, 2000))
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const ws = new WebSocket(list[0].webSocketDebuggerUrl)
  let id = 1; const map = new Map()
  ws.onmessage = e => { const m = JSON.parse(e.data); if (map.has(m.id)) { map.get(m.id)(m.result); map.delete(m.id) } }
  const send = (m, p={}) => new Promise(r => { const c = id++; map.set(c, r); ws.send(JSON.stringify({id:c, method:m, params:p})) })
  await new Promise(r => ws.onopen = r)
  await send('Page.enable')

  // 1. 导航到首页
  await send('Page.navigate', { url: 'http://localhost:5174/#/home' })
  await new Promise(r => setTimeout(r, 2000))

  // 截图 1: 首屏 (Hero Section)
  const shot1 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('verification-hero.png', Buffer.from(shot1.data, 'base64'))
  console.log('Saved verification-hero.png')

  // 截图 2: 滚动到 02 / ABOUT US 板块
  await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.getElementById('story-about');
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    })()`
  })
  await new Promise(r => setTimeout(r, 1500))

  const shot2 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('verification-about.png', Buffer.from(shot2.data, 'base64'))
  console.log('Saved verification-about.png')

  // 截图 3: 移动端视口 (390x844)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  })
  await new Promise(r => setTimeout(r, 800))
  await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.getElementById('story-about');
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    })()`
  })
  await new Promise(r => setTimeout(r, 1000))
  const shot3 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('verification-about-mobile.png', Buffer.from(shot3.data, 'base64'))
  console.log('Saved verification-about-mobile.png')

  proc.kill()
  process.exit(0)
}

run().catch(e => {
  console.error(e)
  proc.kill()
  process.exit(1)
})

