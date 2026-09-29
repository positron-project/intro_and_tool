import { spawn } from 'child_process'
import fs from 'fs'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9591

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

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 1; const map = new Map()
  ws.onmessage = e => { const m = JSON.parse(e.data); if (map.has(m.id)) { map.get(m.id)(m.result); map.delete(m.id) } }
  const send = (m, p={}) => new Promise(r => { const c = id++; map.set(c, r); ws.send(JSON.stringify({id:c, method:m, params:p})) })
  await new Promise(r => ws.onopen = r)
  await send('Page.enable')

  // 等待页面完全加载
  await new Promise(r => setTimeout(r, 1200))

  // 1. 滚动到 03 / WHAT WE OFFER
  await send('Runtime.evaluate', {
    expression: `document.getElementById('story-offer')?.scrollIntoView({ behavior: 'instant', block: 'start' })`
  })
  await new Promise(r => setTimeout(r, 1000))

  const desktopShot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-03-plain-desktop.png', Buffer.from(desktopShot.data, 'base64'))

  // 2. 移动端视口 (390x844)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  })
  await new Promise(r => setTimeout(r, 600))
  await send('Runtime.evaluate', {
    expression: `document.getElementById('story-offer')?.scrollIntoView({ behavior: 'instant', block: 'start' })`
  })
  await new Promise(r => setTimeout(r, 800))

  const mobileShot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-03-plain-mobile.png', Buffer.from(mobileShot.data, 'base64'))

  proc.kill()
  process.exit(0)
}

run().catch(e => {
  console.error(e)
  proc.kill()
  process.exit(1)
})

