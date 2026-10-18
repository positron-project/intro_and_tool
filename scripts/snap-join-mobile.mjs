import { spawn } from 'child_process'
import fs from 'fs'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9596

const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=' + port,
  '--window-size=390,844',
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  })

  // 1. 滚动到二维码区域
  await send('Runtime.evaluate', {
    expression: `
      const el = document.querySelector('.join-action-column');
      if (window.__lenis && el) {
        window.__lenis.resize();
        window.__lenis.scrollTo(el, { immediate: true, force: true });
      } else if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    `
  })
  await new Promise(r => setTimeout(r, 1200))
  const shotAction = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-06-mobile-action.png', Buffer.from(shotAction.data, 'base64'))

  // 2. 滚动到移动端 Footer 底部
  await send('Runtime.evaluate', {
    expression: `
      const footer = document.querySelector('.join-footer-block');
      if (window.__lenis && footer) {
        window.__lenis.scrollTo(footer, { immediate: true, force: true });
      } else if (footer) {
        footer.scrollIntoView({ behavior: 'instant', block: 'end' });
      }
    `
  })
  await new Promise(r => setTimeout(r, 1200))
  const shotFooter = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('snap-06-mobile-footer.png', Buffer.from(shotFooter.data, 'base64'))

  console.log('Mobile sub-screenshots captured successfully!')
  ws.close()
  proc.kill()
}

run().catch(err => {
  console.error(err)
  proc.kill()
})

