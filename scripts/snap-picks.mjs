import { spawn } from 'child_process'
import fs from 'fs'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9593

const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=' + port,
  '--window-size=1440,960',
  'http://localhost:5173/#/home'
])

async function run() {
  await new Promise(r => setTimeout(r, 2000))
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const target = list.find(t => t.type === 'page' && t.url.includes('5173')) || list[0]

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 1; const map = new Map()
  ws.onmessage = e => { const m = JSON.parse(e.data); if (map.has(m.id)) { map.get(m.id)(m.result); map.delete(m.id) } }
  const send = (m, p={}) => new Promise(r => { const c = id++; map.set(c, r); ws.send(JSON.stringify({id:c, method:m, params:p})) })
  await new Promise(r => ws.onopen = r)
  await send('Page.enable')

  // 等待页面完全加载
  await new Promise(r => setTimeout(r, 1200))

  // 1. 滚动到卡片 1 (Minecraft Server)
  await send('Runtime.evaluate', {
    expression: `
      const el = document.querySelector('.sketch-card-minecraft');
      if (window.__lenis) {
        window.__lenis.scrollTo(el, { offset: -90, immediate: true });
      } else if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    `
  })
  await new Promise(r => setTimeout(r, 1000))
  const shot1 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-04-picks-card1.png', Buffer.from(shot1.data, 'base64'))

  // 2. 滚动到卡片 2 (Tools) 完整视口
  const logInfo = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.querySelector('.sketch-card-tools');
        if (window.__lenis && el) {
          window.__lenis.scrollTo(el, { immediate: true, force: true });
          return 'scrolled via lenis to ' + el.offsetTop;
        } else if (el) {
          el.scrollIntoView();
          return 'scrolled via standard to ' + el.offsetTop;
        }
        return 'not found';
      })()
    `
  })
  console.log('Scroll result:', logInfo)
  await new Promise(r => setTimeout(r, 1200))
  await new Promise(r => setTimeout(r, 1000))
  const shot2 = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-04-picks-card2.png', Buffer.from(shot2.data, 'base64'))

  // 3. 移动端视口测试 (390x844) - 查看移动端卡片内部展开
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  })
  await new Promise(r => setTimeout(r, 600))
  await send('Runtime.evaluate', {
    expression: `
      const el = document.querySelector('.sketch-card-minecraft');
      if (window.__lenis) {
        window.__lenis.scrollTo(el, { offset: -70, immediate: true });
      } else if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    `
  })
  await new Promise(r => setTimeout(r, 1000))
  const mobileShot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-04-picks-mobile.png', Buffer.from(mobileShot.data, 'base64'))

  console.log('Precise screenshots captured successfully!')
  ws.close()
  proc.kill()
}

run().catch(err => {
  console.error(err)
  proc.kill()
})
